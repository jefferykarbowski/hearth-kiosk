"""
Verify that matched streams actually respond.

Radio Browser's hidebroken flag reflects *its* last check, not ours, so every
stream is opened here and read for a couple of KB. Anything that will not hand
over audio bytes does not belong in the kiosk.

These are small volunteer-run stations, so: 6 workers, one request each, a
short read, and the connection closed immediately.
"""
import json, re, socket, threading, queue, collections
import urllib.request, urllib.error

MATCHED = json.load(open('soundtap-matched.json', encoding='utf-8'))
CURRENT = None

TIMEOUT = 8
WORKERS = 6
UA = 'Mozilla/5.0 (compatible; lyrapod-kiosk/1.0)'

targets = [r for r in MATCHED if r.get('match', {}).get('confidence') == 'high']
print(f'verifying {len(targets)} high-confidence streams')

q = queue.Queue()
for t in targets:
    q.put(t)
results, lock, done = {}, threading.Lock(), [0]


def check(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Icy-MetaData': '1',
        'Range': 'bytes=0-4095',
    })
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        ct = (r.headers.get('Content-Type') or '').lower()
        name = r.headers.get('icy-name')
        data = r.read(2048)
        return {
            'http': r.status,
            'content_type': ct,
            'icy_name': name,
            'bytes': len(data),
            'audio': bool(data) and ('audio' in ct or 'mpeg' in ct or 'ogg' in ct
                                     or 'aac' in ct or 'octet-stream' in ct
                                     or ct.startswith('application/vnd.apple.mpegurl')
                                     or 'mpegurl' in ct),
        }


def worker():
    while True:
        try:
            t = q.get_nowait()
        except queue.Empty:
            return
        url = t['match']['stream_url']
        rec = {'slug': t['slug'], 'name': t['name'], 'url': url}
        try:
            rec.update(check(url))
            rec['ok'] = rec.get('audio', False)
        except urllib.error.HTTPError as e:
            rec['ok'] = False; rec['error'] = f'HTTP {e.code}'
        except Exception as e:
            rec['ok'] = False; rec['error'] = f'{type(e).__name__}'
        with lock:
            results[t['slug']] = rec
            done[0] += 1
            if done[0] % 20 == 0:
                print(f'  {done[0]}/{len(targets)}', flush=True)


socket.setdefaulttimeout(TIMEOUT)
ts = [threading.Thread(target=worker, daemon=True) for _ in range(WORKERS)]
[t.start() for t in ts]
[t.join() for t in ts]

json.dump(results, open('stream-verify.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
ok = [r for r in results.values() if r.get('ok')]
bad = [r for r in results.values() if not r.get('ok')]
print(f'\nLIVE  {len(ok)}')
print(f'DEAD  {len(bad)}')
print('failure reasons:', dict(collections.Counter(r.get('error', 'not-audio') for r in bad)))
