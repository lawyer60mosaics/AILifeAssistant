import json
import uuid
from dataclasses import dataclass, field

from fastapi import WebSocket
from pydantic import ValidationError
from starlette.websockets import WebSocketDisconnect

from app.core.config import settings
from app.models.events import ClientHello, ErrorEvent, SessionState, TranscriptDelta
from app.services.llm_gateway import LlmGateway
from app.services.redaction import Redactor
from app.services.transcriber import MockTranscriber


@dataclass
class HubSession:
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    clients: set[WebSocket] = field(default_factory=set)
    transcript_segments: list[str] = field(default_factory=list)
    transcriber: MockTranscriber = field(default_factory=MockTranscriber)
    redactor: Redactor = field(
        default_factory=lambda: Redactor(settings.redact_custom_terms.split(","))
    )
    llm_gateway: LlmGateway = field(default_factory=lambda: LlmGateway(settings.local_only))

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.clients.add(websocket)
        await self.send_state(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.clients.discard(websocket)

    async def send_json(self, websocket: WebSocket, payload: dict) -> None:
        await websocket.send_text(json.dumps(payload, ensure_ascii=False))

    async def broadcast(self, payload: dict) -> None:
        dead_clients: list[WebSocket] = []
        for client in list(self.clients):
            try:
                await self.send_json(client, payload)
            except RuntimeError:
                dead_clients.append(client)
        for client in dead_clients:
            self.disconnect(client)

    async def send_state(self, websocket: WebSocket) -> None:
        state = SessionState(
            sessionId=self.session_id,
            privacyMode="local_only" if settings.local_only else "cloud_enabled",
            connectedClients=len(self.clients),
        )
        await self.send_json(websocket, state.model_dump(by_alias=True))

    async def handle_text(self, websocket: WebSocket, message: str) -> None:
        try:
            payload = json.loads(message)
        except json.JSONDecodeError:
            await self.send_error(websocket, "INVALID_JSON", "消息不是合法 JSON。")
            return

        if payload.get("type") == "client_hello":
            try:
                ClientHello.model_validate(payload)
            except ValidationError as exc:
                await self.send_error(websocket, "INVALID_HELLO", exc.errors()[0]["msg"])
                return
            await self.send_state(websocket)
            await self.broadcast(
                {
                    "type": "hub_status",
                    "message": "客户端已连接，等待音频帧。",
                    "connectedClients": len(self.clients),
                }
            )
            return

        await self.send_error(websocket, "UNSUPPORTED_EVENT", "暂不支持该消息类型。")

    async def handle_audio(self, frame: bytes) -> None:
        segment = await self.transcriber.accept_audio(frame)
        if segment is None:
            return

        cleaned_segment = TranscriptDelta(
            segmentId=segment.segment_id,
            speaker=segment.speaker,
            text=self.redactor.clean(segment.text),
            startMs=segment.start_ms,
            endMs=segment.end_ms,
            isFinal=segment.is_final,
        )
        self.transcript_segments.append(cleaned_segment.text)
        await self.broadcast(cleaned_segment.model_dump(by_alias=True))

        if len(self.transcript_segments) > 0 and len(self.transcript_segments) % 4 == 0:
            transcript = "\n".join(self.transcript_segments[-4:])
            analysis = await self.llm_gateway.summarize_window(transcript)
            await self.broadcast(analysis.model_dump(by_alias=True))

    async def send_error(self, websocket: WebSocket, code: str, message: str) -> None:
        event = ErrorEvent(code=code, message=message)
        await self.send_json(websocket, event.model_dump())

    async def websocket_loop(self, websocket: WebSocket) -> None:
        await self.connect(websocket)
        try:
            while True:
                message = await websocket.receive()
                if "text" in message and message["text"] is not None:
                    await self.handle_text(websocket, message["text"])
                elif "bytes" in message and message["bytes"] is not None:
                    await self.handle_audio(message["bytes"])
        except WebSocketDisconnect:
            self.disconnect(websocket)
            await self.broadcast(
                {
                    "type": "hub_status",
                    "message": "客户端已断开。",
                    "connectedClients": len(self.clients),
                }
            )

