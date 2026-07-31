"""
Source station logos, trying three places in order of quality.

  1. Radio Browser's favicon field        - already curated, often the real logo
  2. The station's own homepage           - apple-touch-icon > og:image > <link icon>
  3. SoundTap's archived avatar           - the Internet Archive kept 1,863 of them

Everything is downloaded and decoded locally; a URL that 200s with an HTML error
page is not a logo. 16x16 browser favicons are rejected as unusable at kiosk size.
"""
import json, os, re, sys, threading, queue, collections
import urllib.request, urllib.error, urllib.parse

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT = 'artwork2'
os.makedirs(OUT, exist_ok=True)
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
TIMEOUT = 12
MIN_PX = 48

def sniff(b):
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        return ('png', int.from_bytes(b[16:20], 'big'), int.from_bytes(b[20:24], 'big'))
    if b[:3] == b'\xff\xd8\xff':
        i = 2
        while i < len(b) - 9:
            if b[i] != 0xFF:
                i += 1; continue
            if b[i + 1] in (0xC0, 0xC1, 0xC2, 0xC3):
                return ('jpg', int.from_bytes(b[i + 7:i + 9], 'big'), int.from_bytes(b[i + 5:i + 7], 'big'))
            i += 2 + int.from_bytes(b[i + 2:i + 4], 'big')
        return ('jpg', 0, 0)
    if b[:6] in (b'GIF87a', b'GIF89a'):
        return ('gif', int.from_bytes(b[6:8], 'little'), int.from_bytes(b[8:10], 'little'))
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP':
        return ('webp', 0, 0)
    head = b[:500].lstrip().lower()
    if head[:5] == b'<?xml' or b'<svg' in head:
        return ('svg', 0, 0)
    if b[:4] == b'\x00\x00\x01\x00':
        return ('ico', 0, 0)
    return None


def fetch(url, limit=600_000):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read(limit), r.geturl()


def usable(b):
    s = sniff(b)
    if not s or len(b) < 300:
        return None
    ext, w, h = s
    if ext in ('svg', 'webp', 'ico'):
        return s
    if w == 0 and h == 0:
        return s
    if w >= MIN_PX and h >= MIN_PX:
        return s
    return None


def from_homepage(home):
    """Return candidate image URLs from a station's homepage, best first."""
    html, final = fetch(home, 300_000)
    html = html.decode('utf-8', 'replace')
    cands = []

    for m in re.finditer(r'<link[^>]+rel=["\']?([^"\'>]*icon[^"\'>]*)["\']?[^>]*>', html, re.I):
        tag = m.group(0)
        href = re.search(r'href=["\']([^"\']+)', tag, re.I)
        if not href:
            continue
        sizes = re.search(r'sizes=["\']?(\d+)', tag, re.I)
        px = int(sizes.group(1)) if sizes else (180 if 'apple' in m.group(1).lower() else 0)
        cands.append((-px, href.group(1)))

    og = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', html, re.I)
    if og:
        cands.append((-150, og.group(1)))

    cands.sort()
    urls = [urllib.parse.urljoin(final, u) for _, u in cands]
    urls.append(urllib.parse.urljoin(final, '/favicon.ico'))
    seen, out = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u); out.append(u)
    return out[:6]


def save(sid, b, ext):
    fn = f'{sid}.{ext}'
    open(os.path.join(OUT, fn), 'wb').write(b)
    return fn


def worker():
    while True:
        try:
            s = q.get_nowait()
        except queue.Empty:
            return
        sid = s['id']
        m = by_slug.get(sid, {}).get('match', {})
        rec = {'id': sid, 'name': s['name'], 'source': None}

        # 1. Radio Browser favicon
        for url in ([m['favicon']] if m.get('favicon') else []):
            try:
                b, _ = fetch(url)
                u = usable(b)
                if u:
                    rec.update(source='radiobrowser', file=save(sid, b, u[0]),
                               ext=u[0], w=u[1], h=u[2], src_url=url)
                    break
            except Exception:
                pass

        # 2. The station's homepage
        if not rec['source'] and m.get('homepage'):
            try:
                for url in from_homepage(m['homepage']):
                    try:
                        b, _ = fetch(url)
                        u = usable(b)
                        if u:
                            rec.update(source='homepage', file=save(sid, b, u[0]),
                                       ext=u[0], w=u[1], h=u[2], src_url=url)
                            break
                    except Exception:
                        continue
            except Exception:
                pass

        # 3. SoundTap's archived avatar
        if not rec['source']:
            slug = by_slug.get(sid, {}).get('slug')
            if slug:
                with arch_lock:
                    try:
                        html, _ = fetch(f'https://web.archive.org/web/2019/http://soundtap.com/{slug}/', 300_000)
                        html = html.decode('utf-8', 'replace')
                        av = re.search(r'id="overlay-avatar".*?<img src="([^"]+)"', html, re.S)
                        if av:
                            u2 = av.group(1)
                            if u2.startswith('/web/'):
                                u2 = 'https://web.archive.org' + u2
                            b, _ = fetch(u2)
                            u = usable(b)
                            if u:
                                rec.update(source='soundtap-archive', file=save(sid, b, u[0]),
                                           ext=u[0], w=u[1], h=u[2], src_url=u2)
                    except Exception:
                        pass

        with lock:
            results[sid] = rec
            n = len(results)
            if n % 15 == 0:
                print(f'  {n}/{len(need)}', flush=True)




def main():
    stations = json.load(open('all-stations.json', encoding='utf-8'))
    matched = json.load(open('soundtap-matched.json', encoding='utf-8'))
    by_slug = {re.sub(r'[^a-z0-9]', '', r['slug'].lower()): r for r in matched if r.get('match')}

    need = [s for s in stations if not s['logo']]
    print(f'sourcing logos for {len(need)} stations\n')


    q = queue.Queue()
    for s in need:
        q.put(s)
    results, lock = {}, threading.Lock()
    arch_lock = threading.Semaphore(2)   # archive.org gets at most 2 at a time


    ts = [threading.Thread(target=worker, daemon=True) for _ in range(6)]
    [t.start() for t in ts]
    [t.join() for t in ts]

    json.dump(results, open('logos-sourced.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    got = [r for r in results.values() if r['source']]
    print(f'\nfound {len(got)} / {len(need)}')
    print('by source:', dict(collections.Counter(r['source'] for r in got)))
    print('\nstill missing:', [r['name'] for r in results.values() if not r['source']])



if __name__ == '__main__':
    main()
