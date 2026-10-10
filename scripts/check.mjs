// Static checks that run in CI: the built game parses, content is well formed, versions agree.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { checkCourse, courseKeys } from './check-course.mjs';
import { compileCourses } from './courses-compile.mjs';

const html = readFileSync('dist/play/index.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) throw new Error('no inline script in dist/play/index.html');
new vm.Script(m[1], { filename: 'graze.js' });

const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync('src/content-core.js', 'utf8') + readFileSync('src/content-packs.js', 'utf8') + ';this.out={ROOTS,LEX,LATIN,GERMAN,POLISH,ORGO,BODY,LOGIC,PHILO,CAPITALS,NUMS,CODEX};', ctx);
const { CODEX, ...packs } = ctx.out;
let problems = 0;
for (const [name, items] of Object.entries(packs)) {
  const seen = new Set();
  for (const it of items) {
    if (!Array.isArray(it) || typeof it[0] !== 'string' || typeof it[1] !== 'string' || !it[0] || !it[1]) { console.error(`${name}: malformed item`, it); problems++; }
    const k = it[0].toLowerCase(); if (seen.has(k)) { console.error(`${name}: duplicate prompt ${it[0]}`); problems++; } seen.add(k);
  }
}
const ids = new Set();
for (const p of CODEX) {
  if (ids.has(p.id)) { console.error('duplicate Codex id', p.id); problems++; } ids.add(p.id);
  for (const q of p.q) if (!(q[2] >= 0 && q[2] < q[1].length)) { console.error('bad answer index', p.id, q[0]); problems++; }
  for (const c of p.cards) if (!c[2] || c[2].length < 1) { console.error('card needs distractors', p.id, c[0]); problems++; }
}
// Courses: schema, and every picture item points at a real diagram part, map region or flag.
let nItems = 0;
for (const k of courseKeys()) { const r = checkCourse(k); r.errs.forEach(e => { console.error(e); problems++; }); nItems += r.items; }
const g = {}; vm.createContext(g);
vm.runInContext(['src/geo.js', 'src/diagrams-anatomy.js', 'src/diagrams-science.js'].map(f => readFileSync(f, 'utf8')).join('\n') + ';this.D=DIAGRAMS;this.GEO=GEO;this.mapSVG=mapSVG;this.flagSVG=flagSVG;', g);
for (const c of compileCourses()) for (const u of c.u) {
  if (!u.k) continue;
  for (const it of u.i) {
    const p = it[0];
    const ok = u.k === 'diagram' ? !!(g.D[u.g] && g.D[u.g].parts[p] && g.D[u.g].svg(p)) : u.k === 'map' ? !!g.mapSVG(u.g, p) : !!g.flagSVG(p);
    if (!ok) { console.error(`${c.k}: ${u.k} item ${u.g}:${p} has no picture`); problems++; }
    if (u.k === 'diagram' && g.D[u.g] && g.D[u.g].parts[p] !== it[1]) { console.error(`${c.k}: ${u.g}:${p} answer "${it[1]}" differs from part name "${g.D[u.g].parts[p]}"`); problems++; }
  }
}
const log = JSON.parse(readFileSync('changelog.json', 'utf8'));
const ver = JSON.parse(readFileSync('dist/play/version.json', 'utf8'));
if (ver.version !== log[0].v) { console.error('version.json does not match changelog'); problems++; }
if (!readFileSync('dist/play/sw.js', 'utf8').includes(`'${log[0].v}'`)) { console.error('service worker not stamped'); problems++; }
if (problems) { console.error(`${problems} problem(s)`); process.exit(1); }
console.log(`OK: Graze ${log[0].v}, ${courseKeys().length} course folders with ${nItems} items, ${Object.values(packs).reduce((a, p) => a + p.length, 0)} legacy pack items, ${CODEX.length} Codex pages`);
