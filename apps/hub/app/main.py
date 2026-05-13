from fastapi import FastAPI, Response, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.services.discovery import MdnsPublisher
from app.services.session import HubSession

app = FastAPI(title=settings.app_name)
session = HubSession()
discovery = MdnsPublisher()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    discovery.start()


@app.on_event("shutdown")
async def shutdown() -> None:
    discovery.stop()


@app.get("/health")
async def health() -> dict[str, str | bool]:
    return {"status": "ok", "localOnly": settings.local_only}


@app.get("/discovery")
async def discovery_info() -> dict[str, str | int | bool]:
    return discovery.payload()


@app.get("/sessions/current")
async def current_session() -> dict:
    return session.store.to_dict()


@app.post("/sessions/current/analyze")
async def analyze_current_session() -> dict:
    return await session.analyze_now()


@app.get("/sessions/current/export.json")
async def export_current_session_json() -> dict:
    return session.store.to_dict()


@app.get("/sessions/current/export.md")
async def export_current_session_markdown() -> Response:
    return Response(
        content=session.store.to_markdown(),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=ai-minutes-report.md"},
    )


@app.websocket("/ws/client")
async def client_socket(websocket: WebSocket) -> None:
    await session.websocket_loop(websocket)
