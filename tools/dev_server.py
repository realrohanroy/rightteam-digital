"""Local preview server that behaves like the live site's .htaccess:
clean addresses (/creators serves creators.html, /creators.html redirects to /creators)
and the same security headers, read from .htaccess so local testing uses the real policy.

    python -I tools/dev_server.py [port]      (default 5510; .claude/launch.json uses it)
"""
import http.server, os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEADERS = re.findall(r'^\s*Header always set ([\w-]+) "(.*?)"\s*(?:"expr=.*")?$', (ROOT / ".htaccess").read_text(encoding="utf-8"), re.M)
SKIP = {"Strict-Transport-Security"}  # localhost is plain http


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def end_headers(self):
        for name, value in HEADERS:
            if name not in SKIP:
                self.send_header(name, value.replace("upgrade-insecure-requests", "").rstrip("; "))
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _redirect(self, to):
        self.send_response(301); self.send_header("Location", to); self.end_headers()

    def do_GET(self):
        path, _, query = self.path.partition("?")
        q = "?" + query if query else ""
        m = re.fullmatch(r"/([A-Za-z0-9_-]+)\.html/?", path)
        if m:
            return self._redirect(("/" if m.group(1) == "index" else "/" + m.group(1)) + q)
        m = re.fullmatch(r"/([A-Za-z0-9_-]+)/?", path)
        if m and (ROOT / f"{m.group(1)}.html").is_file():
            if path.endswith("/") or m.group(1) == "index":
                return self._redirect(("/" if m.group(1) == "index" else "/" + m.group(1)) + q)
            self.path = f"/{m.group(1)}.html{q}"
        return super().do_GET()

    def send_error(self, code, message=None, explain=None):
        if code == 404 and (ROOT / "404.html").is_file():
            body = (ROOT / "404.html").read_bytes()
            self.send_response(404); self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
            return
        super().send_error(code, message, explain)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5510
    print(f"Serving {ROOT} on http://localhost:{port} (clean URLs + .htaccess headers)")
    http.server.ThreadingHTTPServer(("", port), Handler).serve_forever()
