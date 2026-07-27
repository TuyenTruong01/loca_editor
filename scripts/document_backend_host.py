import os
import sys

backend_path = os.environ["LOCA_DOCUMENT_BACKEND_PATH"]
sys.path.insert(0, backend_path)

from app import app  # noqa: E402


@app.middleware("http")
async def allow_local_network_access(request, call_next):
    response = await call_next(request)
    if request.headers.get("access-control-request-private-network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response
