Object.assign(sfx, {
  revive: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.45, 'triangle', 0.11, 1, i * 0.06)); noise(0.6, 0.15, 800, 6000, 'bandpass'); },
  boon: () => [659, 988, 1319].forEach((f, i) => tone(f, 0.3, 'sine', 0.1, 1, i * 0.06)),
  nearDeath: () => { noise(0.35, 0.3, 1800, 120); tone(220, 0.3, 'sawtooth', 0.12, 0.4); },
  buy: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'square', 0.05, 1, i * 0.04))
});

/* ================= game state ================= */
let mode = 'menu';
let panel = null;
let G = null;
const demo = { ang: -Math.PI / 2, rf: 1, tgt: 1, nt: 1.4 };
let camX = 0, shake = 0, flash = 0, flashCol = '255,255,255', tNow = 0, lockUntil = 0, multPulse = 0, punch = 0, feverVis = 0, focusVis = 0;
const parts = [], pops = [], toasts = [], waves = [];
let trailPts = [];

const RF = rf => S * (K0 + (K1 - K0) * rf);
function diff() { return clamp(G.t / (runsCount() < 2 ? 110 : 85), 0, 1); }
const bo = k => (G && G.boons[k]) || 0;
const feverDur = () => 6 + 1.5 * bo('fever') + 0.5 * shopLv('fever');
const magnetDur = () => 8 + 5 * bo('lode') + 2 * shopLv('magnet');

function newRun() {
  G = { t: 0, ang: -Math.PI / 2, rf: 1, tgt: 1, omega: 1.7, score: 0, mult: shopLv('start') ? 2 : 1, heat: 0, shards: 0, grazes: 0, perfects: 0, slips: 0, maxMult: 1,
        hz: [], sh: [], pu: [], rushes: [], gates: [], edge: -Math.PI / 2 + Math.PI * 0.85, lsT: -9, lsFrom: -1, chain: 0, chainT: -9, phase: 1, genPhase: 1,
        bestBroken: false, slowT: 0, rewards: 0, dead: false, deadT: 0, lifeStart: lifeShards(), mStart: SV.missions.map(m => m.prog), prevBest: SV.best,
        feverM: 0, fever: 0, feverMax: 6, grace: 0, fevers: 0, smashed: 0, powers: 0, shield: shopLv('shield') > 0, magnet: 0, streak: 0, pstreak: 0,
        puAt: 8, rushT: 20, gateAt: 6, gateN: 0, relearn: [], pending: new Set(), focus: null, gateFx: null, recalls: 0, gatesQ: 0, gatesNew: 0,
        rchain: 0, maxChain: 0, boons: {}, boonPending: false, revives: 1 + shopLv('revive'), revived: 0, rv: null, call: null };
  G.maxMult = G.mult;
  rollDay();
  trailPts = []; parts.length = 0; pops.length = 0; toasts.length = 0; waves.length = 0;
}

function place(lane, lf, gapT, hop) {
  const kRes = hop ? K0 : KL(lane);
  const w = lf / 2 / kRes, pa = PRK / kRes;
  const a = G.edge + gapT * G.omega + w + pa;
  const h = { a, lane, k: KL(lane), lf, col: PHASE_COL[(G.genPhase - 1) % PHASE_COL.length] };
  if (hop) h.hop = { to: 1 - lane, at: rnd(0.62, 0.8), t: -1, from: KL(lane) };
  G.hz.push(h); G.edge = a + w + pa; return h;
}
const shard = (a, lane) => G.sh.push({ a, lane });
function pickPU() {
  const opts = G.shield ? ['magnet', 'nova'] : ['shield', 'shield', 'magnet', 'nova'];
  return opts[Math.random() * opts.length | 0];
}
function genRush() {
  G.genPhase++;
  const sp = 0.2, a0 = G.edge + 0.55 * G.omega, n = Math.round(3.4 * G.omega / sp);
  const r = { a0, a1: 0, n, got: 0, started: false, done: false };
  let lane = Math.random() < 0.5 ? 0 : 1, run = 0, a = a0;
  for (let i = 0; i < n; i++) {
    if (run >= 4 && Math.random() < 0.55) { lane = 1 - lane; run = 0; a += sp * 0.9; }
    run++; G.sh.push({ a, lane, gold: true, r }); a += sp;
  }
  r.a1 = a; G.rushes.push(r);
  G.edge = a + 0.9 * G.omega;
}

/* ---------- gate scheduling ---------- */
function firstNew(dk) {
  if (!packOn(dk)) return null;
  for (const id of DECK_IDS[dk] || []) if (!SV.cards[id] && !G.pending.has(id) && eligible(id)) return id;
  return null;
}
function pickCard() {
  rollDay();
  const now = Date.now(), pend = G.pending;
  for (let i = 0; i < G.relearn.length; i++) {
    const r = G.relearn[i];
    if (G.gateN >= r.after && !pend.has(r.id) && CARDS[r.id]) { G.relearn.splice(i, 1); return { id: r.id, from: 'relearn' }; }
  }
  let best = null, bd = Infinity;
  for (const id in SV.cards) {
    const s = SV.cards[id];
    if (pend.has(id) || G.relearn.some(r => r.id === id) || !eligible(id)) continue;
    if (s.due <= now && s.due < bd) { bd = s.due; best = id; }
  }
  if (best) return { id: best, from: 'due' };
  let pendingNew = 0; pend.forEach(id => { if (!SV.cards[id]) pendingNew++; });
  if (SV.daily.newToday + pendingNew >= NEW_CAP) return null;
  for (const dk of ['codex', 'custom']) { const id = firstNew(dk); if (id) return { id, from: 'new' }; }
  const order = Object.keys(PACKS).filter(packOn);
  if (!order.length) return null;
  SV.rr = ((+SV.rr || 0) + 1) % 1e6;
  for (let i = 0; i < order.length; i++) { const id = firstNew(order[(SV.rr + i) % order.length]); if (id) return { id, from: 'new' }; }
  return null;
}
function genGate() {
  const pick = pickCard(); if (!pick) return false;
  const card = CARDS[pick.id];
  const a = G.edge + 1.05 * G.omega;
  const g = { a, id: pick.id, from: pick.from, kind: SV.cards[pick.id] ? 'quiz' : 'new', correct: Math.random() < 0.5 ? 0 : 1, opts: ['', ''], done: false, focus: false, rev: false };
  if (g.kind === 'quiz') {
    const s = SV.cards[pick.id], canRev = !(PACKS[card.deck] && PACKS[card.deck].norev) && s.b >= 3 && Math.random() < 0.4;
    const dp = canRev ? distractorPrompt(card) : null;
    if (dp) { g.rev = true; g.opts[g.correct] = card.c; g.opts[1 - g.correct] = dp; }
    else { g.opts[g.correct] = card.a; g.opts[1 - g.correct] = distractor(card); }
  }
  G.gates.push(g); G.pending.add(pick.id);
  G.edge = a + 0.75 * G.omega;
  return true;
}

function genPattern() {
  const te = G.t + (G.edge - G.ang) / G.omega;
  if (te >= G.rushT) { G.rushT += 20; genRush(); return; }
  if (te >= G.gateAt) { G.gateAt = te + rnd(9, 13); if (genGate()) return; }
  const d = diff();
  const gapT = lerp(1.0, 0.42, d) * rnd(0.9, 1.25);
  const L = () => rnd(0.11, 0.17);
  let lane = Math.random() < 0.5 ? 0 : 1;
  if (te >= G.puAt) {
    G.puAt = te + rnd(11, 16) * (1 - 0.15 * bo('lode')) * (1 - 0.12 * shopLv('luck'));
    const h = place(lane, L(), gapT);
    G.pu.push({ a: h.a, lane: 1 - lane, type: pickPU() });
    return;
  }
  const roll = Math.random();
  if (G.genPhase >= 2 && roll < lerp(0.14, 0.3, d)) {
    const h = place(lane, rnd(0.12, 0.16), Math.max(gapT, 0.7), true);
    shard(h.a, lane);
    G.edge += 0.3 * G.omega;
  } else if (G.t < 3 || roll < 0.36) {
    const h = place(lane, L(), gapT);
    if (Math.random() < 0.6) shard(h.a, 1 - lane);
  } else if (roll < 0.58) {
    const n = 2 + (Math.random() < lerp(0.3, 0.8, d) ? 1 : 0) + (d > 0.6 && Math.random() < 0.4 ? 1 : 0);
    const zg = lerp(0.42, 0.2, d);
    let h = place(lane, L(), gapT); shard(h.a, 1 - lane);
    for (let i = 1; i < n; i++) { lane = 1 - lane; h = place(lane, rnd(0.1, 0.14), zg * rnd(0.95, 1.2)); shard(h.a, 1 - lane); }
  } else if (roll < 0.72) {
    const h = place(lane, lerp(0.28, 0.46, d) * rnd(0.9, 1.1), gapT), w = wOf(h);
    for (let k = -2; k <= 2; k++) shard(h.a + k * w * 0.38, 1 - lane);
  } else if (roll < 0.86) {
    const sp = 0.06 / KL(lane), start = G.edge + gapT * G.omega, n = 4 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) shard(start + i * sp, lane);
    G.edge = start + (n - 1) * sp + 0.02 / KL(lane);
    const h = place(lane, L(), lerp(0.36, 0.22, d)); shard(h.a, 1 - lane);
  } else {
    const h1 = place(lane, L(), gapT); shard(h1.a, 1 - lane); lane = 1 - lane;
    const h2 = place(lane, L(), lerp(0.32, 0.18, d)); shard(h2.a, 1 - lane);
  }
}

const prOf = () => PRK * S * (G && G.fever > 0 ? 1.45 : 1);
function ppos(o) { const r = RF(o.rf); return { x: Math.cos(o.ang) * r, y: Math.sin(o.ang) * r }; }
function pop(text, col, size) { const p = ppos(G); pops.push({ x: p.x, y: p.y - S * 0.05, text, col, size: size || 1, life: 0.9, max: 0.9 }); }
function toast(title, sub, col, life) { toasts.push({ title, sub, col: col || '#eee5d5', life: life || 1.9, max: life || 1.9 }); if (toasts.length > 3) toasts.splice(1, 1); }
function callout(text, col) { G.call = { text, col, life: 1.1, max: 1.1 }; }
function wave(x, y, col, max, life, lw) { waves.push({ x, y, col, max, life: life || 0.45, t: 0, lw: lw || 3 }); }
function burst(x, y, n, col, spd, life, size) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = spd * rnd(0.25, 1); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * rnd(0.6, 1), max: life, col, s: size * rnd(0.5, 1) }); }
  if (parts.length > 700) parts.splice(0, parts.length - 700);
}
function tip(id, title, sub) { if (SV.tips[id]) return; SV.tips[id] = 1; save(); toast(title, sub, '#eee5d5', 2.6); }

function addHeat(v) {
  if (G.fever > 0) v *= 0.5;
  G.heat += v;
  while (G.heat >= 1) {
    if (G.mult < 8) {
      G.mult++; G.heat -= 1; G.maxMult = Math.max(G.maxMult, G.mult); multPulse = 1;
      sfx.up(G.mult); pop('×' + G.mult, MULT_COL[G.mult - 1], 1.5);
      burst(0, 0, 26, MULT_COL[G.mult - 1], S * 0.9, 0.7, S * 0.008);
      wave(0, 0, MULT_COL[G.mult - 1], S * 0.24, 0.5, 4);
    } else { G.heat = 1; break; }
  }
}
function chargeFever(v) {
  if (G.fever > 0 || G.dead) return;
  v *= 1 + 0.25 * bo('charge');
  const before = G.feverM;
  G.feverM = Math.min(1, G.feverM + v);
  if (before < 0.3 && G.feverM >= 0.3) tip('ring', 'Outer ring = Fever', 'Keep grazing to fill it');
  if (G.feverM >= 1) startFever();
}
function startFever() {
  G.feverMax = feverDur(); G.fever = G.feverMax; G.fevers++; G.feverM = 1;
  toast('Fever', 'Invincible. Smash everything.', '#f0b35e'); callout('FEVER', '#f0b35e');
  sfx.fever(); buzz(40);
  flash = RM ? 0.15 : 0.6; flashCol = '240,179,94'; punch = 1; shake = Math.max(shake, 8);
  const p = ppos(G); wave(p.x, p.y, '#f0b35e', S * 0.7, 0.7, 6); wave(0, 0, '#d5b66f', S * 0.55, 0.6, 3);
  burst(p.x, p.y, 50, '#f0b35e', S * 1.4, 0.8, S * 0.01);
}
function endFever() { G.fever = 0; G.feverM = 0; G.grace = 1.0; sfx.down(); pop('FEVER OVER', '#b9aaa6'); }
function award(kind) {
  const p = ppos(G);
  G.streak++;
  if (kind === 'perfect') {
    G.perfects++; G.grazes++; G.pstreak++;
    const pts = 150 * G.mult * (G.pstreak > 1 ? 1 + (G.pstreak - 1) * 0.25 : 1);
    G.score += pts; addHeat(0.62); chargeFever(0.24);
    pop((G.pstreak > 1 ? 'PERFECT ×' + G.pstreak + ' ' : 'PERFECT ') + '+' + fmt(pts), '#ffffff', 1.15); sfx.perfect(G.pstreak); buzz(18);
    G.slowT = 0.17; flash = RM ? 0.1 : 0.35; flashCol = '255,240,200'; shake = Math.max(shake, 5); punch = Math.max(punch, 0.8);
    burst(p.x, p.y, 22, '#ffffff', S * 1.1, 0.5, S * 0.007); wave(p.x, p.y, '#ffffff', S * 0.2, 0.4, 3);
  } else if (kind === 'graze') {
    G.grazes++; G.pstreak = 0; G.score += 60 * G.mult; addHeat(0.34); chargeFever(0.13);
    pop('GRAZE +' + fmt(60 * G.mult), '#d5b66f'); sfx.graze(); buzz(8);
    burst(p.x, p.y, 12, '#d5b66f', S * 0.8, 0.4, S * 0.006);
  } else {
    G.slips++; G.score += 50 * G.mult; addHeat(0.3); chargeFever(0.1);
    pop('SLIP +' + fmt(50 * G.mult), '#7bc4bd'); sfx.slip();
    burst(p.x, p.y, 10, '#7bc4bd', S * 0.7, 0.4, S * 0.006);
  }
  const w = CALLS[G.streak] || (G.streak > 22 && G.streak % 5 === 2 ? 'GODLIKE' : null);
  if (w) callout(w, MULT_COL[Math.min(7, G.mult - 1)]);
}
function smash(h, quiet) {
  h.dead = true; G.smashed++;
  const pts = 80 * G.mult; G.score += pts;
  const w = wOf(h), R = h.k * S;
  for (let i = 0; i < 5; i++) { const a = h.a - w + (i + 0.5) / 5 * 2 * w; burst(Math.cos(a) * R, Math.sin(a) * R, 7, h.col, S * 0.9, 0.55, S * 0.009); }
  burst(Math.cos(h.a) * R, Math.sin(h.a) * R, 8, '#ffffff', S * 0.6, 0.35, S * 0.006);
  if (!quiet) { sfx.smash(); shake = Math.max(shake, 7); buzz(12); pop('SMASH +' + fmt(pts), h.col); }
}
function shieldBreak(h) {
  G.shield = false; smash(h, true); G.grace = 0.7; G.slowT = 0.28;
  flash = RM ? 0.15 : 0.5; flashCol = '138,180,220'; shake = Math.max(shake, 10);
  const p = ppos(G); wave(p.x, p.y, '#8ab4dc', S * 0.3, 0.5, 4); burst(p.x, p.y, 30, '#8ab4dc', S * 1.2, 0.6, S * 0.008);
  sfx.shieldBreak(); buzz(30); pop('SHIELD SAVED YOU', '#8ab4dc', 1.1);
}
function nova() {
  let n = 0;
  for (const h of G.hz) { const d = h.a - G.ang; if (!h.dead && d > -0.3 && d < LOOK) { smash(h, true); n++; } }
  const p = ppos(G);
  wave(p.x, p.y, '#f0b35e', S * 1.1, 0.8, 8); wave(0, 0, '#ffffff', S * 0.6, 0.6, 3);
  flash = RM ? 0.15 : 0.6; flashCol = '240,179,94'; shake = Math.max(shake, 14); punch = 1;
  sfx.nova(); buzz(45);
  if (n) pop('NOVA ×' + n + ' +' + fmt(n * 80 * G.mult), '#f0b35e', 1.2);
}
function grab(p) {
  p.got = true; G.powers++;
  const pp = ppos(G), def = PU[p.type];
  sfx.power(); wave(pp.x, pp.y, def.col, S * 0.22, 0.4, 3); burst(pp.x, pp.y, 16, def.col, S * 0.8, 0.45, S * 0.007);
  if (p.type === 'shield') G.shield = true;
  else if (p.type === 'magnet') G.magnet = magnetDur();
  else nova();
  toast(def.name, def.sub, def.col);
}
function collect(s) {
  s.got = true; G.shards++;
  G.chain = (G.t - G.chainT < 1.3) ? G.chain + 1 : 0; G.chainT = G.t;
  G.score += (s.gold ? 50 : 25) * G.mult * (bo('midas') ? 3 : 1); addHeat(s.gold ? 0.08 : 0.12); chargeFever(s.gold ? 0.018 : 0.012);
  sfx.shard(G.chain, s.gold);
  if (s.r) s.r.got++;
  const R = KL(s.lane) * S, x = s.fly ? s.x : Math.cos(s.a) * R, y = s.fly ? s.y : Math.sin(s.a) * R;
  burst(x, y, 8, s.gold ? '#ffe9b0' : '#e4cfaa', S * 0.5, 0.35, S * 0.005);
}

/* ---------- gates ---------- */
function enterGate(g) {
  g.focus = true; g.t0 = tNow; G.focus = g; sfx.gateIn(); duck(0.16);
  if (g.kind === 'new') tip('new', 'New sigil', 'Read it and remember it. It comes back soon.');
  else if (g.rev) tip('rev', 'Reverse gate', 'Strong sigils come back flipped: pick the prompt.');
  else tip('gate', 'Recall gate', 'Steer into the lane with the right answer');
}
function reviewCard(id, ok, from) {
  const now = Date.now(), s = SV.cards[id] || { b: 0, n: 0, l: 0, due: now };
  const prev = s.b;
  if (from === 'due') ginc(ok ? 'retR' : 'retW', 1);
  if (ok) { s.b = Math.min(8, s.b + 1); s.due = now + IV[s.b] * rnd(0.92, 1.08); }
  else { s.b = 0; s.l = (s.l || 0) + 1; s.due = now + IV[1]; }
  s.n = (s.n || 0) + 1;
  putCard(id, s);
  return { prev, b: s.b };
}
function resolveGate(g) {
  g.done = true; g.fxT = tNow; g.chose = G.tgt; G.focus = null; G.gateFx = g; G.gateN++; G.pending.delete(g.id); duck(0.34);
  const card = CARDS[g.id];
  rollDay(); SV.daily.gatesToday++;
  const p = ppos(G);
  if (!card) return;
  if (g.kind === 'new') {
    SV.daily.newToday++; G.gatesNew++;
    putCard(g.id, { b: 0, due: Date.now() + IV[1], n: 1, l: 0 });
    G.relearn.push({ id: g.id, after: G.gateN + 2 });
    const pts = 150 * G.mult; G.score += pts; chargeFever(0.12); addHeat(0.2);
    sfx.learn(); pop('NEW SIGIL +' + fmt(pts), DECKS[card.deck].col, 1.1);
    wave(p.x, p.y, DECKS[card.deck].col, S * 0.2, 0.45, 3);
  } else {
    G.gatesQ++;
    const ok = g.chose === g.correct; g.ok = ok;
    const r = reviewCard(g.id, ok, g.from);
    if (ok) {
      G.recalls++; G.rchain++; G.maxChain = Math.max(G.maxChain, G.rchain);
      const chainMul = Math.min(4, 1 + 0.5 * (G.rchain - 1));
      const pts = 400 * G.mult * chainMul * (1 + 0.5 * bo('scholar')) * (1 + 0.2 * shopLv('gate'));
      G.score += pts; addHeat(0.5); chargeFever(0.3);
      sfx.recall(); buzz(15);
      callout(CHAIN_CALLS[G.rchain] || 'RECALL', '#d5b66f');
      pop((G.rchain > 1 ? 'CHAIN ×' + G.rchain + ' ' : 'RECALL ') + '+' + fmt(pts), '#d5b66f', 1.2);
      wave(p.x, p.y, '#d5b66f', S * 0.35, 0.55, 4); burst(p.x, p.y, 26, '#d5b66f', S * 1.1, 0.55, S * 0.008);
      flash = RM ? 0.08 : 0.25; flashCol = '213,182,111';
      if (r.prev < MASTER && r.b >= MASTER) toast('Sigil mastered', card.c + '  ·  ' + card.a, '#d5b66f', 2.4);
    } else {
      G.relearn.push({ id: g.id, after: G.gateN + 2 });
      G.streak = 0; G.rchain = 0; sfx.miss(); shake = Math.max(shake, 4);
      toast(card.c, '= ' + card.a, '#ee8991', 2.8);
    }
  }
  if (SV.daily.gatesToday >= DAILY && markDone()) { toast('Daily ritual complete', 'Streak: ' + SV.streak.n + ' day' + (SV.streak.n > 1 ? 's' : ''), '#82c89c', 2.4); sfx.mission(); }
  save();
}

/* ---------- boons ---------- */
function openBoons() {
  const pool = Object.keys(BOONS).filter(k => bo(k) < BOONS[k].max && (!BOONS[k].ok || BOONS[k].ok()));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const pick = pool.slice(0, 3); if (!pick.length) return;
  mode = 'boon'; duck(0.16); sfx.boon();
  $('boonMeta').textContent = 'Phase ' + G.phase + ' cleared';
  const box = $('boonList'); box.textContent = '';
  pick.forEach((k, i) => {
    const b = el('button', 'boon');
    b.append(el('kbd', '', String(i + 1)), el('b', '', BOONS[k].name), el('span', '', BOONS[k].desc));
    if (bo(k)) b.appendChild(el('em', '', 'Level ' + (bo(k) + 1)));
    b.addEventListener('click', () => takeBoon(k));
    box.appendChild(b);
  });
  G.boonOpts = pick;
  show('boon', true);
  try { box.firstChild.focus({ preventScroll: true }); } catch (e) {}
}
function takeBoon(k) {
  if (mode !== 'boon') return;
  G.boons[k] = bo(k) + 1;
  if (k === 'bulwark') G.shield = true;
  if (k === 'wind') G.revives++;
  if (k === 'supernova') nova();
  if (k === 'fever' && G.fever > 0) { G.fever += 1.5; G.feverMax += 1.5; }
  show('boon', false); mode = 'play'; duck(0.34);
  G.grace = Math.max(G.grace, 0.9); sfx.power();
  toast(BOONS[k].name, BOONS[k].desc, '#d5b66f');
  try { document.activeElement && document.activeElement.blur(); } catch (e) {}
}

/* ---------- recall revive ---------- */
let RVT = null;
function tryRevive(h) {
  if (G.revives <= 0) return false;
  const now = Date.now();
  const pool = Object.keys(SV.cards).filter(id => eligible(id) && SV.cards[id].b >= 1);
  if (!pool.length) return false;
  pool.sort((a, b) => SV.cards[a].due - SV.cards[b].due);
  const top = pool.slice(0, Math.max(6, pool.filter(id => SV.cards[id].due <= now).length));
  const id = top[Math.random() * top.length | 0], card = CARDS[id];
  const correct = Math.random() < 0.5 ? 0 : 1, opts = ['', ''];
  opts[correct] = card.a; opts[1 - correct] = distractor(card);
  G.revives--; G.rv = { id, correct, h, due: SV.cards[id].due <= now };
  mode = 'revive'; musicStop(); sfx.nearDeath(); buzz(40);
  shake = RM ? 3 : 12; flash = RM ? 0.12 : 0.45; flashCol = '238,137,145';
  $('rvMeta').textContent = DECKS[card.deck].tag + ' · answer to keep your run';
  $('rvCue').textContent = card.c;
  const box = $('rvOpts'); box.textContent = '';
  opts.forEach((o, i) => {
    const b = el('button'); b.append(el('kbd', '', String(i + 1)), document.createTextNode(o));
    b.addEventListener('click', () => answerRevive(i));
    box.appendChild(b);
  });
  show('revive', true);
  const bar = $('rvTimer'); bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)'; void bar.offsetWidth;
  requestAnimationFrame(() => { bar.style.transition = 'transform 8s linear'; bar.style.transform = 'scaleX(0)'; });
  clearTimeout(RVT); RVT = setTimeout(() => answerRevive(-1), 8000);
  try { box.firstChild.focus({ preventScroll: true }); } catch (e) {}
  return true;
}
function answerRevive(i) {
  if (mode !== 'revive' || !G.rv) return;
  clearTimeout(RVT);
  const rv = G.rv, ok = i === rv.correct, card = CARDS[rv.id];
  const btns = $('rvOpts').querySelectorAll('button');
  btns.forEach((b, n) => { b.disabled = true; if (n === rv.correct) b.classList.add('ok'); else if (n === i) b.classList.add('bad'); });
  if (ok) { if (rv.due) reviewCard(rv.id, true, 'due'); else { const s = SV.cards[rv.id]; s.n++; putCard(rv.id, s); } }
  else reviewCard(rv.id, false, rv.due ? 'due' : 'relearn');
  save();
  setTimeout(() => {
    show('revive', false); G.rv = null;
    if (ok) {
      mode = 'play'; G.revived++;
      for (const h of G.hz) { const d = h.a - G.ang; if (!h.dead && d > -0.4 && d < 0.9) smash(h, true); }
      G.grace = 1.8; G.slowT = 0.3; sfx.revive(); musicStart();
      callout('REVIVED', '#82c89c'); flash = RM ? 0.1 : 0.5; flashCol = '130,200,156';
      const p = ppos(G); wave(p.x, p.y, '#82c89c', S * 0.6, 0.7, 6); burst(p.x, p.y, 40, '#82c89c', S * 1.2, 0.7, S * 0.009);
    } else {
      mode = 'play'; die();
      toast(card.c, '= ' + card.a, '#ee8991', 2.8);
    }
  }, ok ? 450 : 900);
}

function doSwitch() {
  if (!G || G.dead) return;
  const from = G.tgt; G.tgt = 1 - G.tgt; G.lsFrom = from; G.lsT = G.t;
  sfx.tick(G.tgt);
  for (const h of G.hz) if (!h.dead && h.passT !== undefined && !h.slip && h.lane === G.tgt && G.t - h.passT < 0.14 && G.fever <= 0) { h.slip = true; award('slip'); }
}

function stat(type) {
  switch (type) {
    case 'graze': return G.grazes; case 'perfect': return G.perfects; case 'mult': return G.maxMult;
    case 'score': return G.score; case 'shards': return G.shards; case 'survive': return G.t; case 'slip': return G.slips;
    case 'fever': return G.fevers; case 'smash': return G.smashed; case 'power': return G.powers; case 'recall': return G.recalls; case 'chain': return G.maxChain;
  }
  return 0;
}

function die() {
  G.dead = true; G.deadT = 0; mode = 'dying'; musicStop();
  const p = ppos(G), tr = curTrail();
  burst(p.x, p.y, 70, '#ee8991', S * 1.6, 0.9, S * 0.012);
  burst(p.x, p.y, 40, tr.c ? tr.c[1] : '#ffffff', S * 1.1, 0.8, S * 0.009);
  wave(p.x, p.y, '#ee8991', S * 0.5, 0.7, 5);
  shake = RM ? 4 : 22; flash = RM ? 0.15 : 0.7; flashCol = '238,137,145';
  sfx.die(); buzz(70);
}

function step(dt) {
  G.t += dt;
  G.omega = Math.min(4.3, 1.7 + G.t * 0.034 + Math.max(0, G.t - 40) * 0.008);
  const om = G.omega * (G.fever > 0 ? 1.25 : 1);
  G.ang += om * dt;
  const sp = dt / 0.11; G.rf += clamp(G.tgt - G.rf, -sp, sp);
  while (G.edge < G.ang + LOOK) genPattern();

  if (G.fever > 0) { G.fever -= dt; if (G.fever <= 0) endFever(); }
  else if (!G.focus) {
    G.heat -= dt * (0.14 + 0.025 * G.mult) * (1 - 0.3 * bo('sink'));
    if (G.heat < 0) {
      if (G.mult > 1) { G.mult--; G.heat = 0.5; G.streak = 0; pop('×' + G.mult, '#b9aaa6', 1.1); sfx.down(); }
      else G.heat = 0;
    }
  }
  if (G.grace > 0) G.grace -= dt;
  if (G.magnet > 0) G.magnet = Math.max(0, G.magnet - dt);
  G.score += om * dt * 8 * G.mult;

  for (const g of G.gates) {
    if (g.done) continue;
    const d = g.a - G.ang;
    if (!g.focus && d < 1.15 * om) enterGate(g);
    if (d <= 0) resolveGate(g);
  }
  G.gates = G.gates.filter(g => !g.done || g.a - G.ang > -0.6);

  const rk = K0 + (K1 - K0) * G.rf, edge = 1 + 0.25 * bo('edge');
  for (const h of G.hz) {
    if (h.dead) continue;
    const d = h.a - G.ang;
    if (h.hop) {
      if (h.hop.t < 0 && d > 0 && d / G.omega < h.hop.at) { h.hop.t = 0; h.lane = h.hop.to; sfx.hop(); tip('hop', 'Hopper', 'Striped blocks switch lanes. Watch the ghost.'); }
      if (h.hop.t >= 0 && h.hop.t < 1) { h.hop.t = Math.min(1, h.hop.t + dt / 0.16); const e = 1 - Math.pow(1 - h.hop.t, 3); h.k = lerp(h.hop.from, KL(h.hop.to), e); }
    }
    const w = wOf(h), pa = paOf(h);
    if (!G.dead && Math.abs(d) < w + pa * 0.8 && Math.abs(rk - h.k) < THK / 2 + PRK * 0.85 * (G.fever > 0 ? 1.45 : 1)) {
      if (G.fever > 0 || G.grace > 0) { smash(h); continue; }
      if (G.shield) { shieldBreak(h); continue; }
      if (tryRevive(h)) return;
      die(); return;
    }
    if (h.entry === undefined && d < w + pa) h.entry = (G.tgt !== h.lane && G.lsFrom === h.lane) ? G.t - G.lsT : 99;
    if (h.passT === undefined && d < -(w + pa)) {
      h.passT = G.t;
      if (G.fever <= 0) { if (h.entry < 0.10 * edge) award('perfect'); else if (h.entry < 0.22 * edge) award('graze'); }
    }
  }
  G.hz = G.hz.filter(h => !h.dead && h.a - G.ang > -(wOf(h) + 0.7));

  const pp = ppos(G), reach = 0.6 + 0.25 * bo('lode');
  for (const s of G.sh) {
    if (s.got) continue;
    const d = s.a - G.ang, kl = KL(s.lane);
    if (s.fly) {
      const k = Math.min(1, dt * 16); s.x += (pp.x - s.x) * k; s.y += (pp.y - s.y) * k;
      if (Math.hypot(pp.x - s.x, pp.y - s.y) < S * 0.03) collect(s);
      continue;
    }
    if ((G.magnet > 0 || G.fever > 0) && d < reach && d > -0.05) { s.fly = true; s.x = Math.cos(s.a) * kl * S; s.y = Math.sin(s.a) * kl * S; continue; }
    if (Math.abs(d) * kl < 0.042 && Math.abs(rk - kl) < 0.05) collect(s);
  }
  G.sh = G.sh.filter(s => !s.got && (s.fly || s.a - G.ang > -0.6));

  for (const p of G.pu) {
    if (p.got) continue;
    const d = p.a - G.ang, kl = KL(p.lane);
    if (Math.abs(d) * kl < 0.05 && Math.abs(rk - kl) < 0.055) grab(p);
  }
  G.pu = G.pu.filter(p => !p.got && p.a - G.ang > -0.6);

  for (const r of G.rushes) {
    if (!r.started && G.ang >= r.a0 - 0.1) {
      r.started = true; G.phase++;
      toast('Phase ' + G.phase + ' · Bonus rush', 'Grab every gold shard', '#d5b66f'); sfx.phase(); callout('RUSH', '#d5b66f');
    }
    if (!r.done && G.ang > r.a1) {
      r.done = true;
      if (r.got >= r.n) { const b = 1000 * G.mult; G.score += b; toast('Flawless rush', '+' + fmt(b) + ' bonus', '#d5b66f'); callout('FLAWLESS', '#d5b66f'); sfx.best(); }
      else toast('Rush over', `${r.got} of ${r.n} gold shards`, '#b9aaa6');
      G.boonPending = true;
    }
  }
  G.rushes = G.rushes.filter(r => !r.done);

  if (!G.bestBroken && G.prevBest > 0 && G.score > G.prevBest) {
    G.bestBroken = true; toast('New best', 'Every point from here is a record', '#d5b66f'); sfx.best();
  }
  for (const m of SV.missions) {
    if (m.done || MT[m.type].cum) continue;
    if (stat(m.type) >= m.n) {
      m.done = true; m.prog = m.n; ginc('life', m.reward); G.rewards += m.reward;
      toast('Mission complete', MT[m.type].t(m.n) + '  ·  +' + m.reward + ' shards', '#d5b66f'); sfx.mission(); save();
    }
  }
  const maxT = G.fever > 0 ? 34 : 22;
  trailPts.push(pp); if (trailPts.length > maxT) trailPts.splice(0, trailPts.length - maxT);
  if (G.call) { G.call.life -= dt; if (G.call.life <= 0) G.call = null; }
  if (G.boonPending && !G.focus && !G.dead) { G.boonPending = false; openBoons(); }
}

/* ================= run flow ================= */
function show(id, on) { $(id).hidden = !on; }
function start() {
  if (panel) return;
  audio(); newRun(); mode = 'play';
  show('menu', false); show('results', false); show('pause', false);
  musicStart();
}
function toMenu() {
  mode = 'menu'; musicStop(); show('results', false); show('pause', false); renderMenu(); show('menu', true);
  trailPts = [];
}
function endRun() {
  mode = 'results';
  const score = Math.floor(G.score), prevBest = G.prevBest, isBest = score > prevBest;
  if (isBest) SV.best = score;
  const lvlBefore = levelInfo().L;
  ginc('runs', 1);
  ginc('life', G.shards);
  for (const m of SV.missions) {
    if (m.done) continue;
    if (MT[m.type].cum) { m.prog++; if (m.prog >= m.n) { m.done = true; ginc('life', m.reward); G.rewards += m.reward; } }
    else m.prog = Math.max(m.prog, stat(m.type));
  }
  const snap = SV.missions.map((m, i) => Object.assign({}, m, { from: G.mStart[i] || 0 }));
  const cleared = snap.filter(m => m.done).length;
  ginc('mDone', cleared);
  for (let i = 0; i < SV.missions.length; i++) {
    if (SV.missions[i].done) SV.missions[i] = newMission();
    else SV.missions[i].fresh = false;
  }
  ginc('xp', 10 + Math.floor(Math.sqrt(score) * 0.8));
  save();
  renderResults({ score, prevBest, isBest, snap, cleared, lvlUp: levelInfo().L > lvlBefore });
  show('results', true);
  lockUntil = performance.now() + 550;
}

function countUp(elm, to) {
  const t0 = performance.now(), dur = RM ? 0 : 650;
  const tick = now => { const k = dur ? clamp((now - t0) / dur, 0, 1) : 1; elm.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
function animBar(elm, from, to) {
  elm.style.transition = 'none'; elm.style.width = (clamp(from, 0, 1) * 100) + '%';
  void elm.offsetWidth;
  elm.style.transition = ''; requestAnimationFrame(() => { elm.style.width = (clamp(to, 0, 1) * 100) + '%'; });
}
function progText(m, v) {
  const mt = MT[m.type];
  if (mt.sec) return `${Math.floor(v)}s / ${m.n}s`;
  if (mt.money) return `${fmt(v)} / ${fmt(m.n)}`;
  return `${Math.floor(v)} / ${m.n}`;
}
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function missionItem(m, from) {
  const li = el('li', m.done ? 'done' : m.fresh ? 'fresh' : '');
  const txt = el('span', 'txt', MT[m.type].t(m.n) + ' ');
  txt.appendChild(el('em', '', '+' + m.reward + '◆'));
  const pg = el('span', 'pg', m.done ? 'Cleared' : progText(m, m.prog));
  const bar = el('div', 'bar'); const i = el('i'); bar.appendChild(i);
  li.append(txt, pg, bar);
  const to = m.done ? 1 : m.prog / m.n;
  animBar(i, from === undefined ? to : from / m.n, to);
  return li;
}
function nextUnlock(life) {
  let prev = 0;
  for (const t of TRAILS) { if (t.need > life) return { t, prev }; prev = t.need; }
  return null;
}
function nextPage() { return CODEX.findIndex(p => !SV.codex[p.id]); }
function pageOpen() { rollDay(); return nextPage() >= 0 && SV.daily.codexToday < CODEX_PER_DAY; }
function syncLabel() {
  if (SYNC.link === 'on') return { t: 'Linked', ok: true };
  if (SYNC.cloud === 'on') return { t: 'Cloud saved', ok: true };
  if (SYNC.cloud === 'pending') return { t: 'Checking…', ok: false };
  return { t: 'This device', ok: false };
}

function renderDaily() {
  rollDay();
  const n = Math.min(SV.daily.gatesToday, DAILY), done = SV.streak.last === today(), st = liveStreak();
  $('daily').classList.toggle('done', done);
  animBar($('dBar'), n / DAILY, n / DAILY);
  $('dTxt').textContent = done ? `Done today · ${SV.daily.gatesToday} gates` : `${n} / ${DAILY} gates today`;
  $('dStreak').textContent = '';
  $('dStreak').appendChild(el('span', 'streak', st ? `Streak ${st} day${st > 1 ? 's' : ''}` : 'Start a streak'));
  $('cue').value = SV.prefs.cue || '';
}
function renderMenu() {
  ensureMissions();
  const lv = levelInfo();
  $('mBest').textContent = fmt(SV.best);
  $('mLvl').textContent = lv.L;
  $('mShards').textContent = fmt(bank());
  animBar($('mXp'), lv.xp / lv.need, lv.xp / lv.need);
  renderDaily();
  const open = pageOpen(), read = Object.keys(SV.codex).length;
  $('bCodex').classList.toggle('hot', open);
  $('tCodex').textContent = open ? 'New page' : `${read} / ${CODEX.length} read`;
  const due = dueCount();
  $('bSigils').classList.toggle('hot', due > 0 && !open);
  $('tSigils').textContent = due ? `${due} ready` : `${masteredCount()} mastered`;
  const packsOn = Object.keys(PACKS).filter(packOn).length;
  $('tForge').textContent = `${packsOn} packs${DECK_IDS.custom.length ? ' + yours' : ''}`;
  const afford = Object.keys(SHOP).some(k => shopLv(k) < SHOP[k].costs.length && bank() >= SHOP[k].costs[shopLv(k)]);
  $('bShop').classList.toggle('hot', afford);
  $('tShop').textContent = afford ? 'Upgrade ready' : `${fmt(bank())}◆ banked`;
  const sl = syncLabel(); $('tSync').textContent = sl.t; $('bSync').classList.toggle('ok', sl.ok);
  $('mDone').textContent = gsum('mDone') + ' cleared';
  const ul = $('mMissions'); ul.textContent = '';
  for (const m of SV.missions) ul.appendChild(missionItem(m));
  const nu = nextUnlock(lifeShards());
  $('mNext').textContent = nu ? `Next: ${nu.t.name} at ${fmt(nu.t.need)}◆ earned (${fmt(lifeShards())})` : 'All trails unlocked';
  const box = $('trails'); box.textContent = '';
  for (const t of TRAILS) {
    const b = document.createElement('button');
    const op = lifeShards() >= t.need;
    b.style.background = t.css;
    b.className = (op ? '' : 'locked ') + (curTrail().id === t.id ? 'on ' : '') + (op && !SV.seen.includes(t.id) ? 'new' : '');
    b.setAttribute('aria-label', op ? `${t.name} trail` : `${t.name} trail, unlocks at ${t.need} shards earned`);
    b.title = op ? t.name : `${t.name} · ${t.need} shards earned`;
    b.addEventListener('click', () => {
      if (!op) return;
      if (!SV.seen.includes(t.id)) SV.seen.push(t.id); setPref('trail', t.id); renderMenu(); sfx.tick(1);
    });
    box.appendChild(b);
  }
}

function renderResults(r) {
  const tag = $('rTag');
  tag.textContent = (r.isBest ? (r.prevBest > 0 ? 'New best' : 'First score on the board') : 'Run over') + ' · ' + G.t.toFixed(1) + 's';
  tag.classList.toggle('gold', r.isBest);
  countUp($('rScore'), r.score);
  const dl = $('rDelta');
  dl.classList.remove('close');
  if (r.isBest) dl.textContent = r.prevBest > 0 ? `Beat your old best of ${fmt(r.prevBest)} by ${fmt(r.score - r.prevBest)}.` : 'Now beat it.';
  else {
    const gap = r.prevBest - r.score;
    dl.textContent = `${fmt(gap)} short of your best (${fmt(r.prevBest)}).`;
    if (r.score >= r.prevBest * 0.8) { dl.textContent = `So close: ${fmt(gap)} short of your best.`; dl.classList.add('close'); }
  }
  $('rGraze').textContent = G.grazes; $('rPerf').textContent = G.perfects; $('rMult').textContent = '×' + G.maxMult;
  $('rGates').textContent = G.gatesQ ? `${G.recalls}/${G.gatesQ}` : (G.gatesNew ? `+${G.gatesNew}` : '0');
  const bl = Object.keys(G.boons);
  $('rBoons').hidden = !bl.length && !G.revived && !G.maxChain;
  $('rBoons').textContent = '';
  if (bl.length) { $('rBoons').appendChild(document.createTextNode('Boons: ')); $('rBoons').appendChild(el('b', '', bl.map(k => BOONS[k].name + (G.boons[k] > 1 ? ' ×' + G.boons[k] : '')).join(', '))); }
  const extra = [G.maxChain > 1 ? `best recall chain ×${G.maxChain}` : '', G.revived ? `revived ${G.revived}×` : ''].filter(Boolean).join(' · ');
  if (extra) $('rBoons').appendChild(document.createTextNode((bl.length ? '  ·  ' : '') + extra));
  $('rEarn').textContent = '+' + (G.shards + G.rewards);
  $('rLvl').textContent = r.lvlUp ? `Level up · ${levelInfo().L}` : `Level ${levelInfo().L}`;
  $('rLvl').style.color = r.lvlUp ? 'var(--gold)' : '';
  const n = Math.min(SV.daily.gatesToday, DAILY), st = liveStreak();
  $('rDaily').textContent = SV.streak.last === today() ? `Daily ritual done · ${SV.daily.gatesToday} gates` : `Daily ritual: ${n} / ${DAILY} gates`;
  $('rStreak').textContent = st ? `Streak ${st}` : '';
  $('rStreak').style.color = st ? 'var(--gold)' : '';
  $('rNudge').hidden = !pageOpen();
  const before = G.lifeStart, after = lifeShards();
  const nu = nextUnlock(before), box = $('rUnlock');
  if (!nu) box.hidden = true;
  else {
    box.hidden = false;
    const span = nu.t.need - nu.prev, got = after >= nu.t.need;
    box.classList.toggle('got', got);
    $('uName').textContent = got ? `Unlocked: ${nu.t.name} trail` : `Next trail: ${nu.t.name}`;
    $('uNum').textContent = got ? 'Equip it from the menu' : `${fmt(after)} / ${fmt(nu.t.need)}`;
    animBar($('uBar'), (before - nu.prev) / span, (after - nu.prev) / span);
  }
  $('rMDone').textContent = r.cleared ? `${r.cleared} cleared` : '';
  const ul = $('rMissions'); ul.textContent = '';
  for (const m of r.snap) ul.appendChild(missionItem(m, m.from));
}

/* ================= panels ================= */
const PANELS = ['codex', 'sigils', 'forge', 'shop', 'sync', 'news'];
function openPanel(id) {
  if (mode === 'play' || mode === 'dying' || mode === 'paused' || mode === 'boon' || mode === 'revive') return;
  if (mode === 'results') { mode = 'menu'; show('results', false); }
  panel = id; show('menu', false);
  PANELS.forEach(p => show(p, p === id));
  ({ codex: codexList, sigils: renderSigils, forge: renderForge, shop: renderShop, sync: renderSync, news: renderNews })[id]();
  const f = $(id).querySelector('button, textarea'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
}
function closePanel() {
  if (!panel) return;
  RD = null;
  PANELS.forEach(p => show(p, false));
  panel = null; renderMenu(); show('menu', true);
}
document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-close]'); if (t) closePanel(); });
function head(title, sub) {
  const h = el('div', 'ph'); const w = el('div');
  if (sub) w.appendChild(el('div', 'meta', sub));
  w.appendChild(el('h2', '', title));
  const x = el('button', 'x', '×'); x.setAttribute('aria-label', 'Close'); x.dataset.close = '1';
  h.append(w, x); return h;
}

/* ---------- Codex ---------- */
let RD = null;
function readingSummary() {
  const r = SV.reading.slice(-5);
  if (!r.length) return 'Read a page, then answer from memory.';
  const wpm = Math.round(r.reduce((a, x) => a + x.wpm, 0) / r.length), acc = Math.round(100 * r.reduce((a, x) => a + x.acc, 0) / r.length);
  return `Pace ${wpm} wpm · Comprehension ${acc}%`;
}
function codexList() {
  const B = $('codexBody'); B.textContent = '';
  const read = Object.keys(SV.codex).length;
  B.appendChild(head('Codex', `${read} of ${CODEX.length} pages · ${readingSummary()}`));
  B.appendChild(el('p', 'how', 'Lost pages from the orbit archive. Read one, then answer from memory. Each page seeds new sigils into your gates. Two new pages open each day.'));
  const ul = el('ul', 'pages'), nx = nextPage(), open = pageOpen();
  CODEX.forEach((p, i) => {
    const li = el('li'), b = el('button');
    const isRead = !!SV.codex[p.id], isNext = i === nx;
    b.append(el('span', 'no', String(i + 1).padStart(2, '0')), el('span', 'tt', isRead || isNext ? p.title : 'Sealed page'),
      el('span', 'st', isRead ? `Read · ${Math.round(SV.codex[p.id].acc * 100)}%` : isNext ? (open ? 'New · +40◆' : 'Opens tomorrow') : 'Sealed'));
    if (isRead) b.classList.add('read');
    if (isNext && open) b.classList.add('new');
    if (!(isRead || (isNext && open))) b.disabled = true;
    b.addEventListener('click', () => codexIntro(i));
    li.appendChild(b); ul.appendChild(li);
  });
  B.appendChild(ul);
}
const words = p => p.text.join(' ').split(/\s+/).length;
function codexIntro(i) {
  const p = CODEX[i], B = $('codexBody'); B.textContent = '';
  const first = !SV.codex[p.id];
  B.appendChild(head(p.title, `Page ${i + 1} · ${words(p)} words`));
  B.appendChild(el('p', 'how', first ? 'Read at your natural pace. Two questions follow, and the page closes while you answer.' : 'A second read strengthens it. No shards this time, but your pace still counts.'));
  const row = el('div', 'row'), go = el('button', 'cta', 'Start reading');
  go.addEventListener('click', () => codexRead(i)); row.appendChild(go); B.appendChild(row);
  try { go.focus({ preventScroll: true }); } catch (e) {}
}
function codexRead(i) {
  const p = CODEX[i], B = $('codexBody'); B.textContent = '';
  RD = { i, first: !SV.codex[p.id], t0: performance.now(), hidden: 0, hAt: 0, ans: [] };
  B.appendChild(head(p.title, `Page ${i + 1}`));
  const body = el('div', 'read-body'); p.text.forEach(t => body.appendChild(el('p', '', t))); B.appendChild(body);
  const row = el('div', 'row'), done = el('button', 'cta', 'Done reading');
  done.addEventListener('click', () => { RD.secs = Math.max(1, (performance.now() - RD.t0 - RD.hidden) / 1000); codexQ(0); });
  row.appendChild(done); B.appendChild(row);
  B.scrollTop = 0;
}
document.addEventListener('visibilitychange', () => {
  if (!RD || RD.secs) return;
  if (document.hidden) RD.hAt = performance.now(); else if (RD.hAt) { RD.hidden += performance.now() - RD.hAt; RD.hAt = 0; }
});
function codexQ(k) {
  const p = CODEX[RD.i], B = $('codexBody'); B.textContent = '';
  const q = p.q[k];
  B.appendChild(head(`Question ${k + 1} of ${p.q.length}`, p.title));
  B.appendChild(el('p', 'qtext', q[0]));
  const box = el('div', 'opts'); const btns = [];
  const next = el('button', 'cta', k + 1 < p.q.length ? 'Next question' : 'See result'); next.hidden = true;
  q[1].forEach((o, j) => {
    const b = el('button'); b.append(el('kbd', '', String(j + 1)), document.createTextNode(o)); btns.push(b);
    b.addEventListener('click', () => {
      if (RD.ans[k] !== undefined) return;
      RD.ans[k] = j === q[2];
      btns.forEach((x, n) => { x.disabled = true; if (n === q[2]) x.classList.add('ok'); else if (n === j) x.classList.add('bad'); });
      (RD.ans[k] ? sfx.learn : sfx.miss)();
      next.hidden = false; try { next.focus({ preventScroll: true }); } catch (e) {}
    });
    box.appendChild(b);
  });
  B.appendChild(box);
  next.addEventListener('click', () => k + 1 < p.q.length ? codexQ(k + 1) : codexDone());
  const row = el('div', 'row'); row.appendChild(next); B.appendChild(row);
}
function codexDone() {
  const p = CODEX[RD.i], B = $('codexBody'); B.textContent = '';
  rollDay();
  const right = RD.ans.filter(Boolean).length, acc = right / p.q.length, wpm = Math.round(words(p) / (RD.secs / 60));
  let reward = 0;
  const now = Date.now();
  if (RD.first) {
    reward = acc === 1 ? 40 : acc >= 0.5 ? 20 : 5;
    ginc('life', reward); SV.daily.codexToday++;
    SV.codex[p.id] = { acc, n: 1, u: now };
  } else { const c = SV.codex[p.id]; SV.codex[p.id] = { acc: Math.max(c.acc, acc), n: (c.n || 1) + 1, u: now }; }
  if (wpm > 40 && wpm < 1500) { SV.reading.push({ wpm, acc, t: now }); if (SV.reading.length > 60) SV.reading.shift(); }
  save();
  if (acc === 1) sfx.recall(); else sfx.learn();
  B.appendChild(head(acc === 1 ? 'Page mastered' : 'Page read', p.title));
  const sum = el('div', 'sum');
  [['Pace', wpm + ' wpm'], ['Correct', `${right}/${p.q.length}`], ['Shards', reward ? '+' + reward : '—']].forEach(([l, v]) => { const s = el('div', 'stat'); s.append(el('span', 'lbl', l), el('b', '', v)); sum.appendChild(s); });
  B.appendChild(sum);
  const note = RD.first ? `${p.cards.length} new sigils from this page will appear at your gates.` : 'Re-reading tightens the trace. Your gates keep the schedule.';
  B.appendChild(el('p', 'how', wpm > 700 && acc < 1 ? 'That was fast. Comprehension drops when reading outruns understanding; a steadier pace pays more here.' : note));
  const row = el('div', 'row'), play = el('button', 'cta', 'Play'), back = el('button', 'ghost', 'Codex');
  play.addEventListener('click', () => { closePanel(); start(); });
  back.addEventListener('click', () => { RD = null; codexList(); });
  row.append(play, back); B.appendChild(row);
  RD = null;
  try { play.focus({ preventScroll: true }); } catch (e) {}
}

/* ---------- Sigils ---------- */
function renderSigils() {
  const B = $('sigilBody'); B.textContent = '';
  const due = dueCount(), r = gsum('retR'), w = gsum('retW'), tot = r + w;
  B.appendChild(head('Sigils', `${masteredCount()} mastered · ${due} ready to recall`));
  B.appendChild(el('p', 'how', tot >= 5 ? `Recall accuracy on returning sigils: ${Math.round(100 * r / tot)}% across ${tot} reviews. A sigil is mastered once you recall it after a week away.` : 'Sigils appear at gates. Each returns after a longer gap every time you recall it. Recall one after a week away and it is mastered.'));
  const wrap = el('div', 'decks');
  for (const dk of ['custom', 'codex', ...Object.keys(PACKS)]) {
    if (dk === 'custom' && !DECK_IDS.custom.length) continue;
    if (dk !== 'codex' && dk !== 'custom' && !packOn(dk)) continue;
    const s = deckStats(dk), d = el('div', 'deck');
    const h = el('div', 'sec-h'); h.append(el('b', '', DECKS[dk].name), el('small', '', `${s.mastered} mastered · ${s.strong} strong · ${s.seen - s.mastered - s.strong} learning · ${s.total - s.seen} unseen`));
    const bar = el('div', 'bar good'); const i = el('i'); bar.appendChild(i);
    d.append(h, bar); wrap.appendChild(d);
    animBar(i, 0, s.total ? s.mastered / s.total : 0);
  }
  B.appendChild(wrap);
  const strong = Object.keys(SV.cards).filter(id => CARDS[id]).sort((a, b) => (SV.cards[b].b - SV.cards[a].b) || (SV.cards[b].n - SV.cards[a].n)).slice(0, 24);
  const sec = el('div', 'sec'); sec.appendChild(el('span', 'lbl', 'Strongest sigils'));
  if (!strong.length) sec.appendChild(el('p', 'empty', 'None yet. Your first gate appears a few seconds into a run.'));
  else { const chips = el('div', 'chips'); strong.forEach(id => { const c = CARDS[id], ch = el('span', 'chip', c.c + ' '); ch.appendChild(el('span', '', '· ' + c.a)); ch.title = c.c + ' = ' + c.a; chips.appendChild(ch); }); sec.appendChild(chips); }
  B.appendChild(sec);
  const row = el('div', 'row'), b = el('button', 'cta', 'Play'); b.addEventListener('click', () => { closePanel(); start(); }); row.appendChild(b); B.appendChild(row);
}

/* ---------- Forge ---------- */
function renderForge() {
  $('fText').value = SV.prefs.custom || '';
  const box = $('fPacks'); box.textContent = '';
  const mk = (k, name, n) => { const l = el('label'), c = el('input'); c.type = 'checkbox'; c.dataset.k = k; c.checked = packOn(k); l.append(c, document.createTextNode(name), el('small', '', String(n))); box.appendChild(l); };
  for (const [k, p] of Object.entries(PACKS)) mk(k, p.name, p.items.length);
  mk('custom', 'Yours', DECK_IDS.custom.length);
  $('fSaved').textContent = ''; $('fSaved').classList.remove('err');
}
$('fSave').addEventListener('click', () => {
  const packs = {}; $('fPacks').querySelectorAll('input').forEach(c => packs[c.dataset.k] = c.checked);
  SV.prefs.custom = $('fText').value.slice(0, 80000); SV.prefs.packs = packs; SV.prefs.u = Date.now();
  buildCards(); save();
  const n = DECK_IDS.custom.length, on = Object.keys(PACKS).filter(packOn).length;
  $('fSaved').textContent = `Saved. ${on} pack${on === 1 ? '' : 's'} on${n ? `, ${n} of your sigils forged and placed first at gates` : ''}.`;
  renderForge(); $('fSaved').textContent = `Saved. ${on} pack${on === 1 ? '' : 's'} on${n ? `, ${n} of your sigils forged and placed first at gates` : ''}.`;
  sfx.learn();
});

/* ---------- Workshop ---------- */
function renderShop() {
  const B = $('shopBody'); B.textContent = '';
  B.appendChild(head('Workshop', `${fmt(bank())}◆ to spend · ${fmt(lifeShards())}◆ earned in total`));
  B.appendChild(el('p', 'how', 'Permanent upgrades for every run. Spending never locks trails; those unlock by total shards earned.'));
  const list = el('div', 'shop');
  for (const [k, s] of Object.entries(SHOP)) {
    const lv = shopLv(k), max = s.costs.length, it = el('div', 'item');
    const pips = el('div', 'pips'); for (let i = 0; i < max; i++) pips.appendChild(el('i', i < lv ? 'on' : ''));
    const btn = el('button', 'buy', lv >= max ? 'Maxed' : `${fmt(s.costs[lv])}◆`);
    btn.disabled = lv >= max || bank() < s.costs[lv];
    btn.addEventListener('click', () => {
      const L = shopLv(k); if (L >= max || bank() < s.costs[L]) return;
      ginc('spent', s.costs[L]); SV.shop[k] = L + 1; save(); sfx.buy(); renderShop();
    });
    it.append(el('b', '', s.name), btn, el('p', '', s.desc), pips);
    list.appendChild(it);
  }
  B.appendChild(list);
}

/* ---------- Sync ---------- */
function ago(t) { if (!t) return 'not yet'; const s = Math.round((Date.now() - t) / 1000); return s < 10 ? 'just now' : s < 90 ? s + 's ago' : s < 5400 ? Math.round(s / 60) + ' min ago' : Math.round(s / 3600) + ' h ago'; }
async function copyText(text, input) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) { if (input) { input.focus(); input.select(); } return false; }
}
function renderSync() {
  const B = $('syncBody'); B.textContent = '';
  B.appendChild(head('Sync & storage', `Saved on this device ${ago(SV.lastSave)}`));
  const mkCard = (title, state) => { const c = el('div', 'card'), h = el('h3'); h.append(el('span', 'dot ' + state), document.createTextNode(title)); c.appendChild(h); return c; };

  // Cloud
  const cs = SYNC.cloud;
  const c1 = mkCard('Cloud save', cs === 'on' ? 'on' : cs === 'pending' ? 'warn' : cs === 'readonly' || cs === 'error' ? 'err' : '');
  c1.appendChild(el('p', 'how', cs === 'on' ? `On. Your progress is kept with your Claude account and follows you to any device where you open this game signed in. Last sync ${ago(SYNC.lastCloud)}.`
    : cs === 'pending' ? 'Connecting…'
    : cs === 'readonly' ? 'This view can read but not write saved data. Ask the owner for Contributor access, or use a transfer code below.'
    : cs === 'error' ? 'The cloud store did not answer. Progress is still saved on this device; it will retry on your next change.'
    : IS_WEB ? 'Cloud save and link codes work when you play Graze inside Claude. Here, progress is saved on this device; move it with a transfer code or a backup file.'
    : 'Not available in this view (signed out, or opened outside Claude). Progress is saved on this device; use a transfer code to move it.'));
  B.appendChild(c1);

  // Link code
  const ls = SYNC.link, linked = SV.link && SV.link.code;
  const c2 = mkCard('Link code', linked && ls === 'on' ? 'on' : linked ? 'warn' : '');
  c2.appendChild(el('p', 'how', 'Pair devices or accounts with a 12-character code. Progress is encrypted on your device with a key made from the code, so the shared store only ever holds ciphertext. Anyone with the code can read and change this progress.'));
  const msg = el('div', 'saved'); msg.setAttribute('aria-live', 'polite');
  if (IS_WEB && !SYNC.db) c2.appendChild(el('p', 'how', 'Link codes need Graze’s shared store, which is only available inside Claude.'));
  if (linked) {
    const code = el('div', 'code', showCode(SV.link.code)); c2.appendChild(code);
    c2.appendChild(el('p', 'how', ls === 'on' ? `Linked. Last exchange ${ago(SYNC.lastLink)}. Enter this code on your other device.` : ls === 'readonly' ? 'This view cannot write to the shared store, so linking is read-only here.' : 'Waiting for the shared store…'));
    const row = el('div', 'row'), cp = el('button', 'ghost sm', 'Copy code'), now = el('button', 'ghost sm', 'Sync now'), un = el('button', 'ghost sm', 'Unlink this device');
    cp.addEventListener('click', async () => { msg.textContent = (await copyText(showCode(SV.link.code))) ? 'Copied.' : 'Select the code above and copy it.'; });
    now.addEventListener('click', async () => { msg.textContent = 'Syncing…'; try { await connectLink(SV.link.code, false); await syncPush(); msg.textContent = 'Synced.'; } catch (e) { msg.textContent = e.message; msg.classList.add('err'); } });
    un.addEventListener('click', () => { if (un.dataset.sure) { unlink(); renderSync(); } else { un.dataset.sure = '1'; un.textContent = 'Tap again to unlink'; } });
    row.append(cp, now, un); c2.appendChild(row);
  } else {
    const row = el('div', 'row'), mk = el('button', 'ghost sm', 'Create a link code');
    mk.disabled = !SYNC.db;
    mk.addEventListener('click', async () => {
      mk.disabled = true; msg.textContent = 'Encrypting and uploading…';
      try { await connectLink(genCode(), false); await syncPush(); renderSync(); } catch (e) { msg.textContent = e.message || 'Could not create a link here.'; msg.classList.add('err'); mk.disabled = false; }
    });
    row.appendChild(mk); c2.appendChild(row);
    const inp = el('input'); inp.type = 'text'; inp.placeholder = 'XXXX-XXXX-XXXX'; inp.id = 'linkIn'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('aria-label', 'Link code from another device');
    const go = el('button', 'ghost sm', 'Link with this code'); go.disabled = !SYNC.db;
    go.addEventListener('click', async () => {
      const code = normCode(inp.value);
      if (code.length !== 12) { msg.textContent = 'A link code has 12 characters.'; msg.classList.add('err'); return; }
      go.disabled = true; msg.classList.remove('err'); msg.textContent = 'Fetching and decrypting…';
      try { const r = await connectLink(code, true); await syncPush(); renderSync(); toastMenu(r); } catch (e) { msg.textContent = e.message || 'Linking failed.'; msg.classList.add('err'); go.disabled = false; }
    });
    c2.append(inp, go);
    if (!SYNC.db && !IS_WEB) c2.appendChild(el('p', 'how', 'Linking needs the shared store, which is not available in this view. Use a transfer code instead.'));
  }
  c2.appendChild(msg);
  B.appendChild(c2);

  // Transfer code (no server)
  const c3 = mkCard('Direct transfer', '');
  c3.appendChild(el('p', 'how', 'No server involved. Copy this code, send it to yourself however you like, and paste it on the other device. It merges; nothing is overwritten.'));
  const ta = el('textarea', 'mono'); ta.readOnly = true; ta.id = 'xferOut'; ta.setAttribute('aria-label', 'Your transfer code'); ta.value = 'Generating…';
  makeTransfer().then(t => { ta.value = t; }).catch(() => { ta.value = 'This browser could not build a transfer code.'; });
  const m3 = el('div', 'saved');
  const r3 = el('div', 'row'), cp3 = el('button', 'ghost sm', 'Copy transfer code');
  cp3.addEventListener('click', async () => { m3.textContent = (await copyText(ta.value, ta)) ? `Copied (${fmt(ta.value.length)} characters).` : 'Selected. Copy it with your keyboard or menu.'; });
  r3.appendChild(cp3);
  const tin = el('textarea', 'mono'); tin.id = 'xferIn'; tin.placeholder = 'Paste a transfer code from another device'; tin.setAttribute('aria-label', 'Paste a transfer code');
  const imp = el('button', 'ghost sm', 'Merge pasted code');
  imp.addEventListener('click', async () => {
    m3.classList.remove('err');
    try { const st = await readTransfer(tin.value); const r = absorb(st, 'transfer'); m3.textContent = r.changed ? `Merged. ${r.cards > 0 ? r.cards + ' new sigils came across.' : 'Progress combined.'}` : 'Already up to date.'; tin.value = ''; }
    catch (e) { m3.textContent = 'That code could not be read. Copy it again in full.'; m3.classList.add('err'); }
  });
  c3.append(ta, r3, tin, imp, m3);
  B.appendChild(c3);

  // Backup file
  const c4 = mkCard('Backup file', '');
  c4.appendChild(el('p', 'how', 'Save a file you keep yourself, and load it back on any device.'));
  const m4 = el('div', 'saved'), r4 = el('div', 'row');
  const sv = el('button', 'ghost sm', 'Save backup file'); sv.disabled = !SYNC.dl && !IS_WEB;
  sv.addEventListener('click', async () => {
    try { await saveFile(`graze-backup-${today()}.json`, JSON.stringify({ graze: 2, version: VERSION, at: Date.now(), state: exportState(SV) })); m4.textContent = 'Saved.'; }
    catch (e) { m4.textContent = e && e.code === 'declined' ? 'Not saved.' : 'Saving files is not available here. Use a transfer code.'; }
  });
  const fi = el('input'); fi.type = 'file'; fi.accept = '.json,application/json,.txt'; fi.hidden = true; fi.id = 'backupIn';
  const ld = el('button', 'ghost sm', 'Load backup file');
  ld.addEventListener('click', () => fi.click());
  fi.addEventListener('change', () => {
    const f = fi.files && fi.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => { try { const st = await readTransfer(String(rd.result)); const r = absorb(st, 'file'); m4.textContent = r.changed ? 'Backup merged.' : 'Already up to date.'; } catch (e) { m4.textContent = 'That file is not a Graze backup.'; } };
    rd.readAsText(f);
  });
  r4.append(sv, ld); c4.append(r4, fi, m4);
  if (!SYNC.dl && !IS_WEB) c4.appendChild(el('p', 'how', 'File saving is not available in this view; loading still works.'));
  B.appendChild(c4);
  B.appendChild(versionCard());
}
function toastMenu(r) { if (r && r.changed) sfx.mission(); }
SYNC.onChange = () => { if (panel === 'sync' && !document.activeElement?.matches?.('textarea, input')) renderSync(); if (mode === 'menu' && !panel) { const sl = syncLabel(); $('tSync').textContent = sl.t; $('bSync').classList.toggle('ok', sl.ok); } };
SYNC.onPrefs = () => { buildCards(); if (mode === 'menu' && !panel) renderMenu(); };

$('cue').addEventListener('change', e => setPref('cue', e.target.value));
$('bCodex').addEventListener('click', () => openPanel('codex'));
$('bSigils').addEventListener('click', () => openPanel('sigils'));
$('bForge').addEventListener('click', () => openPanel('forge'));
$('bShop').addEventListener('click', () => openPanel('shop'));
$('bSync').addEventListener('click', () => openPanel('sync'));
$('rRead').addEventListener('click', () => { openPanel('codex'); const i = nextPage(); if (i >= 0) codexIntro(i); });

/* ================= input ================= */
function action() {
  if (panel || mode === 'boon' || mode === 'revive') return;
  audio();
  if (mode === 'play') doSwitch();
  else if (mode === 'menu') start();
  else if (mode === 'results') { if (performance.now() >= lockUntil) start(); }
  else if (mode === 'paused') resume();
}
function pause() { if (mode !== 'play') return; mode = 'paused'; musicStop(); show('pause', true); }
function resume() { if (mode !== 'paused') return; mode = 'play'; show('pause', false); musicStart(); if (G.focus) duck(0.16); }

window.addEventListener('pointerdown', e => {
  if (e.button !== undefined && e.button > 0) return;
  if (panel || mode === 'boon' || mode === 'revive') return;
  const t = e.target;
  if (t.closest && (t.closest('button') || t.closest('select') || (t.closest('.sheet') && mode !== 'paused'))) return;
  e.preventDefault(); action();
}, { passive: false });
window.addEventListener('keydown', e => {
  const tg = e.target && e.target.tagName;
  if (tg === 'TEXTAREA' || tg === 'INPUT' || tg === 'SELECT') { if (e.key === 'Escape' && panel) closePanel(); return; }
  const k = e.key;
  if (panel) { if (k === 'Escape') closePanel(); return; }
  if (mode === 'boon') { const n = +k; if (n >= 1 && n <= 3 && G.boonOpts && G.boonOpts[n - 1]) { e.preventDefault(); takeBoon(G.boonOpts[n - 1]); } return; }
  if (mode === 'revive') { if (k === '1' || k === '2') { e.preventDefault(); answerRevive(+k - 1); } return; }
  if (k === ' ' || k === 'Enter' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'w' || k === 's' || k === 'W' || k === 'S') {
    if (e.repeat) { e.preventDefault(); return; }
    if ((k === 'Enter' || k === ' ') && document.activeElement && document.activeElement.tagName === 'BUTTON' && mode !== 'play') return;
    e.preventDefault(); action();
  } else if (k === 'Escape' || k === 'p' || k === 'P') {
    if (mode === 'play') pause(); else if (mode === 'paused') resume(); else if (mode === 'results' && k === 'Escape') toMenu();
  } else if (k === 'm' || k === 'M') { toggleMute(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', pause);
$('play').addEventListener('click', () => start());
$('again').addEventListener('click', () => { if (performance.now() >= lockUntil) start(); });
$('toMenu').addEventListener('click', toMenu);
function syncMute() {
  $('wave').style.display = SV.muted ? 'none' : ''; $('xmark').style.display = SV.muted ? '' : 'none';
  $('mute').setAttribute('aria-label', SV.muted ? 'Unmute sound' : 'Mute sound');
}
function toggleMute() { SV.muted = !SV.muted; localSave(); syncMute(); audio(); }
$('mute').addEventListener('click', toggleMute);
syncMute();
