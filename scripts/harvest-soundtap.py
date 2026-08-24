"""
Harvest station metadata from the archived SoundTap station pages.

Extraction targets the page's real structure rather than guessing at links:
  og:title        -> "NAME (City, ST)"
  og:description  -> the station's own homepage URL
  a.external      -> same homepage, as a fallback
  .info.location  -> location string
  Active/Hiatus   -> station status at time of capture

Wayback is a free service and throttles hard. Two workers, a real delay, and
exponential backoff on connection resets - the previous 4-worker run lost 86%
of requests to URLError, which is the archive telling us to slow down.
"""
import json, re, time, threading, queue, urllib.request, urllib.error, html as htmlmod

STATIONS = json.load(open('stations_map.json', encoding='utf-8'))
OUT = 'stations_harvested.json'
WORKERS = 2
DELAY = 0.8
RETRIES = 3

UA = 'Mozilla/5.0 (compatible; station-list-research/1.0)'


def strip_wayback(u):
    return re.sub(r'^https?://web\.archive\.org/web/[0-9a-z_]*(?:im_|js_)?/', '', u or '')


def fetch(slug):
    url = f'https://web.archive.org/web/2019/http://soundtap.com/{slug}/'
    last = None
    for attempt in range(RETRIES):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise                      # genuinely absent; no point retrying
            last = e
        except Exception as e:
            last = e
        time.sleep(1.5 * (2 ** attempt))   # 1.5s, 3s, 6s
    raise last


def meta(html, prop):
    m = re.search(rf'<meta\s+property="{prop}"\s+content="([^"]*)"', html)
    return htmlmod.unescape(m.group(1)).strip() if m else None


def extract(html):
    rec = {}

    title = meta(html, 'og:title')          # "WFMU (Jersey City, NJ)"
    if title:
        rec['title'] = title
        m = re.match(r'^(.*?)\s*\(([^)]*)\)\s*$', title)
        if m:
            rec['name_page'], rec['location'] = m.group(1).strip(), m.group(2).strip()

    desc = meta(html, 'og:description')
    if desc and desc.startswith('http'):
        rec['homepage'] = desc

    if not rec.get('homepage'):
        m = re.search(r'<a class="external" href="([^"]+)"', html)
        if m:
            u = strip_wayback(m.group(1))
            if u.startswith('http'):
                rec['homepage'] = u

    if not rec.get('location'):
        m = re.search(r'class="info location">([^<]*)<', html)
        if m:
            rec['location'] = htmlmod.unescape(m.group(1)).strip()

    # The page renders both labels and hides one; the visible class carries state.
    m = re.search(r'id="active"[^>]*class="([^"]*)"', html)
    if m:
        rec['status'] = 'hiatus' if 'hide' in m.group(1) else 'active'

    img = re.search(r'id="overlay-avatar".*?<img src="([^"]+)"', html, re.S)
    if img:
        rec['logo'] = 'https://web.archive.org' + img.group(1) if img.group(1).startswith('/web/') else strip_wayback(img.group(1))

    return rec


results, lock, q = {}, threading.Lock(), queue.Queue()
for s in STATIONS:
    q.put(s)
done = [0]


def worker():
    while True:
        try:
            s = q.get_nowait()
        except queue.Empty:
            return
        rec = {'slug': s['url'], 'name': s['name'], 'lat': s['lat'], 'lng': s['lng']}
        try:
            rec.update(extract(fetch(s['url'])))
            rec['ok'] = True
        except Exception as e:
            rec['ok'] = False
            rec['error'] = f'{type(e).__name__}: {e}'[:100]
        with lock:
            results[s['url']] = rec
            done[0] += 1
            if done[0] % 25 == 0:
                print(f"{done[0]}/{len(STATIONS)} ok={sum(1 for r in results.values() if r.get('ok'))}", flush=True)
                json.dump(list(results.values()), open(OUT, 'w', encoding='utf-8'), indent=1)
        time.sleep(DELAY)


threads = [threading.Thread(target=worker, daemon=True) for _ in range(WORKERS)]
[t.start() for t in threads]
[t.join() for t in threads]

json.dump(list(results.values()), open(OUT, 'w', encoding='utf-8'), indent=1)
vals = list(results.values())
print(f"DONE total={len(vals)} ok={sum(1 for r in vals if r.get('ok'))} "
      f"homepage={sum(1 for r in vals if r.get('homepage'))} "
      f"location={sum(1 for r in vals if r.get('location'))}")
