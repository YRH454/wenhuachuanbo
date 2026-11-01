"""Local-only static preview; no arbitrary disk routes or external dependency."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PreviewHandler(SimpleHTTPRequestHandler):
    # Windows MIME registry may map .mjs to text/plain, which browsers reject.
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
        '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.json': 'application/json', '.svg': 'image/svg+xml',
        '.txt': 'text/plain; charset=utf-8', '.png': 'image/png'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
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
