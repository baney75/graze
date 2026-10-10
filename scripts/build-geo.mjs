// Generates src/geo.js: world and US region outlines plus minified flags for map and flag units.
// Usage: npm run geo   (needs the devDependencies world-atlas, us-atlas, topojson-client, d3-geo, flag-icons)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature, merge } from 'topojson-client';
import { geoEqualEarth, geoPath } from 'd3-geo';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = p => join(root, 'node_modules', p);
const json = p => JSON.parse(readFileSync(nm(p), 'utf8'));

// UN member states and observers: ISO 3166-1 numeric -> [alpha-2, short English name]
const SOVEREIGN = {
  '004': ['AF', 'Afghanistan'], '008': ['AL', 'Albania'], '012': ['DZ', 'Algeria'], '020': ['AD', 'Andorra'], '024': ['AO', 'Angola'],
  '028': ['AG', 'Antigua and Barbuda'], '032': ['AR', 'Argentina'], '051': ['AM', 'Armenia'], '036': ['AU', 'Australia'], '040': ['AT', 'Austria'],
  '031': ['AZ', 'Azerbaijan'], '044': ['BS', 'Bahamas'], '048': ['BH', 'Bahrain'], '050': ['BD', 'Bangladesh'], '052': ['BB', 'Barbados'],
  '112': ['BY', 'Belarus'], '056': ['BE', 'Belgium'], '084': ['BZ', 'Belize'], '204': ['BJ', 'Benin'], '064': ['BT', 'Bhutan'],
  '068': ['BO', 'Bolivia'], '070': ['BA', 'Bosnia and Herzegovina'], '072': ['BW', 'Botswana'], '076': ['BR', 'Brazil'], '096': ['BN', 'Brunei'],
  '100': ['BG', 'Bulgaria'], '854': ['BF', 'Burkina Faso'], '108': ['BI', 'Burundi'], '132': ['CV', 'Cabo Verde'], '116': ['KH', 'Cambodia'],
  '120': ['CM', 'Cameroon'], '124': ['CA', 'Canada'], '140': ['CF', 'Central African Republic'], '148': ['TD', 'Chad'], '152': ['CL', 'Chile'],
  '156': ['CN', 'China'], '170': ['CO', 'Colombia'], '174': ['KM', 'Comoros'], '178': ['CG', 'Republic of the Congo'], '180': ['CD', 'DR Congo'],
  '188': ['CR', 'Costa Rica'], '384': ['CI', "Côte d'Ivoire"], '191': ['HR', 'Croatia'], '192': ['CU', 'Cuba'], '196': ['CY', 'Cyprus'],
  '203': ['CZ', 'Czechia'], '208': ['DK', 'Denmark'], '262': ['DJ', 'Djibouti'], '212': ['DM', 'Dominica'], '214': ['DO', 'Dominican Republic'],
  '218': ['EC', 'Ecuador'], '818': ['EG', 'Egypt'], '222': ['SV', 'El Salvador'], '226': ['GQ', 'Equatorial Guinea'], '232': ['ER', 'Eritrea'],
  '233': ['EE', 'Estonia'], '748': ['SZ', 'Eswatini'], '231': ['ET', 'Ethiopia'], '242': ['FJ', 'Fiji'], '246': ['FI', 'Finland'],
  '250': ['FR', 'France'], '266': ['GA', 'Gabon'], '270': ['GM', 'Gambia'], '268': ['GE', 'Georgia'], '276': ['DE', 'Germany'],
  '288': ['GH', 'Ghana'], '300': ['GR', 'Greece'], '308': ['GD', 'Grenada'], '320': ['GT', 'Guatemala'], '324': ['GN', 'Guinea'],
  '624': ['GW', 'Guinea-Bissau'], '328': ['GY', 'Guyana'], '332': ['HT', 'Haiti'], '340': ['HN', 'Honduras'], '348': ['HU', 'Hungary'],
  '352': ['IS', 'Iceland'], '356': ['IN', 'India'], '360': ['ID', 'Indonesia'], '364': ['IR', 'Iran'], '368': ['IQ', 'Iraq'],
  '372': ['IE', 'Ireland'], '376': ['IL', 'Israel'], '380': ['IT', 'Italy'], '388': ['JM', 'Jamaica'], '392': ['JP', 'Japan'],
  '400': ['JO', 'Jordan'], '398': ['KZ', 'Kazakhstan'], '404': ['KE', 'Kenya'], '296': ['KI', 'Kiribati'], '414': ['KW', 'Kuwait'],
  '417': ['KG', 'Kyrgyzstan'], '418': ['LA', 'Laos'], '428': ['LV', 'Latvia'], '422': ['LB', 'Lebanon'], '426': ['LS', 'Lesotho'],
  '430': ['LR', 'Liberia'], '434': ['LY', 'Libya'], '438': ['LI', 'Liechtenstein'], '440': ['LT', 'Lithuania'], '442': ['LU', 'Luxembourg'],
  '450': ['MG', 'Madagascar'], '454': ['MW', 'Malawi'], '458': ['MY', 'Malaysia'], '462': ['MV', 'Maldives'], '466': ['ML', 'Mali'],
  '470': ['MT', 'Malta'], '584': ['MH', 'Marshall Islands'], '478': ['MR', 'Mauritania'], '480': ['MU', 'Mauritius'], '484': ['MX', 'Mexico'],
  '583': ['FM', 'Micronesia'], '498': ['MD', 'Moldova'], '492': ['MC', 'Monaco'], '496': ['MN', 'Mongolia'], '499': ['ME', 'Montenegro'],
  '504': ['MA', 'Morocco'], '508': ['MZ', 'Mozambique'], '104': ['MM', 'Myanmar'], '516': ['NA', 'Namibia'], '520': ['NR', 'Nauru'],
  '524': ['NP', 'Nepal'], '528': ['NL', 'Netherlands'], '554': ['NZ', 'New Zealand'], '558': ['NI', 'Nicaragua'], '562': ['NE', 'Niger'],
  '566': ['NG', 'Nigeria'], '408': ['KP', 'North Korea'], '807': ['MK', 'North Macedonia'], '578': ['NO', 'Norway'], '512': ['OM', 'Oman'],
  '586': ['PK', 'Pakistan'], '585': ['PW', 'Palau'], '591': ['PA', 'Panama'], '598': ['PG', 'Papua New Guinea'], '600': ['PY', 'Paraguay'],
  '604': ['PE', 'Peru'], '608': ['PH', 'Philippines'], '616': ['PL', 'Poland'], '620': ['PT', 'Portugal'], '634': ['QA', 'Qatar'],
  '642': ['RO', 'Romania'], '643': ['RU', 'Russia'], '646': ['RW', 'Rwanda'], '659': ['KN', 'Saint Kitts and Nevis'], '662': ['LC', 'Saint Lucia'],
  '670': ['VC', 'Saint Vincent and the Grenadines'], '882': ['WS', 'Samoa'], '674': ['SM', 'San Marino'], '678': ['ST', 'São Tomé and Príncipe'], '682': ['SA', 'Saudi Arabia'],
  '686': ['SN', 'Senegal'], '688': ['RS', 'Serbia'], '690': ['SC', 'Seychelles'], '694': ['SL', 'Sierra Leone'], '702': ['SG', 'Singapore'],
  '703': ['SK', 'Slovakia'], '705': ['SI', 'Slovenia'], '090': ['SB', 'Solomon Islands'], '706': ['SO', 'Somalia'], '710': ['ZA', 'South Africa'],
  '410': ['KR', 'South Korea'], '728': ['SS', 'South Sudan'], '724': ['ES', 'Spain'], '144': ['LK', 'Sri Lanka'], '729': ['SD', 'Sudan'],
  '740': ['SR', 'Suriname'], '752': ['SE', 'Sweden'], '756': ['CH', 'Switzerland'], '760': ['SY', 'Syria'], '762': ['TJ', 'Tajikistan'],
  '834': ['TZ', 'Tanzania'], '764': ['TH', 'Thailand'], '626': ['TL', 'Timor-Leste'], '768': ['TG', 'Togo'], '776': ['TO', 'Tonga'],
  '780': ['TT', 'Trinidad and Tobago'], '788': ['TN', 'Tunisia'], '792': ['TR', 'Türkiye'], '795': ['TM', 'Turkmenistan'], '798': ['TV', 'Tuvalu'],
  '800': ['UG', 'Uganda'], '804': ['UA', 'Ukraine'], '784': ['AE', 'United Arab Emirates'], '826': ['GB', 'United Kingdom'], '840': ['US', 'United States'],
  '858': ['UY', 'Uruguay'], '860': ['UZ', 'Uzbekistan'], '548': ['VU', 'Vanuatu'], '862': ['VE', 'Venezuela'], '704': ['VN', 'Vietnam'],
  '887': ['YE', 'Yemen'], '894': ['ZM', 'Zambia'], '716': ['ZW', 'Zimbabwe'], '336': ['VA', 'Vatican City'], '275': ['PS', 'Palestine']
};
// Dataset features that share an id with a sovereign state but are separate territories
const NOT_SOVEREIGN_NAMES = new Set(['Ashmore and Cartier Is.']);
// De facto entities drawn as part of the internationally recognized state
const MERGE_INTO = { 'Somaliland': '706', 'N. Cyprus': '196' };
const DROP = new Set(['Antarctica']);

const USPS = {
  '01': ['AL', 'Alabama'], '02': ['AK', 'Alaska'], '04': ['AZ', 'Arizona'], '05': ['AR', 'Arkansas'], '06': ['CA', 'California'],
  '08': ['CO', 'Colorado'], '09': ['CT', 'Connecticut'], '10': ['DE', 'Delaware'], '11': ['DC', 'District of Columbia'], '12': ['FL', 'Florida'],
  '13': ['GA', 'Georgia'], '15': ['HI', 'Hawaii'], '16': ['ID', 'Idaho'], '17': ['IL', 'Illinois'], '18': ['IN', 'Indiana'],
  '19': ['IA', 'Iowa'], '20': ['KS', 'Kansas'], '21': ['KY', 'Kentucky'], '22': ['LA', 'Louisiana'], '23': ['ME', 'Maine'],
  '24': ['MD', 'Maryland'], '25': ['MA', 'Massachusetts'], '26': ['MI', 'Michigan'], '27': ['MN', 'Minnesota'], '28': ['MS', 'Mississippi'],
  '29': ['MO', 'Missouri'], '30': ['MT', 'Montana'], '31': ['NE', 'Nebraska'], '32': ['NV', 'Nevada'], '33': ['NH', 'New Hampshire'],
  '34': ['NJ', 'New Jersey'], '35': ['NM', 'New Mexico'], '36': ['NY', 'New York'], '37': ['NC', 'North Carolina'], '38': ['ND', 'North Dakota'],
  '39': ['OH', 'Ohio'], '40': ['OK', 'Oklahoma'], '41': ['OR', 'Oregon'], '42': ['PA', 'Pennsylvania'], '44': ['RI', 'Rhode Island'],
  '45': ['SC', 'South Carolina'], '46': ['SD', 'South Dakota'], '47': ['TN', 'Tennessee'], '48': ['TX', 'Texas'], '49': ['UT', 'Utah'],
  '50': ['VT', 'Vermont'], '51': ['VA', 'Virginia'], '53': ['WA', 'Washington'], '54': ['WV', 'West Virginia'], '55': ['WI', 'Wisconsin'],
  '56': ['WY', 'Wyoming']
};

// ---------- geometry helpers ----------
const TOL = 0.12; // Douglas-Peucker tolerance in map units (map is about 1000 wide)

// Record projected rings from a d3 geoPath context.
function ringsOf(path, geom) {
  const rings = []; let cur = null;
  path.context({
    moveTo(x, y) { cur = [[x, y]]; rings.push(cur); },
    lineTo(x, y) { cur.push([x, y]); },
    closePath() {},
    arc() {}
  })(geom);
  return rings;
}
const area = r => { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
function dp(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function simplifyRing(r, tol) {
  // split the closed ring at its farthest point from the start so DP keeps its shape
  let far = 0, fd = -1;
  for (let i = 1; i < r.length; i++) { const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]); if (d > fd) { fd = d; far = i; } }
  const a = dp(r.slice(0, far + 1), tol), b = dp(r.slice(far).concat([r[0]]), tol);
  return a.concat(b.slice(1, -1));
}
// Encode rings as a compact path: absolute moveto, relative lineto, 1 decimal, no drift (deltas from rounded points).
const num = t => { const s = (t / 10).toString(); return s.replace(/^(-?)0\./, '$1.'); };
function joinNums(nums) {
  let out = '', lastDot = false;
  for (const s of nums) {
    if (!out) out = s;
    else if (s[0] === '-' || (s[0] === '.' && lastDot)) out += s;
    else out += ' ' + s;
    lastDot = s.includes('.');
  }
  return out;
}
function encode(rings, keepSmall) {
  let d = ''; const bb = [Infinity, Infinity, -Infinity, -Infinity];
  const kept = [];
  rings.forEach((r, i) => {
    const s = simplifyRing(r, TOL);
    const q = [];
    for (const [x, y] of s) { const t = [Math.round(x * 10), Math.round(y * 10)]; const l = q[q.length - 1]; if (!l || l[0] !== t[0] || l[1] !== t[1]) q.push(t); }
    while (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop();
    kept.push({ q, a: area(r), i });
  });
  const maxA = Math.max(...kept.map(k => k.a));
  for (const { q, a } of kept) {
    if (q.length < 3 && !(keepSmall && a === maxA)) continue;
    if (a < 0.05 && a !== maxA && !keepSmall) continue;
    const nums = [num(q[0][0]), num(q[0][1])];
    let cmd = 'M' + joinNums(nums);
    const rel = [];
    for (let k = 1; k < q.length; k++) rel.push(num(q[k][0] - q[k - 1][0]), num(q[k][1] - q[k - 1][1]));
    if (rel.length) cmd += 'l' + joinNums(rel);
    d += cmd + 'z';
    for (const [x, y] of q) { bb[0] = Math.min(bb[0], x / 10); bb[1] = Math.min(bb[1], y / 10); bb[2] = Math.max(bb[2], x / 10); bb[3] = Math.max(bb[3], y / 10); }
  }
  return { d, full: bb };
}
// Focus box: the main polygon plus pieces near it, so far-flung islands and overseas parts do not hide the target.
function focusBox(rings, mapW) {
  const boxes = rings.map(r => { const b = [Infinity, Infinity, -Infinity, -Infinity]; for (const [x, y] of r) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); } return { b, a: area(r) }; });
  boxes.sort((p, q) => q.a - p.a);
  const total = boxes.reduce((s, p) => s + p.a, 0);
  let B = boxes[0].b.slice();
  if (total < 3) return B; // scattered microstates: focus (and ring) on the main island
  const near = mapW * 0.06;
  let grew = true; const used = new Set([0]);
  while (grew) {
    grew = false;
    boxes.forEach((p, i) => {
      if (used.has(i)) return;
      const b = p.b, gx = Math.max(0, b[0] - B[2], B[0] - b[2]), gy = Math.max(0, b[1] - B[3], B[1] - b[3]);
      if (Math.hypot(gx, gy) <= near && p.a < total * 0.9) {
        const nb = [Math.min(B[0], b[0]), Math.min(B[1], b[1]), Math.max(B[2], b[2]), Math.max(B[3], b[3])];
        if (nb[2] - nb[0] > mapW * 0.6) return; // never let a cluster span the map
        B = nb; used.add(i); grew = true;
      }
    });
  }
  return B;
}
const r1 = v => Math.round(v * 10) / 10;
const box = b => [r1(b[0]), r1(b[1]), r1(b[2] - b[0]), r1(b[3] - b[1])];

// ---------- world ----------
const wt = json('world-atlas/countries-50m.json');
const geoms = wt.objects.countries.geometries;
const sov = [], bg = [];
const mergeGroups = {};
for (const g of geoms) {
  const nm = g.properties.name;
  if (DROP.has(nm)) continue;
  if (MERGE_INTO[nm]) { (mergeGroups[MERGE_INTO[nm]] ||= []).push(g); continue; }
  if (g.id && SOVEREIGN[g.id] && !NOT_SOVEREIGN_NAMES.has(nm)) sov.push(g); else bg.push(g);
}
const worldFeatures = sov.map(g => {
  const extra = mergeGroups[g.id];
  const geometry = extra ? merge(wt, [g, ...extra]) : feature(wt, g).geometry;
  return { type: 'Feature', id: g.id, properties: {}, geometry };
});
const bgFeatures = bg.map(g => feature(wt, g));
const projection = geoEqualEarth().rotate([-11, 0]);
projection.fitExtent([[4, 4], [996, 516]], { type: 'FeatureCollection', features: [...worldFeatures, ...bgFeatures] });
const wpath = geoPath(projection);
const all = { type: 'FeatureCollection', features: [...worldFeatures, ...bgFeatures] };
const [[, y0], [x1, y1]] = wpath.bounds(all);
const WW = 1000, WH = Math.ceil(y1 + 4);

const world = {};
for (const f of worldFeatures) {
  const [iso, name] = SOVEREIGN[f.id];
  const rings = ringsOf(wpath, f);
  const { d, full } = encode(rings, true);
  const fb = focusBox(rings, WW);
  const fbox = box(fb), fullBox = box(full);
  const differs = fullBox[2] > fbox[2] * 1.5 + 2 || fullBox[3] > fbox[3] * 1.5 + 2;
  world[iso] = differs ? [name, d, fbox, fullBox] : [name, d, fbox];
}
const bgD = bgFeatures.map(f => encode(ringsOf(wpath, f), false).d).join('');
const missing = Object.values(SOVEREIGN).filter(([iso]) => !world[iso]).map(([iso, n]) => `${iso} ${n}`);

// ---------- US ----------
const ut = json('us-atlas/states-albers-10m.json');
const upath = geoPath(null);
const us = {};
const [UW, UH] = [975, 610];
for (const g of ut.objects.states.geometries) {
  const s = USPS[g.id]; if (!s) { console.log('US skip', g.id, g.properties.name); continue; }
  const f = feature(ut, g);
  const rings = ringsOf(upath, f);
  const { d } = encode(rings, true);
  const fb = focusBox(rings, UW);
  us[s[0]] = [s[1], d, box(fb)];
}

// ---------- flags ----------
const FLAG_MAX = 8192;
const fdir = nm('flag-icons/flags/4x3');
const flags = {}, skipped = [];
// Fixed decimals for ordinary values, significant digits for small ones (scale factors, tiny radii) so nothing collapses.
const roundTo = (s, p, sig = 3) => s.replace(/-?\d*\.\d+(?:e-?\d+)?/g, m => { const x = parseFloat(m); const v = Math.abs(x) >= 1 ? Math.round(x * 10 ** p) / 10 ** p : Number(x.toPrecision(sig)); const t = String(Object.is(v, -0) ? 0 : v); return t.replace(/^(-?)0\./, '$1.'); });
function minifySvg(src, code) {
  let s = src.replace(/<!--[\s\S]*?-->/g, '').replace(/<metadata[\s\S]*?<\/metadata>/g, '').replace(/<title[\s\S]*?<\/title>/g, '').replace(/<desc[\s\S]*?<\/desc>/g, '');
  s = s.replace(/\s+id="flag-icons-[^"]*"/, '');
  s = s.replace(/\r?\n\s*/g, ' ').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').replace(/\s+\/>/g, '/>').trim();
  // round numeric attribute values and path data, but leave text content and ids alone
  s = s.replace(/(\s(?:d|points|x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|stroke-width|fx|fy|offset|font-size|stroke-miterlimit)=")([^"]*)"/g, (_, a, v) => a + roundTo(v, 2) + '"');
  s = s.replace(/(\s(?:transform|gradientTransform|patternTransform)=")([^"]*)"/g, (_, a, v) => a + roundTo(v, 4, 6) + '"');
  if (!/xlink:/.test(s.replace(/xmlns:xlink="[^"]*"/, ''))) s = s.replace(/\s*xmlns:xlink="[^"]*"/, '');
  return s;
}
for (const iso of Object.values(SOVEREIGN).map(v => v[0].toLowerCase()).sort()) {
  let src;
  try { src = readFileSync(join(fdir, iso + '.svg'), 'utf8'); } catch { skipped.push(iso + ' (missing)'); continue; }
  const m = minifySvg(src, iso);
  if (m.length > FLAG_MAX) { skipped.push(`${iso} (${(m.length / 1024).toFixed(1)} KB)`); continue; }
  flags[iso] = m;
}

// ---------- runtime functions (plain browser JS, embedded verbatim) ----------
function mapSVG(set, code) {
  const S = GEO[set]; if (!S) return null;
  const T = S.regions[code]; if (!T) return null;
  const MW = S.w, MH = S.h, b = T[2];
  const cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2;
  let vw = Math.max(b[2] * 3.5, b[3] * 3.5 * 4 / 3, MW * 0.18);
  vw = Math.min(vw, MW, MH * 4 / 3);
  const vh = vw * 3 / 4;
  const vx = Math.max(0, Math.min(MW - vw, cx - vw / 2)), vy = Math.max(0, Math.min(MH - vh, cy - vh / 2));
  const k = vw / 640, f = n => Math.round(n * 100) / 100;
  const hit = r => { const q = r[3] || r[2]; return q[0] <= vx + vw && q[0] + q[2] >= vx && q[1] <= vy + vh && q[1] + q[3] >= vy; };
  let other = '';
  for (const c in S.regions) if (c !== code && hit(S.regions[c])) other += S.regions[c][1];
  if (S.bg) other += S.bg;
  const sw = f(k * 0.9);
  let out = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="' + [f(vx), f(vy), f(vw), f(vh)].join(' ') + '">' +
    '<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + f(k * 5) + '"/></filter></defs>' +
    '<path fill="#3a2c32" stroke="#6b5a60" stroke-width="' + sw + '" stroke-linejoin="round" d="' + other + '"/>' +
    '<path fill="#d5b66f" stroke="#d5b66f" stroke-width="' + f(k * 6) + '" opacity=".55" filter="url(#glow)" d="' + T[1] + '"/>' +
    '<path fill="#d5b66f" stroke="#fff3cf" stroke-width="' + f(k * 1.4) + '" stroke-linejoin="round" d="' + T[1] + '"/>';
  if (Math.max(b[2], b[3]) < MW * 0.015) {
    const rr = f(Math.max(b[2], b[3]) / 2 + k * 16);
    out += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + rr + '" fill="none" stroke="#d5b66f" stroke-width="' + f(k * 3) + '"/>' +
      '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(rr + k * 7) + '" fill="none" stroke="#d5b66f" stroke-opacity=".35" stroke-width="' + f(k * 2) + '"/>';
  }
  return out + '</svg>';
}
function flagSVG(code) {
  const s = GEO.flags[String(code).toLowerCase()];
  return s ? s.replace('<svg ', '<svg width="640" height="480" ') : null;
}

// ---------- write ----------
const GEO = { world: { w: WW, h: WH, bg: bgD, regions: world }, us: { w: UW, h: UH, regions: us }, flags };
const out = `// GENERATED by scripts/build-geo.mjs (npm run geo). Do not edit by hand.
// World: Natural Earth 1:50m via world-atlas 2.0.2, Equal Earth projection centered on 11°E, ${WW}x${WH}.
// US: US Census Bureau cartographic boundaries via us-atlas 3.0.1 (states-albers-10m), ${UW}x${UH}.
// Flags: flag-icons 7.2.3 (MIT), 4x3, minified.
// regions[code] = [name, pathD, focusBox [x, y, w, h], fullBox (only when overseas parts make it much larger)]
// world.bg: territories and areas that are not UN members or observers, drawn as context only.
const GEO = ${JSON.stringify(GEO)};
${mapSVG.toString()}
${flagSVG.toString()}
`;
writeFileSync(join(root, 'src', 'geo.js'), out);
const kb = n => (n / 1024).toFixed(1) + ' KB';
const sz = o => JSON.stringify(o).length;
console.log(`src/geo.js ${kb(Buffer.byteLength(out))}: world ${Object.keys(world).length} regions (${kb(sz(world) + bgD.length)}), US ${Object.keys(us).length} (${kb(sz(us))}), flags ${Object.keys(flags).length} (${kb(sz(flags))})`);
if (missing.length) console.log('Not in dataset:', missing.join(', '));
if (skipped.length) console.log('Skipped flags:', skipped.join(', '));
