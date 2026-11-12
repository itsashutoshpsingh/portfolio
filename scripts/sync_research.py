"""Build data/projects.json from each project's results/summary.json.

Usage: python3 scripts/sync_research.py [path-to-folder-holding-the-project-repos]

Numbers are never typed into the site: they come from the summary files,
and charts are copied from the project repos into assets/img/<slug>/.
"""
import json
import shutil
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "research"
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else SITE.parent.parent
GH = "https://github.com/itsashutoshpsingh"


def chart_list(summary, repo_dir, slug):
    out = []
    for c in summary.get("charts", []):
        c = {"path": c} if isinstance(c, str) else dict(c)
        src = repo_dir / c["path"]
        if not src.is_file():
            raise SystemExit(f"{slug}: chart missing: {src}")
        dest = SITE / "assets/img" / slug / src.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)
        label = c.get("label") or src.stem.replace("_", " ").replace("-", " ")
        out.append({"src": f"assets/img/{slug}/{src.name}", "label": label, "alt": c.get("alt") or c.get("caption") or label})
    return out


def main():
    meta = json.loads((SITE / "data/site-meta.json").read_text())
    projects = []
    for m in meta["projects"]:
        repo_dir = SRC / m["slug"]
        summary = json.loads((repo_dir / "results/summary.json").read_text())
        metrics = [{"label": x["label"], "value": str(x["value"])} for x in summary["metrics"]]
        if m.get("metric_labels"):
            by = {x["label"]: x for x in metrics}
            metrics = [by[l] for l in m["metric_labels"]]  # KeyError = stale label, fail loudly
        if not metrics:
            raise SystemExit(f"{m['slug']}: summary has no metrics")
        proof_idx = m.get("proof_metric", 0)
        projects.append({
            "slug": m["slug"],
            "title": m["slug"],
            "tags": m["tags"],
            "oneLine": m["oneLine"],
            "headline": summary["headline"],
            "metrics": metrics[: m.get("max_metrics", 4)],
            "proof": {"value": metrics[proof_idx]["value"], "label": m.get("proof_label") or metrics[proof_idx]["label"]},
            "charts": chart_list(summary, repo_dir, m["slug"]),
            "repo": f"{GH}/{m['slug']}",
            "report": f"{GH}/{m['slug']}#readme",
            "misses": m["misses"],
        })
    terminal = [{"cmd": m["cmd"], "out": m.get("terminal_out") or [p["headline"]]} for m, p in zip(meta["projects"], projects)]
    data = {"profile": meta.get("profile"), "projects": projects, "terminal": terminal}
    (SITE / "data/projects.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote data/projects.json with {len(projects)} projects")


if __name__ == "__main__":
    main()
