"""Local-only static preview; no arbitrary disk routes or external dependency."""
import argparse
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


OPTIMIZED_IMAGE_PATH = re.compile(r'^/(?:[a-zA-Z0-9_-]+/)*optimized/[a-zA-Z0-9_-]+-[a-f0-9]{12}\.webp$')


class PreviewHandler(SimpleHTTPRequestHandler):
    # Windows MIME registry may map .mjs to text/plain, which browsers reject.
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
        '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.json': 'application/json', '.svg': 'image/svg+xml',
        '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp'}

    def send_response(self, code, message=None):
        self._response_status = code
        return super().send_response(code, message)

    def end_headers(self):
        cacheable = (getattr(self, '_response_status', None) in (200, 304)
                     and OPTIMIZED_IMAGE_PATH.fullmatch(urlsplit(self.path).path))
        self.send_header('Cache-Control', 'private, max-age=31536000, immutable' if cacheable else 'no-store')
        super().end_headers()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4199)
    args = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(Path(__file__).resolve().parent/'dist'))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    print(f'http://127.0.0.1:{args.port}/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
