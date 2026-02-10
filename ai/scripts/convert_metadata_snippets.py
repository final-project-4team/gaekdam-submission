#!/usr/bin/env python3
"""
Convert existing data/snapshots/metadata.json entries' text fields to max 300 characters.
Creates a backup metadata.json.bak and writes atomically.
Handles two formats:
 - dict with key 'entries' (current expected)
 - plain list (legacy) -> converts to {'entries': [...], 'next_id': max_id+1}
"""
import json
from pathlib import Path
import tempfile
import os
import shutil

META = Path("data/snapshots/metadata.json")
BACKUP = META.with_suffix(".json.bak")
MAXLEN = 300

if not META.exists():
    print(f"metadata file not found: {META}")
    raise SystemExit(1)

# backup
shutil.copy2(META, BACKUP)
print(f"backup created: {BACKUP}")

with META.open("r", encoding="utf-8") as f:
    data = json.load(f)

# normalize legacy list -> dict
if isinstance(data, list):
    entries = data
    # ensure entries have id field; if not, assign sequential ids starting at 1
    maxid = 0
    for i, e in enumerate(entries, start=1):
        if not isinstance(e, dict):
            continue
        if not e.get("id"):
            e["id"] = i
        try:
            maxid = max(maxid, int(e.get("id", 0)))
        except Exception:
            pass
    meta = {"entries": entries, "next_id": int(maxid) + 1}
    data = meta

if isinstance(data, dict) and "entries" in data:
    entries = data.get("entries", [])
    for e in entries:
        t = e.get("text")
        if isinstance(t, str) and len(t) > MAXLEN:
            e["text"] = t[:MAXLEN]
    # write atomically
    tmp = None
    try:
        tmpdir = tempfile.mkdtemp(dir=str(META.parent) or ".")
        tmp = Path(tmpdir) / "metadata.tmp.json"
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(str(tmp), str(META))
        print(f"metadata converted/updated and saved: {META}")
    finally:
        try:
            if tmpdir and os.path.isdir(tmpdir):
                shutil.rmtree(tmpdir)
        except Exception:
            pass
else:
    print("metadata.json does not have expected format (list or dict with 'entries'). No changes made.")
