"""Export read-only of the legacy SQLite database; never truncate original data."""
import json
import os
import sqlite3
from pathlib import Path
path = Path(os.environ.get('PROCLAIR_DATA_DIR', '.local')) / 'crm.sqlite3'
if not path.exists():
    print(json.dumps({'clients': [], 'tasks': []}))
else:
    db = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    print(json.dumps({table: [dict(row) for row in db.execute(f'SELECT * FROM {table}')] for table in ('clients', 'tasks')}))
    db.close()
