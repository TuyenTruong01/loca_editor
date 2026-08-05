from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()
port = int(sys.argv[2]) if len(sys.argv) > 2 else 5173


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(root), **kwargs)

    def do_GET(self):
        requested = root / self.path.split("?", 1)[0].lstrip("/")
        if self.path != "/" and not requested.exists() and "." not in requested.name:
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, *_args):
        return


ThreadingHTTPServer(("127.0.0.1", port), SpaHandler).serve_forever()
