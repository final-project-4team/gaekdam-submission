import os
import json
from typing import List, Dict
import numpy as np

# Use local sentence-transformers for embeddings to match the index built by scripts/rebuild_index.py
_st_model = None
_idx = None
_metadata_entries = None
_metadata_map = None

try:
    import faiss
except Exception:
    faiss = None


def _load_index(index_path: str = None, meta_path: str = None):
    global _idx, _metadata_entries, _metadata_map
    if _idx is not None and _metadata_entries is not None and _metadata_map is not None:
        return

    base_snap = os.path.join(os.path.dirname(__file__), "..", "..", "data", "snapshots")
    index_path = index_path or os.path.join(base_snap, "faiss.index")
    meta_path = meta_path or os.path.join(base_snap, "metadata.json")

    if faiss is None:
        raise RuntimeError("faiss is not installed. Install faiss-cpu or appropriate faiss package.")

    if not os.path.exists(index_path) or not os.path.exists(meta_path):
        raise FileNotFoundError(f"FAISS index or metadata not found. Expected {index_path} and {meta_path}")

    _idx = faiss.read_index(index_path)
    with open(meta_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # Normalize metadata into a list of entries and a mapping id->entry
    entries = None
    if isinstance(raw, dict) and "entries" in raw and isinstance(raw.get("entries"), list):
        entries = raw.get("entries")
    elif isinstance(raw, list):
        entries = raw
    else:
        raise RuntimeError("Unsupported metadata.json format; expected list or dict with 'entries'.")

    _metadata_entries = entries
    _metadata_map = {}
    for ent in entries:
        if not isinstance(ent, dict):
            continue
        try:
            eid = int(ent.get("id"))
        except Exception:
            continue
        _metadata_map[eid] = ent


def _ensure_local_model():
    global _st_model
    if _st_model is None:
        from sentence_transformers import SentenceTransformer
        _st_model = SentenceTransformer("all-MiniLM-L6-v2")


def _normalize(vec: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm


def retrieve_similar_docs(query: str, top_k: int = 3) -> List[Dict]:
    """Return top_k documents similar to query using FAISS + local sentence-transformers embeddings.

    Each returned dict: {id, source, score, text}
    """
    _load_index()
    _ensure_local_model()

    q_emb = _st_model.encode(query, normalize_embeddings=True)
    qv = np.array(q_emb, dtype="float32")

    # ensure dimension matches index
    if _idx.d != qv.shape[0]:
        raise RuntimeError(f"Query embedding dim {qv.shape[0]} does not match index dim {_idx.d}")

    D, I = _idx.search(np.expand_dims(qv, axis=0), top_k)

    temp_results = []
    for score, raw_idx in zip(D[0], I[0]):
        try:
            idx_val = int(raw_idx)
        except Exception:
            continue
        if idx_val < 0:
            continue
        m = _metadata_map.get(idx_val)
        if m is None:
            # not found in map; skip
            continue
        temp_results.append({
            "id": m.get("id"),
            "source": m.get("source"),
            "score": float(score),
            "text": m.get("text"),
        })

    # group by source and remove duplicate snippets per source
    grouped = {}
    ordered_sources = []
    for r in temp_results:
        src = r.get("source") or "unknown"
        if src not in grouped:
            grouped[src] = {"source": src, "snippets": [], "best_score": r.get("score")}
            ordered_sources.append(src)
        # avoid duplicate exact snippets
        if r.get("text") not in grouped[src]["snippets"]:
            grouped[src]["snippets"].append(r.get("text"))
        # keep best (lowest) score if using distance; keep min
        try:
            if r.get("score") < grouped[src].get("best_score", r.get("score")):
                grouped[src]["best_score"] = r.get("score")
        except Exception:
            pass

    results = []
    for s in ordered_sources:
        g = grouped.get(s)
        results.append({"source": g.get("source"), "snippets": g.get("snippets"), "score": g.get("best_score")})
    return results


def reload_index(index_path: str = None, meta_path: str = None):
    """Force reload FAISS index and metadata from disk. Useful to pick up changes made by ingestion
    without restarting the server.

    If index_path / meta_path are not provided, default snapshot paths are used.
    """
    global _idx, _metadata_entries, _metadata_map
    # clear cached objects so _load_index will re-read files
    _idx = None
    _metadata_entries = None
    _metadata_map = None
    # call loader which will populate the globals
    _load_index(index_path=index_path, meta_path=meta_path)
