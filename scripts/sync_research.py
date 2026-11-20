"""Build data/projects.json from each project's results/summary.json.

Usage: python3 scripts/sync_research.py [path-to-folder-holding-the-project-repos]

Numbers are never typed into the site: they come from the summary files,
and charts are copied from the project repos into assets/img/<slug>/.
"""
import json
import re
import shutil
import struct
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "research"
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else SITE.parent.parent
GH = "https://github.com/itsashutoshpsingh"
# Labels start with a capital, except names that are lower case by definition
KEEP = re.compile(r"^(ext\d|exFAT|eth_|pySigma|publicnode|drpc|1rpc|npm|iOS|macOS)")


def cap(s):
    s = re.sub(r"^sigmahq\b", "SigmaHQ", str(s))
    return s if not s or KEEP.match(s) or not s[0].isalpha() else s[0].upper() + s[1:]


def typo(s):
    return re.sub(r"(?<=\w)'(?=\w)", "’", str(s))


MAX_W = 1600  # charts show at about 600-900px and zoom to full width; 2x of that is plenty


def shrink(src, dest):
    """Copy a chart, scaled down to MAX_W wide if the project exported it larger."""
    from PIL import Image  # Pillow: installed by the cards workflow
    with Image.open(src) as im:
        if im.width <= MAX_W:
            shutil.copyfile(src, dest)
            return
        small = im.convert("RGBA").resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        # flat chart colours fit a 256-colour palette; keep the original if that is not smaller
        small.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(dest, "PNG", optimize=True)
    if dest.stat().st_size >= src.stat().st_size:
        shutil.copyfile(src, dest)


def chart_list(summary, repo_dir, slug, chart_meta):
    """chart_meta is the project's optional map in site-meta.json, file name -> {label, alt},
    used only where the summary gives a bare path."""
    out, seen = [], set()
    for c in summary.get("charts", []):
        c = {"path": c} if isinstance(c, str) else dict(c)
        src = repo_dir / c["path"]
        if not src.is_file():
            raise SystemExit(f"{slug}: chart missing: {src}")
        dest = SITE / "assets/img" / slug / src.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shrink(src, dest)
        seen.add(src.name)
        given = chart_meta.get(src.name, {})
        label = cap(c.get("label") or given.get("label") or src.stem.replace("_", " ").replace("-", " "))
        alt = typo(c.get("alt") or c.get("caption") or given.get("alt") or label)
        if src.suffix != ".png":
            raise SystemExit(f"{slug}: chart is not a PNG, cannot read its size: {src}")
        w, h = struct.unpack(">II", dest.read_bytes()[16:24])  # IHDR, so the page can reserve the space
        out.append({"src": f"assets/img/{slug}/{src.name}", "label": label, "alt": alt, "w": w, "h": h})
    stale = set(chart_meta) - seen
    if stale:
        raise SystemExit(f"{slug}: chart_meta names charts the summary does not list: {sorted(stale)}")
    return out


def main():
    meta = json.loads((SITE / "data/site-meta.json").read_text())
    projects = []
    for m in meta["projects"]:
        repo_dir = SRC / m["slug"]
        summary = json.loads((repo_dir / "results/summary.json").read_text())
        metrics = [{"label": cap(x["label"]), "value": str(x["value"])} for x in summary["metrics"]]
        if m.get("metric_labels"):
            by = {x["label"].lower(): x for x in metrics}
            metrics = [by[l.lower()] for l in m["metric_labels"]]  # KeyError = stale label, fail loudly
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
            "proof": {"value": metrics[proof_idx]["value"], "label": cap(m.get("proof_label") or metrics[proof_idx]["label"])},
            "charts": chart_list(summary, repo_dir, m["slug"], m.get("chart_meta", {})),
            "repo": f"{GH}/{m['slug']}",
            "report": f"{GH}/{m['slug']}#readme",
            "misses": m["misses"],
            "viz": [dict(v, title=typo(cap(v["title"])), bars=[dict(b, label=cap(b["label"])) for b in v["bars"]]) for v in summary.get("viz", [])],
        })
    terminal = [{"cmd": m["cmd"], "out": m.get("terminal_out") or [p["headline"]]} for m, p in zip(meta["projects"], projects)]
    data = {"profile": meta.get("profile"), "projects": projects, "terminal": terminal}
    (SITE / "data/projects.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote data/projects.json with {len(projects)} projects")


if __name__ == "__main__":
    assert cap("ext4") == "ext4" and cap("seeded findings") == "Seeded findings" and cap("15%") == "15%"
    assert typo("each scanner's verdict") == "each scanner’s verdict" and typo("'quoted'") == "'quoted'"
    main()
