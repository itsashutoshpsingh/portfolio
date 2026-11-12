#!/usr/bin/env python3
"""Render the GitHub profile README cards into github/cards/ as self-contained SVGs.

Everything an <img> sandbox allows and nothing it strips: an inline <style> with CSS keyframes,
one SMIL gradient sweep, and Geist subset to ASCII and embedded as base64 WOFF2. Numbers come
from research/data/projects.json (built by sync_research.py), never typed here.

STATIC=1 renders every card at its final frame, for screenshots.
"""
import base64
import html
import json
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "github", "cards")
DATA = os.path.join(ROOT, "research", "data", "projects.json")
STATIC = os.environ.get("STATIC") == "1"
TOKENS = dict(re.findall(r"--c-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})", open(os.path.join(ROOT, "tokens.css")).read()))


def font(name):
    b = open(os.path.join(ROOT, "github", "fonts", name), "rb").read()
    return base64.b64encode(b).decode()


FONTS = (
    "@font-face{font-family:'G';font-weight:400;src:url(data:font/woff2;base64,%s) format('woff2')}"
    "@font-face{font-family:'G';font-weight:600;src:url(data:font/woff2;base64,%s) format('woff2')}"
    "@font-face{font-family:'GM';font-weight:500;src:url(data:font/woff2;base64,%s) format('woff2')}"
) % (font("geist-400.sub.woff2"), font("geist-600.sub.woff2"), font("geistmono-500.sub.woff2"))

# Brand: the site's tokens on GitHub's dark and light surfaces, so the cards sit flush on the profile.
BASE = """
:root{--bg:#0d1117;--card:#161b22;--card2:#1c2230;--line:rgba(255,255,255,.12);--dot:rgba(255,255,255,.07);--fg:#e6edf3;--mute:#8b949e;--sig:BLUE;--ice:CYAN;--cyan:CYAN;--ok:GREEN;--amber:AMBER;--red:RED}
@media(prefers-color-scheme:light){:root{--bg:#ffffff;--card:#f6f8fa;--card2:#eef2f6;--line:rgba(0,0,0,.1);--dot:rgba(0,0,0,.08);--fg:#1f2328;--mute:#656d76;--sig:#1f63e0;--ice:#0a7d8c;--cyan:#0a7d8c;--ok:#1a7f4b;--amber:#9a6700;--red:#cf222e}}
text{font-family:'G',ui-sans-serif,system-ui,sans-serif;fill:var(--fg)}
.m{font-family:'GM',ui-monospace,Menlo,monospace}
.mute{fill:var(--mute)}.sig{fill:var(--sig)}.ok{fill:var(--ok)}.red{fill:var(--red)}
.card{fill:var(--card);stroke:var(--line)}
:root{--e:cubic-bezier(.22,1,.36,1)}
"""
BASE = BASE.replace("BLUE", TOKENS["blue"]).replace("CYAN", TOKENS["cyan"]).replace("GREEN", TOKENS["green"]).replace("AMBER", TOKENS["amber"]).replace("RED", TOKENS["red"])
ANIM = """
.rise{opacity:0;animation:rise .8s var(--e) both}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.tile{opacity:0;transform-box:fill-box;transform-origin:50% 100%;animation:tile .9s var(--e) both}
@keyframes tile{0%{opacity:0;transform:translateY(28px) rotate(2deg)}70%{opacity:1;transform:translateY(-3px) rotate(0)}100%{opacity:1;transform:none}}
.draw{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);animation:draw 1.6s var(--e) both}
@keyframes draw{to{stroke-dashoffset:0}}
.pop{opacity:0;transform-box:fill-box;transform-origin:center;animation:pop .7s var(--e) both}
@keyframes pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:none}}
.ping{opacity:0;transform-box:fill-box;transform-origin:center;animation:ping 2.6s var(--e) infinite}
@keyframes ping{0%{opacity:.8;transform:scale(1)}80%,100%{opacity:0;transform:scale(3.2)}}
.flow{stroke-dasharray:6 6;animation:flow 1.2s linear infinite,warn 2.6s var(--e) infinite}
@keyframes flow{to{stroke-dashoffset:-24}}
@keyframes warn{0%,100%{opacity:.35}50%{opacity:1}}
.scan{opacity:0;animation:scan 5.5s var(--e) infinite 1.8s}
@keyframes scan{0%{transform:translateX(0);opacity:0}10%{opacity:.9}90%{opacity:.9}100%{transform:translateX(var(--dx));opacity:0}}
.blink{animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.type{transform-box:fill-box;transform-origin:100% 0;animation:type var(--t) steps(var(--n)) both}
@keyframes type{from{transform:scaleX(1)}to{transform:scaleX(0)}}
.cell{opacity:.18;animation:cell 3.2s var(--e) infinite}
@keyframes cell{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}
.shine{animation:shine 4.5s var(--e) infinite 1.5s}
@keyframes shine{0%{transform:translateX(-120px);opacity:0}15%{opacity:1}60%,100%{transform:translateX(var(--dx));opacity:0}}
.glowpulse{animation:glowpulse 3s var(--e) infinite}
@keyframes glowpulse{0%,100%{opacity:.25}50%{opacity:.7}}
.nudge{animation:nudge 2.8s var(--e) infinite 2.4s}
@keyframes nudge{0%,100%{transform:none}50%{transform:translate(3px,-3px)}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;opacity:1!important;transform:none!important;stroke-dashoffset:0!important}.type,.scan,.ping,.shine,.packet{display:none}}
"""
STATIC_CSS = ".type,.scan,.ping,.shine,.packet{display:none}.cell{opacity:.6}"


def svg(w, h, title, body, defs=""):
    css = BASE + (STATIC_CSS if STATIC else ANIM)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{html.escape(title)}">'
            f'<title>{html.escape(title)}</title><style>{FONTS}{css}</style><defs>'
            f'<pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="var(--dot)"/></pattern>{COMMON}{defs}</defs>{body}</svg>')


# Shared defs: a soft glow, and the brand accent ramp (blue, cyan, green) for bars and scan lines
COMMON = ('<filter id="soft" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>'
          '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/>'
          '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
          '<linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--sig)"/>'
          '<stop offset=".5" stop-color="var(--cyan)"/><stop offset="1" stop-color="var(--ok)"/></linearGradient>'
          '<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--cyan)" stop-opacity="0"/>'
          '<stop offset=".5" stop-color="var(--cyan)" stop-opacity=".9"/><stop offset="1" stop-color="var(--cyan)" stop-opacity="0"/></linearGradient>')


def frame(w, h, r=20, texture=True):
    s = f'<rect class="card" x=".5" y=".5" width="{w-1}" height="{h-1}" rx="{r}"/>'
    if texture:
        s += f'<rect x="1" y="1" width="{w-2}" height="{h-2}" rx="{r-1}" fill="url(#dots)"/>'
    return s


def d(i, step=0.1, base=0.1):
    return "" if STATIC else f' style="animation-delay:{base + i*step:.2f}s"'


def wrap(text, width):
    """Greedy word wrap for SVG text, which has no wrapping of its own."""
    lines, cur = [], ""
    for w in text.split():
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    return lines + [cur] if cur else lines


# Two owners' address clusters with one wrong link between them: the error the research measures.
NODES = [(640, 92), (690, 70), (705, 128), (660, 150), (735, 96),
         (790, 178), (835, 150), (820, 214), (770, 226), (850, 198)]
EDGES = [(0, 1), (0, 2), (1, 4), (2, 3), (2, 4), (0, 3), (5, 6), (5, 7), (6, 9), (7, 8), (7, 9), (5, 8)]


def colour_of(i):
    return "--sig" if i < 5 else "--ok"


def hero():
    w, h = 880, 300
    defs = ('<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--fg)"/><stop offset=".45" stop-color="var(--fg)"/>'
            '<stop offset=".5" stop-color="var(--ice)"/><stop offset=".55" stop-color="var(--fg)"/><stop offset="1" stop-color="var(--fg)"/>'
            + ('' if STATIC else '<animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="6s" begin="2s" repeatCount="indefinite"/>')
            + '</linearGradient><clipPath id="gclip"><rect x="600" y="40" width="270" height="220"/></clipPath>')
    edges = ""
    for k, (a, b) in enumerate(EDGES):
        (x1, y1), (x2, y2) = NODES[a], NODES[b]
        length = int(((x1 - x2) ** 2 + (y1 - y2) ** 2) ** .5) + 2
        delay = "" if STATIC else f";animation-delay:{.3 + k * .08:.2f}s"
        edges += (f'<line class="draw" style="--len:{length}{delay}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                  f'stroke="var({colour_of(a)})" stroke-width="1.4" opacity=".7"/>')
    nodes = "".join(f'<circle class="pop" cx="{x}" cy="{y}" r="5" fill="var({colour_of(i)})" filter="url(#glow)"{d(i, .07, .2)}/>'
                    for i, (x, y) in enumerate(NODES))
    pings = "".join(f'<circle class="ping" cx="{NODES[i][0]}" cy="{NODES[i][1]}" r="5" fill="none" stroke="var(--red)" stroke-width="1.5"{d(j, 1.3, 2.2)}/>'
                    for j, i in enumerate((4, 5)))
    (ax, ay), (bx, by) = NODES[4], NODES[5]
    packets = ""
    if not STATIC:  # SMIL motion along a few edges, staggered, so data visibly moves through each cluster
        for k, (a, b) in enumerate(EDGES[::2]):
            (x1, y1), (x2, y2) = NODES[a], NODES[b]
            packets += (f'<circle class="packet" r="2.2" fill="var(--cyan)" filter="url(#glow)" opacity="0">'
                        f'<animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin="{2 + k * .4:.1f}s" repeatCount="indefinite"/>'
                        f'<animateMotion path="M{x1},{y1} L{x2},{y2}" dur="2.4s" begin="{2 + k * .4:.1f}s" repeatCount="indefinite"/></circle>')
    graph = (f'{edges}{nodes}'
             f'<line class="flow" x1="{ax}" y1="{ay}" x2="{bx}" y2="{by}" stroke="var(--red)" stroke-width="2" filter="url(#glow)"/>{pings}{packets}'
             f'<text class="m red rise" x="772" y="128" font-size="11"{d(0, 0, 2.0)}>false merge</text>'
             '<g clip-path="url(#gclip)"><rect class="scan" style="--dx:270px" x="600" y="40" width="2" height="220" fill="var(--cyan)" filter="url(#glow)"/></g>')
    text = (
        f'<text class="m sig rise"{d(0)} x="40" y="56" font-size="13">&gt; whoami<tspan class="blink">_</tspan></text>'
        f'<text class="rise"{d(1)} x="40" y="114" font-size="46" font-weight="600" letter-spacing="-1.6">Ashutosh <tspan fill="url(#sheen)">Pal Singh</tspan></text>'
        f'<text class="rise"{d(2)} x="40" y="152" font-size="18" font-weight="600">Security analyst who measures the silent errors</text>'
        f'<text class="rise"{d(2)} x="40" y="176" font-size="18" font-weight="600">in crypto investigations and forensic evidence.</text>'
        f'<text class="mute rise"{d(3)} x="40" y="210" font-size="14">MSc Cyber Security Engineering, Warwick (NCSC certified). Microsoft SC-200.</text>'
        f'<g class="rise"{d(4)}><circle class="ok" cx="47" cy="252" r="4"/>'
        '<circle class="ping" cx="47" cy="252" r="4" fill="none" stroke="var(--ok)" stroke-width="1.5"/>'
        '<text class="m mute" x="60" y="256" font-size="12">Open to UK roles: blockchain analytics, DFIR, fincrime, SOC, VM, research. No sponsorship.</text></g>')
    return svg(w, h, "Ashutosh Pal Singh, security analyst who measures the silent errors in crypto investigations and forensic evidence",
               frame(w, h) + graph + text, defs)


def terminal(projects, term):
    w, lh = 880, 22
    rows = []
    for t, p in zip(term, projects):
        rows += [("cmd", "$ " + t["cmd"]), ("out", f'{p["proof"]["value"]} {p["proof"]["label"]}'), ("gap", "")]
    rows = rows[:-1]
    h = 76 + len(rows) * lh + 30
    body = frame(w, h, 16, texture=False) + (
        '<circle cx="28" cy="26" r="5" fill="var(--red)"/><circle cx="46" cy="26" r="5" fill="var(--amber)"/><circle cx="64" cy="26" r="5" fill="var(--ok)"/>'
        f'<text class="m mute" x="84" y="30" font-size="12">~/research</text><rect x="1" y="48" width="{w-2}" height="1" fill="var(--line)"/>')
    t0 = 0.5
    for k, (kind, line) in enumerate(rows):
        if kind == "gap":
            continue
        y = 84 + k * lh
        n = len(line)
        dur = max(0.5, n * 0.03) if kind == "cmd" else 0.3
        if kind == "out":  # results fade up; only commands are typed
            delay = "" if STATIC else f' style="animation-delay:{t0:.2f}s"'
            body += f'<text class="m rise" x="28" y="{y}" font-size="12.5"{delay}>{html.escape(line)}</text>'
        else:
            body += f'<text class="m sig" x="28" y="{y}" font-size="12.5" xml:space="preserve">{html.escape(line)}</text>'
            if not STATIC:  # a card-coloured cover shrinks in steps, one character at a time, to "type" the line
                body += (f'<rect class="type" style="--t:{dur:.2f}s;--n:{n};animation-delay:{t0:.2f}s" '
                         f'x="26" y="{y - 14}" width="{n * 7.6 + 6:.0f}" height="19" fill="var(--card)"/>')
        t0 += dur + (0.2 if kind == "cmd" else 0.7)
    y = 84 + len(rows) * lh
    delay = "" if STATIC else f' style="animation-delay:{t0:.2f}s"'
    body += f'<text class="m sig rise" x="28" y="{y}" font-size="12.5"{delay}>$ <tspan class="blink" style="fill:var(--cyan)" filter="url(#glow)">_</tspan></text>'
    title = "Research results. " + " ".join(f'{p["title"]}: {p["proof"]["value"]} {p["proof"]["label"]}.' for p in projects)
    return svg(w, h, title, body)


def research_card(p, i):
    w, h = 288, 250
    colour = ("sig", "ok", "amber")[i % 3]
    label = wrap(p["proof"]["label"], 32)[:3]
    cells = ""
    for c in range(20):
        delay = "" if STATIC else f' style="animation-delay:{1.2 + c * .06:.2f}s"'
        cells += f'<rect class="cell" x="{24 + c * 10}" y="{h - 34}" width="6" height="12" rx="1.5" fill="var(--{colour})"{delay}/>'
    body = (f'<g class="tile"{d(i, 0.14, 0.2)}>' + frame(w, h, 18)
            + f'<rect x="20" y="0" width="{w - 40}" height="3" rx="1.5" fill="url(#accent)"/>'
            f'<g clip-path="url(#bar{i})"><rect class="shine" style="--dx:{w + 120}px" x="0" y="0" width="120" height="3" fill="url(#beam)"/></g>'
            + f'<text class="m" x="24" y="40" font-size="11" style="fill:var(--{colour})">{html.escape(" / ".join(p["tags"]).upper())}</text>'
            f'<text x="24" y="70" font-size="18" font-weight="600">{html.escape(p["title"])}</text>'
            f'<text class="glowpulse" x="24" y="126" font-size="44" font-weight="600" letter-spacing="-1.5" style="fill:var(--{colour})" filter="url(#soft)">{html.escape(p["proof"]["value"])}</text>'
            f'<text x="24" y="126" font-size="44" font-weight="600" letter-spacing="-1.5" style="fill:var(--{colour})">{html.escape(p["proof"]["value"])}</text>'
            + "".join(f'<text class="mute" x="24" y="{154 + k * 19}" font-size="13">{html.escape(t)}</text>' for k, t in enumerate(label))
            + cells
            + f'<g class="nudge" style="transform-box:fill-box"><path d="M{w - 44} {h - 28}h16m-6-6l6 6-6 6" fill="none" stroke="var(--fg)" '
            'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g></g>')
    return svg(w, h, f'{p["title"]}: {p["proof"]["value"]} {p["proof"]["label"]}', body, f'<clipPath id="bar{i}"><rect x="20" y="0" width="{w - 40}" height="3" rx="1.5"/></clipPath>')


TOOLKIT = [
    ("Blockchain forensics", ["Ethereum JSON-RPC", "ERC-4337", "EIP-7702", "Clustering", "Taint analysis"]),
    ("DFIR", ["The Sleuth Kit", "Plaso", "NTFS", "exFAT and FAT32", "Timelines", "Evidence integrity"]),
    ("Detection and VM", ["Splunk", "Elastic", "Sigma", "MITRE ATT&CK", "Nessus", "Qualys", "CVSS"]),
    ("Code and data", ["Python", "pandas", "Parquet", "SQL", "pytest", "GitHub Actions", "Docker"]),
]


def toolkit():
    w = 880
    h = 60 + len(TOOLKIT) * 44 + 12
    body = frame(w, h) + '<text class="m sig rise" x="32" y="40" font-size="12">&gt; ls toolkit/</text>'
    for r, (name, chips) in enumerate(TOOLKIT):
        y = 62 + r * 44
        body += f'<g class="rise"{d(r, .12, .25)}><text x="32" y="{y + 19}" font-size="14" font-weight="600">{html.escape(name)}</text></g>'
        x = 200
        for j, c in enumerate(chips):
            cw = len(c) * 7.3 + 22
            assert x + cw < w - 24, f"toolkit row {name} overflows"
            body += (f'<g class="pop"{d(r * 7 + j, .045, .35)}><rect x="{x:.0f}" y="{y}" width="{cw:.0f}" height="28" rx="8" fill="var(--card2)" stroke="var(--line)"/>'
                     f'<text class="m" x="{x + 11:.0f}" y="{y + 18}" font-size="12">{html.escape(c)}</text></g>')
            x += cw + 8
    return svg(w, h, "Toolkit. " + " ".join(f"{n}: {', '.join(c)}." for n, c in TOOLKIT), body)


def tile(label, big, sub, colour, i):
    w, h = 432, 210
    body = (f'<g class="tile"{d(i, 0.14, 0.2)}>' + frame(w, h, 18)
            + f'<rect x="20" y="0" width="{w - 40}" height="3" rx="1.5" fill="url(#accent)"/>'
            f'<text class="m mute" x="24" y="46" font-size="12">{html.escape(label)}</text>'
            f'<text x="24" y="104" font-size="40" font-weight="600" letter-spacing="-1.4" style="fill:var(--{colour})">{html.escape(big)}</text>'
            + "".join(f'<text class="mute" x="24" y="{134 + k * 20}" font-size="13">{html.escape(line)}</text>' for k, line in enumerate(sub))
            + f'<g class="nudge" style="transform-box:fill-box"><path d="M{w - 46} {h - 34}h18m-7-7l7 7-7 7" fill="none" stroke="var(--fg)" '
            'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g></g>')
    return svg(w, h, f"{label}: {big}", body)


def main():
    data = json.load(open(DATA))
    projects, term = data["projects"], data["terminal"]
    os.makedirs(OUT, exist_ok=True)
    for old in os.listdir(OUT):  # cards no longer drawn (contribution graph, repo cards) must not linger
        os.remove(os.path.join(OUT, old))
    cards = {
        "hero.svg": hero(),
        "terminal.svg": terminal(projects, term),
        "toolkit.svg": toolkit(),
        "experience.svg": tile("Experience", "4 roles", ["Kyoka, NASSCOM, Cisco AICTE and Verzeo,", "plus open research and a detection lab."], "sig", 0),
        "work.svg": tile("Production work", "1,000+", ["IoT devices secured at Kyoka, with open", "vulnerabilities cut by 45%."], "ok", 1),
    }
    for i, p in enumerate(projects):
        cards[f"research-{i + 1}.svg"] = research_card(p, i)
    for name, content in cards.items():
        open(os.path.join(OUT, name), "w").write(content)
    print("rendered", ", ".join(cards), "(static)" if STATIC else "")


if __name__ == "__main__":
    assert wrap("a bb ccc dddd", 6) == ["a bb", "ccc", "dddd"]
    main()
