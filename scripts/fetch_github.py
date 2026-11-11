#!/usr/bin/env python3
"""Fetch the public GitHub data the README cards are drawn from, into data/github.json.

Contributions come from the GraphQL API when a token is available (GITHUB_TOKEN in Actions
is enough for public data) and from the public contributions page otherwise. Repositories
come from the REST API. Runs daily from .github/workflows/cards.yml.
"""
import datetime as dt
import json
import os
import re
import sys
import urllib.request

USER = os.environ.get("GH_USER", "itsashutoshpsingh")
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "github.json")
UA = "readme-cards (github.com/%s/portfolio)" % USER


def get(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def contributions_graphql():
    q = """query($login:String!){ user(login:$login){ contributionsCollection{ contributionCalendar{
      totalContributions weeks{ contributionDays{ date contributionCount } } } } } }"""
    body = json.dumps({"query": q, "variables": {"login": USER}}).encode()
    res = json.loads(get("https://api.github.com/graphql", body, {"Authorization": "bearer " + TOKEN, "Content-Type": "application/json"}))
    cal = res["data"]["user"]["contributionsCollection"]["contributionCalendar"]
    days = [{"date": d["date"], "count": d["contributionCount"]} for w in cal["weeks"] for d in w["contributionDays"]]
    return days


def contributions_html():
    html = get("https://github.com/users/%s/contributions" % USER)
    cells = re.findall(r'data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"', html)
    tips = dict(re.findall(r'<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)</tool-tip>', html))
    ids = re.findall(r'id="(contribution-day-component-[^"]+)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"', html)
    by_id = {date: tips.get(i, "") for i, date in ids}
    days = []
    for date, level in cells:
        m = re.match(r"\s*(\d+|No)", by_id.get(date, ""))
        count = 0 if not m or m.group(1) == "No" else int(m.group(1))
        days.append({"date": date, "count": count, "level": int(level)})
    days.sort(key=lambda d: d["date"])
    return days


def repos():
    headers = {"Accept": "application/vnd.github+json"}
    if TOKEN:
        headers["Authorization"] = "bearer " + TOKEN
    items = json.loads(get("https://api.github.com/users/%s/repos?per_page=100&sort=updated" % USER, headers=headers))
    out = []
    for r in items:
        if r.get("fork") or r.get("archived"):
            continue
        out.append({"name": r["name"], "description": r.get("description") or "", "language": r.get("language") or "",
                    "stars": r.get("stargazers_count", 0), "url": r["html_url"], "pushed": r.get("pushed_at", "")[:10]})
    out.sort(key=lambda r: (r["stars"], r["pushed"]), reverse=True)
    return out


def main():
    data = {"user": USER, "fetched": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d"), "days": [], "repos": []}
    try:
        data["days"] = contributions_graphql() if TOKEN else contributions_html()
    except Exception as e:  # keep yesterday's data rather than publishing an empty chart
        print("contributions failed:", e, file=sys.stderr)
        try:
            data["days"] = contributions_html()
        except Exception as e2:
            print("fallback failed:", e2, file=sys.stderr)
    try:
        data["repos"] = repos()
    except Exception as e:
        print("repos failed:", e, file=sys.stderr)
    if not data["days"] and os.path.exists(OUT):
        old = json.load(open(OUT))
        data["days"] = old.get("days", [])
        data["repos"] = data["repos"] or old.get("repos", [])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, "w"), indent=1)
    print("days", len(data["days"]), "repos", len(data["repos"]))


if __name__ == "__main__":
    main()
