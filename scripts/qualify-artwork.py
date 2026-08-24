"""
Qualify the medium-confidence matches: working stream AND usable local artwork.

Most of these matched on name alone because Radio Browser holds no coordinates
for them, so the geographic cross-check that validated the high-confidence set
is unavailable. Artwork substitutes for it in two ways: a station that still
serves its own logo is a live operation, and the logo is something a human can
eyeball against the station name.

Artwork is downloaded rather than hotlinked. The kiosk has to render with no
network, the same reason the fonts are self-hosted.
"""
import json, os, io, re, sys, threading, queue, collections
import urllib.request, urllib.error

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUTDIR = 'artwork'
os.makedirs(OUTDIR, exist_ok=True)
UA = 'Mozilla/5.0 (compatible; lyrapod-kiosk/1.0)'
TIMEOUT = 10

matched = json.load(open('soundtap-matched.json', encoding='utf-8'))
targets = [r for r in matched if r.get('match', {}).get('confidence') == 'medium']
print(f'qualifying {len(targets)} medium-confidence matches\n')

# Minimal image sniffing - no Pillow dependency. Returns (ext, w, h) or None.
def sniff(b):
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        w = int.from_bytes(b[16:20], 'big'); h = int.from_bytes(b[20:24], 'big')
        return ('png', w, h)
    if b[:3] == b'\xff\xd8\xff':
        i = 2
        while i < len(b) - 9:
            if b[i] != 0xFF:
                i += 1; continue
            m = b[i+1]
            if m in (0xC0, 0xC1, 0xC2, 0xC3):
                h = int.from_bytes(b[i+5:i+7], 'big'); w = int.from_bytes(b[i+7:i+9], 'big')
                return ('jpg', w, h)
            i += 2 + int.from_bytes(b[i+2:i+4], 'big')
        return ('jpg', 0, 0)
    if b[:6] in (b'GIF87a', b'GIF89a'):
        return ('gif', int.from_bytes(b[6:8], 'little'), int.from_bytes(b[8:10], 'little'))
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP':
        return ('webp', 0, 0)
    head = b[:400].lstrip()
    if head[:5].lower() == b'<?xml' or b'<svg' in head.lower():
        return ('svg', 0, 0)
    if b[:4] == b'\x00\x00\x01\x00':
        return ('ico', 0, 0)
    return None


def get(url, limit=400_000):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read(limit)


def check_stream(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': UA, 'Icy-MetaData': '1', 'Range': 'bytes=0-4095'})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        ct = (r.headers.get('Content-Type') or '').lower()
        data = r.read(2048)
        ok = bool(data) and any(k in ct for k in
                                ('audio', 'mpeg', 'ogg', 'aac', 'octet-stream', 'mpegurl'))
        return ok, ct


q = queue.Queue()
for t in targets:
    q.put(t)
results, lock = {}, threading.Lock()


def worker():
    while True:
        try:
            t = q.get_nowait()
        except queue.Empty:
            return
        m = t['match']
        rec = {'slug': t['slug'], 'name': t['name'], 'rb_name': m['rb_name'],
               'match_kind': m['match_kind'], 'distance_km': m['distance_km'],
               'stream_url': m['stream_url'], 'country': m.get('country')}

        try:
            ok, ct = check_stream(m['stream_url'])
            rec['stream_ok'] = ok
            rec['content_type'] = ct
        except Exception as e:
            rec['stream_ok'] = False
            rec['stream_error'] = type(e).__name__

        fav = m.get('favicon')
        rec['art_ok'] = False
        if fav:
            try:
                b = get(fav)
                s = sniff(b)
                if s and len(b) > 200:
                    ext, w, h = s
                    # Reject tiny 16x16 browser favicons: unusable as station art.
                    if ext in ('svg', 'webp', 'ico') or (w == 0 and h == 0) or (w >= 48 and h >= 48):
                        fn = f"{re.sub(r'[^a-z0-9]', '', t['slug'].lower())}.{ext}"
                        open(os.path.join(OUTDIR, fn), 'wb').write(b)
                        rec.update(art_ok=True, art_file=fn, art_ext=ext,
                                   art_w=w, art_h=h, art_bytes=len(b), art_src=fav)
                    else:
                        rec['art_reject'] = f'too small {w}x{h}'
                else:
                    rec['art_reject'] = 'not an image'
            except Exception as e:
                rec['art_reject'] = type(e).__name__

        with lock:
            results[t['slug']] = rec


ts = [threading.Thread(target=worker, daemon=True) for _ in range(6)]
[t.start() for t in ts]
[t.join() for t in ts]

json.dump(results, open('medium-qualified.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

vals = list(results.values())
both = [r for r in vals if r.get('stream_ok') and r.get('art_ok')]
print(f"stream OK          : {sum(1 for r in vals if r.get('stream_ok'))}")
print(f"artwork OK         : {sum(1 for r in vals if r.get('art_ok'))}")
print(f"BOTH (qualifying)  : {len(both)}")
print('\nart rejections:', dict(collections.Counter(r.get('art_reject') for r in vals if r.get('art_reject'))))
print('\n--- qualifying ---')
for r in sorted(both, key=lambda x: x['name'].lower()):
    print(f"  {r['name'][:22]:<22} -> {r['rb_name'][:28]:<28} {r.get('art_ext'):<5} "
          f"{r.get('art_w')}x{r.get('art_h')}  {(r.get('country') or '')[:18]}")
