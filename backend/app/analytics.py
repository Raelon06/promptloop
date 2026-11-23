"""PromptLoop Admin ve İstek Analitik Depolama Modülü.

Gelen optimize/analyze isteklerini ve ziyaretçi etkinliklerini SQLite veritabanına kaydeder.
Admin paneli için özet istatistikler ve son istek dökümünü sağlar.
"""
from __future__ import annotations

import os
import sqlite3
import time
from typing import Any

DB_PATH = os.path.expanduser(os.environ.get("PROMPTLOOP_DB", "~/.promptloop_analytics.sqlite3"))


def _init_db():
    try:
        os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS prompt_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT,
                    ip_hash TEXT,
                    endpoint TEXT,
                    task_type TEXT,
                    model_id TEXT,
                    prompt_preview TEXT,
                    prompt_length INTEGER,
                    status TEXT,
                    created_at REAL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON prompt_logs (created_at DESC)")
            conn.commit()
    except Exception as exc:
        print(f"[Analytics] DB init warning: {exc}")


_init_db()


def record_request(
    run_id: str,
    ip: str,
    endpoint: str,
    task_type: str,
    model_id: str,
    prompt: str,
    status: str = "SUCCESS",
):
    """Gelen optimizasyon isteğini anonimleştirilmiş IP ile kaydeder."""
    conn = None
    try:
        parts = ip.split(".")
        masked_ip = f"{parts[0]}.{parts[1]}.{parts[2]}.xxx" if len(parts) == 4 else (ip[:8] + "..." if len(ip) > 8 else ip)
        preview = (prompt[:140] + "...") if len(prompt) > 140 else prompt

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO prompt_logs 
            (run_id, ip_hash, endpoint, task_type, model_id, prompt_preview, prompt_length, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            run_id,
            masked_ip,
            endpoint,
            task_type,
            model_id,
            preview,
            len(prompt),
            status,
            time.time()
        ))
        conn.commit()
    except Exception as exc:
        print(f"[Analytics] Record error: {exc}")
    finally:
        if conn:
            conn.close()


def get_admin_metrics(limit: int = 50) -> dict[str, Any]:
    """Admin paneli için özet metrikler ve son etkinlikleri döndürür."""
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Toplam istek sayısı
        cursor.execute("SELECT COUNT(*) FROM prompt_logs")
        total_requests = cursor.fetchone()[0]

        # Tekil kullanıcı (maskeli IP) sayısı
        cursor.execute("SELECT COUNT(DISTINCT ip_hash) FROM prompt_logs")
        unique_visitors = cursor.fetchone()[0]

        # Son 24 saatteki istek sayısı
        one_day_ago = time.time() - 86400
        cursor.execute("SELECT COUNT(*) FROM prompt_logs WHERE created_at >= ?", (one_day_ago,))
        requests_today = cursor.fetchone()[0]

        # Görev türü dağılımı
        cursor.execute("""
            SELECT task_type, COUNT(*) as count 
            FROM prompt_logs 
            GROUP BY task_type 
            ORDER BY count DESC 
            LIMIT 5
        """)
        task_distribution = [{"task_type": row[0], "count": row[1]} for row in cursor.fetchall()]

        # Son istek listesi
        cursor.execute("""
            SELECT id, run_id, ip_hash, task_type, model_id, prompt_preview, prompt_length, status, created_at
            FROM prompt_logs
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))
        
        recent_logs = []
        for row in cursor.fetchall():
            recent_logs.append({
                "id": row[0],
                "run_id": row[1],
                "ip": row[2],
                "task_type": row[3],
                "model_id": row[4],
                "prompt_preview": row[5],
                "prompt_length": row[6],
                "status": row[7],
                "created_at": row[8],
            })

        return {
            "total_requests": total_requests,
            "unique_visitors": unique_visitors,
            "requests_today": requests_today,
            "task_distribution": task_distribution,
            "recent_logs": recent_logs,
        }
    except Exception as exc:
        print(f"[Analytics] Metrics error: {exc}")
        return {
            "total_requests": 0,
            "unique_visitors": 0,
            "requests_today": 0,
            "task_distribution": [],
            "recent_logs": [],
        }
    finally:
        if conn:
            conn.close()
