/* ---------- audio ---------- */
let AC = null, MG = null, MB = null, NB = null;
function audio() {
  if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => {}); return; }
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    AC = new A(); MG = AC.createGain(); MG.gain.value = 0.55; MG.connect(AC.destination);
    MB = AC.createGain(); MB.gain.value = 0.34; MB.connect(MG);
    NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function duck(v) { if (AC && MB) { try { MB.gain.setTargetAtTime(v, AC.currentTime, 0.08); } catch (e) {} } }
function tone(f, dur, type, vol, slide, delay) {
  if (!AC || SV.muted) return;
  const t = AC.currentTime + (delay || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  if (slide && slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(MG); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, f0, f1, type) {
  if (!AC || SV.muted || !NB) return;
  const t = AC.currentTime, s = AC.createBufferSource(); s.buffer = NB;
  const fl = AC.createBiquadFilter(); fl.type = type || 'lowpass';
  fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(MG); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.05);
}
const semi = n => Math.pow(2, n / 12);
const sfx = {
  tick: l => tone(l ? 620 : 470, 0.05, 'triangle', 0.1, 0.92),
  shard: (i, gold) => { const sc = [0, 3, 5, 7, 10], n = sc[i % 5] + 12 * (Math.floor(i / 5) % 3); tone(880 * semi(n), 0.2, 'sine', gold ? 0.12 : 0.14); tone(1760 * semi(n), 0.07, gold ? 'triangle' : 'sine', gold ? 0.07 : 0.04); },
  graze: () => { noise(0.16, 0.16, 4200, 700); tone(330, 0.12, 'sawtooth', 0.04, 1.7); },
  perfect: k => { const tr = semi(Math.min(k - 1, 6) * 2); [523, 659, 784, 1047].forEach((f, i) => tone(f * tr, 0.26, 'triangle', 0.11, 1, i * 0.022)); noise(0.22, 0.12, 7000, 900); },
  slip: () => tone(740, 0.1, 'square', 0.05, 1.35),
  up: m => [0, 4, 7, 12].forEach((s, i) => tone(392 * semi(s + m * 2), 0.15, 'square', 0.055, 1, i * 0.045)),
  down: () => tone(320, 0.24, 'sawtooth', 0.05, 0.5),
  die: () => { noise(0.8, 0.45, 1400, 50); tone(150, 0.65, 'sawtooth', 0.2, 0.22); },
  phase: () => { tone(196, 0.45, 'triangle', 0.13, 2); tone(294, 0.45, 'triangle', 0.09, 2, 0.06); },
  mission: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.3, 'sine', 0.12, 1, i * 0.07)),
  best: () => [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, 1, i * 0.08)),
  smash: () => { noise(0.28, 0.32, 2600, 120); tone(220, 0.18, 'square', 0.07, 0.4); },
  fever: () => { tone(180, 0.7, 'sawtooth', 0.12, 7); tone(270, 0.7, 'sawtooth', 0.08, 7, 0.04); noise(0.7, 0.2, 400, 9000, 'bandpass'); },
  power: () => [880, 1109, 1319, 1760].forEach((f, i) => tone(f, 0.22, 'square', 0.06, 1, i * 0.05)),
  shieldBreak: () => { noise(0.4, 0.3, 9000, 1200, 'highpass'); tone(1800, 0.35, 'triangle', 0.12, 0.33); },
  nova: () => { tone(90, 0.9, 'sine', 0.4, 0.4); noise(0.9, 0.35, 5000, 80); tone(1200, 0.5, 'sawtooth', 0.06, 0.2); },
  hop: () => noise(0.16, 0.1, 600, 3200, 'bandpass'),
  gateIn: () => { tone(1320, 0.9, 'sine', 0.08); tone(1980, 0.9, 'sine', 0.04, 1, 0.05); noise(0.5, 0.08, 300, 3000, 'bandpass'); },
  recall: () => { [659, 831, 988, 1319, 1661].forEach((f, i) => tone(f, 0.4, 'triangle', 0.1, 1, i * 0.035)); tone(330, 0.5, 'sine', 0.14); },
  learn: () => [1047, 1319, 1568].forEach((f, i) => tone(f, 0.55, 'sine', 0.08, 1, i * 0.09)),
  miss: () => { tone(392, 0.22, 'triangle', 0.08); tone(311, 0.35, 'triangle', 0.08, 1, 0.14); }
};
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

/* ---------- adaptive soundtrack ---------- */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const MUS = { on: false, step: 0, next: 0, timer: null };
function mEnv(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
function mOsc(type, f, t, dur, vol, lp, f2, att) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.5);
  mEnv(g, t, att || 0.005, vol, dur);
  let n = o;
  if (lp) { const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
  n.connect(g).connect(MB); o.start(t); o.stop(t + dur + 0.05);
}
function mNoise(t, dur, vol, type, f) {
  const s = AC.createBufferSource(); s.buffer = NB;
  const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
  const g = AC.createGain(); mEnv(g, t, 0.002, vol, dur);
  s.connect(fl).connect(g).connect(MB); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
function playStep(s, t, sp) {
  const lvl = G ? (G.fever > 0 ? 9 : G.mult) : 1;
  const st = s & 15, ch = PROG[(s >> 4) & 3];
  if (st % 4 === 0) mOsc('sine', 150, t, 0.3, 0.6, 0, 42);
  if ([0, 3, 6, 8, 11, 14].includes(st)) mOsc('sawtooth', mtof(ch[0] - 12 + (st === 14 ? 12 : 0)), t, sp * 1.6, 0.12, lvl >= 9 ? 1800 : 300 + lvl * 70);
  if (st === 0) ch.forEach(n => { mOsc('sawtooth', mtof(n), t, sp * 16, 0.016, 900, 0, 0.35); mOsc('sawtooth', mtof(n) * 1.004, t, sp * 16, 0.012, 900, 0, 0.35); });
  if (lvl >= 2 && st % 4 === 2) mNoise(t, 0.05, 0.11, 'highpass', 7500);
  if (lvl >= 4 && st % 2 === 1) mNoise(t, 0.03, 0.05, 'highpass', 9000);
  if (lvl >= 3 && (st === 4 || st === 12)) mNoise(t, 0.14, 0.2, 'bandpass', 1500);
  if (lvl >= 5) mOsc('triangle', mtof(ch[[0, 1, 2, 1][st % 4]] + 12 + (st >= 8 ? 12 : 0)), t, sp * 0.9, lvl >= 9 ? 0.06 : 0.04);
  if (lvl >= 9) { const L = { 0: ch[2] + 12, 3: ch[1] + 12, 6: ch[0] + 24, 10: ch[2] + 12, 12: ch[1] + 24, 14: ch[0] + 24 }; if (L[st]) mOsc('square', mtof(L[st]), t, sp * 1.8, 0.035, 2600); }
}
function musicTick() {
  if (!AC || !MUS.on) return;
  const bpm = G && mode === 'play' ? (G.focus ? 72 : G.fever > 0 ? 162 : 104 + clamp((G.omega - 1.7) / 2.6, 0, 1) * 44) : 104;
  const sp = 60 / bpm / 4;
  if (MUS.next < AC.currentTime - 0.05) MUS.next = AC.currentTime + 0.03;
  while (MUS.next < AC.currentTime + 0.12) {
    if (!SV.muted) playStep(MUS.step, MUS.next, sp);
    MUS.next += sp; MUS.step = (MUS.step + 1) % 64;
  }
}
function musicStart() { if (!AC || MUS.on) return; MUS.on = true; MUS.step = 0; MUS.next = AC.currentTime + 0.06; MUS.timer = setInterval(musicTick, 25); musicTick(); }
function musicStop() { MUS.on = false; if (MUS.timer) clearInterval(MUS.timer); MUS.timer = null; duck(0.34); }

/* ---------- layout ---------- */
let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, S = 300, TOP = 0, BOT = 0, HUD = 80, ZOOM = 1;
let bgGrad = null, bgFever = null, bgFocus = null, vign = null;
const stars = [];
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  C.width = Math.round(W * DPR); C.height = Math.round(H * DPR);
  TOP = $('sai').offsetHeight || 0; BOT = $('sab').offsetHeight || 0;
  HUD = clamp(H * 0.12, 70, 100);
  const avail = H - TOP - BOT - HUD;
  S = Math.max(160, Math.min(W * 0.98, avail * 0.92));
  cx = W / 2; cy = TOP + HUD + avail / 2;
  const R = Math.max(W, H);
  bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75);
  bgGrad.addColorStop(0, '#3a1f2b'); bgGrad.addColorStop(0.55, '#241a1f'); bgGrad.addColorStop(1, '#160f12');
  bgFever = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75);
  bgFever.addColorStop(0, '#5b3a1c'); bgFever.addColorStop(0.5, '#2e1d1a'); bgFever.addColorStop(1, '#140d0e');
  bgFocus = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75);
  bgFocus.addColorStop(0, '#2f2a1a'); bgFocus.addColorStop(0.5, '#1d1619'); bgFocus.addColorStop(1, '#100b0d');
  vign = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.35, cx, cy, R * 0.8);
  vign.addColorStop(0, 'rgba(15,9,12,0)'); vign.addColorStop(1, 'rgba(15,9,12,.55)');
  stars.length = 0;
  const cols = ['#ffffff', '#eee5d5', '#e4cfaa', '#debfbe'];
  for (let i = 0; i < 150; i++) stars.push({ r: Math.sqrt(Math.random()) * R * 0.9, a: Math.random() * TAU, s: Math.random() < 0.15 ? 2 : 1, o: rnd(0.25, 0.8), tw: rnd(0.8, 3), ph: rnd(0, TAU), p: rnd(0.02, 0.08), c: cols[Math.random() * cols.length | 0] });
}
window.addEventListener('resize', resize);

