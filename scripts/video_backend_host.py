import os
import re
import sys
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

backend_path = os.environ["LOCA_VIDEO_BACKEND_PATH"]
sys.path.insert(0, backend_path)

from app.main import create_app  # noqa: E402
from app.core.auth import AccessUser, require_ready_user  # noqa: E402
from app.core.config import PROJECT_ROOT  # noqa: E402
from app.services.downloader.direct_service import download_direct  # noqa: E402
from app.services.downloader.ytdlp_service import YtDlpService  # noqa: E402
from app.services.media.processing_service import compress_video, remove_workspace, run_ffmpeg, save_upload, workspace  # noqa: E402
from app.services.system.tool_checker import _find_executable  # noqa: E402

app = create_app()

# Keep the public API CORS contract explicit at the host that uvicorn actually
# serves. The upstream application also has CORS support, but its origins come
# from runtime settings. This outer middleware guarantees that the Vercel app
# and both supported local development origins receive CORS headers on every
# /api response, including OPTIONS preflight and error responses.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://loca-editor.vercel.app",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Range",
        "X-Requested-With",
    ],
)

chunk_uploads: dict[str, dict] = {}
download_jobs: dict[str, dict] = {}
compression_jobs: dict[str, dict] = {}


def _download_job(job_id: str, url: str, quality: str, cookie_browser: str) -> None:
    job = download_jobs[job_id]
    job["status"] = "running"
    job["started_at"] = datetime.now(timezone.utc).isoformat()
    job_dir = Path(job["job_dir"])
    try:
        height = {"small": "720", "balanced": "1080", "best": "2160"}.get(quality, "1080")
        output_template = str(job_dir / "%(title).160B.%(ext)s")
        ffmpeg, _ = _find_executable("ffmpeg")
        deno = PROJECT_ROOT / "backend/binaries/deno/deno.exe"
        args = [
            "--no-playlist", "--restrict-filenames", "--merge-output-format", "mp4",
            "--extractor-retries", "3", "--fragment-retries", "3",
        ]
        if ffmpeg:
            args += ["--ffmpeg-location", str(ffmpeg.parent)]
        if deno.exists():
            args += ["--js-runtimes", f"deno:{deno}"]
        args += [
            "-f", f"bv*[height<={height}]+ba/b[height<={height}]/b",
            "-o", output_template,
            "--print", "after_move:filepath",
        ]
        if cookie_browser in {"chrome", "edge", "firefox", "brave"}:
            args += ["--cookies-from-browser", cookie_browser]
        args.append(url)

        output = download_direct(url, job_dir)
        if output is None:
            result = YtDlpService().run(args, timeout=7200)
            if result.returncode != 0 and cookie_browser == "none" and "Sign in to confirm" in result.stderr:
                android_args = [*args[:-1], "--extractor-args", "youtube:player_client=android", url]
                result = YtDlpService().run(android_args, timeout=7200)
            if result.returncode != 0:
                raw_error = result.stderr.strip()
                raise RuntimeError(raw_error.splitlines()[-1] if raw_error else "Could not download the video.")
            lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
            output = Path(lines[-1]) if lines else next(job_dir.glob("*"))

        if not output.exists() or output.parent.resolve() != job_dir.resolve():
            raise RuntimeError("The downloaded video file was not found.")
        job["output"] = str(output)
        job["filename"] = re.sub(r"[^\w. -]", "_", output.name)
        job["status"] = "completed"
    except Exception as exc:
        job["status"] = "failed"
        job["error"] = str(exc)
        remove_workspace(job_dir)
    finally:
        job["finished_at"] = datetime.now(timezone.utc).isoformat()


def _owned_download_job(job_id: str, user: AccessUser) -> dict:
    job = download_jobs.get(job_id)
    if not job or job["owner"] != user.user_id:
        raise HTTPException(status_code=404, detail="Download job was not found.")
    return job


def _compression_job(job_id: str, preset: str, output_format: str) -> None:
    job = compression_jobs[job_id]
    job["status"] = "running"
    job["started_at"] = datetime.now(timezone.utc).isoformat()
    job_dir = Path(job["job_dir"])
    try:
        if output_format not in {"mp4", "mov", "mkv", "webm"}:
            raise ValueError("The requested output format is not supported.")
        output = job_dir / f"loca-compressed.{output_format}"
        compress_video(Path(job["source"]), output, preset)
        job["output"] = str(output)
        job["filename"] = output.name
        job["status"] = "completed"
    except Exception as exc:
        job["status"] = "failed"
        job["error"] = str(exc)
        remove_workspace(job_dir)
    finally:
        job["finished_at"] = datetime.now(timezone.utc).isoformat()


def _owned_compression_job(job_id: str, user: AccessUser) -> dict:
    job = compression_jobs.get(job_id)
    if not job or job["owner"] != user.user_id:
        raise HTTPException(status_code=404, detail="Compression job was not found.")
    return job


@app.post("/api/downloads/jobs", status_code=202)
async def create_download_job(
    background_tasks: BackgroundTasks,
    user: Annotated[AccessUser, Depends(require_ready_user)],
    url: str = Form(...),
    quality: str = Form("balanced"),
    cookie_browser: str = Form("none"),
):
    job_id = uuid4().hex
    job_dir = workspace()
    download_jobs[job_id] = {
        "job_id": job_id,
        "owner": user.user_id,
        "status": "queued",
        "job_dir": str(job_dir),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    background_tasks.add_task(_download_job, job_id, url, quality, cookie_browser)
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/downloads/jobs/{job_id}/status")
async def download_job_status(job_id: str, user: Annotated[AccessUser, Depends(require_ready_user)]):
    job = _owned_download_job(job_id, user)
    return {
        "job_id": job_id,
        "status": job["status"],
        "filename": job.get("filename"),
        "error": job.get("error"),
    }


@app.get("/api/downloads/jobs/{job_id}/result")
async def download_job_result(
    job_id: str,
    background_tasks: BackgroundTasks,
    user: Annotated[AccessUser, Depends(require_ready_user)],
):
    job = _owned_download_job(job_id, user)
    if job["status"] == "failed":
        raise HTTPException(status_code=400, detail=job.get("error") or "Video download failed.")
    if job["status"] != "completed":
        raise HTTPException(status_code=409, detail="The video download is not complete yet.")
    output = Path(job["output"])
    if not output.exists():
        raise HTTPException(status_code=404, detail="The downloaded video file is no longer available.")
    background_tasks.add_task(remove_workspace, Path(job["job_dir"]))
    background_tasks.add_task(download_jobs.pop, job_id, None)
    return FileResponse(
        output,
        filename=job["filename"],
        media_type="application/octet-stream",
        background=background_tasks,
    )


@app.post("/api/compression/uploads/{upload_id}/jobs", status_code=202)
async def create_compression_job(
    upload_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    user: Annotated[AccessUser, Depends(require_ready_user)],
):
    upload = chunk_uploads.pop(upload_id, None)
    if not upload or upload["owner"] != user.user_id:
        raise HTTPException(status_code=404, detail="The video upload session was not found or has expired.")
    if not Path(upload["source"]).exists():
        remove_workspace(upload["job_dir"])
        raise HTTPException(status_code=400, detail="No uploaded video data was found.")
    job_id = uuid4().hex
    compression_jobs[job_id] = {
        "job_id": job_id,
        "owner": user.user_id,
        "status": "queued",
        "job_dir": str(upload["job_dir"]),
        "source": str(upload["source"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    background_tasks.add_task(
        _compression_job,
        job_id,
        str(payload.get("preset") or "balanced"),
        str(payload.get("format") or "mp4").lower(),
    )
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/compression/jobs/{job_id}/status")
async def compression_job_status(job_id: str, user: Annotated[AccessUser, Depends(require_ready_user)]):
    job = _owned_compression_job(job_id, user)
    return {
        "job_id": job_id,
        "status": job["status"],
        "filename": job.get("filename"),
        "error": job.get("error"),
    }


@app.get("/api/compression/jobs/{job_id}/result")
async def compression_job_result(
    job_id: str,
    background_tasks: BackgroundTasks,
    user: Annotated[AccessUser, Depends(require_ready_user)],
):
    job = _owned_compression_job(job_id, user)
    if job["status"] == "failed":
        raise HTTPException(status_code=400, detail=job.get("error") or "Video compression failed.")
    if job["status"] != "completed":
        raise HTTPException(status_code=409, detail="Video compression is not complete yet.")
    output = Path(job["output"])
    if not output.exists():
        raise HTTPException(status_code=404, detail="The compressed video is no longer available.")
    background_tasks.add_task(remove_workspace, Path(job["job_dir"]))
    background_tasks.add_task(compression_jobs.pop, job_id, None)
    return FileResponse(
        output,
        filename=job["filename"],
        media_type="application/octet-stream",
        background=background_tasks,
    )


@app.post("/api/video/rotate")
async def rotate_video(
    background_tasks: BackgroundTasks,
    user: Annotated[AccessUser, Depends(require_ready_user)],
    file: UploadFile = File(...),
    rotation: int = Form(0),
    mirror: bool = Form(False),
):
    del user
    if rotation not in {0, 90, 180, 270}:
        raise HTTPException(status_code=400, detail="Rotation must be 0, 90, 180, or 270 degrees.")
    job_dir = workspace()
    source = job_dir / f"source{Path(file.filename or 'video.mp4').suffix or '.mp4'}"
    output = job_dir / "loca-rotated.mp4"
    try:
        await save_upload(file, source)
        filters: list[str] = []
        if mirror:
            filters.append("hflip")
        if rotation == 90:
            filters.append("transpose=1")
        elif rotation == 180:
            filters.extend(["hflip", "vflip"])
        elif rotation == 270:
            filters.append("transpose=2")
        args = ["-i", str(source), "-map", "0:v:0", "-map", "0:a?"]
        if filters:
            args += ["-vf", ",".join(filters)]
        args += ["-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p",
                 "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(output)]
        run_ffmpeg(args)
        background_tasks.add_task(remove_workspace, job_dir)
        return FileResponse(output, filename=output.name, media_type="video/mp4", background=background_tasks)
    except Exception as exc:
        remove_workspace(job_dir)
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
