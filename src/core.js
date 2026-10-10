/* ================= core: constants ================= */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const fmt = n => Math.floor(n).toLocaleString('en-US');
const DAY = 864e5, NEW_CAP = 10, DAILY = 12, CODEX_PER_DAY = 2, MASTER = 5;
const IV = [0, 6e5, DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY, 90 * DAY, 180 * DAY];
const needXp = L => 100 + L * 60;

const DECKS = Object.assign({}, ...Object.values(COURSES).map(c => ({ [c.key]: { tag: c.tag || c.name.toUpperCase().slice(0, 8), name: c.name, col: c.col } })),
  { codex: { tag: 'CODEX', name: 'Codex', col: '#db93b4' }, custom: { tag: 'YOURS', name: 'Yours', col: '#82c89c' } });

/* ================= persistence (v2, mergeable) ================= */
const KEY1 = 'graze.save.v1', KEY2 = 'graze.save.v2';
const devId = () => { const a = new Uint8Array(6); crypto.getRandomValues(a); return [...a].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 10); };
function fresh(dev) {
  return { v: 2, dev: dev || devId(), gc: {}, best: 0, cards: {}, codex: {}, reading: [],
    daily: { day: '', newToday: 0, gatesToday: 0, codexToday: 0 }, streak: { n: 0, last: '' }, shop: {}, seen: ['ember'], tips: {},
    prefs: { trail: 'ember', cue: '', packs: {}, custom: '', u: 0, order: [], unit: {}, newCap: 10, voice: true, onboard: 0 },
    math: { lv: 2, u: 0 },
    muted: false, missions: null, rr: 0, link: null, lastSave: 0 };
}
function migrate(o) {
  const s = fresh(), d = s.dev, num = x => +x || 0;
  let xp = num(o.xp); for (let L = 1; L < (num(o.level) || 1); L++) xp += needXp(L);
  s.gc = { life: { [d]: num(o.life) }, runs: { [d]: num(o.runs) }, xp: { [d]: xp }, mDone: { [d]: num(o.mDone) }, retR: { [d]: num(o.ret && o.ret.r) }, retW: { [d]: num(o.ret && o.ret.w) } };
  s.best = num(o.best);
  const now = Date.now();
  for (const id in (o.cards || {})) { const c = o.cards[id]; s.cards[id] = { b: num(c.b), due: num(c.due), n: num(c.n), l: num(c.l), u: now }; }
  for (const id in (o.codex || {})) { const c = o.codex[id]; s.codex[id] = { acc: num(c.acc), n: num(c.n) || 1, u: now }; }
  s.reading = Array.isArray(o.reading) ? o.reading.filter(r => r && r.t).map(r => ({ wpm: num(r.wpm), acc: num(r.acc), t: num(r.t) })) : [];
  s.daily = { day: o.day || '', newToday: num(o.newToday), gatesToday: num(o.gatesToday), codexToday: num(o.codexToday) };
  s.streak = { n: num(o.streak), last: o.lastDone || '' };
  s.seen = Array.isArray(o.seen) ? o.seen : ['ember']; s.tips = o.tips || {};
  const dk = o.decks || {};
  s.prefs = { trail: o.trail || 'ember', cue: o.cue || '', custom: o.custom || '', u: now, packs: { roots: dk.roots !== false, lex: dk.lex !== false, custom: dk.custom !== false } };
  s.muted = !!o.muted; s.missions = Array.isArray(o.missions) ? o.missions : null; s.rr = num(o.rr);
  return s;
}
function normalize(s) {
  const o = fresh(s && typeof s.dev === 'string' && s.dev ? s.dev : undefined);
  if (!s || typeof s !== 'object') return o;
  for (const k in o) if (k !== 'dev' && s[k] !== undefined && s[k] !== null && typeof s[k] === typeof o[k]) o[k] = s[k];
  if (s.link && typeof s.link === 'object' && typeof s.link.code === 'string') o.link = { code: s.link.code };
  if (!Array.isArray(o.reading)) o.reading = [];
  if (!Array.isArray(o.seen)) o.seen = ['ember'];
  for (const k of ['gc', 'cards', 'codex', 'shop', 'tips']) if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {};
  o.daily = Object.assign(fresh().daily, o.daily || {});
  o.streak = Object.assign(fresh().streak, o.streak || {});
  o.prefs = Object.assign(fresh().prefs, o.prefs || {});
  if (!o.prefs.packs || typeof o.prefs.packs !== 'object') o.prefs.packs = {};
  if (!Array.isArray(o.prefs.order)) o.prefs.order = [];
  if (!o.prefs.unit || typeof o.prefs.unit !== 'object') o.prefs.unit = {};
  o.prefs.newCap = clamp(+o.prefs.newCap || 10, 3, 60);
  if (!o.math || typeof o.math !== 'object') o.math = { lv: 2, u: 0 };
  return migrateOrgo(o);
}
// 5.1.0 moved the functional-groups picture unit (index 4) out of Organic Chemistry, so later orgo units
// shifted down by one. Reading marks are keyed by unit index; remap them once. The marker lives in the
// codex set, which merges by union, so a migrated save never migrates twice.
const ORGO_MOVED = 'x:orgo-fg-5.1';
function migrateOrgo(o) {
  if (!o || !o.codex || typeof o.codex !== 'object' || o.codex[ORGO_MOVED]) return o;
  const old = o.codex, cx = {};
  for (const k in old) { const m = /^r:orgo:(\d+)$/.exec(k); cx[m && +m[1] >= 5 ? 'r:orgo:' + (+m[1] - 1) : m && +m[1] === 4 ? 'r:orgo:x4' : k] = old[k]; }
  cx[ORGO_MOVED] = { acc: 0, n: 1, u: 0 };
  o.codex = cx;
  const pu = o.prefs && o.prefs.unit;
  if (pu && +pu.orgo >= 5) pu.orgo = +pu.orgo - 1; else if (pu && +pu.orgo === 4) pu.orgo = 0;
  return o;
}
function loadSave() {
  let s = null;
  try { const raw = localStorage.getItem(KEY2); if (raw) s = JSON.parse(raw); } catch (e) {}
  if (!s) { try { const o = JSON.parse(localStorage.getItem(KEY1) || 'null'); if (o && typeof o === 'object') s = migrate(o); } catch (e) {} }
  return normalize(s);
}
const SV = loadSave();
function localSave() { SV.lastSave = Date.now(); try { localStorage.setItem(KEY2, JSON.stringify(SV)); return true; } catch (e) { return false; } }
function save() { localSave(); SYNC.dirty(); }
localSave();

/* grow-only per-device counters: merge by max per device, total by sum */
const gsum = k => { const m = SV.gc[k]; let s = 0; if (m) for (const d in m) s += +m[d] || 0; return s; };
function ginc(k, n) { if (!n) return; const m = SV.gc[k] || (SV.gc[k] = {}); m[SV.dev] = (m[SV.dev] || 0) + n; }
const lifeShards = () => gsum('life');
const bank = () => lifeShards() - gsum('spent');
const runsCount = () => gsum('runs');
function levelInfo() { let xp = gsum('xp'), L = 1; while (xp >= needXp(L)) { xp -= needXp(L); L++; } return { L, xp, need: needXp(L) }; }
function setPref(k, v) { SV.prefs[k] = v; SV.prefs.u = Date.now(); save(); }
function putCard(id, s) { SV.cards[id] = { b: s.b | 0, due: Math.round(s.due || 0), n: s.n | 0, l: s.l | 0, u: Date.now() }; }

/* CRDT-style merge: counters max-per-device, cards last-writer-wins, sets union, prefs LWW */
const ukeys = (a, b) => [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].sort();
function mergeState(a, b) {
  b = (b && typeof b === 'object') ? migrateOrgo(JSON.parse(JSON.stringify(b))) : {};
  const o = JSON.parse(JSON.stringify(a));
  o.gc = {};
  for (const k of ukeys(a.gc, b.gc)) { const ma = (a.gc || {})[k] || {}, mb = (b.gc || {})[k] || {}, m = {}; for (const d of ukeys(ma, mb)) m[d] = Math.max(+ma[d] || 0, +mb[d] || 0); o.gc[k] = m; }
  o.best = Math.max(+a.best || 0, +b.best || 0);
  o.cards = {};
  for (const id of ukeys(a.cards, b.cards)) {
    const x = (a.cards || {})[id], y = (b.cards || {})[id];
    const w = !x ? y : !y ? x : (((+y.u || 0) > (+x.u || 0)) || ((+y.u || 0) === (+x.u || 0) && (+y.n || 0) > (+x.n || 0))) ? y : x;
    if (w && typeof w === 'object') o.cards[id] = { b: +w.b | 0, due: +w.due || 0, n: +w.n | 0, l: +w.l | 0, u: +w.u || 0 };
  }
  o.codex = {};
  for (const id of ukeys(a.codex, b.codex)) { const x = (a.codex || {})[id] || {}, y = (b.codex || {})[id] || {}; o.codex[id] = { acc: Math.max(+x.acc || 0, +y.acc || 0), n: Math.max(+x.n || 0, +y.n || 0), u: Math.max(+x.u || 0, +y.u || 0) }; }
  const seenT = new Set();
  o.reading = [...(a.reading || []), ...(Array.isArray(b.reading) ? b.reading : [])].filter(r => r && r.t && !seenT.has(r.t) && seenT.add(r.t))
    .map(r => ({ wpm: +r.wpm || 0, acc: +r.acc || 0, t: +r.t })).sort((p, q) => p.t - q.t).slice(-60);
  const da = a.daily || {}, db = b.daily || {};
  o.daily = (da.day || '') > (db.day || '') ? { day: da.day, newToday: +da.newToday || 0, gatesToday: +da.gatesToday || 0, codexToday: +da.codexToday || 0 }
    : (db.day || '') > (da.day || '') ? { day: db.day, newToday: +db.newToday || 0, gatesToday: +db.gatesToday || 0, codexToday: +db.codexToday || 0 }
    : { day: da.day || '', newToday: Math.max(+da.newToday || 0, +db.newToday || 0), gatesToday: Math.max(+da.gatesToday || 0, +db.gatesToday || 0), codexToday: Math.max(+da.codexToday || 0, +db.codexToday || 0) };
  const sa = a.streak || {}, sb = b.streak || {};
  o.streak = (sa.last || '') > (sb.last || '') ? { n: +sa.n || 0, last: sa.last } : (sb.last || '') > (sa.last || '') ? { n: +sb.n || 0, last: sb.last } : { n: Math.max(+sa.n || 0, +sb.n || 0), last: sa.last || '' };
  o.shop = {}; for (const k of ukeys(a.shop, b.shop)) o.shop[k] = Math.max(+(a.shop || {})[k] || 0, +(b.shop || {})[k] || 0);
  o.seen = [...new Set([...(a.seen || []), ...(Array.isArray(b.seen) ? b.seen : [])])].sort();
  o.tips = {}; for (const k of ukeys(a.tips, b.tips)) o.tips[k] = 1;
  const pa = a.prefs || {}, pb = b.prefs || {};
  if ((+pb.u || 0) > (+pa.u || 0)) o.prefs = Object.assign(fresh().prefs, JSON.parse(JSON.stringify(pb)));
  const ma = a.math || {}, mb = b.math || {};
  o.math = (+mb.u || 0) > (+ma.u || 0) ? { lv: +mb.lv || 2, u: +mb.u } : { lv: +ma.lv || 2, u: +ma.u || 0 };
  return o;
}
function exportState(s) {
  const o = JSON.parse(JSON.stringify(s));
  for (const k of ['missions', 'link', 'muted', 'rr', 'lastSave', 'dev']) delete o[k];
  return o;
}
const sigOf = s => JSON.stringify(exportState(s));
function replaceSV(m) { for (const k of Object.keys(SV)) delete SV[k]; Object.assign(SV, m); }

/* ================= bytes, compression, crypto ================= */
const TE = new TextEncoder(), TD = new TextDecoder();
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
const b64url = u8 => b64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return unb64(s); };
async function packBytes(str) {
  const raw = TE.encode(str);
  if (typeof CompressionStream === 'undefined') { const o = new Uint8Array(raw.length + 1); o[0] = 0; o.set(raw, 1); return o; }
  const buf = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  const o = new Uint8Array(buf.length + 1); o[0] = 1; o.set(buf, 1); return o;
}
async function unpackBytes(u8) {
  if (u8[0] === 0) return TD.decode(u8.subarray(1));
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read compressed saves.');
  return await new Response(new Blob([u8.subarray(1)]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
const CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function genCode() { const a = new Uint8Array(12); crypto.getRandomValues(a); let s = ''; for (const x of a) s += CROCK[x & 31]; return s; }
function normCode(s) { return String(s || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V').replace(/[^0-9A-HJKMNP-TV-Z]/g, ''); }
const showCode = c => c.replace(/(.{4})(?=.)/g, '$1-');
async function deriveLink(code) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', TE.encode('graze-link-v1:' + code)));
  const id = [...h.subarray(0, 20)].map(x => x.toString(16).padStart(2, '0')).join('');
  const base = await crypto.subtle.importKey('raw', TE.encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: TE.encode('graze-salt-v1'), iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { id, key };
}
async function encryptStr(key, str) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await packBytes(str)));
  return { iv: b64(iv), ct: b64(ct) };
}
async function decryptStr(key, d) {
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(d.iv) }, key, unb64(d.ct)));
  return await unpackBytes(pt);
}

/* ================= sync: cloud save, link code, transfer, backup ================= */
const SYNC = {
  db: null, uid: null, dl: null, cloudRef: null, cloudUnsub: null, linkRef: null, linkUnsub: null, linkKey: null,
  cloud: 'pending', link: 'off', lastCloud: 0, lastLink: 0, msg: '', timer: null, busy: false, again: false, sig: { cloud: '', link: '' }, onChange: null
};
SYNC.dirty = () => { if (!SYNC.cloudRef && !SYNC.linkRef) return; clearTimeout(SYNC.timer); SYNC.timer = setTimeout(syncPush, 2500); };
function syncNotify() { if (SYNC.onChange) try { SYNC.onChange(); } catch (e) {} }
async function syncPush() {
  if (SYNC.busy) { SYNC.again = true; return; }
  SYNC.busy = true;
  try {
    const st = exportState(SV), s = JSON.stringify(st);
    if (SYNC.cloudRef && SYNC.cloud !== 'readonly' && s !== SYNC.sig.cloud) {
      try {
        await SYNC.cloudRef.set({ v: 2, at: Date.now(), dev: SV.dev, z: b64(await packBytes(s)) });
        SYNC.sig.cloud = s; SYNC.lastCloud = Date.now(); SYNC.cloud = 'on';
      } catch (e) { SYNC.cloud = e && e.code === 'invalid_argument' ? 'readonly' : 'error'; SYNC.msg = (e && e.message) || ''; }
    }
    if (SYNC.linkRef && SYNC.linkKey && SYNC.link !== 'readonly' && s !== SYNC.sig.link) {
      try {
        const enc = await encryptStr(SYNC.linkKey, s);
        await SYNC.linkRef.set({ v: 2, at: Date.now(), dev: SV.dev, iv: enc.iv, ct: enc.ct });
        SYNC.sig.link = s; SYNC.lastLink = Date.now(); SYNC.link = 'on';
      } catch (e) { SYNC.link = e && e.code === 'invalid_argument' ? 'readonly' : 'error'; SYNC.msg = (e && e.message) || ''; }
    }
  } catch (e) { SYNC.msg = String(e && e.message || e); }
  SYNC.busy = false; syncNotify();
  if (SYNC.again) { SYNC.again = false; SYNC.dirty(); }
}
/* bring a remote state in; returns {changed, cards} */
function absorb(remote, channel) {
  if (!remote || typeof remote !== 'object') return { changed: false };
  const before = sigOf(SV), cardsBefore = Object.keys(SV.cards).length;
  const merged = mergeState(SV, remote), after = sigOf(merged);
  const prefsChanged = JSON.stringify(merged.prefs) !== JSON.stringify(SV.prefs);
  const changed = after !== before;
  if (changed) { replaceSV(merged); localSave(); if (prefsChanged && SYNC.onPrefs) SYNC.onPrefs(); }
  const remoteSig = sigOf(mergeState(fresh(SV.dev), remote));
  if (channel === 'cloud' || channel === 'link') SYNC.sig[channel] = remoteSig;
  if (after !== remoteSig || channel === 'transfer' || channel === 'file') SYNC.dirty();
  syncNotify();
  return { changed, cards: Object.keys(SV.cards).length - cardsBefore };
}
async function initSync() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') { SYNC.cloud = 'off'; syncNotify(); return; }
    const [db, user, dl] = await Promise.all([window.claude.use('db'), window.claude.use('user'), window.claude.use('downloads')]);
    SYNC.dl = dl || null; SYNC.db = db || null;
    if (!db || !user) { SYNC.cloud = 'off'; syncNotify(); return; }
    const uid = await user.id();
    if (!uid) { SYNC.cloud = 'off'; syncNotify(); return; }
    SYNC.uid = uid;
    SYNC.cloudRef = db.doc('data/users/' + uid + '/save');
    try {
      const snap = await SYNC.cloudRef.get();
      if (snap.exists) { const d = snap.data(); if (d && d.z) absorb(JSON.parse(await unpackBytes(unb64(d.z))), 'cloud'); }
      SYNC.cloud = 'on'; SYNC.dirty();
    } catch (e) { SYNC.cloud = 'error'; SYNC.msg = (e && e.message) || ''; }
    SYNC.cloudUnsub = SYNC.cloudRef.onSnapshot(async snap => {
      if (!snap.exists || snap.metadata.hasPendingWrites) return;
      const d = snap.data(); if (!d || d.dev === SV.dev || !d.z) return;
      try { absorb(JSON.parse(await unpackBytes(unb64(d.z))), 'cloud'); SYNC.lastCloud = Date.now(); } catch (e) {}
    }, () => {});
    if (SV.link && SV.link.code) connectLink(SV.link.code, false).catch(() => {});
  } catch (e) { SYNC.cloud = 'off'; }
  syncNotify();
}
async function connectLink(code, mustExist) {
  if (!SYNC.db) throw new Error('Linking needs the shared store, which is not available in this view.');
  const { id, key } = await deriveLink(code);
  const ref = SYNC.db.doc('links/' + id);
  const snap = await ref.get();
  if (mustExist && !snap.exists) throw new Error('No progress is stored under that code yet. Check it, or create a code on the device that has your progress.');
  if (SYNC.linkUnsub) { SYNC.linkUnsub(); SYNC.linkUnsub = null; }
  SYNC.linkRef = ref; SYNC.linkKey = key; SYNC.link = 'on'; SYNC.sig.link = '';
  let res = { changed: false };
  if (snap.exists) { const d = snap.data(); res = absorb(JSON.parse(await decryptStr(key, d)), 'link'); SYNC.lastLink = Date.now(); }
  SV.link = { code }; localSave(); SYNC.dirty();
  SYNC.linkUnsub = ref.onSnapshot(async s => {
    if (!s.exists || s.metadata.hasPendingWrites) return;
    const d = s.data(); if (!d || d.dev === SV.dev) return;
    try { absorb(JSON.parse(await decryptStr(key, d)), 'link'); SYNC.lastLink = Date.now(); syncNotify(); } catch (e) { SYNC.link = 'error'; SYNC.msg = 'Could not decrypt linked data.'; syncNotify(); }
  }, () => {});
  syncNotify();
  return res;
}
function unlink() {
  if (SYNC.linkUnsub) SYNC.linkUnsub();
  SYNC.linkUnsub = null; SYNC.linkRef = null; SYNC.linkKey = null; SYNC.link = 'off'; SV.link = null; localSave(); syncNotify();
}
async function makeTransfer() { return 'GRAZE2.' + b64url(await packBytes(JSON.stringify(exportState(SV)))); }
async function readTransfer(text) {
  const t = String(text || '').trim().replace(/\s+/g, '');
  if (t.startsWith('GRAZE2.')) return JSON.parse(await unpackBytes(unb64url(t.slice(7))));
  const j = JSON.parse(t);
  if (j && j.graze === 2 && j.state) return j.state;
  throw new Error('That is not a Graze transfer code or backup.');
}
document.addEventListener('visibilitychange', () => { if (document.hidden && SYNC.timer) { clearTimeout(SYNC.timer); syncPush(); } });

/* ================= days ================= */
const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const today = () => dayKey(Date.now());
const yesterday = () => dayKey(Date.now() - DAY);
function rollDay() { const d = today(); if (SV.daily.day !== d) { SV.daily = { day: d, newToday: 0, gatesToday: 0, codexToday: 0 }; save(); } }
const liveStreak = () => (SV.streak.last === today() || SV.streak.last === yesterday()) ? SV.streak.n : 0;
function markDone() {
  const t = today(); if (SV.streak.last === t) return false;
  SV.streak = { n: SV.streak.last === yesterday() ? SV.streak.n + 1 : 1, last: t }; save(); return true;
}

/* ================= memory engine ================= */
let CARDS = {}; const DECK_IDS = {};
function parseCustom(txt) {
  const out = [], seen = new Set();
  for (const line of String(txt || '').split(/\r?\n/)) {
    const m = line.match(/^\s*(.+?)\s*(?:=|\t|—|–| - )\s*(.+?)\s*$/);
    if (!m) continue;
    const c = m[1].slice(0, 60), a = m[2].slice(0, 90), k = c.toLowerCase();
    if (seen.has(k)) continue; seen.add(k); out.push([c, a]);
    if (out.length >= 800) break;
  }
  return out;
}
function packOn(k) {
  const p = SV.prefs.packs || {};
  if (k === 'custom') return p.custom !== false;
  if (k === 'codex') return true;
  if (!COURSES[k]) return false;
  // Functional groups moved out of Organic Chemistry into their own course; keep them coming for orgo players.
  if (k === 'fgroups' && !(k in p) && packOn('orgo')) return true;
  return (k in p) ? !!p[k] : (!SV.prefs.onboard && LEGACY_ON.includes(k));
}
const newCap = () => clamp(+SV.prefs.newCap || NEW_CAP, 3, 60);
function cardId(C, u, x) {
  if (u.k === 'diagram') return 'g:' + u.g + ':' + x[0];
  if (u.k === 'map') return 'm:' + u.g + ':' + x[0];
  if (u.k === 'flag') return 'f:' + x[0];
  return C.idOf ? C.idOf(x[0]) : 'p:' + C.key + ':' + x[0];
}
function imgCue(u, p) {
  const D = u.k === 'diagram' && typeof DIAGRAMS !== 'undefined' && DIAGRAMS[u.g];
  return (D && D.cue && D.cue(p)) || (u.k === 'map' && u.g === 'us' ? IMG_CUE.us : IMG_CUE[u.k]);
}
function buildCards() {
  CARDS = {}; for (const k of Object.keys(DECKS)) DECK_IDS[k] = [];
  const put = card => { if (CARDS[card.id]) return; CARDS[card.id] = card; DECK_IDS[card.deck].push(card.id); };
  for (const C of Object.values(COURSES)) C.units.forEach((u, ui) => u.i.forEach(x => {
    const id = cardId(C, u, x);
    if (u.k) put({ id, deck: C.key, u: ui, img: { k: u.k, g: u.g, p: x[0] }, c: imgCue(u, x[0]), a: x[1], d: x[2] || [], ex: x[3] || '' });
    else put({ id, deck: C.key, u: ui, c: C.show ? C.show(x[0]) : x[0], a: x[1], d: x[2] || [], ex: x[3] || '', exT: x[4] || '', r: x[5] || '', say: x[6] || '' });
  }));
  CODEX.forEach(p => p.cards.forEach((x, i) => put({ id: 'c:' + p.id + i, deck: 'codex', c: x[0], a: x[1], d: x[2] || [], pid: p.id })));
  parseCustom(SV.prefs.custom).forEach(([c, a]) => put({ id: 'u:' + c.toLowerCase(), deck: 'custom', c, a, d: [] }));
}
const cardLabel = c => c.img ? (c.img.k === 'diagram' && typeof DIAGRAMS !== 'undefined' && DIAGRAMS[c.img.g] ? DIAGRAMS[c.img.g].name.replace(/\s*\(.*\)$/, '') : c.img.k === 'flag' ? 'Flag' : 'Map') + ': ' + c.a : c.c;
const cardLang = c => { const C = COURSES[c.deck]; return C && C.lang && !c.img ? C.lang : ''; };
const speakable = c => !!cardLang(c) && !/_{2,}/.test(c.say || c.c);
buildCards();
function eligible(id) {
  const c = CARDS[id]; if (!c) return false;
  if (c.deck === 'codex') return !!SV.codex[c.pid];
  return packOn(c.deck);
}
function deckStats(dk) {
  let seen = 0, strong = 0, mastered = 0, total = 0;
  for (const id of DECK_IDS[dk] || []) {
    total++; if (dk === 'codex' && !SV.codex[CARDS[id].pid]) continue;
    const s = SV.cards[id]; if (!s) continue; seen++; if (s.b >= MASTER) mastered++; else if (s.b >= 3) strong++;
  }
  return { total, seen, strong, mastered };
}
function masteredCount() { let n = 0; for (const id in SV.cards) if (CARDS[id] && SV.cards[id].b >= MASTER) n++; return n; }
function dueCount() { const now = Date.now(); let n = 0; for (const id in SV.cards) if (eligible(id) && SV.cards[id].due <= now) n++; return n; }
function distractor(card) {
  if (card.d && card.d.length) return card.d[Math.random() * card.d.length | 0];
  const ans = card.a.toLowerCase();
  let pool = (DECK_IDS[card.deck] || []).filter(id => CARDS[id].a.toLowerCase() !== ans);
  if (!pool.length) pool = Object.keys(CARDS).filter(id => CARDS[id].deck !== 'codex' && CARDS[id].a.toLowerCase() !== ans);
  return pool.length ? CARDS[pool[Math.random() * pool.length | 0]].a : 'none of these';
}
function distractorPrompt(card) {
  const ok = id => { const x = CARDS[id]; return id !== card.id && !x.img && x.c.toLowerCase() !== card.c.toLowerCase() && x.a.toLowerCase() !== card.a.toLowerCase() && !/_{2,}/.test(x.c) === !/_{2,}/.test(card.c); };
  const deck = DECK_IDS[card.deck] || [];
  let pool = deck.filter(id => CARDS[id].u === card.u && ok(id));
  if (pool.length < 2) pool = deck.filter(ok);
  return pool.length ? CARDS[pool[Math.random() * pool.length | 0]].c : null;
}
