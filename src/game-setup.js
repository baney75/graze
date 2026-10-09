/* ================= game: constants ================= */
const C = $('c'), ctx = C.getContext('2d');
const RM = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
const TAU = Math.PI * 2, K0 = 0.27, K1 = 0.41, THK = 0.048, PRK = 0.022, LOOK = Math.PI * 1.45;
const KL = l => l ? K1 : K0;
const wOf = h => h.lf / 2 / h.k;
const paOf = h => PRK / h.k;
const FD = '"Source Serif 4", "Iowan Old Style", Georgia, serif';
const FU = 'Karla, "Avenir Next", "Helvetica Neue", sans-serif';
const PHASE_COL = ['#e07a8a', '#d9855e', '#b98ad0', '#c95f75', '#d97f9f', '#8fb0d8', '#e09a6e'];
const MULT_COL = ['#b9aaa6', '#d5b66f', '#dcae62', '#e6a36d', '#e58a7a', '#ee8991', '#db93b4', '#c3a6d6'];
const PU = {
  shield: { col: '#8ab4dc', name: 'Shield', sub: 'Absorbs your next hit' },
  magnet: { col: '#7bc4bd', name: 'Magnet', sub: 'Pulls in every shard nearby' },
  nova:   { col: '#db93b4', name: 'Nova', sub: 'Shattered every block in sight' }
};
const CALLS = { 3: 'NICE', 5: 'SLICK', 8: 'WILD', 12: 'INSANE', 16: 'UNREAL', 22: 'GODLIKE' };
const CHAIN_CALLS = { 3: 'SCHOLAR', 5: 'SAGE', 8: 'ORACLE', 12: 'LUMINARY' };

const BOONS = {
  fever:   { name: 'Long Fever', desc: 'Fever lasts 1.5 seconds longer.', max: 3 },
  charge:  { name: 'Overcharge', desc: 'The Fever ring fills 25% faster.', max: 3 },
  edge:    { name: 'Razor Edge', desc: 'Graze and perfect windows widen 25%.', max: 2 },
  lode:    { name: 'Lodestone', desc: 'Magnets last 5s longer and power-ups come sooner.', max: 2 },
  bulwark: { name: 'Bulwark', desc: 'Raise a shield right now.', max: 9, ok: () => !G.shield },
  scholar: { name: 'Scholar', desc: 'Recall gates pay 50% more.', max: 3 },
  sink:    { name: 'Heat Sink', desc: 'Your multiplier cools 30% slower.', max: 2 },
  wind:    { name: 'Second Wind', desc: 'One more recall revive this run.', max: 2 },
  midas:   { name: 'Midas', desc: 'Shards score triple.', max: 1 },
  supernova: { name: 'Supernova', desc: 'Detonate a Nova right now.', max: 9 }
};
const SHOP = {
  shield: { name: 'Opening Shield', desc: 'Start every run with a shield.', costs: [220] },
  fever:  { name: 'Deep Fever', desc: 'Fever lasts 0.5s longer per level.', costs: [120, 260, 420] },
  magnet: { name: 'Strong Magnet', desc: 'Magnets last 2s longer per level.', costs: [100, 240] },
  revive: { name: 'Extra Life', desc: 'One more recall revive every run.', costs: [480] },
  gate:   { name: 'Scholar’s Purse', desc: 'Recall gates pay 20% more per level.', costs: [150, 320, 520] },
  start:  { name: 'Hot Start', desc: 'Begin every run at ×2.', costs: [360] },
  luck:   { name: 'Lucky Orbit', desc: 'Power-ups appear 12% sooner per level.', costs: [140, 300] }
};
const shopLv = k => +SV.shop[k] || 0;

const TRAILS = [
  { id: 'ember', name: 'Ember', need: 0, c: ['#fff1c9', '#ffb23d'], css: 'radial-gradient(circle at 35% 35%,#fff1c9,#ffb23d 60%,#c96a10)' },
  { id: 'glacier', name: 'Glacier', need: 60, c: ['#e8fbff', '#4fc3ff'], css: 'radial-gradient(circle at 35% 35%,#e8fbff,#4fc3ff 60%,#1c64b8)' },
  { id: 'rose', name: 'Rose', need: 160, c: ['#ffe3f1', '#ff4fa8'], css: 'radial-gradient(circle at 35% 35%,#ffe3f1,#ff4fa8 60%,#a3155e)' },
  { id: 'moss', name: 'Moss', need: 320, c: ['#f0ffd0', '#69e06d'], css: 'radial-gradient(circle at 35% 35%,#f0ffd0,#69e06d 60%,#22802d)' },
  { id: 'solar', name: 'Solar', need: 550, c: ['#ffffff', '#ffd000'], css: 'radial-gradient(circle at 35% 35%,#fff,#ffd000 55%,#ff6a00)' },
  { id: 'void', name: 'Void', need: 850, c: ['#ffffff', '#7d5cff'], css: 'radial-gradient(circle at 35% 35%,#fff,#7d5cff 50%,#1a0f52)' },
  { id: 'prism', name: 'Prism', need: 1300, fx: 'prism', css: 'conic-gradient(#ee8991,#d5b66f,#69e06d,#4fc3ff,#c3a6d6,#ee8991)' },
  { id: 'aurora', name: 'Aurora', need: 2000, fx: 'aurora', css: 'linear-gradient(140deg,#82c89c,#4fc3ff 45%,#c3a6d6)' }
];
const curTrail = () => TRAILS.find(t => t.id === SV.prefs.trail && lifeShards() >= t.need) || TRAILS[0];

const MT = {
  graze:   { t: n => `Graze ${n} blocks in one run`, b: [5, 10, 18, 28, 40] },
  perfect: { t: n => `Land ${n} perfect dodge${n > 1 ? 's' : ''} in one run`, b: [2, 4, 7, 11, 16] },
  mult:    { t: n => `Reach a ×${n} multiplier`, b: [3, 4, 5, 6, 8] },
  score:   { t: n => `Score ${fmt(n)} in one run`, b: [2500, 7000, 15000, 30000, 55000], money: true },
  shards:  { t: n => `Collect ${n} shards in one run`, b: [15, 30, 50, 80, 120] },
  survive: { t: n => `Survive ${n} seconds`, b: [20, 35, 50, 70, 95], sec: true },
  slip:    { t: n => `Slip in behind ${n} blocks in one run`, b: [2, 5, 9, 14, 20] },
  runs:    { t: n => `Play ${n} runs`, b: [3, 5, 8, 10, 12], cum: true },
  fever:   { t: n => `Trigger Fever ${n} time${n > 1 ? 's' : ''} in one run`, b: [1, 2, 3, 4, 5] },
  smash:   { t: n => `Smash ${n} blocks in one run`, b: [6, 12, 20, 30, 45] },
  power:   { t: n => `Grab ${n} power-up${n > 1 ? 's' : ''} in one run`, b: [1, 2, 3, 4, 6] },
  recall:  { t: n => `Clear ${n} recall gate${n > 1 ? 's' : ''} in one run`, b: [2, 3, 4, 5, 7] },
  chain:   { t: n => `Reach a recall chain of ${n}`, b: [2, 3, 4, 5, 6] }
};
function newMission() {
  const have = (SV.missions || []).filter(m => !m.done).map(m => m.type);
  const pool = Object.keys(MT).filter(k => !have.includes(k));
  const type = pool[Math.random() * pool.length | 0];
  const tier = Math.min(4, Math.floor(gsum('mDone') / 3 + Math.random() * 1.3));
  return { type, n: MT[type].b[tier], prog: 0, done: false, reward: 15 + tier * 10, fresh: true };
}
function ensureMissions() {
  if (!Array.isArray(SV.missions)) SV.missions = [];
  SV.missions = SV.missions.filter(m => m && MT[m.type]);
  while (SV.missions.length < 3) { const m = newMission(); m.fresh = false; SV.missions.push(m); }
}
ensureMissions();
