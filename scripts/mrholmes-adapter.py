import argparse, json, pathlib, re, urllib.request
parser = argparse.ArgumentParser()
parser.add_argument("--root", required=True); parser.add_argument("--username", required=True); parser.add_argument("--limit", type=int, default=40)
args = parser.parse_args()
if not re.fullmatch(r"[A-Za-z0-9._-]{1,64}", args.username): raise SystemExit("username inválido")
folder = pathlib.Path(args.root) / "Site_lists" / "Username"
candidates = list(folder.glob("*.json"))
if not candidates: raise SystemExit("base de sites do Mr.Holmes não encontrada")
raw = json.loads(candidates[0].read_text(encoding="utf-8")); entries = []
for group in raw if isinstance(raw, list) else [raw]:
    if isinstance(group, dict): entries.extend(group.values())
results = []
for item in entries[:max(1, min(args.limit, 50))]:
    if not isinstance(item, dict): continue
    template = item.get("user") or item.get("url")
    if not isinstance(template, str) or "{}" not in template: continue
    url = template.replace("{}", args.username)
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 OSINT-Agent/1.0"})
        with urllib.request.urlopen(request, timeout=8) as response:
            if response.status < 400: results.append({"site": item.get("name", "unknown"), "url": url, "status": response.status})
    except Exception: pass
print(json.dumps({"source": "Mr.Holmes site definitions", "username": args.username, "matches": results}, ensure_ascii=False))
