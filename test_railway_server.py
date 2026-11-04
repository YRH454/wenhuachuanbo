"""Exercise the Railway entry point with fake credentials and a mocked model."""
import base64
import json
import unittest
from unittest.mock import patch

import museum_assistant_server as assistant
from railway_server import create_app


class RailwayServerTest(unittest.TestCase):
    def setUp(self):
        self.origin = 'https://preview.example'
        self.password = 'preview-pass-123456'
        self.app = create_app({'PUBLIC_ORIGIN': self.origin,
                               'SITE_PREVIEW_PASSWORD': self.password,
                               'DASHSCOPE_API_KEY': 'fake-test-key'})
        self.client = self.app.test_client()
        token = base64.b64encode(('viewer:' + self.password).encode()).decode()
        self.auth = {'Authorization': 'Basic ' + token}
        self.headers = {**self.auth, 'Origin': self.origin}
        self.body = {'messages': [{'role': 'user', 'content': '介绍一下'}], 'sceneId': 'city-370300'}

    def post(self, body=None, headers=None, host='preview.example'):
        return self.client.post('/api/museum-assistant/chat', json=body or self.body,
                                headers=self.headers if headers is None else headers,
                                base_url='https://' + host)

    def test_preview_auth_and_health(self):
        self.assertEqual(self.client.get('/healthz').status_code, 200)
        self.assertEqual(self.client.get('/').status_code, 401)
        response = self.client.get('/', headers=self.auth)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(self.password.encode(), response.data)
        response.close()
        self.assertEqual(self.post(headers={'Origin': self.origin}).status_code, 401)

    def test_static_site_and_all_city_data(self):
        for path in ['/', '/museum/', '/app.mjs', '/museum/images/sdu-egg.jpg']:
            with self.subTest(path=path):
                result = self.client.get(path, headers=self.auth)
                self.assertEqual(result.status_code, 200)
                if path.endswith('.mjs'):
                    self.assertIn('javascript', result.content_type)
                result.close()
        files = list((assistant.PEOPLE_ROOT / 'data').glob('[0-9][0-9][0-9][0-9][0-9][0-9].json'))
        self.assertEqual(len(files), 16)
        for file in files:
            with self.subTest(city=file.stem):
                result = self.client.get('/people-culture-v1/data/' + file.name, headers=self.auth)
                self.assertEqual(result.status_code, 200)
                self.assertEqual(json.loads(result.data)['cityId'], file.stem)
                result.close()
        self.assertEqual(self.client.get('/.env', headers=self.auth).status_code, 404)
        self.assertEqual(self.client.get('/%2e%2e/railway_server.py', headers=self.auth).status_code, 404)
        self.assertEqual(self.client.get('/museum/images/', headers=self.auth).status_code, 404)

    def test_failed_logins_are_rate_limited_but_valid_preview_still_works(self):
        for _ in range(10):
            self.assertEqual(self.client.get('/').status_code, 401)
        self.assertEqual(self.client.get('/').status_code, 429)
        response = self.client.get('/', headers=self.auth)
        self.assertEqual(response.status_code, 200)
        response.close()

    def test_same_origin_and_scene_use_real_server_catalog(self):
        with patch.object(assistant, 'call_model', return_value='模拟讲解') as model:
            response = self.post()
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json['scene']['id'], 'city-370300')
            self.assertEqual(model.call_args.args[4]['title'], '淄博')
            for headers, host in [({**self.auth, 'Origin': 'https://evil.example'}, 'preview.example'),
                                  (self.auth, 'preview.example'),
                                  (self.headers, 'evil.example'),
                                  ({**self.headers, 'X-Forwarded-Host': 'preview.example'}, 'evil.example')]:
                self.assertEqual(self.post(headers=headers, host=host).status_code, 403)
            self.assertEqual(model.call_count, 1)

    def test_context_index_is_preloaded_and_respects_preview_auth(self):
        self.assertEqual(self.client.get('/api/museum-assistant/context-index').status_code, 401)
        with patch.object(assistant, 'call_model') as model:
            response = self.client.get('/api/museum-assistant/context-index', headers=self.auth)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json['contexts']['exhibit:sdu-egg']['evidence'], 'checked')
            self.assertIn('scene:map', response.json['contexts'])
            self.assertNotIn('fake-test-key', response.get_data(as_text=True))
            model.assert_not_called()

    def test_only_content_addressed_display_images_are_cached(self):
        index = json.loads((assistant.DIST_ROOT / 'optimized-assets.json').read_text(encoding='utf-8'))
        display = next(iter(index['entries'].values()))['src']
        response = self.client.get('/' + display, headers=self.auth)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, 'image/webp')
        self.assertIn('private', response.headers['Cache-Control'])
        self.assertIn('immutable', response.headers['Cache-Control'])
        response.close()
        self.assertEqual(self.client.get('/' + display).headers['Cache-Control'], 'no-store')
        self.assertEqual(self.client.get('/api/museum-assistant/context-index', headers=self.auth).headers['Cache-Control'], 'no-store')
        self.assertEqual(self.client.get('/assets/optimized/missing-123456789abc.webp', headers=self.auth).headers['Cache-Control'], 'no-store')

    def test_access_is_fail_closed_without_key_password_or_public_opt_in(self):
        app = create_app({'PUBLIC_ORIGIN': self.origin, 'DASHSCOPE_API_KEY': 'fake-test-key'})
        client = app.test_client()
        with patch.object(assistant, 'call_model') as model:
            response = client.post('/api/museum-assistant/chat', json=self.body,
                                   headers={'Origin': self.origin}, base_url=self.origin)
            self.assertEqual(response.status_code, 503)
            model.assert_not_called()
        app = create_app({'PUBLIC_ORIGIN': self.origin, 'SITE_PREVIEW_PASSWORD': self.password})
        response = app.test_client().post('/api/museum-assistant/chat', json=self.body,
                                          headers=self.headers, base_url=self.origin)
        self.assertEqual(response.status_code, 503)

    def test_missing_domain_or_invalid_configuration_cannot_enable_chat(self):
        app = create_app({'SITE_PREVIEW_PASSWORD': self.password, 'DASHSCOPE_API_KEY': 'fake'})
        response = app.test_client().post('/api/museum-assistant/chat', json=self.body,
                                          headers=self.headers, base_url=self.origin)
        self.assertEqual(response.status_code, 403)
        for origin in ['http://example.com', 'https://user@example.com', 'https://example.com/path',
                       'https://example.com?x=y', 'https://example.com:1234']:
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                create_app({'PUBLIC_ORIGIN': origin})
        with self.assertRaises(ValueError):
            create_app({'SITE_PREVIEW_PASSWORD': 'short'})

    def test_size_content_type_and_rate_limit(self):
        response = self.client.post('/api/museum-assistant/chat', data='x' * (assistant.MAX_REQUEST_BYTES + 1),
                                    headers=self.headers, content_type='application/json', base_url=self.origin)
        self.assertEqual(response.status_code, 413)
        response = self.client.post('/api/museum-assistant/chat', data='{}', headers=self.headers,
                                    content_type='text/plain', base_url=self.origin)
        self.assertEqual(response.status_code, 415)
        with patch.object(assistant, 'call_model', return_value='模拟讲解') as model:
            for _ in range(8):
                self.assertEqual(self.post().status_code, 200)
            self.assertEqual(self.post().status_code, 429)
            self.assertEqual(model.call_count, 8)

    def test_railway_domain_can_supply_default_origin(self):
        app = create_app({'RAILWAY_PUBLIC_DOMAIN': 'preview.example', 'PUBLIC_AI_ENABLED': 'true',
                          'DASHSCOPE_API_KEY': 'fake'})
        with patch.object(assistant, 'call_model', return_value='模拟讲解'):
            response = app.test_client().post('/api/museum-assistant/chat', json=self.body,
                                              headers={'Origin': self.origin}, base_url=self.origin)
            self.assertEqual(response.status_code, 200)


if __name__ == '__main__':
    unittest.main()
