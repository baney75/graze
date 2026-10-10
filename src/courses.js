/* ================= courses: registry, legacy packs, mental math ================= */
const GROUPS = ['Languages', 'Sciences', 'Medicine', 'Math', 'Mind', 'Reading', 'World', 'Skills'];
const GROUP_COL = { Languages: '#e3a47c', Sciences: '#82c89c', Medicine: '#d98aa6', Math: '#a8c97a', Mind: '#c3a6d6', Reading: '#d5b66f', World: '#8ab4dc', Skills: '#e6a36d' };
const GROUP_BLURB = {
  Languages: 'Whole beginner-to-A2 courses with audio and pronunciation.',
  Sciences: 'College-level science from open textbooks.',
  Medicine: 'Pre-med foundations, anatomy and the language of medicine.',
  Math: 'Mental math and calculus.',
  Mind: 'Logic, philosophy, psychology and the arguments for God.',
  Reading: 'Great books, the Bible, the ancients and advanced vocabulary.',
  World: 'Maps, flags, capitals and history.',
  Skills: 'Writing, research, strategy, martial arts and software.'
};
// Courses that were on by default before courses existed. Players who never changed packs keep them.
const LEGACY_ON = ['roots', 'lex', 'logic', 'philo', 'body', 'capitals', 'nums'];
const IMG_CUE = { diagram: 'Name the highlighted part', map: 'Which country is highlighted?', us: 'Which state is highlighted?', flag: 'Whose flag is this?' };

/* ---------- mental math: facts are computed, never typed ---------- */
const MM = (() => {
  const S = n => String(n);
  const near = (p, ...alts) => { const out = []; for (const x of alts) { const v = Math.round(x); if (v !== p && v > 0 && !out.includes(S(v))) out.push(S(v)); if (out.length === 3) break; } return out; };
  const prod = (a, b) => [`${a} × ${b}`, S(a * b), near(a * b, a * b + a, a * b - b, a * b + 10, (a + 1) * (b - 1), a * b - 1)];
  const units = [];
  const tt = (lo, hi, title, note) => { const i = []; for (let a = lo; a <= hi; a++) for (let b = a; b <= 12; b++) if (a >= 2 && b >= 2 && !(a < lo)) i.push(prod(a, b)); return { t: title, n: note, i }; };
  units.push({ t: 'Number bonds and complements', n: 'Complements make mental addition and change-making fast: to subtract from 100, find what adds up to 100. Work left to right: the tens digits add to 9 and the ones digits add to 10.',
    i: [...[37, 64, 18, 45, 72, 29, 83, 56, 91, 13, 68, 24].map(n => [`100 − ${n}`, S(100 - n), near(100 - n, 100 - n + 10, 100 - n - 10, 110 - n - 10 + 1)]),
        ...[[250, 1000], [380, 1000], [615, 1000], [47, 200], [125, 500], [6.5, 10], [0.35, 1], [0.72, 1]].map(([n, t]) => [`${t} − ${n}`, S(+(t - n).toFixed(2)), [S(+(t - n + (t > 9 ? 10 : 0.1)).toFixed(2)), S(+(t - n - (t > 9 ? 10 : 0.1)).toFixed(2))]]),
        ...[[38, 47], [56, 29], [67, 45], [124, 79], [348, 256], [99, 87], [198, 145], [75, 68]].map(([a, b]) => [`${a} + ${b}`, S(a + b), near(a + b, a + b + 10, a + b - 10, a + b + 1)])] });
  units.push(tt(2, 5, 'Times tables: 2 to 5', 'Know every product by sight. Multiplication commutes, so 4 × 7 is the same fact as 7 × 4; each pair appears once.'));
  units.push(tt(6, 9, 'Times tables: 6 to 9', 'For the nines, the digits of 9 × n add to 9 and the tens digit is n − 1: 9 × 7 = 63.'));
  units.push(tt(10, 12, 'Times tables: 10 to 12', 'To multiply a two-digit number by 11, write the sum of its digits between them: 11 × 43 = 4(4+3)3 = 473. Carry when the sum passes 9.'));
  units[units.length - 1].i.push(...[23, 34, 52, 61, 45, 72, 18, 27, 36, 59, 68, 87].map(n => [`11 × ${n}`, S(11 * n), near(11 * n, 11 * n + 10, 11 * n - 10, 10 * n)]));
  const sq = []; for (let n = 1; n <= 30; n++) sq.push([n >= 11 && n <= 25 ? n + '²' : n + '²', S(n * n), near(n * n, n * n + n, n * n - n, n * n + 10, n * n + 2 * n)]);
  units.push({ t: 'Squares to 30', n: 'Squares are the backbone of fast arithmetic. For numbers ending in 5, multiply the tens digit by the next number and append 25: 35² = 3×4 then 25 = 1225. Neighbors: (n+1)² = n² + 2n + 1.', i: sq });
  const legacyPairs = [[6, 12], [7, 13], [8, 14], [9, 15], [6, 17], [7, 18], [8, 19], [9, 16], [12, 13], [12, 14], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [11, 19], [13, 17], [24, 25], [7, 16], [8, 17], [9, 19], [6, 19], [13, 15], [12, 18]];
  units.push({ t: 'Teen products', n: 'For two numbers near each other, use the difference of squares: 13 × 17 = 15² − 2² = 225 − 4 = 221. Or split: 7 × 18 = 7 × 20 − 7 × 2.', i: legacyPairs.map(([a, b]) => [`${a} × ${b}`, S(a * b), [S(a * b + 10), S(a * b - a), S(a * b + b)]]) });
  const cub = []; for (let n = 2; n <= 12; n++) cub.push([n + '³', S(n ** 3), near(n ** 3, n ** 3 + n * n, n ** 3 - n, n ** 3 + 10)]);
  for (let k = 5; k <= 16; k++) cub.push(['2^' + k, S(2 ** k), near(2 ** k, 2 ** (k + 1), 2 ** (k - 1) * 3, 2 ** k + 2 ** (k - 2))]);
  units.push({ t: 'Cubes and powers of two', n: 'Powers of two run every computer: 2^10 = 1024, about a thousand, so 2^20 is about a million. Cubes up to 12³ = 1728 are worth knowing cold.', i: cub });
  const fr = [['1/2', '0.5 = 50%'], ['1/3', '0.333… ≈ 33.3%'], ['2/3', '0.666… ≈ 66.7%'], ['1/4', '0.25 = 25%'], ['3/4', '0.75 = 75%'], ['1/5', '0.2 = 20%'], ['2/5', '0.4 = 40%'], ['3/5', '0.6 = 60%'], ['4/5', '0.8 = 80%'], ['1/6', '0.1666… ≈ 16.7%'], ['5/6', '0.8333… ≈ 83.3%'], ['1/7', '0.142857… ≈ 14.3%'], ['1/8', '0.125 = 12.5%'], ['3/8', '0.375 = 37.5%'], ['5/8', '0.625 = 62.5%'], ['7/8', '0.875 = 87.5%'], ['1/9', '0.111… ≈ 11.1%'], ['1/10', '0.1 = 10%'], ['1/11', '0.0909… ≈ 9.1%'], ['1/12', '0.0833… ≈ 8.3%'], ['1/16', '0.0625 = 6.25%'], ['1/20', '0.05 = 5%'], ['1/25', '0.04 = 4%'], ['1/40', '0.025 = 2.5%']];
  units.push({ t: 'Fractions, decimals and percents', n: 'Every fraction is a division. Knowing the common ones turns percentages into easy fractions: 37.5% of 64 is 3/8 of 64 = 24.', i: fr.map(([f, v], i) => [f + ' as a decimal', v, [fr[(i + 3) % fr.length][1], fr[(i + 7) % fr.length][1]]]) });
  const pc = [[10, 450], [15, 80], [20, 65], [25, 84], [5, 360], [12.5, 96], [30, 70], [40, 85], [75, 48], [1, 2300], [2.5, 400], [150, 60], [35, 60], [8, 250], [60, 45], [90, 30]];
  units.push({ t: 'Percent shortcuts', n: 'Find 10% by moving the decimal point, then build: 15% = 10% + 5%. And x% of y equals y% of x: 8% of 25 is 25% of 8 = 2.', i: pc.map(([p, n]) => { const v = +(p * n / 100).toFixed(2); return [`${p}% of ${n}`, S(v), near(v, v * 2, v / 2, v + n / 10, v + 1)]; }) });
  const rt = [[144, 12], [169, 13], [196, 14], [225, 15], [256, 16], [289, 17], [324, 18], [361, 19], [400, 20], [441, 21], [484, 22], [529, 23], [576, 24], [625, 25], [729, 27], [900, 30]].map(([n, r]) => ['√' + n, S(r), near(r, r + 1, r - 1, r + 2)]);
  rt.push(['√2 (to 3 places)', '1.414', ['1.732', '1.141']], ['√3 (to 3 places)', '1.732', ['1.414', '1.723']], ['π (to 4 places)', '3.1416', ['3.1415', '3.1146']], ['e (to 3 places)', '2.718', ['2.817', '3.142']], ['ln 2 (to 3 places)', '0.693', ['0.639', '0.301']], ['log₁₀ 2 (to 3 places)', '0.301', ['0.693', '0.310']]);
  units.push({ t: 'Roots and constants', n: 'Estimate a square root by the nearest squares: √50 is a bit more than 7, since 7² = 49.', i: rt });
  units.push({ t: 'Divisibility and tricks', n: 'Divisibility rules let you factor and simplify at a glance. Casting out nines checks arithmetic: a number leaves the same remainder mod 9 as its digit sum.',
    i: [['Divisible by 3 when…', 'its digit sum is divisible by 3', ['its last digit is 3', 'its last two digits are divisible by 3']],
        ['Divisible by 4 when…', 'its last two digits are divisible by 4', ['its digit sum is divisible by 4', 'its last digit is even']],
        ['Divisible by 6 when…', 'it is divisible by both 2 and 3', ['its digit sum is 6', 'its last digit is 6']],
        ['Divisible by 8 when…', 'its last three digits are divisible by 8', ['its last two digits are divisible by 8', 'its digit sum is divisible by 8']],
        ['Divisible by 9 when…', 'its digit sum is divisible by 9', ['its last digit is 9', 'it is odd and divisible by 3']],
        ['Divisible by 11 when…', 'alternating digit sum is divisible by 11', ['digit sum is divisible by 11', 'its last two digits are 11']],
        ['Divisible by 5 when…', 'it ends in 0 or 5', ['its digit sum is divisible by 5', 'it ends in 5 only']],
        ['× 5 shortcut', 'multiply by 10, then halve', ['multiply by 2, then add 5', 'halve, then add 10']],
        ['× 25 shortcut', 'multiply by 100, then divide by 4', ['multiply by 20, then add 5', 'divide by 25, then multiply by 100']],
        ['× 9 shortcut', 'multiply by 10, then subtract the number', ['multiply by 10, then subtract 9', 'multiply by 9, then add 1']],
        ['Rule of 72', 'doubling time ≈ 72 ÷ interest rate (%)', ['doubling time ≈ 72 × rate', 'halving time ≈ rate ÷ 72']],
        ['Square of a number ending in 5: 65²', '4225', ['4125', '3625']],
        ['(a + b)(a − b)', 'a² − b²', ['a² + b²', '(a − b)²']],
        ['(a + b)²', 'a² + 2ab + b²', ['a² + b²', 'a² + ab + b²']],
        ['Casting out nines checks…', 'arithmetic results by digit sums', ['whether a number is prime', 'square roots']],
        ['Prime numbers below 30', '2, 3, 5, 7, 11, 13, 17, 19, 23, 29', ['2, 3, 5, 7, 9, 11, 13, 17, 19, 23', '3, 5, 7, 11, 13, 17, 19, 23, 27, 29']],
        ['Is 91 prime?', 'No: 7 × 13', ['Yes', 'No: 3 × 31']],
        ['Is 97 prime?', 'Yes', ['No: 7 × 14', 'No: 3 × 33']],
        ['Is 51 prime?', 'No: 3 × 17', ['Yes', 'No: 7 × 7']],
        ['Is 57 prime?', 'No: 3 × 19', ['Yes', 'No: 7 × 8']]] });
  return units;
})();

/* Endless adaptive drills for the Feed and quick-math gates. Level 1-12. */
function mathProblem(lv) {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const L = clamp(Math.round(lv || 1), 1, 12);
  let q, a, w = [];
  const kinds = { 1: 'add1', 2: 'add2', 3: 'sub2', 4: 'mul', 5: 'add3', 6: 'mul21', 7: 'div', 8: 'pct', 9: 'mul22', 10: 'sq', 11: 'mixed', 12: 'mul32' };
  const k = Math.random() < 0.25 && L > 2 ? kinds[R(1, L - 1)] : kinds[L];
  switch (k) {
    case 'add1': { const x = R(3, 9), y = R(3, 9); q = `${x} + ${y}`; a = x + y; break; }
    case 'add2': { const x = R(12, 89), y = R(5, 9); q = `${x} + ${y}`; a = x + y; break; }
    case 'sub2': { const x = R(41, 99), y = R(12, x - 10); q = `${x} − ${y}`; a = x - y; break; }
    case 'mul': { const x = R(3, 9), y = R(3, 12); q = `${x} × ${y}`; a = x * y; break; }
    case 'add3': { const x = R(120, 899), y = R(45, 399); q = `${x} + ${y}`; a = x + y; break; }
    case 'mul21': { const x = R(13, 89), y = R(3, 9); q = `${x} × ${y}`; a = x * y; break; }
    case 'div': { const y = R(3, 12), a0 = R(4, 15); q = `${y * a0} ÷ ${y}`; a = a0; break; }
    case 'pct': { const p = [5, 10, 15, 20, 25, 30, 40, 50, 75][R(0, 8)], n = R(2, 40) * 4; q = `${p}% of ${n}`; a = p * n / 100; break; }
    case 'mul22': { const x = R(11, 19), y = R(11, 19); q = `${x} × ${y}`; a = x * y; break; }
    case 'sq': { const x = R(11, 35); q = `${x}²`; a = x * x; break; }
    case 'mixed': { const x = R(2, 9), y = R(2, 9), z = R(2, 20); q = `${x} × ${y} + ${z}`; a = x * y + z; break; }
    default: { const x = R(101, 499), y = R(3, 9); q = `${x} × ${y}`; a = x * y; }
  }
  const cand = [a + 1, a - 1, a + 10, a - 10, a + 2, a + (a % 10 === 0 ? 5 : 10 - a % 10)];
  for (const c of cand) if (c !== a && c >= 0 && !w.includes(c)) w.push(c);
  w = w.sort(() => Math.random() - 0.5).slice(0, 3);
  return { q, a: String(a), w: w.map(String), lv: L };
}

/* ---------- registry ---------- */
const COURSES = {};
function addCourse(c) {
  c.col = c.col || GROUP_COL[c.group] || '#d5b66f';
  c.count = c.units.reduce((n, u) => n + u.i.length, 0);
  COURSES[c.key] = c;
}
(typeof COURSE_DATA !== 'undefined' ? COURSE_DATA : []).forEach(d => addCourse({
  key: d.k, name: d.n, group: d.g, tag: d.t, level: d.lv, blurb: d.b, src: d.s || [], lang: d.l || '', speak: d.sp || '', units: d.u
}));
addCourse({ key: 'nums', name: 'Mental Math', group: 'Math', tag: 'MATH', level: 'All levels', norev: true, math: true,
  blurb: 'Times tables, squares, powers, fractions and shortcuts, plus endless adaptive speed drills in the Feed and quick-math gates in runs.',
  src: [['OpenStax Prealgebra 2e', 'https://openstax.org/details/books/prealgebra-2e'], ['Answers are computed, not typed', 'https://github.com/baney75/graze']], units: MM });
const legacy = (key, name, group, items, title, extra) => addCourse(Object.assign({ key, name, group, tag: '', level: 'Quick deck', blurb: '', src: [], units: [{ t: title, i: items.map(x => [x[0], x[1], x[2] || []]) }] }, extra));
legacy('roots', 'Word Roots', 'Reading', ROOTS, 'Greek and Latin roots', { tag: 'ROOT', idOf: c => 'r:' + c, show: c => c + '-', blurb: 'Sixty Greek and Latin roots that unlock thousands of English words.' });
legacy('lex', 'Essential Words', 'Reading', LEX, 'Precise words', { tag: 'WORD', idOf: c => 'l:' + c, blurb: 'Fifty-five precise words every strong reader uses.' });
legacy('philo', 'Philosophy & Theology Terms', 'Mind', PHILO, 'Key terms', { tag: 'PHILO', blurb: 'Quick deck of core terms from philosophy and theology.' });
legacy('body', 'Body & Cell Basics', 'Medicine', BODY, 'Body and cell', { tag: 'BIO', blurb: 'Quick deck: organelles, organs and what they do.' });
const COURSE_KEYS = Object.keys(COURSES).sort((a, b) => {
  const ga = GROUPS.indexOf(COURSES[a].group), gb = GROUPS.indexOf(COURSES[b].group);
  if (ga !== gb) return ga - gb;
  const la = COURSES[a].level === 'Quick deck', lb = COURSES[b].level === 'Quick deck';
  if (la !== lb) return la ? 1 : -1;
  return COURSES[b].count - COURSES[a].count;
});
const courseSpeaks = k => { const c = COURSES[k]; return !!(c && c.lang); };
