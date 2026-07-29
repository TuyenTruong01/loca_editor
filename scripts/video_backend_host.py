import os
import sys
import shutil
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

backend_path = os.environ["LOCA_VIDEO_BACKEND_PATH"]
sys.path.insert(0, backend_path)

from app.main import create_app  # noqa: E402
from app.core.auth import AccessUser, require_ready_user  # noqa: E402
from app.services.media.processing_service import compress_video, remove_workspace, workspace  # noqa: E402

app = create_app()
chunk_uploads: dict[str, dict] = {}


@app.post("/api/compression/uploads")
async def begin_chunk_upload(payload: dict, user: Annotated[AccessUser, Depends(require_ready_user)]):
    filename = Path(str(payload.get("filename") or "video.mp4")).name
    upload_id = uuid4().hex
    job_dir = workspace()
    source = job_dir / f"source{Path(filename).suffix or '.mp4'}"
    chunk_uploads[upload_id] = {"owner": user.user_id, "job_dir": job_dir, "source": source, "next": 0}
    return {"upload_id": upload_id}


@app.post("/api/compression/uploads/{upload_id}/chunks")
async def append_chunk(upload_id: str, user: Annotated[AccessUser, Depends(require_ready_user)], index: int = Form(...), chunk: UploadFile = File(...)):
    upload = chunk_uploads.get(upload_id)
    if not upload or upload["owner"] != user.user_id:
        raise HTTPException(status_code=404, detail="Phiên tải video không tồn tại.")
    if index != upload["next"]:
        raise HTTPException(status_code=409, detail=f"Thứ tự phần tải lên không hợp lệ. Cần phần {upload['next']}.")
    with upload["source"].open("ab") as destination:
        while data := await chunk.read(1024 * 1024):
            destination.write(data)
    await chunk.close()
    upload["next"] += 1
    return {"received": index}


@app.post("/api/compression/uploads/{upload_id}/process")
async def process_chunk_upload(upload_id: str, payload: dict, background_tasks: BackgroundTasks, user: Annotated[AccessUser, Depends(require_ready_user)]):
    upload = chunk_uploads.pop(upload_id, None)
    if not upload or upload["owner"] != user.user_id:
        raise HTTPException(status_code=404, detail="Phiên tải video không tồn tại hoặc đã hết hạn.")
    try:
        output_format = str(payload.get("format") or "mp4").lower()
        if output_format not in {"mp4", "mov", "mkv", "webm"}:
            raise ValueError("Định dạng đầu ra không hợp lệ")
        output = upload["job_dir"] / f"loca-compressed.{output_format}"
        compress_video(upload["source"], output, str(payload.get("preset") or "balanced"))
        background_tasks.add_task(remove_workspace, upload["job_dir"])
        return FileResponse(output, filename=output.name, media_type="application/octet-stream", background=background_tasks)
    except Exception as exc:
        remove_workspace(upload["job_dir"])
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# create_app mounts the static frontend at "/". Keep that catch-all route last
# so the chunk endpoints registered by this host remain reachable.
app.router.routes.sort(key=lambda route: getattr(route, "path", "") == "/")


@app.middleware("http")
async def allow_local_network_access(request, call_next):
    response = await call_next(request)
    if request.headers.get("access-control-request-private-network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response
