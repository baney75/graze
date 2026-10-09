/* ================= updates: version, What's new, service worker ================= */
const IS_WEB = (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') && !(window.claude && typeof window.claude.use === 'function');
const UPD = { reg: null, ready: null, remote: null, lastCheck: 0, reloading: false, msg: '' };
function cmpVer(a, b) {
  const pa = String(a).split('.').map(n => +n || 0), pb = String(b).split('.').map(n => +n || 0);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
}
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

function renderNews(list) {
  const B = $('newsBody'); B.textContent = '';
  B.appendChild(head('What’s new', 'Graze ' + VERSION));
  const items = Array.isArray(list) && list.length ? list : CHANGELOG.slice(0, 3);
  for (const e of items) {
    const sec = el('div', 'sec news'), h = el('div', 'sec-h');
    h.append(el('b', '', e.v + (e.name ? ' · ' + e.name : '')), el('small', '', e.date));
    const ul = el('ul', 'notes'); e.notes.forEach(n => ul.appendChild(el('li', '', n)));
    sec.append(h, ul); B.appendChild(sec);
  }
  const row = el('div', 'row'), b = el('button', 'cta', 'Play'); b.addEventListener('click', () => { closePanel(); start(); }); row.appendChild(b); B.appendChild(row);
}
function maybeShowNews() {
  const seen = lsGet('graze.seenVersion');
  if (seen === VERSION) return;
  lsSet('graze.seenVersion', VERSION);
  if (!seen && runsCount() === 0) return;
  const list = CHANGELOG.filter(e => !seen || cmpVer(e.v, seen) > 0);
  openPanel('news'); renderNews(list.length ? list : CHANGELOG.slice(0, 1));
}

function syncUpdBanner() {
  const on = !!UPD.ready && (mode === 'menu' || mode === 'results') && !panel;
  $('upd').hidden = !on;
  if (on) $('updTxt').textContent = UPD.ready.version && UPD.ready.version !== 'new' ? `Graze ${UPD.ready.version} is ready.` : 'A new version of Graze is ready.';
}
async function checkRemote(manual) {
  if (!IS_WEB) return null;
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('bad status');
    const j = await r.json(); UPD.remote = j; UPD.lastCheck = Date.now();
    if (j && j.version && cmpVer(j.version, VERSION) > 0) { UPD.ready = j; UPD.msg = `Version ${j.version} is ready to install.`; }
    else UPD.msg = 'You have the latest version.';
  } catch (e) { UPD.msg = 'Could not reach the update server right now.'; }
  syncUpdBanner();
  return UPD.remote;
}
async function applyUpdate() {
  if (UPD.reg) {
    try { await UPD.reg.update(); } catch (e) {}
    const w = UPD.reg.waiting;
    if (w) { w.postMessage('skipWaiting'); setTimeout(() => location.reload(), 2500); return; }
  }
  location.reload();
}
function versionCard() {
  const c = el('div', 'card'), h = el('h3');
  h.append(el('span', 'dot ' + (UPD.ready ? 'warn' : 'on')), document.createTextNode('Version ' + VERSION));
  c.appendChild(h);
  c.appendChild(el('p', 'how', IS_WEB ? 'Graze checks for updates when you open it and every half hour. A new version waits until you tap Update, so it never interrupts a run. Your progress is kept across updates.'
    : 'This copy updates itself whenever a new version is published. Your progress is kept across updates.'));
  const msg = el('div', 'saved'); msg.textContent = UPD.msg;
  const row = el('div', 'row');
  if (IS_WEB) {
    const chk = el('button', 'ghost sm', UPD.ready ? 'Install update' : 'Check for updates');
    chk.addEventListener('click', async () => { if (UPD.ready) return applyUpdate(); chk.disabled = true; msg.textContent = 'Checking…'; await checkRemote(true); msg.textContent = UPD.msg; chk.disabled = false; if (UPD.ready) chk.textContent = 'Install update'; });
    row.appendChild(chk);
  }
  const nw = el('button', 'ghost sm', 'What’s new'); nw.addEventListener('click', () => { openPanel('news'); renderNews(CHANGELOG.slice(0, 4)); });
  row.appendChild(nw);
  c.append(row, msg);
  return c;
}
function saveFile(filename, text) {
  if (SYNC.dl) return SYNC.dl.save({ filename, data: text });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = filename;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return Promise.resolve({ status: 'saved' });
}
function initUpdates() {
  $('verTxt').textContent = 'Version ' + VERSION;
  $('newsBtn').addEventListener('click', () => { openPanel('news'); renderNews(CHANGELOG.slice(0, 4)); });
  $('updGo').addEventListener('click', applyUpdate);
  $('updNews').addEventListener('click', () => { const list = UPD.remote && Array.isArray(UPD.remote.notes) ? [{ v: UPD.remote.version, date: UPD.remote.date || '', name: UPD.remote.name || '', notes: UPD.remote.notes }] : null; openPanel('news'); renderNews(list); });
  if (!IS_WEB || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (UPD.reloading) return; UPD.reloading = true; location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    UPD.reg = reg;
    const watch = w => w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { UPD.ready = UPD.ready || { version: 'new' }; checkRemote(); } });
    if (reg.waiting && navigator.serviceWorker.controller) UPD.ready = { version: 'new' };
    reg.addEventListener('updatefound', () => watch(reg.installing));
    syncUpdBanner();
  }).catch(() => {});
  checkRemote();
  setInterval(() => { if (UPD.reg) UPD.reg.update().catch(() => {}); checkRemote(); }, 30 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - UPD.lastCheck > 10 * 60 * 1000) { checkRemote(); if (UPD.reg) UPD.reg.update().catch(() => {}); } });
}
