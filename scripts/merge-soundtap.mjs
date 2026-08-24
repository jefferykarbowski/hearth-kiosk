// Merge the soundtap.fm catalogue into LyraPod's station list.
// Union: every carried soundtap station, plus every LyraPod station soundtap
// does not have. Overlaps keep LyraPod's id (favourites key off it) and take
// soundtap's freshly probed https stream.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const LYRA = 'C:/Users/Jeff/Documents/GitHub/radio-kiosk/.claude/worktrees/friendly-lehmann-a8cec8';
const ST = 'C:/Users/Jeff/Documents/GitHub/soundtap';
const DB = `${ST}/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/5408558db934195e89a1b1694e84ce8fadb8908e0cef02494fadd77e00ff2617.sqlite`;

// ---------- read the current LyraPod catalogue ----------
// config/stations.js once it exists (so this is re-runnable), otherwise the
// original inline array in RadioContext.jsx.
const CATALOGUE = `${LYRA}/frontend/src/config/stations.js`;
const LEGACY = `${LYRA}/frontend/src/contexts/RadioContext.jsx`;
const source = fs.existsSync(CATALOGUE) ? CATALOGUE : LEGACY;
const src = fs.readFileSync(source, 'utf8');
const open = src.indexOf('[', src.indexOf('DEFAULT_STATIONS'));
let depth = 0, end = -1;
for (let i = open; i < src.length; i++) {
  if (src[i] === '[') depth++;
  else if (src[i] === ']') { depth--; if (!depth) { end = i; break; } }
}
const lyra = eval(src.slice(open, end + 1));
console.log(`baseline: ${lyra.length} stations from ${path.basename(source)}\n`);

// ---------- read soundtap ----------
const db = new DatabaseSync(DB, { readOnly: true });
const st = db.prepare(`
  SELECT s.*, (SELECT group_concat(g.name, ', ') FROM station_genres sg
    JOIN genres g ON g.id = sg.genre_id WHERE sg.station_id = s.id ORDER BY g.sort) AS genres
  FROM stations s WHERE s.approved = 1 AND s.stream_healthy = 1
  ORDER BY s.name COLLATE NOCASE`).all();
db.close();

// A bare HTML5 Audio element cannot play an HLS playlist without hls.js, so an
// .m3u8 entry is a station that silently does nothing when tapped. soundtap
// flags these as stream_format 'hls'; LyraPod's own list carried two more that
// its byte-level verifier passed, because a playlist does return bytes.
const isHls = (u, fmt) => fmt === 'hls' || /\.m3u8(\?|$)/i.test(u || '');
const hls = st.filter(s => isHls(s.stream_url, s.stream_format));
const carried = st.filter(s => !isHls(s.stream_url, s.stream_format));

// ---------- match ----------
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
// "WLUW" and "WLUW-FM", "CHIRP" and "CHIRP Radio" are the same station.
const bare = (s) => norm(s).replace(/(fm|radio)$/, '');
const urlKey = (u) => { try { const x = new URL(u); return (x.host + x.pathname).toLowerCase().replace(/\/$/, ''); } catch { return ''; } };

const lyraByName = new Map();
for (const s of lyra) {
  lyraByName.set(norm(s.name), s);
  if (!lyraByName.has(bare(s.name))) lyraByName.set(bare(s.name), s);
}
const lyraByUrl = new Map(lyra.map(s => [urlKey(s.streamUrl), s]));

const claimed = new Set();
const pairs = new Map(); // lyra.id -> soundtap row
for (const s of carried) {
  const hit = lyraByName.get(norm(s.callsign)) || lyraByName.get(norm(s.name))
    || lyraByUrl.get(urlKey(s.stream_url))
    || lyraByName.get(bare(s.callsign)) || lyraByName.get(bare(s.name));
  if (hit && !pairs.has(hit.id)) { pairs.set(hit.id, s); claimed.add(s.id); }
}

// ---------- post-merge stream verification ----------
// Every carried stream was re-probed on 2026-08-24, three weeks after
// soundtap's own probe. scripts/verify-all-streams.py reported 9 failures; four
// of those were the verifier, not the station — Python's TLS defaults are
// rejected by some Icecast hosts, and one URL only redirects to its live mount
// under a browser User-Agent. Each was re-checked by hand with curl.
const DEAD = new Set([
  'BAU Radyo',   // 206, text/html — no longer a stream
  'KDFC',        // 403 to any client, browser User-Agent included
  'KHSU',        // connection times out
  'KRFF',        // 302 to an index.html; the mount is gone
  'WRCT',        // TLS handshake fails outright, so no browser can play it
  'WUNH',        // connection refused
]);
// name -> replacement stream url, where a probe found a working mount
const REPAIRS = {
  'Radyo ODTU': 'https://stream3.radyoodtu.com.tr/;', // 302 -> stream3, audio/aacp
};

// ---------- genre label (single truncated line in the grid) ----------
// soundtap's city column is 'Unknown' for 161 of its 239 and occasionally
// carries the callsign or a blog name glued to the front of the town.
const cleanCity = (city, callsign) => {
  if (!city || city === 'Unknown') return null;
  let c = city.replace(new RegExp(`^${callsign}\\s+`, 'i'), '').trim();
  const words = c.split(/\s+/);
  if (words.length > 2) c = words.slice(-2).join(' '); // 'Chapelboro Chapel Hill' -> 'Chapel Hill'
  return c || null;
};
const label = (s) => {
  const g = s.genres ? s.genres.split(', ').slice(0, 2).join(', ') : '';
  const city = cleanCity(s.city, s.callsign);
  const place = city || s.country;
  if (g && place) return `${g} • ${place}`;
  return g || place || 'Community Radio';
};

// ---------- logos ----------
const lyraLogoDir = `${LYRA}/frontend/public/logos`;
const stLogoDir = `${ST}/public/logos`;
const existing = new Set(fs.readdirSync(lyraLogoDir));
const copied = [];
const md5 = (p) => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');

function bringLogo(s) {
  if (!s.logo) return null;
  const from = path.join(stLogoDir, s.logo);
  if (!fs.existsSync(from)) return null;
  let name = s.logo;
  if (existing.has(name)) {
    // same bytes -> reuse; different bytes -> keep LyraPod's and take a new name
    const a = md5(path.join(lyraLogoDir, name)), b = md5(from);
    if (a === b) return `/logos/${name}`;
    const ext = path.extname(name), base = path.basename(name, ext);
    name = `${base}-st${ext}`;
    if (existing.has(name)) return `/logos/${name}`;
  }
  fs.copyFileSync(from, path.join(lyraLogoDir, name));
  existing.add(name);
  copied.push(name);
  return `/logos/${name}`;
}

// ---------- build ----------
const out = [];
const usedIds = new Set();
const idFor = (slug) => {
  let id = slug.replace(/[^a-z0-9-]/g, '');
  while (usedIds.has(id)) id += 'x';
  usedIds.add(id);
  return id;
};

// 1. existing LyraPod stations, upgraded where soundtap knows them
let upgraded = 0, keptLyraOnly = 0;
const droppedHls = [];
for (const l of lyra) {
  const s = pairs.get(l.id);
  // An existing entry only survives on an HLS url if soundtap has a real one.
  if (!s && isHls(l.streamUrl)) { droppedHls.push(l); continue; }
  usedIds.add(l.id);
  if (s) {
    upgraded++;
    out.push({
      id: l.id,
      name: l.name,
      streamUrl: s.stream_url,          // https, freshly probed
      logo: l.logo || bringLogo(s),     // keep the artwork already shipping
      genre: l.genre,                   // keep the hand-written tagline
    });
  } else {
    keptLyraOnly++;
    out.push({ id: l.id, name: l.name, streamUrl: l.streamUrl, logo: l.logo, genre: l.genre });
  }
}

// 2. soundtap stations LyraPod did not have
let added = 0;
for (const s of carried) {
  if (claimed.has(s.id)) continue;
  added++;
  out.push({
    id: idFor(s.slug),
    name: s.callsign || s.name,
    streamUrl: s.stream_url,
    logo: bringLogo(s),
    genre: label(s),
  });
}

// 3. one entry per stream. soundtap lists some HD subchannels separately
// (KMSU-HD2, WETS News) but carries the parent's stream url for them, so they
// would appear as separate rows playing identical audio. Keep the entry that
// was already shipping, else the plainest name.
const byStream = new Map();
for (const s of out) {
  const k = s.streamUrl;
  const prev = byStream.get(k);
  if (!prev) { byStream.set(k, s); continue; }
  const existed = (x) => lyra.some(l => l.id === x.id);
  const better = existed(prev) !== existed(s)
    ? (existed(prev) ? prev : s)
    : (prev.name.length <= s.name.length ? prev : s);
  byStream.set(k, better);
}
const deduped = [...byStream.values()];
const droppedDupes = out.filter(s => !deduped.includes(s));
out.length = 0;
out.push(...deduped);

// 4. drop what the post-merge probe found dead, and apply the repaired mounts
const droppedDead = out.filter(s => DEAD.has(s.name));
const kept = out.filter(s => !DEAD.has(s.name));
let repaired = 0;
for (const s of kept) {
  if (REPAIRS[s.name] && s.streamUrl !== REPAIRS[s.name]) { s.streamUrl = REPAIRS[s.name]; repaired++; }
}
out.length = 0;
out.push(...kept);

out.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

// ---------- emit ----------
const body = out.map(s => {
  const lines = [
    `    id: ${JSON.stringify(s.id)},`,
    `    name: ${JSON.stringify(s.name)},`,
    `    streamUrl: ${JSON.stringify(s.streamUrl)},`,
  ];
  if (s.logo) lines.push(`    logo: ${JSON.stringify(s.logo)},`);
  lines.push(`    genre: ${JSON.stringify(s.genre)}`);
  return `  {\n${lines.join('\n')}\n  }`;
}).join(',\n');

const header = `// Station catalogue — ${out.length} stations.
//
// Generated by scripts/merge-soundtap.mjs; edit that, not this.
//
// Upstream is the soundtap.fm catalogue (the soundtap repo's D1 database),
// which carries a station only after probing it live, so those entries are all
// https and were serving audio when soundtap last checked. Stations LyraPod
// already had and soundtap does not list are kept unchanged, http streams
// included — those play here because the kiosk is served over http itself.
//
// Excluded on purpose:
//   - HLS (.m3u8). A bare HTML5 Audio element cannot play a playlist without
//     hls.js, so such an entry is a tile that silently does nothing.
//   - Entries sharing another station's stream url, which is how soundtap
//     records some HD subchannels; two tiles playing identical audio is worse
//     than one.
//   - Stations found dead when every stream here was re-probed on 2026-08-24.
//
// Streams rot. Re-probe with scripts/verify-all-streams.py, and treat its TLS
// failures sceptically: Python's defaults are refused by some Icecast hosts
// that browsers negotiate with fine.

export const DEFAULT_STATIONS = [
${body}
];

export default DEFAULT_STATIONS;
`;

fs.writeFileSync(`${LYRA}/frontend/src/config/stations.js`, header);

// Provenance record, so the next person can see what this pass decided and why
// without re-deriving it. Mirrors how the earlier station work is documented.
fs.writeFileSync(`${LYRA}/data/soundtap-merge.json`, JSON.stringify({
  _meta: {
    generated_by: 'scripts/merge-soundtap.mjs',
    upstream: 'soundtap repo D1 catalogue (.wrangler local state), plus its public/logos',
    upstream_probe: 'soundtap probed its own streams 2026-08-02/03',
    reprobe: 'every stream in the merged list re-probed 2026-08-24 with scripts/verify-all-streams.py',
    caveat: "verify-all-streams.py reports a TLS handshake failure for some hosts that browsers negotiate fine; entries it flagged were re-checked with curl before being dropped",
  },
  totals: {
    lyrapod_before: lyra.length,
    soundtap_carried: carried.length,
    overlap_upgraded: upgraded,
    added_from_soundtap: added,
    lyrapod_only_kept: keptLyraOnly,
    total: out.length,
    with_artwork: out.filter(s => s.logo).length,
  },
  excluded_hls_soundtap: hls.map(s => ({ name: s.callsign, url: s.stream_url })),
  excluded_hls_lyrapod: droppedHls.map(s => ({ name: s.name, url: s.streamUrl })),
  collapsed_duplicate_stream: droppedDupes.map(s => ({ name: s.name, url: s.streamUrl })),
  dropped_dead: droppedDead.map(s => ({ name: s.name, url: s.streamUrl })),
  repaired: REPAIRS,
}, null, 2) + '\n');

console.log(`LyraPod before      : ${lyra.length}`);
console.log(`soundtap carried    : ${carried.length} (of ${st.length}; ${hls.length} HLS excluded)`);
console.log(`  overlap upgraded  : ${upgraded}`);
console.log(`  new from soundtap : ${added}`);
console.log(`  LyraPod-only kept : ${keptLyraOnly}`);
console.log(`TOTAL               : ${out.length}`);
console.log(`logos copied        : ${copied.length}`);
console.log(`without logo        : ${out.filter(s => !s.logo).length}`);
console.log(`http streams left   : ${out.filter(s => s.streamUrl.startsWith('http:')).length}`);

console.log(`\nHLS excluded from soundtap (${hls.length}):`);
hls.forEach(s => console.log(`  ${s.callsign} — ${s.stream_url}`));
console.log(`\nHLS dropped from LyraPod's existing list (${droppedHls.length}):`);
droppedHls.forEach(s => console.log(`  ${s.name} — ${s.streamUrl}`));
console.log(`\nDuplicate-stream entries collapsed (${droppedDupes.length}):`);
droppedDupes.forEach(s => console.log(`  ${s.name} — same stream as a kept entry`));
console.log(`\nDropped, dead at the 2026-08-24 probe (${droppedDead.length}):`);
droppedDead.forEach(s => console.log(`  ${s.name} — ${s.streamUrl}`));
console.log(`\nStream urls repaired (${repaired}):`);
Object.entries(REPAIRS).forEach(([n, u]) => console.log(`  ${n} -> ${u}`));
