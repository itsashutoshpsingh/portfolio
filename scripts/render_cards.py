#!/usr/bin/env python3
"""Render the GitHub profile README cards into github/cards/ as self-contained SVGs.

Everything an <img> sandbox allows and nothing it strips: an inline <style> with CSS keyframes,
SMIL motion along a few lines, fonts subset to ASCII and embedded as base64 WOFF2, and the banner
photograph embedded as base64. The cards take GitHub's own surface colours in its dark and light
themes, so they sit flush on the profile, and use the site's one accent. Numbers come from
research/data/projects.json (built by sync_research.py), never typed here, and are never animated.

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


def b64(*path):
    return base64.b64encode(open(os.path.join(ROOT, *path), "rb").read()).decode()


FONTS = (
    "@font-face{font-family:'G';font-weight:400;src:url(data:font/woff2;base64,%s) format('woff2')}"
    "@font-face{font-family:'G';font-weight:700;src:url(data:font/woff2;base64,%s) format('woff2')}"
    "@font-face{font-family:'GM';font-weight:500;src:url(data:font/woff2;base64,%s) format('woff2')}"
) % (b64("github", "fonts", "carlito-400.sub.woff2"), b64("github", "fonts", "carlito-700.sub.woff2"), b64("github", "fonts", "geistmono-500.sub.woff2"))

# GitHub's surfaces in both of its themes, with the site's accent (darkened on the light theme so it still reads).
# The banner keeps the site's navy and pearl in both themes because it is a photograph.
BASE = """
:root{--card:#161b22;--card2:#21262d;--line:#30363d;--fg:#f0f6fc;--soft:#c9d1d9;--mute:#9198a1;--sig:%(accent)s;--on:#0d1117;--ok:%(green)s;--amber:%(amber)s;--red:%(red)s;--navy:%(bg)s;--pearl:%(ink)s;--pearl2:%(ink-2)s;--tang:%(accent)s;--e:cubic-bezier(.22,1,.36,1)}
@media(prefers-color-scheme:light){:root{--card:#f6f8fa;--card2:#ffffff;--line:#d1d9e0;--fg:#1f2328;--soft:#424a53;--mute:#59636e;--sig:#B5432A;--on:#ffffff;--ok:#1a7f37;--amber:#9a6700;--red:#cf222e}}
text{font-family:'G',Calibri,Carlito,ui-sans-serif,system-ui,sans-serif;fill:var(--fg)}
.m{font-family:'GM',ui-monospace,Menlo,monospace}
.soft{fill:var(--soft)}.mute{fill:var(--mute)}.sig{fill:var(--sig)}.on{fill:var(--on)}
.cap{font-size:12px;font-weight:700;letter-spacing:1.3px;fill:var(--mute)}
.card{fill:var(--card);stroke:var(--line)}
""" % TOKENS
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
@keyframes warn{0%,100%{opacity:.45}50%{opacity:1}}
.scan{opacity:0;animation:scan 5.5s var(--e) infinite 1.8s}
@keyframes scan{0%{transform:translateX(0);opacity:0}10%{opacity:.9}90%{opacity:.9}100%{transform:translateX(var(--dx));opacity:0}}
.blink{animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.type{transform-box:fill-box;transform-origin:100% 0;animation:type var(--t) steps(var(--n)) both}
@keyframes type{from{transform:scaleX(1)}to{transform:scaleX(0)}}
.cell{transform-box:fill-box;transform-origin:50% 100%;animation:cell 3.2s var(--e) infinite}
@keyframes cell{0%,100%{transform:scaleY(.35)}12%{transform:scaleY(1)}40%{transform:scaleY(.35)}}
.shine{animation:shine 4.5s var(--e) infinite 1.5s}
@keyframes shine{0%{transform:translateX(-120px);opacity:0}15%{opacity:1}60%,100%{transform:translateX(var(--dx));opacity:0}}
.nudge{transform-box:fill-box;animation:nudge 2.8s var(--e) infinite 2.4s}
@keyframes nudge{0%,100%{transform:none}50%{transform:translateX(4px)}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;opacity:1!important;transform:none!important;stroke-dashoffset:0!important}.type,.scan,.ping,.shine,.packet{display:none}}
"""
STATIC_CSS = ".type,.scan,.ping,.shine,.packet{display:none}"
ARROW = 'fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'


def svg(w, h, title, body, defs=""):
    css = BASE + (STATIC_CSS if STATIC else ANIM)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{html.escape(title)}">'
            f'<title>{html.escape(title)}</title><style>{FONTS}{css}</style><defs>{defs}</defs>{body}</svg>')


def frame(w, h, r=20):
    return f'<rect class="card" x=".5" y=".5" width="{w-1}" height="{h-1}" rx="{r}"/>'


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


def arrow(x, y, colour, size=16):
    """A small arrow that nudges forward now and then."""
    return f'<g class="nudge"><path d="M{x} {y}h{size}m-6-6l6 6-6 6" stroke="{colour}" {ARROW}/></g>'


# Two owners' address clusters with one wrong link between them: the error the research measures.
NODES = [(640, 92), (690, 70), (705, 128), (660, 150), (735, 96),
         (790, 178), (835, 150), (820, 214), (770, 226), (850, 198)]
EDGES = [(0, 1), (0, 2), (1, 4), (2, 3), (2, 4), (0, 3), (5, 6), (5, 7), (6, 9), (7, 8), (7, 9), (5, 8)]
FACTS = ["Month offset bug found in libfsfat", "45% fewer open vulnerabilities at Kyoka", "Microsoft SC-200 certified"]


def hero():
    """The banner: the site's lake photograph under a navy veil, the headline, and the graph with its one wrong link.
    Data moves along the edges, a scan line crosses the graph and the wrong link keeps flashing."""
    w, h = 880, 380
    defs = (f'<clipPath id="r"><rect width="{w}" height="{h}" rx="20"/></clipPath><clipPath id="g"><rect x="600" y="40" width="270" height="220"/></clipPath>'
            '<linearGradient id="veil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--navy)" stop-opacity=".9"/>'
            '<stop offset=".6" stop-color="var(--navy)" stop-opacity=".66"/><stop offset="1" stop-color="var(--navy)" stop-opacity=".5"/></linearGradient>')
    photo = (f'<g clip-path="url(#r)"><rect width="{w}" height="{h}" fill="var(--navy)"/>'
             f'<image href="data:image/jpeg;base64,{b64("github", "hero-bg.jpg")}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice"/>'
             f'<rect width="{w}" height="{h}" fill="url(#veil)"/></g><rect x=".5" y=".5" width="{w-1}" height="{h-1}" rx="20" fill="none" stroke="var(--line)"/>')
    edges = packets = ""
    for k, (a, b) in enumerate(EDGES):
        (x1, y1), (x2, y2) = NODES[a], NODES[b]
        length = int(((x1 - x2) ** 2 + (y1 - y2) ** 2) ** .5) + 2
        delay = "" if STATIC else f";animation-delay:{.3 + k * .08:.2f}s"
        edges += f'<line class="draw" style="--len:{length}{delay}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="var(--pearl)" stroke-width="1.2" opacity=".75"/>'
        if not STATIC and k % 2 == 0:  # a packet travels along every other edge, staggered
            packets += (f'<circle class="packet" r="2.4" fill="var(--tang)" opacity="0">'
                        f'<animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin="{2 + k * .2:.1f}s" repeatCount="indefinite"/>'
                        f'<animateMotion path="M{x1},{y1} L{x2},{y2}" dur="2.4s" begin="{2 + k * .2:.1f}s" repeatCount="indefinite"/></circle>')
    nodes = "".join(f'<circle class="pop" cx="{x}" cy="{y}" r="4.5" fill="var(--pearl)"{d(i, .07, .2)}/>' for i, (x, y) in enumerate(NODES))
    (ax, ay), (bx, by) = NODES[4], NODES[5]
    pings = "".join(f'<circle class="ping" cx="{x}" cy="{y}" r="5" fill="none" stroke="var(--tang)" stroke-width="1.5"{d(j, 1.3, 2.2)}/>' for j, (x, y) in enumerate(((ax, ay), (bx, by))))
    graph = (f'{edges}<line class="flow" x1="{ax}" y1="{ay}" x2="{bx}" y2="{by}" stroke="var(--tang)" stroke-width="2.2"/>'
             f'{nodes}<circle cx="{ax}" cy="{ay}" r="4.5" fill="var(--tang)"/><circle cx="{bx}" cy="{by}" r="4.5" fill="var(--tang)"/>{pings}{packets}'
             f'<text class="rise" x="776" y="128" font-size="13" font-weight="700" style="fill:var(--tang)"{d(0, 0, 2.0)}>False merge</text>'
             '<g clip-path="url(#g)"><rect class="scan" style="--dx:270px" x="600" y="40" width="2" height="220" fill="var(--tang)"/></g>')
    p, p2 = 'style="fill:var(--pearl)"', 'style="fill:var(--pearl2)"'
    text = (
        f'<g class="rise"{d(0)}><rect x="40.5" y="34.5" width="252" height="32" rx="16" fill="var(--navy)" fill-opacity=".6" stroke="var(--pearl)" stroke-opacity=".3"/>'
        f'<circle cx="58" cy="50.5" r="4" fill="var(--tang)"/><circle class="ping" cx="58" cy="50.5" r="4" fill="none" stroke="var(--tang)" stroke-width="1.5"/>'
        f'<text x="70" y="55.5" font-size="14" {p}>Security analyst, open to roles</text></g>'
        f'<text class="rise"{d(1)} x="38" y="134" font-size="62" letter-spacing="-2.2" {p}>I find the errors</text>'
        f'<text class="rise"{d(2)} x="38" y="198" font-size="62" letter-spacing="-2.2" {p}>in the evidence<tspan class="blink" style="fill:var(--tang)">.</tspan></text>'
        f'<text class="rise"{d(3)} x="40" y="240" font-size="15.5" {p2}>Ashutosh Pal Singh. MSc Cyber Security Engineering, Warwick (NCSC certified).</text>'
        f'<text class="rise"{d(3)} x="40" y="262" font-size="15.5" {p2}>Open to roles in blockchain analytics, DFIR, fincrime, SOC, vulnerability management and research.</text>'
        f'<g class="rise"{d(4)}><rect x="40" y="284" width="196" height="44" rx="22" fill="var(--tang)"/>'
        f'<text x="62" y="312" font-size="16" font-weight="700" style="fill:var(--navy)">Open the portfolio</text>{arrow(201, 306, "var(--navy)", 14)}'
        '<rect x="248.5" y="284.5" width="166" height="43" rx="21.5" fill="none" stroke="var(--pearl)"/>'
        f'<text x="270" y="312" font-size="16" font-weight="700" {p}>See the research</text></g>'
        f'<rect x="40" y="346" width="{w - 80}" height="1" fill="var(--pearl)" fill-opacity=".25"/>'
        + "".join(f'<text class="rise" x="{40 + k * 280}" y="366" font-size="12.5" {p2}{d(5 + k)}>{html.escape(t)}</text>' for k, t in enumerate(FACTS)))
    return svg(w, h, "Ashutosh Pal Singh, security analyst: I find the errors in the evidence", photo + graph + text, defs)


def terminal(projects, term):
    """A terminal that types each project's command once and prints its result."""
    w, lh = 880, 22
    rows = []
    for t, p in zip(term, projects):
        rows += [("cmd", "$ " + t["cmd"]), ("out", f'{p["proof"]["value"]} {p["proof"]["label"]}'), ("gap", "")]
    rows = rows[:-1]
    h = 76 + len(rows) * lh + 30
    body = frame(w, h, 16) + (
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
    body += f'<text class="m sig rise" x="28" y="{y}" font-size="12.5"{delay}>$ <tspan class="blink">_</tspan></text>'
    title = "Research results. " + " ".join(f'{p["title"]}: {p["proof"]["value"]} {p["proof"]["label"]}.' for p in projects)
    return svg(w, h, title, body)


def research_card(p, i):
    w, h = 288, 264
    label = wrap(p["proof"]["label"], 32)[:3]
    cells = ""
    for c in range(18):  # a quiet row of bars that ripples, like a signal being read
        delay = "" if STATIC else f' style="animation-delay:{1.2 + c * .06:.2f}s"'
        cells += f'<rect class="cell" x="{24 + c * 10}" y="{h - 34}" width="6" height="12" rx="1.5" fill="var(--sig)"{delay}/>'
    body = (f'<g class="tile"{d(i, 0.12, 0.2)}>' + frame(w, h, 18)
            + f'<rect x="20" y="0" width="{w - 40}" height="3" rx="1.5" fill="var(--sig)"/>'
            f'<g clip-path="url(#bar{i})"><rect class="shine" style="--dx:{w + 120}px" x="0" y="0" width="120" height="3" fill="var(--fg)"/></g>'
            f'<text class="cap" x="24" y="40">{html.escape(" / ".join(p["tags"]).upper())}</text>'
            f'<text x="24" y="70" font-size="18" font-weight="700">{html.escape(p["title"])}</text>'
            f'<text x="23" y="130" font-size="52" letter-spacing="-2">{html.escape(p["proof"]["value"])}</text>'
            + "".join(f'<text class="mute" x="24" y="{158 + k * 19}" font-size="13.5">{html.escape(t)}</text>' for k, t in enumerate(label))
            + cells + arrow(w - 42, h - 28, "var(--sig)") + "</g>")
    # 10px of clear space under the card, so the two rows do not touch
    return svg(w, h + 10, f'{p["title"]}: {p["proof"]["value"]} {p["proof"]["label"]}', body, f'<clipPath id="bar{i}"><rect x="20" y="0" width="{w - 40}" height="3" rx="1.5"/></clipPath>')


TOOLKIT = [
    ("Detection", ["Microsoft Sentinel", "KQL", "Defender XDR", "Splunk", "Elastic", "Sigma", "MITRE ATT&CK"]),
    ("Vulnerability and AppSec", ["Nessus", "Qualys", "Trivy", "OSV-Scanner", "Burp Suite", "CVSS", "OWASP Top 10"]),
    ("Cloud and identity", ["Microsoft Azure", "Microsoft 365", "Entra ID", "Conditional Access", "Intune", "mTLS"]),
    ("Blockchain forensics", ["Ethereum JSON-RPC", "ERC-4337", "EIP-7702", "Clustering", "Taint analysis"]),
    ("DFIR", ["The Sleuth Kit", "Plaso", "Volatility", "Autopsy", "NTFS", "exFAT and FAT32", "Timelines"]),
    ("Code and data", ["Python", "Bash", "SQL", "Node.js", "pandas", "pytest", "GitHub Actions", "Docker"]),
]


def toolkit():
    w = 880
    h = 60 + len(TOOLKIT) * 44 + 12
    body = frame(w, h) + '<text class="cap rise" x="32" y="40">TOOLKIT</text>'
    for r, (name, chips) in enumerate(TOOLKIT):
        y = 62 + r * 44
        body += f'<g class="rise"{d(r, .12, .25)}><text x="32" y="{y + 19}" font-size="15" font-weight="700">{html.escape(name)}</text></g>'
        x = 200
        for j, c in enumerate(chips):
            cw = len(c) * 6.7 + 24
            assert x + cw < w - 24, f"toolkit row {name} overflows"
            body += (f'<g class="pop"{d(r * 7 + j, .045, .35)}><rect x="{x + .5:.1f}" y="{y + .5}" width="{cw:.0f}" height="28" rx="14" fill="var(--card2)" stroke="var(--line)"/>'
                     f'<text class="soft" x="{x + 12:.0f}" y="{y + 19}" font-size="13.5">{html.escape(c)}</text></g>')
            x += cw + 8
    return svg(w, h, "Toolkit. " + " ".join(f"{n}: {', '.join(c)}." for n, c in TOOLKIT), body)


PUBLISHED = [
    ("Peer reviewed paper", ["Safeguarding Authenticity in the", "Digital Realm: content provenance", "and watermarking to combat", "deepfakes. IJFMR 6(3), 2024."]),
    ("Certifications", ["Microsoft SC-200, Security", "Operations Analyst Associate, 2026", "Google Cybersecurity, 2024", "EC-Council Digital Forensics"]),
    ("Education", ["MSc Cyber Security Engineering,", "Warwick (NCSC certified)", "BTech Computer Science,", "Symbiosis Institute of Technology"]),
]


def published():
    w, h = 880, 218
    body = frame(w, h) + '<text class="cap rise" x="32" y="40">PUBLISHED AND CERTIFIED</text>'
    col = (w - 64) / 3
    for i, (head, lines) in enumerate(PUBLISHED):
        x = 32 + i * col
        body += (f'<g class="rise"{d(i, .15, .3)}><circle class="sig" cx="{x + 4:.0f}" cy="72" r="4"/>'
                 f'<text x="{x + 16:.0f}" y="78" font-size="16" font-weight="700">{html.escape(head)}</text>'
                 + "".join(f'<text class="mute" x="{x:.0f}" y="{106 + k * 21}" font-size="13.5">{html.escape(t)}</text>' for k, t in enumerate(lines))
                 + "</g>")
        assert max(len(t) for t in lines) <= 36, f"{head}: line too long for its column"
        if i:
            body += f'<rect x="{x - 14:.0f}" y="60" width="1" height="{h - 84}" fill="var(--line)"/>'
    return svg(w, h, "Published and certified. " + " ".join(f"{a}: {' '.join(c)}." for a, c in PUBLISHED), body)


def icon(name):
    """Path data of a Phosphor icon (MIT, github/icons/LICENSE), drawn in a 256 unit box."""
    return re.search(r' d="([^"]+)"', open(os.path.join(ROOT, "github", "icons", name + ".svg")).read()).group(1)


SOCIAL = [("Portfolio", "globe-simple"), ("Research", "article"), ("LinkedIn", "linkedin-logo"), ("Email", "envelope-simple"), ("CV", "download-simple")]


def social(label, ic, i):
    """Pill buttons: the first is the filled accent, the rest are outlined, like the site's button pair."""
    w, h = 210, 56
    main = i == 0
    fill, ink = ("var(--sig)", "var(--on)") if main else ("var(--card)", "var(--fg)")
    body = (f'<g class="rise"{d(i, .1, .2)}><rect x=".5" y=".5" width="{w-1}" height="{h-1}" rx="28" fill="{fill}" stroke="{"var(--sig)" if main else "var(--line)"}"/>'
            f'<g transform="translate(22 18) scale(.078)" style="fill:{ink if main else "var(--sig)"}"><path d="{icon(ic)}"/></g>'
            f'<text x="54" y="34" font-size="16" font-weight="700" style="fill:{ink}">{html.escape(label)}</text>'
            + arrow(w - 36, 28, ink, 12) + "</g>")
    return svg(w, h, label, body)


def tile(label, big, sub, i):
    w, h = 432, 210
    body = (f'<g class="tile"{d(i, 0.14, 0.2)}>' + frame(w, h, 18)
            + f'<rect x="20" y="0" width="{w - 40}" height="3" rx="1.5" fill="var(--sig)"/>'
            f'<text class="cap" x="24" y="46">{html.escape(label.upper())}</text>'
            f'<text x="23" y="108" font-size="48" letter-spacing="-1.8">{html.escape(big)}</text>'
            + "".join(f'<text class="mute" x="24" y="{138 + k * 20}" font-size="13.5">{html.escape(line)}</text>' for k, line in enumerate(sub))
            + arrow(w - 46, h - 34, "var(--sig)", 18) + "</g>")
    return svg(w, h, f"{label}: {big}", body)


def main():
    data = json.load(open(DATA))
    projects, term = data["projects"], data["terminal"]
    os.makedirs(OUT, exist_ok=True)
    for old in os.listdir(OUT):  # cards no longer drawn must not linger
        os.remove(os.path.join(OUT, old))
    cards = {
        "hero.svg": hero(),
        "terminal.svg": terminal(projects, term),
        "toolkit.svg": toolkit(),
        "published.svg": published(),
        "experience.svg": tile("Experience", "5 roles", ["Perfume Reverie, Kyoka, NASSCOM, Cisco and Verzeo,", "plus open research and two home labs."], 0),
        "work.svg": tile("Production work", "1,000+", ["IoT devices secured at Kyoka, and a live online", "store hardened against a formal threat model."], 1),
    }
    for i, p in enumerate(projects):
        cards[f"research-{i + 1}.svg"] = research_card(p, i)
    for i, (label, ic) in enumerate(SOCIAL):
        cards[f"social-{label.lower()}.svg"] = social(label, ic, i)
    for name, content in cards.items():
        open(os.path.join(OUT, name), "w").write(content)
    print("rendered", ", ".join(cards), "(static)" if STATIC else "")


if __name__ == "__main__":
    assert wrap("a bb ccc dddd", 6) == ["a bb", "ccc", "dddd"]
    main()
