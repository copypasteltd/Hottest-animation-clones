"""Serve only the public, synthetic demo on the loopback interface.

This is a static documentation preview, not an inference or upload service.
"""
from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "docs" / "demo"


class DemoHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        requested = unquote(urlsplit(self.path).path)
        if requested not in {"/", "/index.html", "/styles.css", "/app.js"}:
            self.send_error(404, "Only public demo files are served")
            return None
        normalized = "/index.html" if requested == "/" else requested
        demo_root = Path(self.directory).resolve()
        leaf = Path(self.directory) / normalized.lstrip("/")
        resolved = leaf.resolve()
        if leaf.is_symlink() or not resolved.is_relative_to(demo_root) or not resolved.is_file():
            self.send_error(404, "Path is outside the public demo or not a regular file")
            return None
        # Validate and serve the same final leaf; do not let the base handler
        # perform a separate implicit index lookup after a directory check.
        self.path = normalized
        return super().send_head()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404, "Directory listing is disabled")
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    arguments = parser.parse_args()
    if not 0 <= arguments.port <= 65535:
        parser.error("Port must be between 0 and 65535")
    if not (DEMO / "index.html").is_file():
        parser.error("Public demo files are missing")
    handler = partial(DemoHandler, directory=str(DEMO))
    with ThreadingHTTPServer(("127.0.0.1", arguments.port), handler) as server:
        print(f"Synthetic documentation demo: http://127.0.0.1:{server.server_port}", flush=True)
        print("No models, uploads, private assets or API endpoints are served.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
