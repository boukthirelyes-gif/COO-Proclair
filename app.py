"""CRM Proclair — Python 3.12+, sans dépendances externes."""
import json
import os
import sqlite3
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent
DB = Path(os.environ.get('PROCLAIR_DATA_DIR', str(ROOT / '.local'))) / 'crm.sqlite3'

def connect():
    DB.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row
    return db

def initialize():
    with connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT "", company TEXT NOT NULL DEFAULT "", status TEXT NOT NULL DEFAULT "Prospect", notes TEXT NOT NULL DEFAULT "")')
        db.execute('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, title TEXT NOT NULL, due TEXT NOT NULL DEFAULT "", done INTEGER NOT NULL DEFAULT 0)')

class Handler(BaseHTTPRequestHandler):
    def reply(self, value, status=200):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/api/state':
            with connect() as db:
                self.reply({table: [dict(row) for row in db.execute(f'SELECT * FROM {table} ORDER BY id DESC')] for table in ('clients', 'tasks')})
            return
        files = {'/': ('index.html', 'text/html; charset=utf-8'), '/app.js': ('app.js', 'text/javascript; charset=utf-8'), '/style.css': ('style.css', 'text/css; charset=utf-8')}
        if self.path not in files:
            self.reply({'error': 'Page introuvable'}, 404)
            return
        filename, mime = files[self.path]
        body = (ROOT / 'legacy' / 'static' / filename).read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 65536:
                raise ValueError('Requête vide ou trop volumineuse')
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError('Objet JSON attendu')
            with connect() as db:
                if self.path == '/api/clients':
                    name = str(payload.get('name', '')).strip()
                    status = payload.get('status', 'Prospect')
                    if not name or status not in ('Prospect', 'En discussion', 'Client'):
                        raise ValueError('Nom et statut valides requis')
                    cursor = db.execute('INSERT INTO clients(name,email,company,status,notes) VALUES(?,?,?,?,?)', (name, str(payload.get('email', '')).strip(), str(payload.get('company', '')).strip(), status, str(payload.get('notes', '')).strip()))
                    self.reply({'id': cursor.lastrowid}, 201)
                elif self.path == '/api/tasks':
                    title = str(payload.get('title', '')).strip()
                    due = str(payload.get('due', ''))
                    if not title:
                        raise ValueError('Titre requis')
                    if due:
                        date.fromisoformat(due)
                    cursor = db.execute('INSERT INTO tasks(title,due) VALUES(?,?)', (title, due))
                    self.reply({'id': cursor.lastrowid}, 201)
                elif self.path == '/api/tasks/toggle':
                    cursor = db.execute('UPDATE tasks SET done = 1 - done WHERE id = ?', (int(payload['id']),))
                    if not cursor.rowcount:
                        self.reply({'error': 'Tâche introuvable'}, 404)
                    else:
                        self.reply({'ok': True})
                elif self.path == '/api/agent/organize':
                    prospects = db.execute('SELECT name FROM clients WHERE status != ?', ('Client',)).fetchall()
                    created = 0
                    for prospect in prospects:
                        title = 'Faire le suivi de ' + prospect['name']
                        existing = db.execute('SELECT id FROM tasks WHERE title = ? AND done = 0', (title,)).fetchone()
                        if not existing:
                            db.execute('INSERT INTO tasks(title,due) VALUES(?,?)', (title, date.today().isoformat()))
                            created += 1
                    self.reply({'created': created, 'summary': f'{created} tâche(s) de suivi créée(s). Les tâches ouvertes existantes sont conservées.'})
                elif self.path == '/api/agent':
                    clients = db.execute('SELECT * FROM clients ORDER BY id DESC').fetchall()
                    tasks = db.execute('SELECT * FROM tasks WHERE done = 0 ORDER BY due').fetchall()
                    overdue = [t['title'] for t in tasks if t['due'] and t['due'] < date.today().isoformat()]
                    prospects = [c['name'] for c in clients if c['status'] != 'Client']
                    suggestions = []
                    if overdue:
                        suggestions.append('Traiter les tâches en retard : ' + ', '.join(overdue))
                    if prospects:
                        suggestions.append('Préparer un suivi pour : ' + ', '.join(prospects))
                    if not suggestions:
                        suggestions.append('Ajouter un prospect et une prochaine action pour organiser votre suivi.')
                    target = next((c for c in clients if c['status'] != 'Client'), None)
                    draft = f"Bonjour {target['name']}, je reviens vers vous concernant notre échange avec Proclair. Seriez-vous disponible pour faire le point sur vos besoins ?" if target else ''
                    self.reply({'summary': f'{len(clients)} contacts, {len(prospects)} prospects à suivre et {len(tasks)} tâches ouvertes.', 'suggestions': suggestions, 'draft': draft, 'mode': 'Assistant local à règles — aucun modèle IA connecté. Les relances ne sont pas envoyées.'})
                else:
                    self.reply({'error': 'Route introuvable'}, 404)
        except (ValueError, KeyError, TypeError) as exc:
            self.reply({'error': str(exc)}, 400)

if __name__ == '__main__':
    initialize()
    host = os.environ.get('PROCLAIR_HOST', '127.0.0.1')
    port = int(os.environ.get('PROCLAIR_PORT', '8000'))
    print(f'CRM Proclair démarré sur {host}:{port}', flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
