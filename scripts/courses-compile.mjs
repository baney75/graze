// Compile courses/<key>/ (plus courses/_diagrams/<key>.json) into the compact form the game loads.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { courseKeys } from './check-course.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'courses');
const J = p => JSON.parse(readFileSync(p, 'utf8'));

// Where diagram units sit inside their course: after the text unit they illustrate.
const DG_AFTER = { heart: 'u12', neuron: 'u07', brain: 'u08', nephron: 'u15', eye: 'u09', lungs: 'u13', cell: 'u03', plantcell: 'u03', ptable: 'u04', fg: 'u04' };
// Display order of groups and courses in the Library.
export const GROUP_ORDER = ['Languages', 'Sciences', 'Medicine', 'Math', 'Mind', 'Reading', 'World', 'Skills'];

const trim = a => { while (a.length && (a[a.length - 1] === 0 || a[a.length - 1] === undefined || a[a.length - 1] === '')) a.pop(); return a; };
const s0 = v => (typeof v === 'string' && v.trim()) ? v.trim() : 0;

function unitOut(u) {
  const o = { t: u.title };
  if (u.note) o.n = u.note;
  if (u.src && u.src.u) o.s = [u.src.t || '', u.src.u];
  if (['diagram', 'map', 'flag'].includes(u.kind)) {
    o.k = u.kind; o.g = u.kind === 'diagram' ? u.dg : u.kind === 'map' ? (u.set || 'world') : 'flag';
    o.i = u.items.map(it => trim([String(it.p), it.a, (it.d || []).slice(0, 3), s0(it.ex)]));
  } else {
    o.i = u.items.map(it => trim([it.c, it.a, (it.d || []).slice(0, 3), s0(it.ex), s0(it.exT), s0(it.r), s0(it.say)]));
  }
  if (u.read && Array.isArray(u.read.text) && u.read.text.length) {
    o.r = { t: u.read.title || u.title, x: u.read.text, q: (u.read.q || []).map(q => [q.q, q.o, q.k]) };
  }
  return o;
}

export function compileCourses() {
  const out = [];
  for (const key of courseKeys()) {
    if (key.startsWith('_')) continue;
    const dir = join(ROOT, key), m = J(join(dir, 'meta.json'));
    const files = readdirSync(dir).filter(f => /^u\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    const units = [];
    const dgFile = join(ROOT, '_diagrams', key + '.json');
    const dgUnits = existsSync(dgFile) ? J(dgFile) : [];
    const placed = new Set();
    for (const f of files) {
      units.push(unitOut(J(join(dir, f))));
      const tag = f.replace('.json', '');
      dgUnits.forEach((d, i) => { if (!placed.has(i) && DG_AFTER[d.dg] === tag) { units.push(unitOut(d)); placed.add(i); } });
    }
    dgUnits.forEach((d, i) => { if (!placed.has(i)) units.push(unitOut(d)); });
    const c = { k: key, n: m.name, g: m.group, t: m.tag, lv: m.level, b: m.blurb, s: (m.sources || []).map(s => [s.t, s.u]), u: units };
    if (m.lang) c.l = m.lang;
    if (m.speak) c.sp = m.speak;
    out.push(c);
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('courses-compile.mjs')) {
  const c = compileCourses();
  const s = JSON.stringify(c);
  let items = 0, units = 0, reads = 0;
  for (const k of c) for (const u of k.u) { units++; items += u.i.length; if (u.r) reads++; }
  console.log(`${c.length} courses, ${units} units, ${items} items, ${reads} readings, ${(s.length / 1024).toFixed(0)} KB`);
}
