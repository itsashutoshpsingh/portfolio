#!/usr/bin/env python3
"""Render the GitHub profile README cards into github/cards/ as self-contained SVGs.

Everything an <img> sandbox allows and nothing it strips: an inline <style> with CSS keyframes,
one SMIL gradient sweep, and Geist subset to ASCII and embedded as base64 WOFF2. Motion is kept
cheap on purpose: one animation per element at most, a single clip sweep over the contribution
graph instead of one animation per square, and no frame-by-frame text counters.

STATIC=1 renders every card at its final frame, for screenshots.
"""
import base64
import collections
import datetime as dt
import html
import json
import os

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "github", "cards")
DATA = os.path.join(ROOT, "data", "github.json")
STATIC = os.environ.get("STATIC") == "1"
SITE = "https://itsashutoshpsingh.github.io/portfolio/"


def font(name):
    b = open(os.path.join(ROOT, "github", "fonts", name), "rb").read()
    return base64.b64encode(b).decode()


FONTS = (
    "@font-face{font-family:'G';font-weight:400;src:url(data:font/woff2;base64,%s) format('woff2')}"
    "@font-face{font-family:'G';font-weight:600;src:url(data:font/woff2;base64,%s) format('woff2')}"
    "@font-face{font-family:'GM';font-weight:500;src:url(data:font/woff2;base64,%s) format('woff2')}"
) % (font("geist-400.sub.woff2"), font("geist-600.sub.woff2"), font("geistmono-500.sub.woff2"))

# Brand: GitHub dark and light surfaces, the site's signal blue, ice, green.
BASE = """
:root{--bg:#0d1117;--card:#161b22;--card2:#1c2230;--line:rgba(255,255,255,.12);--dot:rgba(255,255,255,.07);--fg:#e6edf3;--mute:#8b949e;--sig:#5ba8ff;--ice:#a9d6ff;--ok:#4fd8a0;--amber:#f0b35b}
@media(prefers-color-scheme:light){:root{--bg:#ffffff;--card:#f6f8fa;--card2:#eef2f6;--line:rgba(0,0,0,.1);--dot:rgba(0,0,0,.08);--fg:#1f2328;--mute:#656d76;--sig:#1f63e0;--ice:#1f63e0;--ok:#1a7f4b;--amber:#9a6700}}
text{font-family:'G',ui-sans-serif,system-ui,sans-serif;fill:var(--fg)}
.m{font-family:'GM',ui-monospace,Menlo,monospace}
.mute{fill:var(--mute)}.sig{fill:var(--sig)}.ice{fill:var(--ice)}.ok{fill:var(--ok)}
.card{fill:var(--card);stroke:var(--line)}
:root{--e:cubic-bezier(.22,1,.36,1)}
"""
ANIM = """
.rise{opacity:0;animation:rise .8s var(--e) both}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.tile{opacity:0;transform-box:fill-box;transform-origin:50% 100%;animation:tile .9s var(--e) both}
@keyframes tile{0%{opacity:0;transform:translateY(28px) rotate(2deg)}70%{opacity:1;transform:translateY(-3px) rotate(0)}100%{opacity:1;transform:none}}
.bar{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(0);animation:bar .9s var(--e) both}
@keyframes bar{to{transform:scaleY(1)}}
.draw{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);animation:draw 2.2s var(--e) both}
@keyframes draw{to{stroke-dashoffset:0}}
.sweep{transform-box:fill-box;transform-origin:0 0;transform:scaleX(0);animation:sweep 1.8s var(--e) both}
@keyframes sweep{to{transform:scaleX(1)}}
.nudge{animation:nudge 2.8s ease-in-out infinite 2.4s}
@keyframes nudge{0%,100%{transform:none}50%{transform:translate(3px,-3px)}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;opacity:1!important;transform:none!important;stroke-dashoffset:0!important}}
"""
STATIC_CSS = ".rise,.tile{opacity:1}.bar{transform:none}.draw{stroke-dashoffset:0}.sweep{transform:none}"


def svg(w, h, title, body, defs=""):
    css = BASE + (STATIC_CSS if STATIC else ANIM)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{html.escape(title)}">'
            f'<title>{html.escape(title)}</title><style>{FONTS}{css}</style><defs>'
            f'<pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="var(--dot)"/></pattern>{defs}</defs>{body}</svg>')


def frame(w, h, r=20, texture=True):
    s = f'<rect class="card" x=".5" y=".5" width="{w-1}" height="{h-1}" rx="{r}"/>'
    if texture:
        s += f'<rect x="1" y="1" width="{w-2}" height="{h-2}" rx="{r-1}" fill="url(#dots)"/>'
    return s


def d(i, step=0.1, base=0.1):
    return "" if STATIC else f' style="animation-delay:{base + i*step:.2f}s"'


def hero():
    w, h = 880, 280
    # one signal line, drawn once; a slow blue sheen crosses the surname (SMIL, one element)
    import math
    pts = " ".join(f"{600+i*4.4:.1f},{74+math.sin(i/62*6.3)*24*(1-i/95)+math.sin(i/62*2.2+1)*10:.1f}" for i in range(63))
    defs = ('<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--fg)"/><stop offset=".45" stop-color="var(--fg)"/>'
            '<stop offset=".5" stop-color="var(--ice)"/><stop offset=".55" stop-color="var(--fg)"/><stop offset="1" stop-color="var(--fg)"/>'
            + ('' if STATIC else '<animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="6s" begin="2s" repeatCount="indefinite"/>')
            + '</linearGradient>')
    body = frame(w, h) + f'''
<polyline class="draw ease" style="--len:320" points="{pts}" fill="none" stroke="var(--sig)" stroke-width="2" stroke-linecap="round" opacity=".9"/>
<text class="m mute rise ease"{d(0)} x="40" y="52" font-size="13">Coventry, United Kingdom</text>
<text class="rise ease"{d(1)} x="40" y="112" font-size="46" font-weight="600" letter-spacing="-1.6">Ashutosh <tspan fill="url(#sheen)">Pal Singh</tspan></text>
<text class="rise ease"{d(2)} x="40" y="148" font-size="18" font-weight="600">Security analyst. Vulnerability management and threat detection.</text>
<text class="mute rise ease"{d(3)} x="40" y="176" font-size="14">I find the weak spots in devices and networks, then write the detections that catch someone using them.</text>
<text class="mute rise ease"{d(4)} x="40" y="200" font-size="14">MSc Cyber Security Engineering, University of Warwick (NCSC-certified).</text>
<g class="rise ease"{d(5)}><circle class="ok" cx="47" cy="240" r="4"/><text class="m mute" x="60" y="244" font-size="12">Open to UK SOC and vulnerability roles. No sponsorship needed.</text></g>'''
    return svg(w, h, "Ashutosh Pal Singh, security analyst", body, defs)


def tile(name, label, big, sub, colour, i):
    w, h = 288, 210
    body = (f'<g class="tile ease"{d(i, 0.14, 0.2)}>' + frame(w, h, 18)
            + f'<rect x="1" y="1" width="{w-2}" height="6" rx="3" fill="var(--{colour})"/>'
            f'<text class="m mute" x="24" y="46" font-size="12">{html.escape(label)}</text>'
            f'<text x="24" y="104" font-size="40" font-weight="600" letter-spacing="-1.4" fill="var(--{colour})">{html.escape(big)}</text>'
            + "".join(f'<text class="mute" x="24" y="{134+k*20}" font-size="13">{html.escape(line)}</text>' for k, line in enumerate(sub))
            + f'<g class="nudge" style="transform-box:fill-box"><path d="M{w-46} {h-34}h18m-7-7l7 7-7 7" fill="none" stroke="var(--fg)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g></g>')
    return svg(w, h, f"{label}: {big}", body)


def month_stats(days):
    today = dt.date.today()
    counts = {x["date"]: x["count"] for x in days}
    months = []
    for k in range(11, -1, -1):
        y, m = today.year, today.month - k
        while m <= 0:
            y, m = y - 1, m + 12
        total = sum(c for date, c in counts.items() if date.startswith(f"{y:04d}-{m:02d}"))
        months.append((dt.date(y, m, 1).strftime("%b"), total))
    total = sum(x["count"] for x in days)
    active = sum(1 for x in days if x["count"])
    streak, cur, best_streak = 0, 0, 0
    for x in sorted(days, key=lambda x: x["date"]):
        cur = cur + 1 if x["count"] else 0
        best_streak = max(best_streak, cur)
    for x in sorted(days, key=lambda x: x["date"], reverse=True):
        if x["count"]:
            streak += 1
        elif x["date"] != today.isoformat():
            break
    busiest = max(days, key=lambda x: x["count"]) if days else None
    return months, total, active, streak, best_streak, busiest


def activity(days):
    w, h = 880, 260
    months, total, active, streak, best_streak, busiest = month_stats(days)
    body = frame(w, h) + '<text class="m mute" x="40" y="44" font-size="13">Contributions, last twelve months</text>'
    if not days:
        body += '<text class="mute" x="40" y="140" font-size="15">Waiting for the first daily refresh.</text>'
        return svg(w, h, "Contribution activity", body)
    top = max(1, max(t for _, t in months))
    best_i = max(range(12), key=lambda i: months[i][1])
    x0, bw, gap, base, maxh = 40, 44, 14, 190, 110
    for i, (lab, t) in enumerate(months):
        x = x0 + i * (bw + gap)
        hh = max(3, round(maxh * t / top))
        col = "var(--sig)" if i == best_i else "var(--line)"
        body += f'<rect class="bar ease"{d(i, 0.06, 0.2)} x="{x}" y="{base-hh}" width="{bw}" height="{hh}" rx="4" fill="{col}"/>'
        body += f'<text class="m mute" x="{x+bw/2:.0f}" y="{base+20}" font-size="12" text-anchor="middle">{lab}</text>'
        if i == best_i and t:
            body += f'<text class="m sig rise ease"{d(8, 0.06, 0.6)} x="{x+bw/2:.0f}" y="{base-hh-8}" font-size="12" text-anchor="middle">{t}</text>'
    stats = [("Total", str(total)), ("Active days", str(active)), ("Current streak", f"{streak} d"), ("Best streak", f"{best_streak} d")]
    if busiest and busiest["count"]:
        stats.append(("Busiest day", f'{busiest["count"]} on {dt.date.fromisoformat(busiest["date"]).strftime("%-d %b")}'))
    sx = 760
    for k, (lab, val) in enumerate(stats[:5]):
        y = 60 + k * 36
        body += f'<g class="rise ease"{d(k, 0.08, 0.5)}><text class="m mute" x="{sx}" y="{y}" font-size="11">{html.escape(lab)}</text><text x="{sx}" y="{y+17}" font-size="15" font-weight="600">{html.escape(val)}</text></g>'
    body = body.replace('width="44"', 'width="44"')  # keep bars inside the stats column
    return svg(w, h, f"Contributions: {total} in the last year", body)


def graph(days):
    w, h = 880, 150
    body = frame(w, h) + '<text class="m mute" x="40" y="40" font-size="13">Contribution graph</text>'
    if not days:
        body += '<text class="mute" x="40" y="96" font-size="15">Waiting for the first daily refresh.</text>'
        return svg(w, h, "Contribution graph", body)
    days = sorted(days, key=lambda x: x["date"])[-371:]
    first = dt.date.fromisoformat(days[0]["date"])
    offset = (first.weekday() + 1) % 7  # Sunday first, like GitHub
    top = max(1, max(x["count"] for x in days))
    cell, gap, x0, y0 = 11, 3, 40, 56
    cols = (offset + len(days) + 6) // 7
    scale = min(1, (w - 80) / (cols * (cell + gap)))
    rects = ""
    for i, x in enumerate(days):
        c, r = divmod(offset + i, 7)
        if x["count"] == 0:
            a = ".08"
        else:
            a = {1: ".35", 2: ".6", 3: ".8"}.get(min(3, 1 + int(2.99 * x["count"] / top)), "1")
        rects += f'<rect x="{c*(cell+gap)}" y="{r*(cell+gap)}" width="{cell}" height="{cell}" rx="2" fill="var(--sig)" opacity="{a}"/>'
    defs = f'<clipPath id="wipe"><rect class="sweep ease" x="0" y="0" width="{cols*(cell+gap)}" height="{7*(cell+gap)}"/></clipPath>'
    body += f'<g transform="translate({x0} {y0}) scale({scale:.3f})"><g clip-path="url(#wipe)">{rects}</g></g>'
    return svg(w, h, "GitHub contribution graph in blue", body, defs)


def repo_card(r, i):
    w, h = 430, 120
    desc = (r["description"] or "No description yet").strip()
    if len(desc) > 60:
        desc = desc[:57].rstrip() + "..."
    body = (f'<g class="rise ease"{d(i, 0.12, 0.2)}>' + frame(w, h, 16)
            + f'<text x="24" y="42" font-size="17" font-weight="600">{html.escape(r["name"])}</text>'
            f'<text class="mute" x="24" y="66" font-size="13">{html.escape(desc)}</text>'
            f'<text class="m mute" x="24" y="98" font-size="12">{html.escape(r["language"] or "")}</text>'
            f'<text class="m mute" x="{w-24}" y="98" font-size="12" text-anchor="end">{r["stars"]} stars, updated {html.escape(r["pushed"])}</text></g>')
    return svg(w, h, f'Repository {r["name"]}', body)


def main():
    data = json.load(open(DATA)) if os.path.exists(DATA) else {"days": [], "repos": []}
    os.makedirs(OUT, exist_ok=True)
    cards = {
        "hero.svg": hero(),
        "story.svg": tile("story", "The story", "7 chapters", ["Pune 2020 to Coventry 2026.", "Devices, policy, a paper, a lab."], "sig", 0),
        "work.svg": tile("work", "Production work", "1,000+", ["IoT devices secured at Kyoka.", "Nessus, Qualys, CVSS, firmware."], "ok", 1),
        "contact.svg": tile("contact", "Hiring?", "No visa", ["sponsorship needed. UK Graduate", "visa. London, Manchester, remote."], "amber", 2),
        "activity.svg": activity(data.get("days", [])),
        "graph.svg": graph(data.get("days", [])),
    }
    repos = [r for r in data.get("repos", []) if r["name"].lower() != data.get("user", "").lower()][:4]
    for i, r in enumerate(repos):
        cards[f"repo-{i+1}.svg"] = repo_card(r, i)
    for name, content in cards.items():
        open(os.path.join(OUT, name), "w").write(content)
    print("rendered", ", ".join(cards), "(static)" if STATIC else "")


if __name__ == "__main__":
    main()
