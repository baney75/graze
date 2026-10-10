/* ================= library: choose what you learn, lessons, speaking ================= */
function unitStats(key) {
  const C = COURSES[key], out = C.units.map(u => ({ total: 0, seen: 0, mastered: 0 }));
  for (const id of DECK_IDS[key] || []) { const c = CARDS[id], s = SV.cards[id], o = out[c.u || 0]; if (!o) continue; o.total++; if (s) { o.seen++; if (s.b >= MASTER) o.mastered++; } }
  return out;
}
function courseStats(key) { const s = deckStats(key); return s; }
function nextUnit(key) {
  const C = COURSES[key]; if (!C) return -1;
  const us = unitStats(key), start = +((SV.prefs.unit || {})[key]) || 0;
  for (let i = start; i < us.length; i++) if (us[i].seen < us[i].total) return i;
  for (let i = 0; i < start; i++) if (us[i].seen < us[i].total) return i;
  return -1;
}
function setOn(key, on) {
  const p = Object.assign({}, SV.prefs.packs || {}); p[key] = !!on;
  const order = (SV.prefs.order || []).filter(k => k !== key && COURSES[k]);
  if (on) order.push(key);
  SV.prefs.packs = p; SV.prefs.order = order; SV.prefs.u = Date.now(); save();
}
function setFocus(key) { const o = courseOrder().filter(k => k !== key); o.unshift(key); SV.prefs.order = o; SV.prefs.u = Date.now(); save(); }
function moveCourse(key, d) {
  const o = courseOrder(), i = o.indexOf(key), j = i + d; if (i < 0 || j < 0 || j >= o.length) return;
  [o[i], o[j]] = [o[j], o[i]]; SV.prefs.order = o; SV.prefs.u = Date.now(); save();
}
const unitKind = u => u.k === 'diagram' ? 'Diagram' : u.k === 'map' ? 'Map' : u.k === 'flag' ? 'Flags' : '';
function readKey(key, ui) { return 'r:' + key + ':' + ui; }

/* ---------- menu: next lesson ---------- */
function renderNextLesson() {
  const box = $('mLesson'); if (!box) return;
  box.textContent = '';
  const order = courseOrder();
  if (!order.length || !SV.prefs.onboard) {
    box.hidden = false;
    box.append(el('span', 'lbl', 'Library'), el('b', '', order.length ? 'Choose what you learn first' : 'Pick what you want to learn'));
    const b = el('button', '', 'Choose'); b.addEventListener('click', () => openPanel('library')); box.appendChild(b);
    return;
  }
  for (const k of order) {
    const ui = nextUnit(k); if (ui < 0) continue;
    const C = COURSES[k], u = C.units[ui];
    box.hidden = false;
    box.append(el('span', 'lbl', 'Next lesson · ' + C.name), el('b', '', `Unit ${ui + 1} · ${u.t}`));
    const b = el('button', '', 'Learn'); b.addEventListener('click', () => openLesson(k, ui)); box.appendChild(b);
    return;
  }
  box.hidden = true;
}

/* ---------- Library ---------- */
let LIB = { view: 'main', key: null, picks: [] };
function renderLibrary(view, key) {
  if (view) LIB.view = view; if (key) LIB.key = key;
  if (!SV.prefs.onboard && LIB.view === 'main' && (!courseOrder().length || isNewPlayer())) LIB.view = 'pick';
  const B = $('libBody'); B.textContent = ''; B.scrollTop = 0;
  if (LIB.view === 'course' && COURSES[LIB.key]) return libCourse(B, LIB.key);
  if (LIB.view === 'pick') return libPick(B);
  libMain(B);
}
function courseCard(k, opts) {
  const C = COURSES[k], s = deckStats(k), on = packOn(k);
  const b = el('button', 'cc' + (on ? ' on' : '')); b.style.setProperty('--cc', C.col);
  b.append(el('b', '', C.name), el('small', '', `${C.level} · ${fmt(C.count)} items`));
  if (s.seen) { const bar = el('div', 'bar good'), i = el('i'); bar.appendChild(i); i.style.width = Math.max(2, 100 * s.seen / Math.max(1, s.total)) + '%'; b.appendChild(bar); }
  b.addEventListener('click', () => opts && opts.onClick ? opts.onClick(k, b) : renderLibrary('course', k));
  return b;
}
function libMain(B) {
  const on = courseOrder(), total = COURSE_KEYS.reduce((n, k) => n + COURSES[k].count, 0);
  B.appendChild(head('Library', `${on.length} course${on.length === 1 ? '' : 's'} on · ${fmt(total)} items in ${COURSE_KEYS.length} courses`));
  B.appendChild(el('p', 'how', 'Your first course is your focus: most new sigils come from it, and the rest mix in. Every course is written from free, reputable sources, which each course page lists.'));
  if (on.length) {
    const sec = el('div', 'sec'); sec.appendChild(el('span', 'lbl', 'Your order'));
    const ul = el('ul', 'focus-list');
    on.forEach((k, i) => {
      const C = COURSES[k], s = deckStats(k), li = el('li');
      const nm = el('button', 'nm'); nm.append(el('b', '', C.name), el('small', '', (i === 0 ? 'Focus · ' : '') + `${s.seen} of ${fmt(s.total)} learned · ${s.mastered} mastered`));
      nm.addEventListener('click', () => renderLibrary('course', k));
      const mv = el('div', 'mv');
      const up = el('button'); up.innerHTML = ICON.up; up.setAttribute('aria-label', 'Move ' + C.name + ' up'); up.disabled = i === 0;
      const dn = el('button'); dn.innerHTML = ICON.down; dn.setAttribute('aria-label', 'Move ' + C.name + ' down'); dn.disabled = i === on.length - 1;
      up.addEventListener('click', () => { moveCourse(k, -1); renderLibrary(); }); dn.addEventListener('click', () => { moveCourse(k, 1); renderLibrary(); });
      mv.append(up, dn); li.append(el('span', 'no', String(i + 1)), nm, mv); ul.appendChild(li);
    });
    sec.appendChild(ul); B.appendChild(sec);
  }
  B.appendChild(settingsSec());
  const groups = el('div', 'lib-groups');
  for (const g of GROUPS) {
    const keys = COURSE_KEYS.filter(k => COURSES[k].group === g); if (!keys.length) continue;
    const box = el('div', 'lib-g'); box.append(el('h3', '', g), el('p', '', GROUP_BLURB[g] || ''));
    const list = el('div', 'clist'); keys.forEach(k => list.appendChild(courseCard(k))); box.appendChild(list); groups.appendChild(box);
  }
  B.appendChild(groups);
  const row = el('div', 'row'), own = el('button', 'ghost', 'Your own list'), play = el('button', 'cta', 'Play');
  own.addEventListener('click', () => { closePanel(); openPanel('forge'); });
  play.addEventListener('click', () => { closePanel(); start(); });
  row.append(play, own); B.appendChild(row);
}
function settingsSec() {
  const sec = el('div', 'sec');
  sec.appendChild(el('span', 'lbl', 'Pace'));
  const r1 = el('div', 'setrow'); r1.appendChild(el('span', '', 'New sigils a day'));
  const seg = el('div', 'seg');
  [5, 10, 15, 20, 30].forEach(n => { const b = el('button', +SV.prefs.newCap === n ? 'on' : '', String(n)); b.addEventListener('click', () => { setPref('newCap', n); seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }); seg.appendChild(b); });
  r1.appendChild(seg); sec.appendChild(r1);
  const r2 = el('div', 'setrow'); r2.appendChild(el('span', '', 'Speak words aloud at gates'));
  const seg2 = el('div', 'seg');
  [['On', true], ['Off', false]].forEach(([t, v]) => { const b = el('button', (SV.prefs.voice !== false) === v ? 'on' : '', t); b.addEventListener('click', () => { setPref('voice', v); seg2.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }); seg2.appendChild(b); });
  r2.appendChild(seg2); sec.appendChild(r2);
  sec.appendChild(el('p', 'how', 'More new sigils means faster progress and more reviews tomorrow. Ten a day is about 3,600 a year.'));
  return sec;
}
function libPick(B) {
  if (!LIB.picks.length) LIB.picks = courseOrder().filter(k => (SV.prefs.packs || {})[k]);
  const h = el('div', 'ph'), w = el('div'); w.append(el('div', 'meta', 'Welcome to Graze'), el('h2', '', 'What do you want to learn?'));
  h.appendChild(w);
  if (SV.prefs.onboard) { const x = el('button', 'x', '×'); x.setAttribute('aria-label', 'Close'); x.dataset.close = '1'; h.appendChild(x); }
  B.appendChild(h);
  B.appendChild(el('p', 'how', 'Tap courses in the order you want them. Your first pick is your focus. You can change all of this later in the Library.'));
  const groups = el('div', 'lib-groups');
  const refresh = () => {
    groups.querySelectorAll('.cc').forEach(b => {
      const k = b.dataset.k, i = LIB.picks.indexOf(k);
      b.classList.toggle('on', i >= 0); b.classList.toggle('ranked', i >= 0);
      const r = b.querySelector('.rank'); if (r) r.remove();
      if (i >= 0) b.appendChild(el('span', 'rank', String(i + 1)));
    });
    go.disabled = !LIB.picks.length;
    go.firstChild.textContent = LIB.picks.length ? `Start with ${COURSES[LIB.picks[0]].name} ` : 'Pick at least one ';
  };
  for (const g of GROUPS) {
    const keys = COURSE_KEYS.filter(k => COURSES[k].group === g && COURSES[k].level !== 'Quick deck'); if (!keys.length) continue;
    const box = el('div', 'lib-g'); box.append(el('h3', '', g), el('p', '', GROUP_BLURB[g] || ''));
    const list = el('div', 'clist');
    keys.forEach(k => {
      const b = courseCard(k, { onClick: kk => { const i = LIB.picks.indexOf(kk); if (i >= 0) LIB.picks.splice(i, 1); else LIB.picks.push(kk); sfx.tick(i >= 0 ? 0 : 1); refresh(); } });
      b.classList.add('pick'); b.dataset.k = k; b.classList.remove('on'); list.appendChild(b);
    });
    box.appendChild(list); groups.appendChild(box);
  }
  B.appendChild(groups);
  B.appendChild(settingsSec());
  const row = el('div', 'row'); const go = el('button', 'cta'); go.append(document.createTextNode('Start'), el('kbd', '', 'Enter'));
  go.addEventListener('click', () => {
    if (!LIB.picks.length) return;
    const p = {}; for (const k of COURSE_KEYS) p[k] = false; LIB.picks.forEach(k => p[k] = true); p.custom = (SV.prefs.packs || {}).custom !== false;
    SV.prefs.packs = p; SV.prefs.order = LIB.picks.slice(); SV.prefs.onboard = 1; SV.prefs.u = Date.now(); save();
    sfx.mission(); LIB.view = 'main';
    const k = LIB.picks[0], ui = nextUnit(k); LIB.picks = [];
    if (ui >= 0) openLesson(k, ui); else { closePanel(); }
  });
  row.appendChild(go); B.appendChild(row);
  refresh();
}
function libCourse(B, key) {
  const C = COURSES[key], s = deckStats(key), on = packOn(key), us = unitStats(key), order = courseOrder();
  const back = el('button', 'ghost sm', '‹ Library'); back.addEventListener('click', () => renderLibrary('main'));
  const top = el('div', 'row'); top.appendChild(back); B.appendChild(top);
  B.appendChild(head(C.name, `${C.group} · ${C.level}`));
  if (C.blurb) B.appendChild(el('p', 'how', C.blurb));
  const pills = el('div', 'pillrow');
  const reads = C.units.filter(u => u.r).length, imgs = C.units.filter(u => u.k).length;
  [[`${fmt(C.count)} items`], [`${C.units.length} units`], reads ? [`${reads} readings`] : null, imgs ? [`${imgs} picture units`] : null, C.lang && SPEECH.canSay(C.lang) ? ['Audio', 1] : null, C.speak === 'recognize' && SPEECH.canHear() ? ['Speaking', 1] : null, C.math ? ['Endless drills', 1] : null]
    .filter(Boolean).forEach(([t, g]) => pills.appendChild(el('span', 'pill' + (g ? ' g' : ''), t)));
  B.appendChild(pills);
  const st = el('div', 'sec'); const sh = el('div', 'sec-h'); sh.append(el('span', 'lbl', 'Progress'), el('small', '', `${s.seen} learned · ${s.mastered} mastered · ${fmt(s.total)} total`));
  const bar = el('div', 'bar good'), bi = el('i'); bar.appendChild(bi); st.append(sh, bar); B.appendChild(st);
  animBar(bi, 0, s.total ? s.seen / s.total : 0);
  const row = el('div', 'row');
  const nu = nextUnit(key);
  if (nu >= 0) { const l = el('button', 'cta', `Learn unit ${nu + 1}`); l.addEventListener('click', () => openLesson(key, nu)); row.appendChild(l); }
  const tg = el('button', 'ghost', on ? 'Remove from my courses' : 'Add to my courses');
  tg.addEventListener('click', () => { setOn(key, !on); sfx.tick(on ? 0 : 1); renderLibrary('course', key); });
  row.appendChild(tg);
  if (on && order[0] !== key) { const f = el('button', 'ghost', 'Make it my focus'); f.addEventListener('click', () => { setFocus(key); sfx.learn(); renderLibrary('course', key); }); row.appendChild(f); }
  if (C.lang && s.seen >= 3 && (SPEECH.canHear() || SPEECH.canSay(C.lang))) { const sp = el('button', 'ghost', 'Speaking practice'); sp.addEventListener('click', () => openSpeak(key)); row.appendChild(sp); }
  B.appendChild(row);
  const ul = el('ul', 'units'), start = +((SV.prefs.unit || {})[key]) || 0;
  C.units.forEach((u, i) => {
    const x = us[i], li = el('li' , (i === start ? 'start ' : '') + (x.seen >= x.total ? 'done' : ''));
    const tt = el('div', 'tt'); tt.appendChild(el('b', '', u.t));
    const sm = el('small'); const bits = [];
    if (unitKind(u)) bits.push(unitKind(u)); if (u.r) bits.push(SV.codex[readKey(key, i)] ? 'Reading done' : 'Reading');
    bits.push(x.seen >= x.total ? `All ${x.total} learned` : `${x.seen} / ${x.total} learned`);
    sm.textContent = bits.join(' · '); tt.appendChild(sm);
    if (x.seen) { const b2 = el('div', 'bar good'), i2 = el('i'); b2.appendChild(i2); i2.style.width = (100 * x.seen / x.total) + '%'; tt.appendChild(b2); }
    const go = el('button', 'go', x.seen >= x.total ? 'Review' : x.seen ? 'Continue' : 'Learn');
    go.addEventListener('click', () => openLesson(key, i));
    li.append(el('span', 'no', String(i + 1)), tt, go); ul.appendChild(li);
  });
  const us2 = el('div', 'sec'); us2.append(el('span', 'lbl', 'Units'), ul); B.appendChild(us2);
  if (C.src.length) {
    const sec = el('div', 'sec'); sec.appendChild(el('span', 'lbl', 'Sources'));
    const ol = el('ul', 'srcs');
    C.src.forEach(([t, u]) => { const li = el('li'), a = el('a', '', t); a.href = u; a.target = '_blank'; a.rel = 'noopener'; li.appendChild(a); ol.appendChild(li); });
    sec.appendChild(ol); B.appendChild(sec);
  }
}

/* ---------- lessons ---------- */
let LS = null;
const LESSON_N = 8;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function unitIds(key, ui) { return (DECK_IDS[key] || []).filter(id => (CARDS[id].u || 0) === ui); }
function openLesson(key, ui) {
  const C = COURSES[key]; if (!C) return;
  if (!packOn(key)) setOn(key, true);
  SV.prefs.unit = Object.assign({}, SV.prefs.unit, { [key]: ui }); SV.prefs.u = Date.now(); save();
  const ids = unitIds(key, ui), fresh0 = ids.filter(id => !SV.cards[id]);
  const review = !fresh0.length;
  const items = review ? shuffle(ids.slice()).sort((a, b) => SV.cards[a].due - SV.cards[b].due).slice(0, 10) : fresh0.slice(0, LESSON_N);
  LS = { key, ui, items, review, i: 0, phase: 'intro', res: {}, rd: null, mode: 'lesson' };
  if (panel !== 'learn') { if (panel) { PANELS.forEach(p => show(p, false)); panel = null; } openPanel('learn'); }
  learnRender();
}
function learnClose() { LS = null; SPEECH.stop(); }
function learnPrimary(btn) { btn.classList.add('primary'); try { btn.focus({ preventScroll: true }); } catch (e) {} return btn; }
function steps(n, i, res, ids) {
  const s = el('div', 'steps'); for (let k = 0; k < n; k++) { const x = el('i'); const id = ids && ids[k]; if (res && id && res[id] !== undefined) x.className = res[id] ? 'ok' : 'bad'; else if (k <= i) x.className = 'on'; s.appendChild(x); } return s;
}
function learnRender() {
  if (!LS) return;
  const B = $('learnBody'); B.textContent = ''; B.scrollTop = 0;
  const C = COURSES[LS.key], u = C.units[LS.ui];
  if (LS.mode === 'speak') return speakRender(B);
  if (LS.phase === 'intro') {
    B.appendChild(head(u.t, `${C.name} · Unit ${LS.ui + 1}${unitKind(u) ? ' · ' + unitKind(u) : ''}`));
    if (u.n) B.appendChild(el('p', 'fnote', u.n));
    if (u.s) { const p = el('p', 'src'); p.appendChild(document.createTextNode('Source: ')); const a = el('a', '', u.s[0] || 'link'); a.href = u.s[1]; a.target = '_blank'; a.rel = 'noopener'; p.appendChild(a); B.appendChild(p); }
    B.appendChild(el('p', 'how', LS.review ? `You have learned every sigil here. Quick review of ${LS.items.length}.` : `${LS.items.length} new sigil${LS.items.length > 1 ? 's' : ''}: learn each one, then a quick check. They return at your gates and in the Feed on a spaced schedule.`));
    const row = el('div', 'row');
    if (u.r && !SV.codex[readKey(LS.key, LS.ui)]) {
      const r = learnPrimary(el('button', 'cta', 'Read first')); r.appendChild(el('kbd', '', 'Enter'));
      r.addEventListener('click', () => { LS.phase = 'read'; LS.rd = { t0: performance.now(), ans: [] }; learnRender(); });
      const sk = el('button', 'ghost', 'Skip to sigils'); sk.addEventListener('click', () => { LS.phase = LS.review ? 'check' : 'teach'; learnRender(); });
      row.append(r, sk);
    } else {
      const g = learnPrimary(el('button', 'cta', LS.review ? 'Start review' : 'Start')); g.appendChild(el('kbd', '', 'Enter'));
      g.addEventListener('click', () => { LS.phase = LS.review ? 'check' : 'teach'; LS.i = 0; learnRender(); });
      row.appendChild(g);
      if (u.r) { const rr = el('button', 'ghost', 'Read again'); rr.addEventListener('click', () => { LS.phase = 'read'; LS.rd = { t0: performance.now(), ans: [], again: true }; learnRender(); }); row.appendChild(rr); }
    }
    B.appendChild(row); return;
  }
  if (LS.phase === 'read') return readRender(B, C, u);
  if (LS.phase === 'teach') {
    const id = LS.items[LS.i], card = CARDS[id];
    B.appendChild(head(u.t, `Learn ${LS.i + 1} of ${LS.items.length}`));
    B.appendChild(steps(LS.items.length, LS.i));
    const t = el('div', 'teach');
    if (card.img) t.appendChild(cardImgEl(card));
    if (!card.img) t.appendChild(el('p', 'cue', card.c)); else t.appendChild(el('div', 'meta', card.c));
    if (card.r) t.appendChild(el('div', 'rd', card.r));
    t.appendChild(el('p', 'ans', card.a));
    if (card.ex) { const ex = el('p', 'ex', card.ex); if (card.exT) ex.appendChild(el('small', '', card.exT)); t.appendChild(ex); }
    const vr = voiceRow(card); if (vr) t.appendChild(vr);
    B.appendChild(t);
    if (speakable(card) && SV.prefs.voice !== false) setTimeout(() => SPEECH.say(card.say || card.c, cardLang(card)), 250);
    const row = el('div', 'row'), nx = learnPrimary(el('button', 'cta', LS.i + 1 < LS.items.length ? 'Next' : 'Check yourself')); nx.appendChild(el('kbd', '', 'Enter'));
    nx.addEventListener('click', () => { if (LS.i + 1 < LS.items.length) LS.i++; else { LS.phase = 'check'; LS.i = 0; LS.order = shuffle(LS.items.slice()); } learnRender(); });
    row.appendChild(nx);
    if (LS.i > 0) { const bk = el('button', 'ghost', 'Back'); bk.addEventListener('click', () => { LS.i--; learnRender(); }); row.appendChild(bk); }
    B.appendChild(row); return;
  }
  if (LS.phase === 'check') {
    if (!LS.order) LS.order = shuffle(LS.items.slice());
    const id = LS.order[LS.i], card = CARDS[id];
    B.appendChild(head(LS.review ? 'Review' : 'Check yourself', `${LS.i + 1} of ${LS.order.length}`));
    B.appendChild(steps(LS.order.length, LS.i, LS.res, LS.order));
    const t = el('div', 'teach');
    if (card.img) t.appendChild(cardImgEl(card));
    t.appendChild(el('p', card.img ? 'meta' : 'cue', card.c));
    if (card.r) t.appendChild(el('div', 'rd', card.r));
    B.appendChild(t);
    const opts = shuffle([card.a, ...card.d.slice(0, 3)].filter((x, i, a) => a.indexOf(x) === i));
    const box = el('div', 'opts'), btns = [];
    const nx = el('button', 'cta', LS.i + 1 < LS.order.length ? 'Next' : 'Finish'); nx.appendChild(el('kbd', '', 'Enter')); nx.hidden = true;
    opts.forEach((o, j) => {
      const b = el('button'); b.append(el('kbd', '', String(j + 1)), document.createTextNode(o)); btns.push(b);
      b.addEventListener('click', () => {
        if (LS.res[id] !== undefined) return;
        const ok = o === card.a; LS.res[id] = ok;
        btns.forEach((x, n) => { x.disabled = true; if (opts[n] === card.a) x.classList.add('ok'); else if (n === j) x.classList.add('bad'); });
        (ok ? sfx.learn : sfx.miss)(); buzz(ok ? 10 : 30);
        if (speakable(card) && SV.prefs.voice !== false) SPEECH.say(card.say || card.c, cardLang(card));
        nx.hidden = false; learnPrimary(nx);
      });
      box.appendChild(b);
    });
    B.appendChild(box);
    nx.addEventListener('click', () => { if (LS.i + 1 < LS.order.length) { LS.i++; learnRender(); } else learnFinish(); });
    const row = el('div', 'row'); row.appendChild(nx); B.appendChild(row);
    return;
  }
  if (LS.phase === 'done') return doneRender(B, C, u);
}
function learnFinish() {
  const now = Date.now(); let right = 0;
  rollDay();
  for (const id of LS.items) {
    const ok = !!LS.res[id]; if (ok) right++;
    if (LS.review) {
      const s = SV.cards[id]; if (!s) continue;
      if (s.due <= now) reviewCard(id, ok, 'due');
      else if (!ok) reviewCard(id, false, 'relearn');
      else { s.n = (s.n || 0) + 1; putCard(id, s); }
    } else {
      putCard(id, { b: 0, due: now + (ok ? 90e3 : 20e3), n: 1, l: ok ? 0 : 1 });
    }
  }
  if (!LS.review) SV.daily.newToday += LS.items.length;
  const shards = right * (LS.review ? 1 : 2);
  ginc('life', shards); ginc('xp', LS.items.length * 4); ginc('lessons', 1);
  save();
  LS.right = right; LS.shards = shards; LS.phase = 'done';
  sfx.mission();
  learnRender();
}
function doneRender(B, C, u) {
  const n = LS.items.length;
  B.appendChild(head(LS.right === n ? 'Lesson mastered' : 'Lesson done', `${C.name} · Unit ${LS.ui + 1}`));
  const sum = el('div', 'sum');
  [['Sigils', LS.review ? `${n} reviewed` : `+${n}`], ['Correct', `${LS.right}/${n}`], ['Shards', '+' + LS.shards]].forEach(([l, v]) => { const s = el('div', 'stat'); s.append(el('span', 'lbl', l), el('b', '', v)); sum.appendChild(s); });
  B.appendChild(sum);
  B.appendChild(el('p', 'how', LS.review ? 'Reviews keep the schedule honest: anything you missed comes back soon.' : 'They come back in a minute or two at your gates and in the Feed, then after a day, three days, a week, and longer. Recalling them on schedule is what makes them stick.'));
  const row = el('div', 'row');
  const play = learnPrimary(el('button', 'cta', 'Play to lock it in')); play.appendChild(el('kbd', '', 'Enter'));
  play.addEventListener('click', () => { closePanel(); start(); });
  row.appendChild(play);
  const feed = el('button', 'ghost', 'Feed'); feed.addEventListener('click', () => { closePanel(); openPanel('feed'); }); row.appendChild(feed);
  const more = unitIds(LS.key, LS.ui).some(id => !SV.cards[id]), nu = nextUnit(LS.key);
  if (more || nu >= 0) { const nx = el('button', 'ghost', more ? 'More from this unit' : 'Next unit'); const k = LS.key, ui = more ? LS.ui : nu; nx.addEventListener('click', () => openLesson(k, ui)); row.appendChild(nx); }
  const lib = el('button', 'ghost', 'Course'); const k2 = LS.key; lib.addEventListener('click', () => { closePanel(); openPanel('library'); renderLibrary('course', k2); }); row.appendChild(lib);
  B.appendChild(row);
}

/* ---------- readings inside lessons ---------- */
function readRender(B, C, u) {
  const R = u.r, rd = LS.rd;
  if (rd.q === undefined) {
    B.appendChild(head(R.t, `${C.name} · Reading`));
    const body = el('div', 'read-body'); R.x.forEach(t => body.appendChild(el('p', '', t))); B.appendChild(body);
    if (u.s && C.group === 'Reading') { const p = el('p', 'src'); p.appendChild(document.createTextNode('Text: ')); const a = el('a', '', u.s[0]); a.href = u.s[1]; a.target = '_blank'; a.rel = 'noopener'; p.appendChild(a); B.appendChild(p); }
    const row = el('div', 'row'), d = learnPrimary(el('button', 'cta', 'Done reading')); d.appendChild(el('kbd', '', 'Enter'));
    d.addEventListener('click', () => { rd.secs = Math.max(1, (performance.now() - rd.t0) / 1000); rd.q = 0; rd.order = R.q.map(q => shuffle(q[1].map((o, i) => [o, i]))); learnRender(); });
    row.appendChild(d); B.appendChild(row); return;
  }
  if (rd.q < R.q.length) {
    const q = R.q[rd.q], opts = rd.order[rd.q];
    B.appendChild(head(`Question ${rd.q + 1} of ${R.q.length}`, R.t));
    B.appendChild(el('p', 'qtext', q[0]));
    const box = el('div', 'opts'), btns = [];
    const nx = el('button', 'cta', rd.q + 1 < R.q.length ? 'Next question' : 'See result'); nx.hidden = true;
    opts.forEach(([o, oi], j) => {
      const b = el('button'); b.append(el('kbd', '', String(j + 1)), document.createTextNode(o)); btns.push(b);
      b.addEventListener('click', () => {
        if (rd.ans[rd.q] !== undefined) return;
        rd.ans[rd.q] = oi === q[2];
        btns.forEach((x, n) => { x.disabled = true; if (opts[n][1] === q[2]) x.classList.add('ok'); else if (n === j) x.classList.add('bad'); });
        (rd.ans[rd.q] ? sfx.learn : sfx.miss)(); nx.hidden = false; learnPrimary(nx);
      });
      box.appendChild(b);
    });
    B.appendChild(box);
    nx.addEventListener('click', () => { rd.q++; learnRender(); });
    const row = el('div', 'row'); row.appendChild(nx); B.appendChild(row); return;
  }
  // result
  const words = R.x.join(' ').split(/\s+/).length, wpm = Math.round(words / (rd.secs / 60));
  const right = rd.ans.filter(Boolean).length, acc = right / Math.max(1, R.q.length), key = readKey(LS.key, LS.ui), first = !SV.codex[key];
  if (!rd.saved) {
    rd.saved = true; const now = Date.now();
    rd.reward = first ? (acc === 1 ? 25 : acc >= 0.5 ? 12 : 4) : 0;
    if (rd.reward) ginc('life', rd.reward);
    const prev = SV.codex[key]; SV.codex[key] = { acc: Math.max(acc, prev ? prev.acc : 0), n: (prev ? prev.n : 0) + 1, u: now };
    if (wpm > 40 && wpm < 1500 && C.group !== 'Languages') { SV.reading.push({ wpm, acc, t: now }); if (SV.reading.length > 60) SV.reading.shift(); }
    ginc('reads', 1); save(); (acc === 1 ? sfx.recall : sfx.learn)();
  }
  B.appendChild(head(acc === 1 ? 'Understood' : 'Read', R.t));
  const sum = el('div', 'sum');
  [['Pace', wpm + ' wpm'], ['Correct', `${right}/${R.q.length}`], ['Shards', rd.reward ? '+' + rd.reward : '—']].forEach(([l, v]) => { const s = el('div', 'stat'); s.append(el('span', 'lbl', l), el('b', '', v)); sum.appendChild(s); });
  B.appendChild(sum);
  if (wpm > 700 && acc < 1) B.appendChild(el('p', 'how', 'That was fast. Comprehension drops when reading outruns understanding.'));
  const row = el('div', 'row'), g = learnPrimary(el('button', 'cta', LS.review && !LS.items.length ? 'Done' : 'On to the sigils')); g.appendChild(el('kbd', '', 'Enter'));
  g.addEventListener('click', () => { LS.rd = null; LS.phase = LS.review ? 'check' : 'teach'; LS.i = 0; learnRender(); });
  row.appendChild(g); B.appendChild(row);
}

/* ---------- speaking practice ---------- */
function openSpeak(key) {
  const ids = (DECK_IDS[key] || []).filter(id => SV.cards[id] && speakable(CARDS[id]));
  const items = shuffle(ids).sort((a, b) => SV.cards[a].b - SV.cards[b].b).slice(0, 10);
  if (!items.length) return;
  LS = { key, ui: 0, items, i: 0, mode: 'speak', res: {} };
  if (panel !== 'learn') { if (panel) { PANELS.forEach(p => show(p, false)); panel = null; } openPanel('learn'); }
  learnRender();
}
function speakRender(B) {
  const C = COURSES[LS.key];
  if (LS.i >= LS.items.length) {
    const ok = Object.values(LS.res).filter(Boolean).length;
    B.appendChild(head('Speaking practice', C.name));
    B.appendChild(el('p', 'how', `${ok} of ${LS.items.length} said clearly enough to be recognized. Say a word aloud whenever you meet it: speaking it is another route into memory.`));
    const row = el('div', 'row'), again = learnPrimary(el('button', 'cta', 'Again')); again.addEventListener('click', () => openSpeak(LS.key));
    const back = el('button', 'ghost', 'Course'); const k = LS.key; back.addEventListener('click', () => { closePanel(); openPanel('library'); renderLibrary('course', k); });
    row.append(again, back); B.appendChild(row); return;
  }
  const card = CARDS[LS.items[LS.i]];
  B.appendChild(head('Say it in ' + C.name.replace(/\s*\(.*\)$/, ''), `${LS.i + 1} of ${LS.items.length}`));
  B.appendChild(steps(LS.items.length, LS.i, LS.res, LS.items));
  const t = el('div', 'teach'); t.appendChild(el('p', 'cue', card.a));
  const reveal = el('div', 'sec'); reveal.hidden = true;
  reveal.appendChild(el('p', 'ans', card.c)); if (card.r) reveal.appendChild(el('div', 'rd', card.r));
  t.appendChild(reveal);
  const vr = voiceRow(card, { micLabel: 'Speak', onResult: sc => { LS.res[card.id] = sc.ok; reveal.hidden = false; } });
  if (vr) t.appendChild(vr);
  B.appendChild(t);
  const row = el('div', 'row'), show2 = el('button', 'ghost', 'Show answer'), nx = learnPrimary(el('button', 'cta', 'Next'));
  nx.appendChild(el('kbd', '', 'Enter'));
  show2.addEventListener('click', () => { reveal.hidden = false; SPEECH.say(card.say || card.c, cardLang(card)); });
  nx.addEventListener('click', () => { if (LS.res[card.id] === undefined) LS.res[card.id] = false; LS.i++; learnRender(); });
  row.append(nx, show2); B.appendChild(row);
}

function learnKey(e) {
  const k = e.key;
  if (k === 'Escape') { e.preventDefault(); closePanel(); return; }
  const B = $('learnBody');
  if (k === 'Enter' || k === ' ') {
    if (document.activeElement && document.activeElement.tagName === 'BUTTON' && B.contains(document.activeElement)) return;
    const p = [...B.querySelectorAll('button.cta')].find(b => !b.hidden && !b.disabled);
    if (p) { e.preventDefault(); p.click(); }
    return;
  }
  const n = +k;
  if (n >= 1 && n <= 4) { const o = B.querySelectorAll('.opts button'); if (o[n - 1] && !o[n - 1].disabled) { e.preventDefault(); o[n - 1].click(); } }
}
const isNewPlayer = () => !SV.prefs.onboard && runsCount() === 0 && !Object.keys(SV.cards).length;
function maybeOnboard() {
  if (!isNewPlayer()) return false;
  LIB.view = 'pick'; openPanel('library'); return true;
}
