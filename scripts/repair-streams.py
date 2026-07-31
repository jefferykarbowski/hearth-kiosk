"""
Repair dead streams by finding a current URL for the SAME station.

Identity is not in question here - these call signs are already in the kiosk and
were chosen deliberately. The only thing being replaced is a rotted URL, so the
match needs the name to agree and, critically, the replacement stream must hand
over audio bytes before it is accepted.
"""
import json, re, sys, collections
import urllib.request, urllib.error, urllib.parse

sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from verify_all import check  # reuse the same audio-bytes test

RB = json.load(open('rb/all.json', encoding='utf-8'))
verified = json.load(open('verify-all.json', encoding='utf-8'))
dead = [r for r in verified.values() if not r.get('ok')]
print(f'attempting repair for {len(dead)} dead streams\n')

norm = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())
words = lambda s: [w for w in re.split(r'[^a-z0-9]+', (s or '').lower()) if w]
CALLSIGN = re.compile(r'^[kwc][a-z]{2,4}$')

by_norm = collections.defaultdict(list)
by_token = collections.defaultdict(list)
for r in RB:
    n = norm(r.get('name'))
    if n:
        by_norm[n].append(r)
    for w in words(r.get('name')):
        if CALLSIGN.match(w):
            by_token[w].append(r)


def candidates(name):
    n = norm(name)
    out = list(by_norm.get(n, []))
    for w in words(name):
        if CALLSIGN.match(w):
            out += by_token.get(w, [])
    # Highest clickcount first: the URL most listeners actually reach.
    seen, uniq = set(), []
    for r in sorted(out, key=lambda x: -(x.get('clickcount') or 0)):
        u = r.get('url_resolved') or r.get('url')
        if u and u not in seen:
            seen.add(u)
            uniq.append(r)
    return uniq[:6]


repairs, failed = {}, []
for d in dead:
    got = None
    for c in candidates(d['name']):
        url = c.get('url_resolved') or c.get('url')
        if url == d['url']:
            continue
        res = check(url)
        if res.get('ok'):
            got = {'id': d['id'], 'name': d['name'], 'old': d['url'], 'new': url,
                   'rb_name': (c.get('name') or '').strip(),
                   'codec': c.get('codec'), 'bitrate': c.get('bitrate'),
                   'country': c.get('country')}
            break
    if got:
        repairs[d['id']] = got
        print(f"  FIXED   {d['name'][:22]:<22} -> {got['rb_name'][:26]:<26} {got['new'][:48]}")
    else:
        failed.append(d)
        print(f"  no fix  {d['name'][:22]:<22} ({d.get('error')})")

json.dump(repairs, open('repairs.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(f'\nrepaired {len(repairs)} / {len(dead)}')
print('unfixable:', [d['name'] for d in failed])
