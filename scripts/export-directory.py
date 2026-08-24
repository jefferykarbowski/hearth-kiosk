"""
Build a single consolidated station export for the SoundTap rebuild.

Everything known about all 622 stations in one file, with provenance on each
field so a downstream consumer knows what was verified versus inferred.
"""
import json, re, os, sys, collections
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REPO = 'C:/Users/Jeff/Documents/GitHub/radio-kiosk/.claude/worktrees/kitchen-kiosk-setup-0921a0'

matched = json.load(open('soundtap-matched.json', encoding='utf-8'))
verify = json.load(open('verify-all.json', encoding='utf-8'))          # by kiosk id
logos = json.load(open('logos-sourced.json', encoding='utf-8'))        # by kiosk id
medium = {r['slug']: r for r in json.load(open('medium-reviewed.json', encoding='utf-8'))}

ctx = open(f'{REPO}/frontend/src/contexts/RadioContext.jsx', encoding='utf-8').read()
kiosk_ids = set(re.findall(r"id:\s*'([^']+)'", ctx))
kiosk_logo = dict(re.findall(r"id:\s*'([^']+)',\s*name:[^\n]*\n\s*streamUrl:[^\n]*\n\s*logo:\s*'([^']+)'", ctx))

slug_id = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())

out = []
for r in matched:
    sid = slug_id(r['slug'])
    m = r.get('match') or {}
    v = verify.get(sid) or {}
    lg = logos.get(sid) or {}

    rec = {
        # --- identity, from SoundTap's archived station map (authoritative) ---
        'slug': r['slug'],
        'name': r['name'],
        'lat': r['lat'],
        'lng': r['lng'],
        'region': r['region'],
        'archived_page': f"https://web.archive.org/web/2019/http://soundtap.com/{r['slug']}/",

        # --- current operating data, from Radio Browser (may drift) ---
        'stream_url': m.get('stream_url'),
        'homepage': m.get('homepage') or r.get('homepage'),
        'favicon': m.get('favicon'),
        'codec': m.get('codec'),
        'bitrate': m.get('bitrate'),
        'country': m.get('country'),
        'countrycode': m.get('countrycode'),
        'tags': m.get('tags') or None,
        'radiobrowser_uuid': m.get('stationuuid'),
        'radiobrowser_name': m.get('rb_name'),

        # --- how much to trust the join ---
        'match_confidence': m.get('confidence'),
        'match_kind': m.get('match_kind'),
        'match_distance_km': m.get('distance_km'),

        # --- what we actually proved ---
        'stream_verified': bool(v.get('ok')) if v else None,
        'in_lyrapod_kiosk': sid in kiosk_ids,
        'artwork_file': (kiosk_logo.get(sid) or (f"/logos/{sid}.{lg['ext']}" if lg.get('source') else None)),
        'artwork_source': lg.get('source'),
    }

    if r['slug'] in medium:
        rec['country_crosscheck'] = medium[r['slug']].get('agree')

    out.append(rec)

out.sort(key=lambda x: (x['region'], x['name'].lower()))

doc = {
    '_meta': {
        'title': 'SoundTap station directory, reconstructed',
        'generated': '2026-07-31',
        'station_count': len(out),
        'provenance': {
            'identity': ('slug, name, lat, lng come from the `var stations` array embedded in '
                         'http://soundtap.com/stationmap, recovered from the Internet Archive. '
                         'This is SoundTap\'s own data and is authoritative for what the site listed.'),
            'operating_data': ('stream_url, homepage, favicon, codec, country come from Radio Browser '
                               '(https://api.radio-browser.info) as of 2026-07-31, joined to SoundTap by '
                               'name + geography. These drift; re-resolve before relying on them.'),
            'soundtap_streams': ('SoundTap\'s OWN stream URLs are unrecoverable. It served them from '
                                 '/stationdata/<id>/, which the Wayback Machine never captured, and the '
                                 'public station edit form omitted the field.'),
        },
        'how_to_read_confidence': {
            'high': 'name matched AND Radio Browser places the station within 150km of SoundTap\'s coordinates',
            'medium': 'exact name match but Radio Browser has no coordinates, so no positional confirmation',
            'null': 'no Radio Browser match found - 477 stations, mostly small campus outfits not in that directory',
        },
        'caveats': [
            'stream_verified=true means the URL returned actual audio bytes on 2026-07-31, not that it works today.',
            'match_kind="substring" is a name-containment guess, not an identity match. Treat as unverified.',
            'country_crosscheck=false marks a station whose SoundTap coordinates disagree with the Radio Browser country. Those joins are wrong.',
            'Artwork paths refer to frontend/public/logos/ in the lyrapod kiosk repo, not to this file.',
        ],
        'related_files': {
            'data/soundtap-cdx-index.txt': '13,926 archived soundtap.com URLs (path, timestamp, HTTP status) for rebuilding the rest of the site',
            'data/soundtap-stations.csv': 'the 622 stations as a spreadsheet',
            'scripts/': 'the harvest, match, verify and artwork pipeline, all re-runnable',
        },
    },
    'stations': out,
}

json.dump(doc, open('soundtap-directory.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

c = collections.Counter(x['match_confidence'] for x in out)
print(f'exported {len(out)} stations')
print('  confidence :', dict(c))
print('  with stream:', sum(1 for x in out if x['stream_url']))
print('  verified   :', sum(1 for x in out if x['stream_verified']))
print('  in kiosk   :', sum(1 for x in out if x['in_lyrapod_kiosk']))
print('  w/ artwork :', sum(1 for x in out if x['artwork_file']))
print('  homepages  :', sum(1 for x in out if x['homepage']))
