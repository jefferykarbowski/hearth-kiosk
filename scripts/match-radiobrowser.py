"""
Match the 622 SoundTap stations against Radio Browser to recover live streams.

Geo-first. Exact-name matching alone found only 40 stations, because SoundTap's
"WCBN" is "WCBN-FM 88.3 Ann Arbor" in Radio Browser. Names are messy; positions
are not. So the search space for each station is "everything Radio Browser
places within 150 km", and only then are names compared - which lets name
matching be generous without becoming reckless, since a false positive would
have to be both similarly named AND in the same town.

Confidence:
  high    within 150 km AND a strong name signal (exact, or call sign as a token)
  medium  within 150 km AND a weaker name signal, or exact name with no coords
  low     reported for review, never auto-used
"""
import json, re, math, collections, difflib, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

RB = json.load(open('rb/all.json', encoding='utf-8'))
ST = json.load(open('soundtap-stations.json', encoding='utf-8'))['stations']

norm = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())
words = lambda s: [w for w in re.split(r'[^a-z0-9]+', (s or '').lower()) if w]

GENERIC = {'radio', 'fm', 'am', 'the', 'core', 'boom', 'rock', 'bridge', 'point',
           'edge', 'beat', 'wave', 'mix', 'voice', 'live', 'music', 'station', 'community'}


def haversine(alat, alng, blat, blng):
    R = 6371.0
    p1, p2 = math.radians(alat), math.radians(blat)
    dp, dl = math.radians(blat - alat), math.radians(blng - alng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


# --- spatial index: 1-degree cells (~111 km) -------------------------------
cells = collections.defaultdict(list)
no_coords = collections.defaultdict(list)
for r in RB:
    lat, lng = r.get('geo_lat'), r.get('geo_long')
    if lat is not None and lng is not None and (lat or lng):
        cells[(int(math.floor(lat)), int(math.floor(lng)))].append(r)
    else:
        n = norm(r.get('name'))
        if n:
            no_coords[n].append(r)

print(f'Radio Browser: {len(RB)} stations, {sum(len(v) for v in cells.values())} geolocated')


def nearby(lat, lng, radius_km=150):
    out = []
    span = 2  # 2 cells each way comfortably covers 150 km at most latitudes
    for dy in range(-span, span + 1):
        for dx in range(-span, span + 1):
            for r in cells.get((int(math.floor(lat)) + dy, int(math.floor(lng)) + dx), ()):
                d = haversine(lat, lng, r['geo_lat'], r['geo_long'])
                if d <= radius_km:
                    out.append((d, r))
    return out


# A North American broadcast call sign: K/W/C/X plus 2-4 letters. This is the
# one token that genuinely identifies a station, unlike a city or genre word.
CALLSIGN = re.compile(r'^[kwcx][a-z]{2,4}$')


def name_signal(st_name, rb_name, na=True):
    """How strongly do these two names refer to the SAME station? 0..1 plus a label.

    Deliberately conservative. Proximity is already required by the caller, so
    this must not also relax - two stations in one city are near each other by
    definition, and "Berlin Community Radio" vs "Tango Berlin" is exactly the
    false positive a loose rule produces."""
    a, b = norm(st_name), norm(rb_name)
    if not a or not b:
        return 0.0, 'none'
    if a == b:
        return 1.0, 'exact'

    aw, bw = words(st_name), words(rb_name)

    # Call sign appearing as a whole token on both sides. Only meaningful in
    # North America - elsewhere it misfires on ordinary words, e.g. Hebrew
    # "Kol" ("voice") matching the K-call-sign shape.
    for w in (aw if na else ()):
        if CALLSIGN.match(w) and w in bw:
            return 0.95, 'callsign-token'
    for w in (aw if na else ()):
        if CALLSIGN.match(w) and b.startswith(w):
            return 0.9, 'callsign-prefix'

    # Containment, but only when the shorter name covers most of the longer one,
    # so "Acik Radyo" no longer swallows "Apacik Radyo".
    if a in b or b in a:
        cover = min(len(a), len(b)) / max(len(a), len(b))
        if cover >= 0.7 and min(len(a), len(b)) >= 6:
            return 0.8, 'substring'

    ratio = difflib.SequenceMatcher(None, a, b).ratio()
    if ratio >= 0.9 and len(a) >= 6:
        return ratio, 'fuzzy'
    return 0.0, 'weak'


def best(s):
    cands = []
    na = -170 < s['lng'] < -50 and 15 < s['lat'] < 72

    for d, r in nearby(s['lat'], s['lng']):
        score, kind = name_signal(s['name'], r.get('name'), na=na)
        if score >= 0.8:
            conf = 'high' if score >= 0.9 else 'medium'
            cands.append((0 if conf == 'high' else 1, -score, d, conf, kind, d, r))

    if not cands:
        # No geolocated candidate. Fall back to an exact name match among the
        # stations Radio Browser has no coordinates for.
        n = norm(s['name'])
        for r in no_coords.get(n, []):
            if len(n) >= 5:
                cands.append((2, -1.0, 9e9, 'medium', 'exact-nogeo', None, r))

    if not cands:
        return None

    cands.sort(key=lambda x: (x[0], x[1], x[2]))
    _, negscore, _, conf, kind, dist, r = cands[0]
    return {
        'confidence': conf,
        'match_kind': kind,
        'name_score': round(-negscore, 3),
        'distance_km': round(dist, 1) if dist is not None else None,
        'rb_name': (r.get('name') or '').strip(),
        'stream_url': r.get('url_resolved') or r.get('url'),
        'homepage': r.get('homepage') or None,
        'favicon': r.get('favicon') or None,
        'codec': r.get('codec'),
        'bitrate': r.get('bitrate'),
        'country': r.get('country'),
        'countrycode': r.get('countrycode'),
        'tags': (r.get('tags') or '')[:120],
        'votes': r.get('votes'),
        'clickcount': r.get('clickcount'),
        'stationuuid': r.get('stationuuid'),
    }


out, counts, kinds = [], collections.Counter(), collections.Counter()
for s in ST:
    rec = dict(s)
    m = best(s)
    if m:
        rec['match'] = m
        counts[m['confidence']] += 1
        kinds[m['match_kind']] += 1
    else:
        counts['none'] += 1
    out.append(rec)

json.dump(out, open('soundtap-matched.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

print(f'\nSoundTap stations: {len(ST)}')
for k in ('high', 'medium', 'low', 'none'):
    print(f'  {k:<7} {counts[k]}')
print('\nby signal:', dict(kinds))

print('\n--- high-confidence sample ---')
n = 0
for r in out:
    m = r.get('match')
    if m and m['confidence'] == 'high':
        n += 1
        if n <= 22:
            print(f"  {r['name'][:20]:<20} -> {m['rb_name'][:30]:<30} {str(m['distance_km'])+'km':<8} {m['match_kind']}")
