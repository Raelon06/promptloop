"""Aggregate local telemetry without reading raw user content."""
import json
from .registry import connect

def main():
    db = connect()
    try:
        rows = db.execute("""
           SELECT r.provider, r.model_id, COUNT(*) AS n,
                  SUM(CASE WHEN r.status='PASS' THEN 1 ELSE 0 END) AS passes,
                  SUM(CASE WHEN r.status='UNVERIFIED' THEN 1 ELSE 0 END) AS unverifiable,
                  AVG(r.total_attempts) AS mean_attempts,
                  SUM(CASE WHEN a.attempt=1 AND a.status='PASS' THEN 1 ELSE 0 END) AS first_passes
           FROM runs r LEFT JOIN attempts a ON a.run_id = r.run_id AND a.attempt=1
           GROUP BY r.provider, r.model_id
           ORDER BY r.provider, r.model_id
        """).fetchall()
    finally:
        db.close()
    output = [{"provider": p, "model_id": m, "runs": n, "verified_passes": k,
               "unverified_runs": u, "first_attempt_pass_rate": round(first/n, 3),
               "mean_attempts": round(mean, 2)}
              for p, m, n, k, u, mean, first in rows]
    print(json.dumps(output, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
