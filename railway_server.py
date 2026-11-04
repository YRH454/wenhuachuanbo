"""Production WSGI entry point for a single-instance Railway preview.

Credentials are read only from the environment and are never logged.  The
preview password is optional for browsing, but is required for the model
unless the owner explicitly enables public AI access.
"""
import hmac
import os
import threading
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlsplit

from flask import Flask, abort, jsonify, redirect, request, send_file

import museum_assistant_server as assistant
from server import OPTIMIZED_IMAGE_PATH


def configured_origin(config):
    value = config.get('PUBLIC_ORIGIN', '').strip()
    if not value and config.get('RAILWAY_PUBLIC_DOMAIN', '').strip():
        value = 'https://' + config['RAILWAY_PUBLIC_DOMAIN'].strip()
    if not value:
        return None
    try:
        parsed = urlsplit(value)
        if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
                or parsed.port not in (None, 443) or parsed.path not in ('', '/')
                or parsed.query or parsed.fragment):
            raise ValueError
    except ValueError as error:
        raise ValueError('PUBLIC_ORIGIN must be a single HTTPS origin') from error
    return 'https://' + parsed.netloc.lower()


def create_app(config=None):
    config = dict(os.environ if config is None else config)
    origin = configured_origin(config)
    password = config.get('SITE_PREVIEW_PASSWORD', '')
    if password and len(password) < 12:
        raise ValueError('SITE_PREVIEW_PASSWORD must contain at least 12 characters')
    public_ai = config.get('PUBLIC_AI_ENABLED', '').lower() == 'true'
    endpoint = assistant.validated_endpoint(config.get('DASHSCOPE_BASE_URL', assistant.DEFAULT_BASE_URL).strip())
    service = SimpleNamespace(
        api_key=config.get('DASHSCOPE_API_KEY', '').strip(), endpoint=endpoint,
        exhibits=assistant.load_exhibit_catalog(), scenes=assistant.load_scene_catalog(),
        model_slots=threading.BoundedSemaphore(2), guide_cache=assistant.GuideCache(),
        # Railway is expected to run one instance.  These are conservative
        # process-local safeguards, not persistent quotas or spending caps.
        request_budget=assistant.ModelRequestBudget(window=60, total_limit=8, client_limit=8),
        additional_budgets=(
            assistant.ModelRequestBudget(window=3600, total_limit=40, client_limit=40),
            assistant.ModelRequestBudget(window=86400, total_limit=100, client_limit=100),
        ),
    )
    service.quick_contexts = assistant.build_quick_contexts(service.exhibits, service.scenes)
    web = Flask(__name__, static_folder=None)
    web.config['MAX_CONTENT_LENGTH'] = assistant.MAX_REQUEST_BYTES
    web.config['ASSISTANT_SERVICE'] = service
    failed_login_budget = assistant.ModelRequestBudget(window=60, total_limit=10, client_limit=10)
    root = assistant.DIST_ROOT.resolve(strict=True)

    @web.before_request
    def protect_preview():
        # Health checks need no credentials and never reveal configuration.
        if request.path == '/healthz' and request.method == 'GET':
            return None
        if password:
            auth = request.authorization
            user = (auth.username or '') if auth else ''
            secret = (auth.password or '') if auth else ''
            if not (hmac.compare_digest(user.encode('utf-8'), b'viewer') and
                    hmac.compare_digest(secret.encode('utf-8'), password.encode('utf-8'))):
                if not failed_login_budget.allow('shared-preview-budget'):
                    return 'Too many attempts', 429
                return ('Preview authentication required', 401,
                        {'WWW-Authenticate': 'Basic realm="Shandong preview", charset="UTF-8"'})
        return None

    @web.after_request
    def security_headers(response):
        cacheable = request.method == 'GET' and response.status_code in (200, 304) and OPTIMIZED_IMAGE_PATH.fullmatch(request.path)
        response.headers['Cache-Control'] = 'private, max-age=31536000, immutable' if cacheable else 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'same-origin'
        return response

    @web.errorhandler(413)
    def too_large(_error):
        return jsonify(error='问题太长，请缩短后重试。'), 413

    @web.get('/healthz')
    def health():
        return 'ok', 200, {'Content-Type': 'text/plain; charset=utf-8'}

    @web.get('/api/museum-assistant/context-index')
    def context_index():
        return jsonify(service.quick_contexts)

    @web.post('/api/museum-assistant/chat')
    def chat():
        # Compare against the configured public host; do not trust forwarded
        # headers supplied by arbitrary callers. Origin alone is not auth.
        if not origin or request.host.lower() != urlsplit(origin).netloc or request.headers.get('Origin') != origin:
            return jsonify(error='请求来源不受支持。'), 403
        if request.mimetype != 'application/json':
            return jsonify(error='请求格式不正确。'), 415
        if not password and not public_ai:
            return jsonify(error='模型服务暂未开放。'), 503
        body = request.get_json(silent=True)
        status, payload = assistant.process_chat(service, body, 'shared-preview-budget')
        return jsonify(payload), status

    @web.get('/')
    @web.get('/<path:asset>')
    def static_asset(asset=''):
        # Never expose dotfiles, arbitrary filesystem paths or directory listings.
        parts = Path(asset).parts
        if any(part.startswith('.') or '\\' in part for part in parts):
            abort(404)
        path = (root / asset).resolve()
        if not path.is_relative_to(root):
            abort(404)
        if path.is_dir():
            if not request.path.endswith('/'):
                return redirect(request.path + '/', code=308)
            path = path / 'index.html'
        if not path.is_file() or not path.resolve().is_relative_to(root):
            abort(404)
        mimetype = 'text/javascript' if path.suffix.lower() == '.mjs' else None
        return send_file(path, mimetype=mimetype, conditional=True)

    return web


app = create_app()


if __name__ == '__main__':
    from waitress import serve

    port = int(os.environ.get('PORT', '8080'))
    if not 1 <= port <= 65535:
        raise ValueError('PORT must be between 1 and 65535')
    serve(app, listen=f'0.0.0.0:{port}', threads=8, channel_timeout=60,
          max_request_body_size=assistant.MAX_REQUEST_BYTES, ident='web')
