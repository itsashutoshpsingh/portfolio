#!/usr/bin/env python3
"""Render the GitHub profile README cards into github/cards/ as self-contained SVGs.

Everything an <img> sandbox allows and nothing it strips: an inline <style> with CSS keyframes,
fonts subset to ASCII and embedded as base64 WOFF2, and the banner photograph embedded as base64.
Colours come from tokens.css, the same palette as the site: navy, pearl and one accent. Numbers come
from research/data/projects.json (built by sync_research.py), never typed here, and are never animated.

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
) % (b64("github", "fonts", "carlito-400.sub.woff2"), b64("github", "fonts", "carlito-700.sub.woff2"))

# The cards keep the site's own colours on both of GitHub's themes, so the profile reads as one piece with the portfolio.
BASE = """
:root{--bg:%(bg)s;--card:%(surface-1)s;--card2:%(surface-2)s;--line:%(line)s;--fg:%(ink)s;--soft:%(ink-2)s;--mute:%(ink-3)s;--sig:%(accent)s;--e:cubic-bezier(.22,1,.36,1)}
text{font-family:'G',Calibri,Carlito,ui-sans-serif,system-ui,sans-serif;fill:var(--fg)}
.soft{fill:var(--soft)}.mute{fill:var(--mute)}.sig{fill:var(--sig)}.ink{fill:var(--bg)}
.cap{font-size:12px;font-weight:700;letter-spacing:1.3px;fill:var(--mute)}
.card{fill:var(--card);stroke:var(--line)}
""" % TOKENS
# Motion: each thing arrives once and then rests. Nothing loops.
ANIM = """
.rise{opacity:0;animation:rise .8s var(--e) both}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.draw{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);animation:draw 1.6s var(--e) both}
@keyframes draw{to{stroke-dashoffset:0}}
.pop{opacity:0;transform-box:fill-box;transform-origin:center;animation:pop .7s var(--e) both}
@keyframes pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:none}}
.ping{opacity:0;transform-box:fill-box;transform-origin:center;animation:ping 2.6s var(--e) 3}
@keyframes ping{0%{opacity:.8;transform:scale(1)}80%,100%{opacity:0;transform:scale(3.2)}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;opacity:1!important;transform:none!important;stroke-dashoffset:0!important}.ping{display:none}}
"""
STATIC_CSS = ".ping{display:none}"
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


# Two owners' address clusters with one wrong link between them: the error the research measures.
NODES = [(640, 92), (690, 70), (705, 128), (660, 150), (735, 96),
         (790, 178), (835, 150), (820, 214), (770, 226), (850, 198)]
EDGES = [(0, 1), (0, 2), (1, 4), (2, 3), (2, 4), (0, 3), (5, 6), (5, 7), (6, 9), (7, 8), (7, 9), (5, 8)]
FACTS = ["Month offset bug found in libfsfat", "45% fewer open vulnerabilities at Kyoka", "Microsoft SC-200 certified"]


def hero():
    """The banner: the site's lake photograph under a navy veil, the headline, and the one wrong link."""
    w, h = 880, 380
    defs = (f'<clipPath id="r"><rect width="{w}" height="{h}" rx="20"/></clipPath>'
            '<linearGradient id="veil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--bg)" stop-opacity=".9"/>'
            '<stop offset=".6" stop-color="var(--bg)" stop-opacity=".66"/><stop offset="1" stop-color="var(--bg)" stop-opacity=".5"/></linearGradient>')
    photo = (f'<g clip-path="url(#r)"><rect width="{w}" height="{h}" fill="var(--bg)"/>'
             f'<image href="data:image/jpeg;base64,{b64("github", "hero-bg.jpg")}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice"/>'
             f'<rect width="{w}" height="{h}" fill="url(#veil)"/></g><rect x=".5" y=".5" width="{w-1}" height="{h-1}" rx="20" fill="none" stroke="var(--line)"/>')
    edges = ""
    for k, (a, b) in enumerate(EDGES):
        (x1, y1), (x2, y2) = NODES[a], NODES[b]
        length = int(((x1 - x2) ** 2 + (y1 - y2) ** 2) ** .5) + 2
        delay = "" if STATIC else f";animation-delay:{.3 + k * .08:.2f}s"
        edges += f'<line class="draw" style="--len:{length}{delay}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="var(--fg)" stroke-width="1.2" opacity=".75"/>'
    nodes = "".join(f'<circle class="pop" cx="{x}" cy="{y}" r="4.5" fill="var(--fg)"{d(i, .07, .2)}/>' for i, (x, y) in enumerate(NODES))
    (ax, ay), (bx, by) = NODES[4], NODES[5]
    pings = "".join(f'<circle class="ping" cx="{x}" cy="{y}" r="5" fill="none" stroke="var(--sig)" stroke-width="1.5"{d(j, 1.3, 2.2)}/>' for j, (x, y) in enumerate(((ax, ay), (bx, by))))
    graph = (f'{edges}<line class="rise" x1="{ax}" y1="{ay}" x2="{bx}" y2="{by}" stroke="var(--sig)" stroke-width="2.2" stroke-dasharray="6 6"{d(0, 0, 1.6)}/>'
             f'{nodes}<circle cx="{ax}" cy="{ay}" r="4.5" fill="var(--sig)"/><circle cx="{bx}" cy="{by}" r="4.5" fill="var(--sig)"/>{pings}'
             f'<text class="sig rise" x="776" y="128" font-size="13" font-weight="700"{d(0, 0, 2.0)}>False merge</text>')
    text = (
        f'<g class="rise"{d(0)}><rect x="40.5" y="34.5" width="252" height="32" rx="16" fill="var(--bg)" fill-opacity=".6" stroke="var(--line)"/>'
        '<circle class="sig" cx="58" cy="50.5" r="4"/><text x="70" y="55.5" font-size="14">Security analyst, open to roles</text></g>'
        f'<text class="rise"{d(1)} x="38" y="134" font-size="62" letter-spacing="-2.2">I find the errors</text>'
        f'<text class="rise"{d(2)} x="38" y="198" font-size="62" letter-spacing="-2.2">in the evidence.</text>'
        f'<text class="soft rise"{d(3)} x="40" y="240" font-size="15.5">Ashutosh Pal Singh. MSc Cyber Security Engineering, Warwick (NCSC certified).</text>'
        f'<text class="soft rise"{d(3)} x="40" y="262" font-size="15.5">Open to roles in blockchain analytics, DFIR, fincrime, SOC, vulnerability management and research.</text>'
        f'<g class="rise"{d(4)}><rect x="40" y="284" width="196" height="44" rx="22" fill="var(--sig)"/>'
        f'<text class="ink" x="62" y="312" font-size="16" font-weight="700">Open the portfolio</text><path d="M201 306h14m-6-6l6 6-6 6" stroke="var(--bg)" {ARROW}/>'
        '<rect x="248.5" y="284.5" width="166" height="43" rx="21.5" fill="none" stroke="var(--fg)"/>'
        '<text x="270" y="312" font-size="16" font-weight="700">See the research</text></g>'
        f'<rect x="40" y="346" width="{w - 80}" height="1" fill="var(--line)"/>'
        + "".join(f'<text class="mute rise" x="{40 + k * 280}" y="366" font-size="12.5"{d(5 + k)}>{html.escape(t)}</text>' for k, t in enumerate(FACTS)))
    return svg(w, h, "Ashutosh Pal Singh, security analyst: I find the errors in the evidence", photo + graph + text, defs)


def research_card(p, i):
    w, h = 288, 264
    label = wrap(p["proof"]["label"], 32)[:3]
    body = (f'<g class="rise"{d(i, 0.12, 0.2)}>' + frame(w, h, 18)
            + f'<text class="cap" x="24" y="40" font-size="11">{html.escape(" / ".join(p["tags"]).upper())}</text>'
            f'<text x="24" y="70" font-size="18" font-weight="700">{html.escape(p["title"])}</text>'
            f'<text x="23" y="130" font-size="52" letter-spacing="-2">{html.escape(p["proof"]["value"])}</text>'
            + "".join(f'<text class="mute" x="24" y="{158 + k * 19}" font-size="13.5">{html.escape(t)}</text>' for k, t in enumerate(label))
            + f'<rect x="24" y="{h - 46}" width="{w - 48}" height="1" fill="var(--line)"/>'
            f'<text class="sig" x="24" y="{h - 20}" font-size="13.5" font-weight="700">Repository</text>'
            f'<path d="M{w - 42} {h - 25}h16m-6-6l6 6-6 6" stroke="var(--sig)" {ARROW}/></g>')
    return svg(w, h + 10, f'{p["title"]}: {p["proof"]["value"]} {p["proof"]["label"]}', body)  # 10px of clear space under the card, so the two rows do not touch


TOOLKIT = [
    ("Blockchain forensics", ["Ethereum JSON-RPC", "ERC-4337", "EIP-7702", "Clustering", "Taint analysis"]),
    ("DFIR", ["The Sleuth Kit", "Plaso", "NTFS", "exFAT and FAT32", "Timelines", "Evidence integrity"]),
    ("Detection and VM", ["Splunk", "Elastic", "Sigma", "MITRE ATT&CK", "Nessus", "Qualys", "CVSS"]),
    ("Code and data", ["Python", "pandas", "Parquet", "SQL", "pytest", "GitHub Actions", "Docker"]),
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
        body += (f'<g class="rise"{d(i, .15, .3)}><text x="{x:.0f}" y="78" font-size="16" font-weight="700">{html.escape(head)}</text>'
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
    fill, ink = ("var(--sig)", "var(--bg)") if main else ("var(--card)", "var(--fg)")
    body = (f'<g class="rise"{d(i, .1, .2)}><rect x=".5" y=".5" width="{w-1}" height="{h-1}" rx="28" fill="{fill}" stroke="{"var(--sig)" if main else "var(--line)"}"/>'
            f'<g transform="translate(22 18) scale(.078)" style="fill:{ink}"><path d="{icon(ic)}"/></g>'
            f'<text x="54" y="34" font-size="16" font-weight="700" style="fill:{ink}">{html.escape(label)}</text>'
            f'<path d="M{w - 36} 28h12m-5-5l5 5-5 5" stroke="{ink}" {ARROW}/></g>')
    return svg(w, h, label, body)


def tile(label, big, sub, i):
    w, h = 432, 210
    body = (f'<g class="rise"{d(i, 0.14, 0.2)}>' + frame(w, h, 18)
            + f'<text class="cap" x="24" y="46">{html.escape(label.upper())}</text>'
            f'<text x="23" y="108" font-size="48" letter-spacing="-1.8">{html.escape(big)}</text>'
            + "".join(f'<text class="mute" x="24" y="{138 + k * 20}" font-size="13.5">{html.escape(line)}</text>' for k, line in enumerate(sub))
            + f'<path d="M{w - 46} {h - 34}h18m-7-7l7 7-7 7" stroke="var(--sig)" {ARROW}/></g>')
    return svg(w, h, f"{label}: {big}", body)


def main():
    projects = json.load(open(DATA))["projects"]
    os.makedirs(OUT, exist_ok=True)
    for old in os.listdir(OUT):  # cards no longer drawn must not linger
        os.remove(os.path.join(OUT, old))
    cards = {
        "hero.svg": hero(),
        "toolkit.svg": toolkit(),
        "published.svg": published(),
        "experience.svg": tile("Experience", "4 roles", ["Kyoka, NASSCOM, Cisco AICTE and Verzeo,", "plus open research and a detection lab."], 0),
        "work.svg": tile("Production work", "1,000+", ["IoT devices secured at Kyoka, with open", "vulnerabilities cut by 45%."], 1),
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
