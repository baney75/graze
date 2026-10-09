// Builds dist/ for GitHub Pages and dist/artifact.html for the Claude-hosted copy.
// Usage: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const ORDER = ['content-core.js', 'content-packs.js', 'core.js', 'game-setup.js', 'audio.js', 'game.js', 'updates.js', 'render.js', 'frame.js'];

const changelog = JSON.parse(read('changelog.json'));
const version = changelog[0].v;
const pkg = JSON.parse(read('package.json'));
if (pkg.version !== version) { pkg.version = version; writeFileSync(join(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n'); }

const js = ORDER.map(f => `/* ---- src/${f} ---- */\n` + read('src/' + f)).join('\n');
const stamp = `const VERSION = ${JSON.stringify(version)};\nconst CHANGELOG = ${JSON.stringify(changelog)};`;
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
vm.runInContext(read('src/content-core.js') + read('src/content-packs.js') + ';this.out={ROOTS,LEX,LOGIC,PHILO,BODY,CAPITALS,NUMS,ORGO,LATIN,GERMAN,POLISH,CODEX};', ctx);
const PACK_META = [['ROOTS', 'Roots', 1], ['LEX', 'Words', 1], ['LOGIC', 'Logic & Bias', 1], ['PHILO', 'Philosophy & Theology', 1], ['BODY', 'Body & Cell', 1], ['CAPITALS', 'Capitals', 1], ['NUMS', 'Number Sense', 1], ['ORGO', 'Organic Chemistry', 0], ['LATIN', 'Latin', 0], ['GERMAN', 'German', 0], ['POLISH', 'Polish', 0]];
const packsHtml = PACK_META.map(([k, n, on]) => `<span class="pack${on ? '' : ' opt'}">${esc(n)}<small>${ctx.out[k].length}</small></span>`).join('');
const logHtml = changelog.map(e => `<article><h3>${esc(e.v)}${e.name ? ' \u00b7 <i>' + esc(e.name) + '</i>' : ''}<span>${esc(e.date)}</span></h3><ul>${e.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></article>`).join('');
const landing = read('site/index.html').replaceAll('__VERSION__', version).replace('<!--__PACKS__-->', packsHtml).replace('<!--__CHANGELOG__-->', logHtml)
  .replace('Eleven packs, twenty pages', `Eleven packs, ${['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four'][ctx.out.CODEX.length] || ctx.out.CODEX.length} pages`);
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
