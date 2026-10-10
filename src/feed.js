/* ================= feed: an endless vertical stream of learning ================= */
let FEED = null;
function mathAdapt(ok, fast) {
  SV.math.lv = clamp((+SV.math.lv || 2) + (ok ? (fast ? 0.3 : 0.15) : -0.45), 1, 12); SV.math.u = Date.now();
}
function feedOpen() {
  audio();
  FEED = { made: 0, idx: -1, combo: 0, best: 0, n: 0, ok: 0, gain: 0, xp: 0, recent: [], skip: new Set(), checks: [], newPending: 0, els: [], t0: Date.now(), lvl: levelInfo().L };
  const sc = $('fScroll'); sc.textContent = ''; sc.scrollTop = 0;
  $('fSheet').hidden = true;
  if (FEED.obs) FEED.obs.disconnect();
  FEED.obs = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting && e.intersectionRatio > 0.6) feedActivate(+e.target.dataset.i); }, { root: sc, threshold: [0.6] });
  for (let i = 0; i < 3; i++) feedAppend();
  feedHud();
  setTimeout(() => feedActivate(0), 50);
}
function feedClose() {
  if (!FEED) return;
  const cur = FEED.els[FEED.idx]; if (cur && cur.plan.type === 'learn' && !cur.done) feedLearned(cur);
  if (FEED.obs) FEED.obs.disconnect();
  SPEECH.stop();
  if (FEED.n) { ginc('feedN', FEED.n); save(); }
  FEED = null;
}
function feedHud() {
  if (!FEED) return;
  $('fCombo').textContent = FEED.combo >= 2 ? `×${FEED.combo} combo` : '';
  rollDay();
  const n = Math.min(SV.daily.gatesToday, DAILY), st = liveStreak();
  $('fToday').textContent = SV.streak.last === today() ? (st ? `Streak ${st}` : 'Done today') : `${n} / ${DAILY} today`;
  $('fGain').textContent = FEED.gain ? `+${FEED.gain}◆` : '';
}
function feedToast(text) {
  const t = el('div', 'fstats'); t.textContent = text;
  t.style.cssText = 'position:fixed;z-index:6;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 62px);color:var(--gold);font-weight:700;transition:opacity .5s';
  $('feed').appendChild(t); setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 600); }, 1600);
}

/* ---------- what comes next ---------- */
function feedDue() {
  const now = Date.now(), rec = new Set(FEED.recent);
  let best = null, bd = Infinity;
  for (const id in SV.cards) { const s = SV.cards[id]; if (s.due > now || s.due >= bd || rec.has(id) || FEED.skip.has(id) || !eligible(id)) continue; bd = s.due; best = id; }
  return best;
}
function feedEarly() {
  const rec = new Set(FEED.recent); let best = null, bs = Infinity;
  for (const id in SV.cards) { const s = SV.cards[id]; if (rec.has(id) || FEED.skip.has(id) || !eligible(id)) continue; const sc = s.b * 1e13 + s.due; if (sc < bs) { bs = sc; best = id; } }
  return best;
}
function feedNote() {
  for (const k of courseOrder()) {
    const C = COURSES[k], ui = nextUnit(k); if (ui < 0) continue;
    const u = C.units[ui];
    if (u.r && !SV.codex[readKey(k, ui)] && !FEED.recent.includes('read:' + k + ui)) return { type: 'read', key: k, ui };
    if (u.n && !FEED.recent.includes('note:' + k + ui)) return { type: 'note', key: k, ui };
  }
  return null;
}
function feedPlan() {
  const F = FEED, n = F.made;
  const ci = F.checks.findIndex(c => c.at <= n);
  if (ci >= 0) return { type: 'quiz', id: F.checks.splice(ci, 1)[0].id, from: 'check' };
  if (n > 0 && n % 25 === 0) return { type: 'milestone' };
  const r = Math.random(), due = feedDue();
  if (due && r < 0.62) return feedQuizOrSpeak(due, 'due');
  if (packOn('nums') && r < 0.74) return { type: 'math' };
  if (r < 0.8) { const nt = feedNote(); if (nt) return nt; }
  if (newOpen(F.newPending)) { const id = pickNew(F.skip); if (id) return { type: 'learn', id }; }
  if (due) return feedQuizOrSpeak(due, 'due');
  if (packOn('nums') && r < 0.88) return { type: 'math' };
  const early = feedEarly(); if (early && r < 0.94) return feedQuizOrSpeak(early, 'early');
  if (SV.daily.newToday + F.newPending < newCap() * 2) { const id = pickNew(F.skip); if (id) return { type: 'learn', id, extra: true }; }
  if (early) return feedQuizOrSpeak(early, 'early');
  return { type: 'math' };
}
function feedQuizOrSpeak(id, from) {
  const c = CARDS[id], C = COURSES[c.deck], s = SV.cards[id];
  if (SV.prefs.feedMic !== false && C && C.speak === 'recognize' && SPEECH.canHear() && speakable(c) && s && s.b >= 2 && Math.random() < 0.22) return { type: 'speak', id, from };
  return { type: 'quiz', id, from };
}

/* ---------- building cards ---------- */
function feedAppend() {
  const F = FEED; if (!F) return;
  const plan = feedPlan(); F.made++;
  if (plan.id) { F.recent.push(plan.id); if (F.recent.length > 10) F.recent.shift(); F.skip.add(plan.id); setTimeout(() => FEED && FEED.skip.delete(plan.id), 20000); }
  if (plan.type === 'note' || plan.type === 'read') { F.recent.push(plan.type + ':' + plan.key + plan.ui); }
  if (plan.type === 'learn') { F.newPending++; F.checks.push({ id: plan.id, at: F.made + 3 + (Math.random() * 3 | 0) }); }
  const i = F.els.length, sec = el('section', 'fcard'), inn = el('div', 'fin');
  sec.dataset.i = i; sec.appendChild(inn);
  plan.gold = (plan.type === 'quiz' || plan.type === 'math') && Math.random() < 0.08;
  if (plan.gold) sec.classList.add('gold');
  F.els.push({ sec, inn, plan, done: false });
  $('fScroll').appendChild(sec);
  F.obs.observe(sec);
  feedBuild(F.els[i]);
}
function fk(left, right, col) {
  const k = el('div', 'fk'); const a = el('span', 't', left); if (col) a.style.color = col; k.append(a, el('span', '', right || '')); return k;
}
function optButtons(item, opts, correct, onPick, two) {
  const box = el('div', 'fopts wait' + (two ? ' two' : '')), btns = [];
  opts.forEach((o, j) => {
    const b = el('button'); b.append(el('kbd', '', String(j + 1)), document.createTextNode(o)); btns.push(b);
    b.addEventListener('click', () => {
      if (item.done) return; item.done = true;
      const ok = o === correct;
      btns.forEach((x, n) => { x.disabled = true; if (opts[n] === correct) x.classList.add('ok'); else if (n === j) x.classList.add('bad'); });
      onPick(ok);
    });
    box.appendChild(b);
  });
  item.opts = btns;
  setTimeout(() => box.classList.remove('wait'), 450);
  return box;
}
// Recall first: the choices stay hidden until the player has tried to recall the answer.
// Tap, Space or a number key shows them; they also appear on their own after a pause.
function veil(item, box, ms, hint) {
  const wrap = el('div', 'fveil'), btn = el('button', 'fshow');
  btn.append(el('span', 'fthink', 'Recall it first'), el('span', '', hint || 'Say the answer in your head, then tap for choices'));
  box.classList.add('veiled'); wrap.append(btn, box);
  item.veilMs = ms;
  item.reveal = () => { if (!box.classList.contains('veiled')) return; box.classList.remove('veiled'); btn.remove(); clearTimeout(item.veilT); };
  btn.addEventListener('click', () => { item.reveal(); const b = item.opts && item.opts[0]; if (b) setTimeout(() => b.focus({ preventScroll: true }), 30); });
  return wrap;
}
function picButtons(item, parts, g, correct, onPick) {
  const box = el('div', 'fopts fpics wait'), btns = [];
  parts.forEach((p, j) => {
    const b = el('button'); b.append(el('kbd', '', String(j + 1)), partImgEl(g, p)); b.setAttribute('aria-label', 'Choice ' + (j + 1)); btns.push(b);
    b.addEventListener('click', () => {
      if (item.done) return; item.done = true;
      btns.forEach((x, n) => { x.disabled = true; if (parts[n] === correct) x.classList.add('ok'); else if (n === j) x.classList.add('bad'); });
      onPick(p === correct);
    });
    box.appendChild(b);
  });
  item.opts = btns;
  setTimeout(() => box.classList.remove('wait'), 450);
  return box;
}
function cardOptions(card, rev) {
  if (rev) {
    const out = [card.c]; for (let t = 0; t < 8 && out.length < 4; t++) { const p = distractorPrompt(card); if (p && !out.includes(p)) out.push(p); }
    return shuffle(out);
  }
  const o = [card.a, ...(card.d || []).slice(0, 3)];
  if (o.length < 2) { const x = distractor(card); if (x && x !== card.a) o.push(x); }
  return shuffle(o.filter((x, i, a) => a.indexOf(x) === i));
}
function feedBuild(item) {
  const { inn, plan } = item; inn.textContent = '';
  const card = plan.id ? CARDS[plan.id] : null, C = card ? COURSES[card.deck] : null, D = card ? DECKS[card.deck] : null;
  if (plan.type === 'quiz') {
    const s = SV.cards[plan.id], rev = !card.img && !(C && C.norev) && s && s.b >= 3 && Math.random() < 0.35 && !!distractorPrompt(card);
    const pick = plan.from !== 'check' && canPick(card) && s && s.b >= 1 && Math.random() < 0.45;
    inn.appendChild(fk((D ? D.tag || D.name : '') + (plan.gold ? '  ·  GOLDEN' : ''), plan.from === 'check' ? 'Just learned' : rev || pick ? 'Reverse' : plan.from === 'early' ? 'Practice' : 'Recall', D && D.col));
    if (pick) {
      inn.appendChild(el('p', 'fcue sm', 'Pick the ' + card.a.toLowerCase()));
      const ex = el('p', 'fex');
      inn.appendChild(veil(item, picButtons(item, pickParts(card), card.img.g, card.img.p, ok => {
        feedGrade(item, card, ok);
        if (card.ex) { ex.textContent = ''; ex.appendChild(el('b', '', card.ex)); }
        feedAdvance(item, ok ? 1300 : 2600);
      }), 3200, 'Picture the structure, then tap for choices'));
      inn.appendChild(ex);
      return;
    }
    if (card.img) inn.appendChild(cardImgEl(card));
    inn.appendChild(el('p', 'fcue' + ((rev ? card.a : card.c).length > 28 || card.img ? ' sm' : ''), rev ? card.a : card.c));
    if (card.r && !rev) inn.appendChild(el('div', 'frd', card.r));
    const ex = el('p', 'fex');
    const opts = cardOptions(card, rev), correct = rev ? card.c : card.a;
    inn.appendChild(veil(item, optButtons(item, opts, correct, ok => {
      feedGrade(item, card, ok);
      if (card.ex) { ex.textContent = ''; ex.appendChild(el('b', '', card.ex)); if (card.exT) ex.appendChild(document.createTextNode(' · ' + card.exT)); }
      if (speakable(card) && SV.prefs.voice !== false) SPEECH.say(card.say || card.c, cardLang(card));
      feedAdvance(item, ok ? 1100 : 2400);
    }, opts.every(o => o.length < 22)), card.img ? 3000 : 2400));
    inn.appendChild(ex);
    return;
  }
  if (plan.type === 'learn') {
    inn.appendChild(fk((D ? D.tag || D.name : '') + '  ·  NEW', C ? C.units[card.u || 0].t : '', D && D.col));
    if (card.img) inn.appendChild(cardImgEl(card));
    else inn.appendChild(el('p', 'fcue' + (card.c.length > 28 ? ' sm' : ''), card.c));
    if (card.r) inn.appendChild(el('div', 'frd', card.r));
    inn.appendChild(el('p', 'fans', card.a));
    if (card.ex) { const ex = el('p', 'fex'); ex.appendChild(el('b', '', card.ex)); if (card.exT) ex.appendChild(document.createTextNode(' · ' + card.exT)); inn.appendChild(ex); }
    const vr = voiceRow(card); if (vr) inn.appendChild(vr);
    inn.appendChild(el('div', 'fhint', 'Remember it. It comes back in a moment. Swipe up.'));
    return;
  }
  if (plan.type === 'speak') {
    const lang = cardLang(card);
    inn.appendChild(fk((D ? D.tag : '') + '  ·  SPEAK', 'Say it aloud', D && D.col));
    inn.appendChild(el('p', 'fcue sm', card.a));
    const ans = el('p', 'fans', card.c); ans.hidden = true; inn.appendChild(ans);
    const out = el('div', 'heard', 'Tap the mic and say it in ' + C.name.replace(/\s*\(.*\)$/, ''));
    const row = el('div', 'voice'), mic = vbtn('mic', 'Speak'), skip = vbtn('play', 'Show me');
    row.append(mic, skip); inn.append(row, out);
    const self = el('div', 'fopts two'); self.hidden = true;
    const yes = el('button', '', 'I knew it'), no = el('button', '', 'I did not');
    self.append(yes, no); inn.appendChild(self);
    const finish = ok => { if (item.done) return; item.done = true; feedGrade(item, card, ok); feedAdvance(item, 1400); };
    yes.addEventListener('click', () => finish(true)); no.addEventListener('click', () => finish(false));
    skip.addEventListener('click', () => { ans.hidden = false; SPEECH.say(card.say || card.c, lang); self.hidden = false; });
    mic.addEventListener('click', async () => {
      if (item.done) return;
      SPEECH.stop(); mic.classList.add('live'); out.className = 'heard'; out.textContent = 'Listening…';
      const r = await SPEECH.hear(lang, 6500); mic.classList.remove('live');
      if (!r.alts.length) { out.textContent = SPEECH.errText(r.err); if (r.err === 'not-allowed' || r.err === 'service-not-allowed') SV.prefs.feedMic = false; self.hidden = false; ans.hidden = false; return; }
      const sc = SPEECH.score(r.alts, [card.c, card.say, card.r], lang);
      ans.hidden = false; out.className = 'heard ' + (sc.ok ? 'ok' : 'bad'); out.textContent = '';
      out.append(document.createTextNode('Heard: '), el('b', '', sc.heard), document.createTextNode(` · ${Math.round(sc.score * 100)}%`));
      ginc('spoke', 1);
      if (sc.ok) { ginc('spokeOk', 1); finish(true); } else { SPEECH.say(card.say || card.c, lang); self.hidden = false; }
    });
    return;
  }
  if (plan.type === 'math') {
    const m = mathProblem(SV.math.lv); item.t0 = 0;
    inn.appendChild(fk('MATH  ·  LEVEL ' + m.lv + (plan.gold ? '  ·  GOLDEN' : ''), 'Quick', '#a8c97a'));
    inn.appendChild(el('p', 'fcue', m.q));
    const opts = shuffle([m.a, ...m.w]);
    inn.appendChild(optButtons(item, opts, m.a, ok => {
      const fast = item.t0 && performance.now() - item.t0 < 3500;
      mathAdapt(ok, fast); feedScore(item, ok, fast ? 1 : 0);
      if (!ok) sfx.miss(); else sfx.recall();
      feedAdvance(item, ok ? 700 : 1800);
    }, true));
    inn.appendChild(el('div', 'fhint', 'Answer within 3 seconds for a speed bonus'));
    return;
  }
  if (plan.type === 'note' || plan.type === 'read') {
    const K = COURSES[plan.key], u = K.units[plan.ui];
    inn.appendChild(fk(K.tag || K.name, plan.type === 'read' ? 'Reading' : 'Lesson note', K.col));
    inn.appendChild(el('p', 'fcue sm', u.t));
    if (plan.type === 'read') { const words = u.r.x.join(' ').split(/\s+/); inn.appendChild(el('p', 'fnote', words.slice(0, 60).join(' ') + (words.length > 60 ? '…' : ''))); }
    else inn.appendChild(el('p', 'fnote', u.n));
    const row = el('div', 'row'), b = el('button', 'cta', plan.type === 'read' ? 'Read it · +25◆' : 'Learn this unit');
    b.addEventListener('click', () => { const k = plan.key, ui = plan.ui; closePanel(); openLesson(k, ui); if (plan.type === 'read' && LS) { LS.phase = 'read'; LS.rd = { t0: performance.now(), ans: [] }; learnRender(); } });
    row.appendChild(b); inn.appendChild(row);
    inn.appendChild(el('div', 'fhint', K.name + ' · Unit ' + (plan.ui + 1) + ' · swipe up to keep going'));
    return;
  }
  if (plan.type === 'milestone') {
    const F = FEED, acc = F.n ? Math.round(100 * F.ok / F.n) : 0;
    inn.appendChild(fk('MILESTONE', `${F.made - 1} cards`));
    inn.appendChild(el('div', 'fbig', `${F.ok} right`));
    const sum = el('div', 'fsum');
    [['Accuracy', acc + '%'], ['Best combo', '×' + F.best], ['Shards', '+' + F.gain]].forEach(([l, v]) => { const s = el('div', 'stat'); s.append(el('span', 'lbl', l), el('b', '', v)); sum.appendChild(s); });
    inn.appendChild(sum);
    const due = dueCount();
    inn.appendChild(el('p', 'fnote', due ? `${due} sigil${due > 1 ? 's are' : ' is'} still ready to recall. Keep going, or take what you learned into a run.` : 'Everything due is reviewed. Learn something new below, or take it into a run.'));
    const row = el('div', 'row'), play = el('button', 'cta', 'Play a run'); play.addEventListener('click', () => { closePanel(); start(); });
    row.appendChild(play); inn.appendChild(row);
    inn.appendChild(el('div', 'fhint', 'Swipe up to keep going'));
  }
}
function feedActivate(i) {
  const F = FEED; if (!F || i === F.idx || !F.els[i]) return;
  // Leaving a card: commit learn cards that were seen.
  const prev = F.els[F.idx];
  if (prev && prev.plan.type === 'learn' && !prev.done) feedLearned(prev);
  if (prev && prev.veilT) { clearTimeout(prev.veilT); prev.veilT = 0; }
  F.idx = i;
  const it = F.els[i];
  while (F.els.length < i + 4) feedAppend();
  if (it.plan.type === 'math') it.t0 = performance.now();
  if (it.reveal && !it.veilT) it.veilT = setTimeout(it.reveal, it.veilMs || 2400);
  const card = it.plan.id ? CARDS[it.plan.id] : null;
  if (card && it.plan.type === 'learn' && speakable(card) && SV.prefs.voice !== false) setTimeout(() => SPEECH.say(card.say || card.c, cardLang(card)), 200);
  else SPEECH.stop();
  try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
}
function feedLearned(item) {
  item.done = true;
  const id = item.plan.id;
  if (!SV.cards[id]) { rollDay(); putCard(id, { b: 0, due: Date.now() + IV[1], n: 1, l: 0 }); SV.daily.newToday++; FEED.newPending = Math.max(0, FEED.newPending - 1); ginc('xp', 3); save(); }
}
function feedScore(item, ok, bonus) {
  const F = FEED; F.n++;
  rollDay(); SV.daily.gatesToday++;
  if (ok) {
    F.ok++; F.combo++; F.best = Math.max(F.best, F.combo);
    const sh = (1 + Math.floor(F.combo / 5) + (bonus || 0)) * (item.plan.gold ? 5 : 1);
    ginc('life', sh); ginc('xp', 2 + Math.min(6, F.combo >> 2)); F.gain += sh;
    if (F.combo === 5 || F.combo === 10 || F.combo === 20 || F.combo % 50 === 0) { feedToast(`×${F.combo} combo`); sfx.mission(); }
    if (item.plan.gold) { feedToast(`Golden card · +${sh}◆`); sfx.best(); }
    buzz(10);
  } else { F.combo = 0; buzz(30); }
  if (SV.daily.gatesToday >= DAILY && markDone()) { feedToast('Daily ritual complete · streak ' + SV.streak.n); sfx.mission(); }
  const L = levelInfo().L; if (L > F.lvl) { F.lvl = L; feedToast('Level ' + L); sfx.best(); }
  save(); feedHud();
}
function feedGrade(item, card, ok) {
  const id = card.id, from = item.plan.from, s = SV.cards[id];
  if (!s) putCard(id, { b: 0, due: Date.now() + IV[1], n: 1, l: 0 });
  if (from === 'due') reviewCard(id, ok, 'due');
  else if (from === 'check') { const x = SV.cards[id]; if (ok) { x.n++; putCard(id, x); } else { reviewCard(id, false, 'relearn'); FEED.checks.push({ id, at: FEED.made + 3 }); } }
  else { if (ok) { const x = SV.cards[id]; x.n++; putCard(id, x); } else reviewCard(id, false, 'relearn'); }
  const r = SV.cards[id];
  if (ok && r && r.b === MASTER && from === 'due') feedToast('Sigil mastered');
  if (ok) sfx.recall(); else sfx.miss();
  feedScore(item, ok, 0);
}
function feedAdvance(item, ms) {
  const F = FEED; if (!F) return;
  const i = +item.sec.dataset.i;
  setTimeout(() => { if (FEED === F && F.idx === i && F.els[i + 1]) F.els[i + 1].sec.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); }, ms);
}
function feedGo(d) {
  const F = FEED; if (!F) return;
  const t = F.els[Math.max(0, F.idx + d)]; if (t) t.sec.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
}
function feedKey(e) {
  const k = e.key, F = FEED; if (!F) return;
  if (k === 'Escape') { e.preventDefault(); if (!$('fSheet').hidden) { $('fSheet').hidden = true; return; } closePanel(); return; }
  if (k === 'ArrowDown' || k === 'PageDown' || k === 'j') { e.preventDefault(); feedGo(1); return; }
  if (k === 'ArrowUp' || k === 'PageUp' || k === 'k') { e.preventDefault(); feedGo(-1); return; }
  const it = F.els[F.idx]; if (!it) return;
  const n = +k;
  const veiled = it.reveal && it.opts && it.opts[0] && it.opts[0].parentNode.classList.contains('veiled');
  if (veiled && !it.done && ((n >= 1 && n <= 4) || k === ' ' || k === 'Enter')) { e.preventDefault(); it.reveal(); return; }
  if (n >= 1 && n <= 4 && it.opts && it.opts[n - 1] && !it.done) { e.preventDefault(); it.opts[n - 1].click(); return; }
  if (k === ' ' || k === 'Enter') {
    if (document.activeElement && document.activeElement.tagName === 'BUTTON' && it.sec.contains(document.activeElement) && !it.done) return;
    e.preventDefault(); feedGo(1);
  }
}
function feedSettings() {
  const S2 = $('fSheet'); S2.textContent = ''; S2.hidden = false;
  const h = el('div', 'ph'); h.appendChild(el('h2', '', 'Feed')); const x = el('button', 'x', '×'); x.setAttribute('aria-label', 'Close'); x.addEventListener('click', () => { S2.hidden = true; }); h.appendChild(x); S2.appendChild(h);
  S2.appendChild(el('p', 'how', 'Every card is spaced review: what is due comes first, new sigils from your focus course follow, and quick math keeps it moving. Every answer counts toward your daily ritual.'));
  const mk = (label, key, def) => {
    const r = el('div', 'setrow'); r.appendChild(el('span', '', label)); const seg = el('div', 'seg');
    [['On', true], ['Off', false]].forEach(([t, v]) => { const b = el('button', ((SV.prefs[key] === undefined ? def : SV.prefs[key]) !== false) === v ? 'on' : '', t); b.addEventListener('click', () => { setPref(key, v); seg.querySelectorAll('button').forEach(z => z.classList.toggle('on', z === b)); }); seg.appendChild(b); });
    r.appendChild(seg); S2.appendChild(r);
  };
  mk('Read words aloud', 'voice', true);
  mk('Speaking cards (microphone)', 'feedMic', true);
  const row = el('div', 'row'), lib = el('button', 'ghost', 'Choose courses'); lib.addEventListener('click', () => { closePanel(); openPanel('library'); });
  row.appendChild(lib); S2.appendChild(row);
}
$('fClose').addEventListener('click', () => closePanel());
$('fMenu').addEventListener('click', feedSettings);
