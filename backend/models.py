import sqlite3
import os
from datetime import datetime

class Database:
    def __init__(self, db_path):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.executescript('''
                CREATE TABLE IF NOT EXISTS savedata (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_name TEXT NOT NULL,
                    platform TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    savedata_id INTEGER,
                    version_number INTEGER,
                    file_path TEXT NOT NULL,
                    file_size INTEGER,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (savedata_id) REFERENCES savedata (id) ON DELETE CASCADE
                );
            ''')

    def get_all_saves(self):
        with self._get_conn() as conn:
            # Get saves with latest version info
            cursor = conn.execute('''
                SELECT s.*, 
                       COUNT(v.id) as version_count,
                       MAX(v.created_at) as last_backup
                FROM savedata s
                LEFT JOIN versions v ON s.id = v.savedata_id
                GROUP BY s.id
                ORDER BY s.updated_at DESC
            ''')
            return [dict(row) for row in cursor.fetchall()]

    def get_savedata_by_id(self, save_id):
        with self._get_conn() as conn:
            cursor = conn.execute('SELECT * FROM savedata WHERE id = ?', (save_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def create_savedata(self, game_name, platform):
        with self._get_conn() as conn:
            cursor = conn.execute(
                'INSERT INTO savedata (game_name, platform) VALUES (?, ?)',
                (game_name, platform)
            )
            return cursor.lastrowid

    def add_version(self, savedata_id, file_path, file_size, notes=''):
        with self._get_conn() as conn:
            # Get next version number
            cursor = conn.execute(
                'SELECT MAX(version_number) as max_ver FROM versions WHERE savedata_id = ?',
                (savedata_id,)
            )
            max_ver = cursor.fetchone()['max_ver']
            next_ver = (max_ver or 0) + 1

            cursor = conn.execute(
                '''INSERT INTO versions 
                   (savedata_id, version_number, file_path, file_size, notes)
                   VALUES (?, ?, ?, ?, ?)''',
                (savedata_id, next_ver, file_path, file_size, notes)
            )
            
            # Update parent timestamp
            conn.execute(
                'UPDATE savedata SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (savedata_id,)
            )
            return cursor.lastrowid

    def get_versions(self, savedata_id):
        with self._get_conn() as conn:
            cursor = conn.execute(
                'SELECT * FROM versions WHERE savedata_id = ? ORDER BY version_number DESC',
                (savedata_id,)
            )
            return [dict(row) for row in cursor.fetchall()]

    def get_version(self, version_id):
        with self._get_conn() as conn:
            cursor = conn.execute('SELECT * FROM versions WHERE id = ?', (version_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def rename_savedata(self, save_id, new_name):
        try:
            with self._get_conn() as conn:
                conn.execute(
                    'UPDATE savedata SET game_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    (new_name, save_id)
                )
            return True
        except Exception as e:
            print(f"DB Error: {e}")
            return False

    def update_version_path(self, version_id, new_path):
        """Update the file path for a specific version (used during rename)"""
        with self._get_conn() as conn:
            conn.execute(
                'UPDATE versions SET file_path = ? WHERE id = ?',
                (new_path, version_id)
            )

    def delete_savedata(self, save_id):
        with self._get_conn() as conn:
            conn.execute('DELETE FROM savedata WHERE id = ?', (save_id,))
        return True

    def delete_version(self, version_id):
        with self._get_conn() as conn:
            conn.execute('DELETE FROM versions WHERE id = ?', (version_id,))
        return True
