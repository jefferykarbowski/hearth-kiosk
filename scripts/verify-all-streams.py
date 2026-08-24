"""
Verify every stream currently in the kiosk, including the original 47 that
predate this work and have never been checked.

A stream counts as alive only if it actually hands over audio bytes. A 200 with
an HTML body is a station's "we've moved" page, not a stream. Playlist URLs
(.pls / .m3u / .m3u8) are resolved one hop to the real endpoint first.
"""
import json, re, sys, socket, threading, queue, collections
import urllib.request, urllib.error, urllib.parse

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

STATIONS = json.load(open('all-stations.json', encoding='utf-8'))
UA = 'Mozilla/5.0 (compatible; lyrapod-kiosk/1.0)'
TIMEOUT = 12
WORKERS = 8

AUDIO_HINTS = ('audio', 'mpeg', 'ogg', 'aac', 'octet-stream', 'mpegurl', 'x-scpls')


def read_url(url, nbytes=2048, extra=None):
    h = {'User-Agent': UA, 'Icy-MetaData': '1'}
    if extra:
        h.update(extra)
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.status, (r.headers.get('Content-Type') or '').lower(), r.read(nbytes), r.headers, r.geturl()


def resolve_playlist(url, body):
    """A .pls/.m3u points at the real stream; pull the first http URL out of it."""
    txt = body.decode('utf-8', 'replace')
    m = re.findall(r'https?://[^\s"\'<>]+', txt)
    return m[0] if m else None


def check(url):
    out = {'url': url}
    try:
        status, ct, body, hdrs, final = read_url(url)
    except urllib.error.HTTPError as e:
        # Some Icecast mounts reject Range/HEAD but stream fine on a plain GET.
        if e.code in (400, 405, 416):
            try:
                status, ct, body, hdrs, final = read_url(url, extra={'Range': None})
            except Exception as e2:
                return {**out, 'ok': False, 'error': f'HTTP {e.code}'}
        else:
            return {**out, 'ok': False, 'error': f'HTTP {e.code}'}
    except Exception as e:
        return {**out, 'ok': False, 'error': type(e).__name__}

    out['http'] = status
    out['content_type'] = ct
    out['icy_name'] = hdrs.get('icy-name')

    is_playlist = any(k in ct for k in ('mpegurl', 'x-scpls', 'scpls')) or \
        urllib.parse.urlparse(url).path.lower().endswith(('.pls', '.m3u', '.m3u8'))

    if is_playlist and body:
        inner = resolve_playlist(url, body)
        if inner and inner != url:
            out['resolved_to'] = inner
            try:
                s2, ct2, b2, h2, _ = read_url(inner)
                out.update(http=s2, content_type=ct2, icy_name=h2.get('icy-name') or out['icy_name'])
                out['ok'] = bool(b2) and any(k in ct2 for k in AUDIO_HINTS)
                out['bytes'] = len(b2)
                return out
            except Exception as e:
                return {**out, 'ok': False, 'error': f'playlist target: {type(e).__name__}'}
        # HLS manifests are text but are legitimately playable.
        if 'mpegurl' in ct:
            out['ok'] = b'#EXTM3U' in body
            out['bytes'] = len(body)
            return out

    out['bytes'] = len(body)
    out['ok'] = bool(body) and any(k in ct for k in AUDIO_HINTS)
    if not out['ok'] and body[:200].lstrip().lower().startswith(b'<'):
        out['error'] = 'served HTML, not audio'
    elif not out['ok']:
        out['error'] = f'content-type {ct or "?"}'
    return out


def main():
    q = queue.Queue()
    for s in STATIONS:
        q.put(s)
    results, lock = {}, threading.Lock()


    def worker():
        while True:
            try:
                s = q.get_nowait()
            except queue.Empty:
                return
            r = check(s['streamUrl'])
            r.update(id=s['id'], name=s['name'], genre=s['genre'], has_logo=bool(s['logo']))
            with lock:
                results[s['id']] = r
                if len(results) % 25 == 0:
                    print(f'  {len(results)}/{len(STATIONS)}', flush=True)


    socket.setdefaulttimeout(TIMEOUT)
    ts = [threading.Thread(target=worker, daemon=True) for _ in range(WORKERS)]
    [t.start() for t in ts]
    [t.join() for t in ts]

    json.dump(results, open('verify-all.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

    vals = list(results.values())
    ok = [r for r in vals if r.get('ok')]
    bad = [r for r in vals if not r.get('ok')]
    print(f'\nchecked {len(vals)} streams')
    print(f'  ALIVE {len(ok)}')
    print(f'  DEAD  {len(bad)}')
    print('\nfailure reasons:', dict(collections.Counter(r.get('error', '?') for r in bad)))
    print('\n--- dead ---')
    for r in sorted(bad, key=lambda x: x['name'].lower()):
        print(f"  {r['name'][:24]:<24} {str(r.get('error'))[:26]:<26} {r['url'][:56]}")


if __name__ == '__main__':
    main()
