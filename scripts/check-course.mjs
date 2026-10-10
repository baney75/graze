// Validate Graze courses. Usage: node scripts/check-course.mjs [key ...]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'courses');
const GROUPS = ['Languages', 'Sciences', 'Medicine', 'Math', 'Mind', 'World', 'Reading', 'Skills'];
const lc = s => String(s).trim().toLowerCase();
const wc = a => a.join(' ').split(/\s+/).filter(Boolean).length;

export function checkCourse(key) {
  const dir = join(ROOT, key), errs = [], warns = [];
  const E = (w, m) => errs.push(`${key}/${w}: ${m}`), Wn = (w, m) => warns.push(`${key}/${w}: ${m}`);
  if (!existsSync(join(dir, 'meta.json'))) return { errs: [`${key}: missing meta.json`], warns, items: 0, units: 0 };
  let meta;
  try { meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')); } catch (e) { return { errs: [`${key}/meta.json: ${e.message}`], warns, items: 0, units: 0 }; }
  if (meta.key !== key) E('meta', `key "${meta.key}" must equal folder name`);
  for (const f of ['name', 'group', 'tag', 'level', 'blurb']) if (typeof meta[f] !== 'string' || !meta[f].trim()) E('meta', `missing ${f}`);
  if (!GROUPS.includes(meta.group)) E('meta', `group must be one of ${GROUPS.join(', ')}`);
  if (meta.tag && !/^[A-ZÀ-ÿ0-9 &]{2,9}$/u.test(meta.tag)) Wn('meta', `tag "${meta.tag}" should be 3-8 uppercase characters`);
  if (meta.speak && !['recognize', 'listen'].includes(meta.speak)) E('meta', 'speak must be recognize or listen');
  if (meta.speak && !meta.lang) E('meta', 'speak needs lang');
  if (!Array.isArray(meta.sources) || meta.sources.length < 1) E('meta', 'needs sources');
  else meta.sources.forEach((s, i) => { if (!s.t || !/^https:\/\//.test(s.u || '')) E('meta', `source ${i} needs t and https u`); });
  const isLang = meta.group === 'Languages';
  const files = readdirSync(dir).filter(f => /^u\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
  if (!files.length) E('units', 'no unit files');
  const seenC = new Map(); let items = 0, reads = 0;
  for (const f of files) {
    let u;
    try { u = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch (e) { E(f, e.message); continue; }
    if (!u.title) E(f, 'missing title');
    if (u.note && u.note.length > 420) Wn(f, `note is ${u.note.length} chars`);
    if (u.src && (!u.src.t || !/^https:\/\//.test(u.src.u || ''))) E(f, 'src needs t and https u');
    if (!Array.isArray(u.items)) { E(f, 'items must be an array'); continue; }
    const isDiagram = ['diagram', 'map', 'flag'].includes(u.kind);
    if (isDiagram && !u.dg && u.kind === 'diagram') E(f, 'diagram unit needs dg');
    if (!isDiagram && (u.items.length < 10 || u.items.length > 45)) Wn(f, `${u.items.length} items (aim for 15-40)`);
    const seenA = new Set();
    u.items.forEach((it, i) => {
      const w = `${f}#${i}`;
      if (isDiagram) { if (!it.p || !it.a) E(w, 'diagram item needs p and a'); if (!Array.isArray(it.d) || !it.d.length) E(w, 'diagram item needs d'); items++; return; }
      if (typeof it.c !== 'string' || !it.c.trim()) return E(w, 'missing c');
      if (typeof it.a !== 'string' || !it.a.trim()) return E(w, 'missing a');
      if (it.c.length > 64) E(w, `c too long (${it.c.length}): ${it.c}`);
      else if (it.c.length > 48) Wn(w, `c long (${it.c.length})`);
      if (it.a.length > 90) E(w, `a too long (${it.a.length}): ${it.a}`);
      if (seenC.has(lc(it.c))) E(w, `duplicate c "${it.c}" (also ${seenC.get(lc(it.c))})`); else seenC.set(lc(it.c), w);
      if (seenA.has(lc(it.a))) Wn(w, `duplicate a "${it.a}" in unit`); seenA.add(lc(it.a));
      if (!Array.isArray(it.d) || it.d.length < 1 || it.d.length > 3) E(w, 'd needs 1-3 distractors');
      else it.d.forEach(x => { if (typeof x !== 'string' || !x.trim()) E(w, 'empty distractor'); else if (lc(x) === lc(it.a)) E(w, `distractor equals answer: ${x}`); else if (x.length > 90) E(w, 'distractor too long'); });
      for (const k of ['ex', 'exT', 'r', 'say']) if (it[k] !== undefined && typeof it[k] !== 'string') E(w, `${k} must be a string`);
      items++;
    });
    if (u.read) {
      reads++;
      const r = u.read;
      if (!Array.isArray(r.text) || !r.text.length) E(f, 'read.text must be paragraphs');
      else { const n = wc(r.text); const lo = isLang ? 40 : meta.group === 'Reading' ? 100 : 110, hi = isLang ? 200 : meta.group === 'Reading' ? 600 : 300; if (n < lo || n > hi) Wn(f, `read is ${n} words`); }
      if (!Array.isArray(r.q) || r.q.length < 1) E(f, 'read.q needs questions');
      else r.q.forEach((q, i) => { if (!q.q || !Array.isArray(q.o) || q.o.length < 2 || q.o.length > 4 || !(q.k >= 0 && q.k < q.o.length)) E(f, `read.q[${i}] malformed`); });
    }
  }
  return { errs, warns, items, units: files.length, reads, meta };
}

export function courseKeys() {
  if (!existsSync(ROOT)) return [];
  return readdirSync(ROOT).filter(k => statSync(join(ROOT, k)).isDirectory() && existsSync(join(ROOT, k, 'meta.json'))).sort();
}

if (process.argv[1] && process.argv[1].endsWith('check-course.mjs')) {
  const keys = process.argv.slice(2).length ? process.argv.slice(2) : courseKeys();
  let bad = 0;
  for (const k of keys) {
    const r = checkCourse(k);
    r.warns.slice(0, 40).forEach(w => console.log('warn ', w));
    if (r.warns.length > 40) console.log(`warn  ... ${r.warns.length - 40} more warnings`);
    r.errs.forEach(e => console.log('ERROR', e));
    console.log(`${r.errs.length ? 'FAIL' : 'OK  '} ${k}: ${r.units} units, ${r.items} items, ${r.reads || 0} readings, ${r.errs.length} errors, ${r.warns.length} warnings`);
    if (r.errs.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
