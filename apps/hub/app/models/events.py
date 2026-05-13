from typing import Literal

from pydantic import BaseModel, Field


class AudioFormat(BaseModel):
    mime_type: str = Field(alias="mimeType")
    sample_rate: int | None = Field(default=None, alias="sampleRate")
    channels: int = 1


class ClientHello(BaseModel):
    type: Literal["client_hello"]
    client_id: str = Field(alias="clientId")
    role: Literal["collector", "viewer", "editor"] = "collector"
    audio: AudioFormat | None = None


class SessionState(BaseModel):
    type: Literal["session_state"] = "session_state"
    session_id: str = Field(alias="sessionId")
    privacy_mode: Literal["local_only", "cloud_enabled"] = Field(alias="privacyMode")
    connected_clients: int = Field(alias="connectedClients")


class TranscriptDelta(BaseModel):
    type: Literal["transcript_delta"] = "transcript_delta"
    segment_id: str = Field(alias="segmentId")
    speaker: str
    text: str
    start_ms: int = Field(alias="startMs")
    end_ms: int = Field(alias="endMs")
    is_final: bool = Field(alias="isFinal")


class AnalysisUpdate(BaseModel):
    type: Literal["analysis_update"] = "analysis_update"
    summary: str
    action_items: list[dict[str, str | None]] = Field(default_factory=list, alias="actionItems")
    decisions: list[str] = Field(default_factory=list)


class ErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    code: str
    message: str

