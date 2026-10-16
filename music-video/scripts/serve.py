"""Dev server for dev.html.

A static file server that tells the browser to re-check every file on each load
(Cache-Control: no-cache; unchanged files come back as a cheap 304). Python's
stock http.server sends no cache headers, so a browser may keep running a stale
copy of a scene that has since been rewritten.

Usage: python3 scripts/serve.py [port]   (serves the music-video folder; default 3123)
"""
import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 3123
handler = functools.partial(NoCache, directory=str(ROOT))
http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
