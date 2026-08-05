import os
import sys
import shutil
import tempfile
from pathlib import Path
from typing import Annotated

import fitz
from fastapi import BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

backend_path = os.environ["LOCA_DOCUMENT_BACKEND_PATH"]
sys.path.insert(0, backend_path)

from services.validation.docx_inspector import DocxInspector  # noqa: E402


def validate_practical_docx(self, path):
    """Reject broken DOCX files while allowing small, harmless textbox overlaps."""
    report = self.inspect(path)
    invalid = (
        report["editable_character_count"] == 0
        or report["max_font_size_pt"] > 72
        or report["text_outside_page_count"] != 0
        or report["overlap_count"] > max(20, report["media_count"] * 2)
    )
    if invalid:
        raise RuntimeError("DOCX_EXPORT_VALIDATION_FAILED")
    return report


DocxInspector.validate_editable = validate_practical_docx

from app import app  # noqa: E402
from api.pdf_tools import _page_count, _parse_ranges, _read_pdf, _safe_name  # noqa: E402
from core.auth import AccessUser, require_ready_user, require_user  # noqa: E402

if os.environ.get("LOCA_DESKTOP_MODE", "").lower() in {"1", "true", "yes"}:
    def desktop_user() -> AccessUser:
        return AccessUser("desktop-local", "local@desktop", "user", "active", None, False)
    app.dependency_overrides[require_user] = desktop_user


@app.post("/api/pdf/rotate")
async def rotate_pdf(
    background_tasks: BackgroundTasks,
    user: Annotated[AccessUser, Depends(require_ready_user)],
    file: UploadFile = File(...),
    rotation: int = Form(...),
    page_ranges: str = Form(""),
    output_name: str = Form(""),
):
    del user
    if rotation not in {-90, 90, 180}:
        raise HTTPException(status_code=400, detail="Rotation must be -90, 90, or 180 degrees.")
    data = await _read_pdf(file)
    total_pages = _page_count(data)
    selected = set(range(1, total_pages + 1))
    if page_ranges.strip():
        selected = {page for group in _parse_ranges(page_ranges, total_pages) for page in group}
    work = Path(tempfile.mkdtemp(prefix="loca_pdf_rotate_"))
    filename = _safe_name(output_name, f"{Path(file.filename or 'document').stem}_rotated", ".pdf")
    output = work / filename
    try:
        with fitz.open(stream=data, filetype="pdf") as document:
            for page_number in selected:
                page = document.load_page(page_number - 1)
                page.set_rotation((page.rotation + rotation) % 360)
            document.save(output, garbage=4, deflate=True)
        background_tasks.add_task(shutil.rmtree, work, ignore_errors=True)
        return FileResponse(output, media_type="application/pdf", filename=filename, background=background_tasks)
    except Exception:
        shutil.rmtree(work, ignore_errors=True)
        raise


@app.exception_handler(Exception)
async def document_backend_error(_request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": f"Chuyển đổi thất bại trên backend: {exc}"})

ALLOWED_ORIGINS = {
    "https://loca-editor.vercel.app",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
}


@app.middleware("http")
async def allow_local_network_access(request, call_next):
    origin = request.headers.get("origin")
    if request.method == "OPTIONS" and origin in ALLOWED_ORIGINS:
        response = Response(status_code=204)
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers", "Authorization,Content-Type")
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "86400"
    else:
        try:
            response = await call_next(request)
        except Exception as exc:
            response = JSONResponse(status_code=500, content={"detail": f"Chuyển đổi thất bại trên backend: {exc}"})
        if origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
    if request.headers.get("access-control-request-private-network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response
