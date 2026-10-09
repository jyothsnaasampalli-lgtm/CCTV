"""
CCTV Sense - Database Connection and Query Manager
Provides thread-safe SQLite connections, parameterized query execution,
and dictionary-style row mappings.
"""

import sqlite3
import os
from contextlib import contextmanager
from config import config

def init_db_dir():
    """Ensure the database directory exists."""
    db_dir = os.path.dirname(config.DATABASE_PATH)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

@contextmanager
def get_db():
    """Context manager for SQLite connections with foreign keys and WAL mode enabled."""
    init_db_dir()
    conn = sqlite3.connect(config.DATABASE_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def fetch_all(query: str, params: tuple = ()):
    """Execute a parameterized SELECT query and return a list of dictionaries."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def fetch_one(query: str, params: tuple = ()):
    """Execute a parameterized SELECT query and return a single dictionary or None."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        row = cursor.fetchone()
        return dict(row) if row else None

def execute_query(query: str, params: tuple = ()):
    """Execute a parameterized INSERT, UPDATE, or DELETE query and return affected rows."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return cursor.rowcount

def execute_insert(query: str, params: tuple = ()):
    """Execute a parameterized INSERT query and return the new row's ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return cursor.lastrowid
