# PromptLoop V3.4.2 — Evidence Guard

This patch adds a conservative, independent dealer evidence gate to the **offline benchmark only**. It does not change Studio, the API, or the production extraction pipeline.

- In semicolon/newline-delimited source fields, `Bayi: D000123; Bayi: D000124` is a `CONFLICT`.
- A non-null dealer supplied by a model in a conflicting source is rejected with `AMBIGUOUS_SOURCE_VALUE`.
- An unambiguous labelled dealer must match the source or it is rejected with `DEALER_NOT_SUPPORTED_BY_SOURCE`.
- Null dealer remains an abstention; benchmark gold labels still decide whether it is correct.
- Unknown/free-form inputs are **not** asserted to be clear or contradictory; a broader verified parser is needed before production use.
- Report gains `dealer_evidence_status` per attempt; accuracy is never silently inflated or corrected.

Install from the root project directory after taking a backup:

```bash
cp app/benchmark.py app/benchmark_v341_backup.py
unzip -o ~/Downloads/PromptLoop_V3_4_2_EVIDENCE_PATCH.zip -d .
python -m unittest discover -s tests -p 'test_*.py' -v
```

Expected test count: **52 tests**. Benchmark can be re-run using the same V3.4.1 CLI. Existing eight cases are now a *development set* after diagnosis; use a new untouched benchmark to claim general improvement.
