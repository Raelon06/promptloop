"""Minimal local telemetry registry. No raw prompts or candidate outputs are persisted."""
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.environ.get("PROMPTLOOP_DB", str(Path.home() / ".promptloop_v31.sqlite3")))

def connect():
    db = sqlite3.connect(DB_PATH)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("""CREATE TABLE IF NOT EXISTS runs (
        run_id TEXT PRIMARY KEY, started_utc TEXT NOT NULL, prompt_hash TEXT NOT NULL,
        provider TEXT NOT NULL, model_id TEXT NOT NULL, prompt_score REAL NOT NULL,
        status TEXT NOT NULL, total_attempts INTEGER NOT NULL
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS attempts (
        run_id TEXT NOT NULL, attempt INTEGER NOT NULL, status TEXT NOT NULL,
        failure_code TEXT, latency_ms INTEGER NOT NULL,
        input_tokens INTEGER, output_tokens INTEGER,
        PRIMARY KEY (run_id, attempt), FOREIGN KEY(run_id) REFERENCES runs(run_id)
    )""")
    return db

def save_run(meta: dict, attempts: list[dict]):
    db = connect()
    try:
        with db:
            db.execute("INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (
            meta["run_id"], meta["started_utc"], meta["prompt_hash"], meta["provider"],
            meta["model_id"], meta["prompt_score"], meta["status"], len(attempts)
        ))
            for item in attempts:
                db.execute("INSERT INTO attempts VALUES (?, ?, ?, ?, ?, ?, ?)", (
                    meta["run_id"], item["attempt"], item["status"], item.get("failure_code"),
                    item["latency_ms"], item.get("input_tokens"), item.get("output_tokens")
                ))
    finally:
        db.close()
