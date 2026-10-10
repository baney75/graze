// Builds dist/ for GitHub Pages and dist/artifact.html for the Claude-hosted copy.
// Usage: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { compileCourses } from './courses-compile.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const ORDER = ['content-core.js', 'content-packs.js', 'geo.js', 'diagrams-anatomy.js', 'diagrams-science.js', 'courses.js', 'core.js', 'game-setup.js', 'audio.js', 'speech.js', 'images.js', 'game.js', 'library.js', 'feed.js', 'updates.js', 'render.js', 'frame.js'];

const changelog = JSON.parse(read('changelog.json'));
const version = changelog[0].v;
const pkg = JSON.parse(read('package.json'));
if (pkg.version !== version) { pkg.version = version; writeFileSync(join(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n'); }

const js = ORDER.map(f => `/* ---- src/${f} ---- */\n` + read('src/' + f)).join('\n');
const COURSE_DATA = compileCourses();
const stamp = `const VERSION = ${JSON.stringify(version)};\nconst CHANGELOG = ${JSON.stringify(changelog)};\nconst COURSE_DATA = ${JSON.stringify(COURSE_DATA).replace(/<\/(script)/gi, '<\\/$1').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')};`;
const shell = read('src/shell.html');
if (!shell.includes('/*__JS__*/') || !shell.includes('/*__VERSION__*/')) throw new Error('shell.html is missing build markers');
const game = shell.replace('/*__VERSION__*/', () => stamp).replace('/*__JS__*/', () => js);

const dist = join(root, 'dist');
if (existsSync(dist)) rmSync(dist, { recursive: true });
mkdirSync(join(dist, 'play'), { recursive: true });

// Pages: the playable game, installable and self-updating
const page = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n${game}\n</body></html>\n`;
writeFileSync(join(dist, 'play', 'index.html'), page);
for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png']) cpSync(join(root, 'public', f), join(dist, 'play', f));
writeFileSync(join(dist, 'play', 'sw.js'), read('public/sw.js').replace('__VERSION__', version));
writeFileSync(join(dist, 'play', 'version.json'), JSON.stringify({ version, date: changelog[0].date, name: changelog[0].name, notes: changelog[0].notes }, null, 2) + '\n');

// Landing site
cpSync(join(root, 'site'), dist, { recursive: true });
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(read('src/content-core.js') + read('src/content-packs.js') + `const COURSE_DATA = ${JSON.stringify(COURSE_DATA)};` + read('src/courses.js') + ';this.out={COURSES,COURSE_KEYS,GROUPS,GROUP_BLURB,CODEX};', ctx);
const { COURSES: CS, COURSE_KEYS: CK, GROUPS: GR, GROUP_BLURB: GB } = ctx.out;
const full = CK.filter(k => CS[k].level !== 'Quick deck');
const packsHtml = GR.map(g => { const ks = full.filter(k => CS[k].group === g); if (!ks.length) return ''; return `<div class="lib-row"><div><h3>${esc(g)}</h3><p>${esc(GB[g] || '')}</p></div><div class="packs">${ks.map(k => `<span class="pack">${esc(CS[k].name)}<small>${CS[k].count.toLocaleString('en-US')}</small></span>`).join('')}</div></div>`; }).join('');
const NUM = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
const words = n => n <= 20 ? NUM[n] : n < 100 ? ['twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'][Math.floor(n / 10) - 2] + (n % 10 ? '-' + NUM[n % 10] : '') : String(n);
const nCourses = words(full.length).replace(/^./, c => c.toUpperCase());
const logHtml = changelog.map(e => `<article><h3>${esc(e.v)}${e.name ? ' \u00b7 <i>' + esc(e.name) + '</i>' : ''}<span>${esc(e.date)}</span></h3><ul>${e.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></article>`).join('');
const landing = read('site/index.html').replaceAll('__VERSION__', version).replace('<!--__PACKS__-->', packsHtml).replace('<!--__CHANGELOG__-->', logHtml).replace('__NCOURSES__', nCourses);
writeFileSync(join(dist, 'index.html'), landing);
writeFileSync(join(dist, '.nojekyll'), '');

// Claude artifact copy: no manifest, icons or worker (the artifact frame updates on republish)
const artifact = game
  .replace(/<meta name="theme-color"[^>]*>\n/, '')
  .replace(/<link rel="manifest"[^>]*>\n/, '')
  .replace(/<link rel="icon"[^>]*>\n/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\n/, '');
writeFileSync(join(dist, 'artifact.html'), artifact);
console.log(`Built Graze ${version}: dist/index.html, dist/play/, dist/artifact.html`);
