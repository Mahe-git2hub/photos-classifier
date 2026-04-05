import asyncio
import threading
from typing import Any

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.schemas import ScanRequest, ScanStatus
from app.services.scanner import scan_photos
from app.services.face_detector import detect_all_faces
from app.services.clustering import cluster_faces

router = APIRouter(prefix="/api/scan", tags=["scan"])

# Global scan state
_scan_state = {
    "is_scanning": False,
    "phase": "idle",
    "progress": 0.0,
    "total_photos": 0,
    "processed_photos": 0,
    "total_faces": 0,
    "message": "",
}
_ws_clients: list[WebSocket] = []
_scan_lock = threading.Lock()


async def _broadcast(data: dict):
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_json(data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


def _progress_callback(phase: str, current: int, total: int, message: str):
    _scan_state["phase"] = phase
    _scan_state["progress"] = current / max(total, 1)
    _scan_state["processed_photos"] = current
    _scan_state["total_photos"] = total
    _scan_state["message"] = message

    # Broadcast to WebSocket clients from a thread
    import asyncio

    loop = _scan_state.get("_loop")
    if loop and loop.is_running():
        asyncio.run_coroutine_threadsafe(
            _broadcast({**_scan_state, "_loop": None}), loop
        )


def _run_scan(directory: str, loop: asyncio.AbstractEventLoop):
    db = SessionLocal()
    try:
        _scan_state["_loop"] = loop

        # Phase 1: Scan photos
        _scan_state["phase"] = "scanning"
        _scan_state["message"] = "Discovering photos..."
        new_count, total = scan_photos(db, directory, _progress_callback)

        # Phase 2: Detect faces
        _scan_state["phase"] = "detecting"
        _scan_state["message"] = "Detecting faces..."
        _scan_state["progress"] = 0.0
        total_faces = detect_all_faces(db, _progress_callback)
        _scan_state["total_faces"] = total_faces

        # Phase 3: Cluster faces
        _scan_state["phase"] = "clustering"
        _scan_state["message"] = "Clustering faces..."
        _scan_state["progress"] = 0.0
        person_count = cluster_faces(db, _progress_callback)

        # Done
        _scan_state["phase"] = "done"
        _scan_state["progress"] = 1.0
        _scan_state["message"] = (
            f"Complete! {new_count} new photos, {total_faces} faces, {person_count} persons"
        )

        asyncio.run_coroutine_threadsafe(
            _broadcast({k: v for k, v in _scan_state.items() if k != "_loop"}), loop
        )
    except Exception as e:
        _scan_state["phase"] = "error"
        _scan_state["message"] = str(e)
        asyncio.run_coroutine_threadsafe(
            _broadcast({k: v for k, v in _scan_state.items() if k != "_loop"}), loop
        )
    finally:
        _scan_state["is_scanning"] = False
        db.close()


@router.post("/start")
async def start_scan(body: ScanRequest):
    with _scan_lock:
        if _scan_state["is_scanning"]:
            return {"detail": "Scan already in progress"}

        _scan_state["is_scanning"] = True
        _scan_state["phase"] = "starting"
        _scan_state["progress"] = 0.0
        _scan_state["message"] = "Starting scan..."

    loop = asyncio.get_event_loop()
    thread = threading.Thread(target=_run_scan, args=(body.directory_path, loop), daemon=True)
    thread.start()

    return {"detail": "Scan started"}


@router.get("/status", response_model=ScanStatus)
async def get_scan_status():
    return ScanStatus(
        is_scanning=_scan_state["is_scanning"],
        phase=_scan_state["phase"],
        progress=_scan_state["progress"],
        total_photos=_scan_state["total_photos"],
        processed_photos=_scan_state["processed_photos"],
        total_faces=_scan_state["total_faces"],
        message=_scan_state["message"],
    )


@router.websocket("/ws")
async def scan_websocket(ws: WebSocket):
    await ws.accept()
    _ws_clients.append(ws)
    try:
        # Send current state immediately
        await ws.send_json(
            {k: v for k, v in _scan_state.items() if k != "_loop"}
        )
        # Keep alive
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        if ws in _ws_clients:
            _ws_clients.remove(ws)
