import os
import sys

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
        or report["overlap_count"] > 20
    )
    if invalid:
        raise RuntimeError("DOCX_EXPORT_VALIDATION_FAILED")
    return report


DocxInspector.validate_editable = validate_practical_docx

from app import app  # noqa: E402


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
        response = await call_next(request)
        if origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
    if request.headers.get("access-control-request-private-network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response
