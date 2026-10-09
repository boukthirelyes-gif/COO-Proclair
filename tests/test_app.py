import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError


class CRMTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        spec = importlib.util.spec_from_file_location('proclair_test', Path(__file__).parents[1] / 'app.py')
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.DB = Path(cls.directory.name) / 'test.sqlite3'
        cls.app.initialize()
        cls.server = cls.app.ThreadingHTTPServer(('127.0.0.1', 0), cls.app.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.directory.cleanup()

    def request(self, route, payload=None):
        request = Request(self.base + route, data=json.dumps(payload).encode() if payload is not None else None, headers={'Content-Type': 'application/json'})
        with urlopen(request) as response:
            return json.load(response)

    def test_client_task_and_agent_workflow(self):
        client = self.request('/api/clients', {'name': 'Alice', 'company': 'Exemple', 'status': 'Prospect', 'notes': '<script>alert(1)</script>'})
        task = self.request('/api/tasks', {'title': 'Contacter Alice', 'due': '2020-01-01'})
        state = self.request('/api/state')
        self.assertTrue(any(c['id'] == client['id'] and c['name'] == 'Alice' for c in state['clients']))
        agent = self.request('/api/agent', {})
        self.assertIn('Alice', agent['draft'])
        self.assertTrue(any('Contacter Alice' in s for s in agent['suggestions']))
        first = self.request('/api/agent/organize', {})
        second = self.request('/api/agent/organize', {})
        self.assertEqual(first['created'], 1)
        self.assertEqual(second['created'], 0)
        self.request('/api/tasks/toggle', {'id': task['id']})
        self.assertEqual(next(t for t in self.request('/api/state')['tasks'] if t['id'] == task['id'])['done'], 1)
        self.app.initialize()
        with self.app.connect() as db:
            self.assertEqual(db.execute('SELECT name FROM clients WHERE id=?', (client['id'],)).fetchone()['name'], 'Alice')

    def test_invalid_contact_rejected(self):
        with self.assertRaises(HTTPError) as error:
            self.request('/api/clients', {'name': ''})
        self.assertEqual(error.exception.code, 400)

    def test_static_application(self):
        with urlopen(self.base + '/') as response:
            self.assertIn('Assistant Proclair', response.read().decode())
        with self.assertRaises(HTTPError) as error:
            urlopen(self.base + '/../app.py')
        self.assertEqual(error.exception.code, 404)
