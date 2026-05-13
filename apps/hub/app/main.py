from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.services.session import HubSession

app = FastAPI(title=settings.app_name)
session = HubSession()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str | bool]:
    return {"status": "ok", "localOnly": settings.local_only}


@app.websocket("/ws/client")
async def client_socket(websocket: WebSocket) -> None:
    await session.websocket_loop(websocket)

