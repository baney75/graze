/* ---------- render ---------- */
function trailCol(i) {
  if (G && G.fever > 0 && mode !== 'menu') return `hsl(${32 + 14 * Math.sin(tNow * 7 + i * 0.45)} 88% ${66 + 8 * Math.sin(tNow * 5 + i * 0.3)}%)`;
  const tr = curTrail();
  if (tr.fx === 'prism') return `hsl(${(tNow * 140 + i * 16) % 360} 100% 66%)`;
  if (tr.fx === 'aurora') return `hsl(${200 + Math.sin(tNow * 1.4 + i * 0.28) * 70} 95% 64%)`;
  return tr.c[1];
}
const coreCol = () => { const tr = curTrail(); return tr.c ? tr.c[0] : '#ffffff'; };
function arcPath(r, a0, a1) { ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrapText(text, maxW) {
  const ws = String(text).split(/\s+/), lines = []; let cur = '';
  for (const w of ws) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

function drawStars(rot, streak) {
  if (streak > 0.05) {
    ctx.lineCap = 'round';
    for (const s of stars) {
      const a = s.a + rot * s.p, len = streak * 0.12 * (1 + s.p * 6);
      ctx.globalAlpha = s.o * 0.8; ctx.strokeStyle = s.c; ctx.lineWidth = s.s;
      ctx.beginPath(); ctx.arc(0, 0, s.r, a - len, a); ctx.stroke();
    }
    ctx.lineCap = 'butt'; ctx.globalAlpha = 1; return;
  }
  for (const s of stars) {
    const a = s.a + rot * s.p;
    ctx.globalAlpha = s.o * (0.6 + 0.4 * Math.sin(tNow * s.tw + s.ph));
    ctx.fillStyle = s.c;
    ctx.fillRect(Math.cos(a) * s.r, Math.sin(a) * s.r, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}
function drawDial(f, fev) {
  const Rd = S * (K1 + 0.08), lit = Math.round(clamp(f, 0, 1) * 72);
  for (const long of [false, true]) {
    ctx.beginPath();
    for (let i = lit; i < 72; i++) {
      if ((i % 6 === 0) !== long) continue;
      const a = -Math.PI / 2 + i / 72 * TAU, c = Math.cos(a), s = Math.sin(a), l = long ? S * 0.024 : S * 0.011;
      ctx.moveTo(c * Rd, s * Rd); ctx.lineTo(c * (Rd + l), s * (Rd + l));
    }
    ctx.strokeStyle = long ? 'rgba(213,182,111,.42)' : 'rgba(213,182,111,.18)'; ctx.lineWidth = 1; ctx.stroke();
  }
  arcPath(Rd - S * 0.012, 0, TAU); ctx.strokeStyle = 'rgba(213,182,111,.16)'; ctx.lineWidth = 1; ctx.stroke();
  arcPath(Rd - S * 0.019, 0, TAU); ctx.strokeStyle = 'rgba(213,182,111,.07)'; ctx.stroke();
  if (S > 260) {
    ctx.font = `600 ${Math.max(8, Math.round(S * 0.019))}px ${FU}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(213,182,111,.34)';
    const Rn = Rd + S * 0.05;
    for (let k = 0; k < 12; k++) { const a = -Math.PI / 2 + k / 12 * TAU; ctx.fillText(String(k * 30), Math.cos(a) * Rn, Math.sin(a) * Rn); }
  }
  if (!lit) return;
  const ready = f >= 0.8 && !fev, pulse = 0.65 + 0.35 * Math.sin(tNow * 14);
  ctx.lineCap = 'round';
  for (let i = 0; i < lit; i++) {
    const a = -Math.PI / 2 + i / 72 * TAU, c = Math.cos(a), s = Math.sin(a), l = (i % 6 === 0 ? S * 0.03 : S * 0.019);
    ctx.strokeStyle = fev ? `hsl(${34 + 12 * Math.sin(tNow * 6 + i * 0.35)} 85% 66%)` : '#f0b35e';
    ctx.globalAlpha = ready ? pulse : 0.95; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(c * Rd, s * Rd); ctx.lineTo(c * (Rd + l), s * (Rd + l)); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
function drawLanes(tgt, fev, quiz) {
  for (const l of [0, 1]) {
    arcPath(KL(l) * S, 0, TAU);
    if (quiz > 0.01) { ctx.strokeStyle = l ? `rgba(123,196,189,${0.25 + 0.35 * quiz})` : `rgba(213,182,111,${0.25 + 0.35 * quiz})`; ctx.lineWidth = l === tgt ? 3.5 : 2; }
    else if (fev > 0) { ctx.strokeStyle = `rgba(240,179,94,${0.18 + 0.2 * fev})`; ctx.lineWidth = 2 + fev * 2; }
    else { ctx.strokeStyle = l === tgt ? 'rgba(213,182,111,.34)' : 'rgba(213,182,111,.13)'; ctx.lineWidth = l === tgt ? 2 : 1.25; }
    ctx.stroke();
    if (quiz <= 0.01 && fev <= 0) { arcPath(KL(l) * S + 4, 0, TAU); ctx.strokeStyle = 'rgba(213,182,111,.05)'; ctx.lineWidth = 1; ctx.stroke(); }
  }
}
function drawCallout() {
  if (!G || !G.call || mode === 'menu') return;
  const c = G.call, k = c.life / c.max, sc = 1 + (1 - k) * 0.3;
  let fs = S * 0.17;
  ctx.font = `italic 600 ${Math.round(fs)}px ${FD}`;
  const w = ctx.measureText(c.text).width;
  if (w > W * 0.92) fs *= W * 0.92 / w;
  ctx.save(); ctx.scale(sc, sc);
  ctx.font = `italic 600 ${Math.round(fs)}px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = Math.min(1, (c.max - c.life) / 0.06) * k * 0.32;
  ctx.fillStyle = c.col; ctx.fillText(c.text, 0, 0);
  ctx.globalAlpha *= 1.6; ctx.strokeStyle = c.col; ctx.lineWidth = 1.5; ctx.strokeText(c.text, 0, 0);
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawCore(big, small, heat, col) {
  { const g = ctx.createRadialGradient(0, -S * 0.04, S * 0.01, 0, 0, S * 0.14); g.addColorStop(0, '#45282f'); g.addColorStop(1, '#261a1f');
    arcPath(S * 0.135, 0, TAU); ctx.fillStyle = g; ctx.fill(); }
  ctx.strokeStyle = 'rgba(213,182,111,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  arcPath(S * 0.158, 0, TAU); ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = S * 0.012; ctx.stroke();
  if (heat > 0.001) {
    arcPath(S * 0.158, -Math.PI / 2, -Math.PI / 2 + clamp(heat, 0, 1) * TAU);
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
  }
  if (!big) return;
  const sc = 1 + multPulse * 0.35;
  ctx.save(); ctx.scale(sc, sc);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = col; ctx.font = `italic 600 ${Math.round(S * 0.085)}px ${FD}`;
  ctx.fillText(big, 0, -S * 0.012);
  ctx.restore();
  ctx.fillStyle = '#b9aaa6'; ctx.font = `600 ${Math.max(9, Math.round(S * 0.024))}px ${FU}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(small, 0, S * 0.058);
}
function drawHazards() {
  const th = THK * S;
  for (const h of G.hz) {
    if (h.dead) continue;
    const d = h.a - G.ang, w = wOf(h), Rl = h.k * S;
    const vis = clamp((LOOK - d) / 0.6, 0, 1); if (vis <= 0) continue;
    const fade = d < -w ? clamp(1 + (d + w) / 0.5, 0, 1) : 1;
    const a = vis * fade; if (a <= 0) continue;
    const cap = (th / 2) / Rl, a0 = h.a - w + cap, a1 = Math.max(a0 + 0.001, h.a + w - cap);
    const danger = !G.dead && G.fever <= 0 && h.lane === G.tgt && d > 0 && d / G.omega < 0.55;
    ctx.lineCap = 'round';
    if (h.hop && h.hop.t < 0) {
      const Rg = KL(h.hop.to) * S, cg = (th / 2) / Rg, wg = h.lf / 2 / KL(h.hop.to);
      ctx.globalAlpha = a * (0.35 + 0.25 * Math.sin(tNow * 16)); ctx.strokeStyle = h.col; ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      arcPath(Rg - th / 2, h.a - wg + cg, h.a + wg - cg); ctx.stroke();
      arcPath(Rg + th / 2, h.a - wg + cg, h.a + wg - cg); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalCompositeOperation = 'lighter';
    arcPath(Rl, a0, a1); ctx.strokeStyle = h.col; ctx.globalAlpha = a * (danger ? 0.32 + 0.12 * Math.sin(tNow * 30) : 0.16); ctx.lineWidth = th * 2.1; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    arcPath(Rl, a0, a1); ctx.globalAlpha = a * (vis < 1 ? 0.55 : 1); ctx.lineWidth = th; ctx.stroke();
    if (h.hop) {
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = a * 0.7; ctx.lineWidth = th * 0.5; ctx.lineCap = 'butt';
      ctx.setLineDash([3, 6]); arcPath(Rl, a0, a1); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'round';
    } else {
      arcPath(Rl, a0, a1); ctx.globalAlpha = a * 0.55; ctx.lineWidth = th * 0.26; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    }
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
function drawGates() {
  for (const g of G.gates) {
    const d = g.a - G.ang, vis = clamp((LOOK - d) / 0.6, 0, 1); if (vis <= 0) continue;
    const fade = g.done ? clamp(1 + d / 0.6, 0, 1) : 1;
    const col = g.done ? (g.kind === 'new' || g.ok ? '#82c89c' : '#ee8991') : '#d5b66f';
    const c = Math.cos(g.a), s = Math.sin(g.a), r0 = (K0 - 0.055) * S, r1 = (K1 + 0.055) * S;
    const pulse = g.focus && !g.done ? 0.6 + 0.4 * Math.sin(tNow * 9) : 1;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = vis * fade * 0.28 * pulse; ctx.strokeStyle = col; ctx.lineWidth = S * 0.04;
    ctx.beginPath(); ctx.moveTo(c * r0, s * r0); ctx.lineTo(c * r1, s * r1); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = vis * fade; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(c * r0, s * r0); ctx.lineTo(c * r1, s * r1); ctx.stroke();
    for (const l of [0, 1]) {
      const R = KL(l) * S;
      ctx.beginPath(); ctx.arc(c * R, s * R, S * 0.016, 0, TAU);
      ctx.fillStyle = '#21191d'; ctx.fill(); ctx.strokeStyle = g.done ? col : (l ? '#7bc4bd' : '#d5b66f'); ctx.lineWidth = 2.5; ctx.stroke();
    }
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
function diamond(x, y, sz, rot, fill, line) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.7, 0); ctx.lineTo(0, sz); ctx.lineTo(-sz * 0.7, 0); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
function star4(x, y, sz, rot, fill) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? sz * 0.34 : sz; i ? ctx.lineTo(Math.sin(a) * r, -Math.cos(a) * r) : ctx.moveTo(0, -r); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
}
function drawShards() {
  const sz = S * 0.017;
  for (const s of G.sh) {
    let x, y, vis = 1;
    if (s.fly) { x = s.x; y = s.y; }
    else {
      const d = s.a - G.ang; vis = clamp((LOOK - d) / 0.6, 0, 1); if (vis <= 0) continue;
      const R = KL(s.lane) * S; x = Math.cos(s.a) * R; y = Math.sin(s.a) * R;
    }
    const col = s.gold ? '#ffe9b0' : '#e4cfaa', z = s.gold ? sz * 1.35 : sz * 1.1;
    { const gr = ctx.createRadialGradient(x, y, 0, x, y, z * 2.4); gr.addColorStop(0, s.gold ? 'rgba(255,233,176,.42)' : 'rgba(228,207,170,.3)'); gr.addColorStop(1, 'rgba(228,207,170,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = vis; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, z * 2.4, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = vis;
    star4(x, y, z, tNow * 1.6 + s.a, col);
  }
  ctx.globalAlpha = 1;
}
function puIcon(type, s, c) {
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = Math.max(1.5, s * 0.26); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (type === 'shield') {
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.85, -s * 0.55); ctx.lineTo(s * 0.7, s * 0.35); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, s * 0.35); ctx.lineTo(-s * 0.85, -s * 0.55); ctx.closePath(); ctx.stroke();
  } else if (type === 'magnet') {
    ctx.moveTo(-s * 0.65, -s * 0.85); ctx.lineTo(-s * 0.65, 0); ctx.arc(0, 0, s * 0.65, Math.PI, 0, true); ctx.lineTo(s * 0.65, -s * 0.85); ctx.stroke();
  } else {
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? s * 0.36 : s; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
}
function drawPU() {
  const r = S * 0.03;
  for (const p of G.pu) {
    const d = p.a - G.ang, vis = clamp((LOOK - d) / 0.6, 0, 1); if (vis <= 0) continue;
    const R = KL(p.lane) * S, x = Math.cos(p.a) * R, y = Math.sin(p.a) * R, c = PU[p.type].col, bob = 1 + 0.1 * Math.sin(tNow * 6);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = vis * 0.28; ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x, y, r * 2.3 * bob, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = vis;
    ctx.beginPath(); ctx.arc(x, y, r * bob, 0, TAU); ctx.fillStyle = '#21191d'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.save(); ctx.translate(x, y); puIcon(p.type, r * 0.55, c); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawTrail() {
  const n = trailPts.length, pr = (G && mode !== 'menu') ? prOf() : PRK * S;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 1; i < n; i++) {
    const k = i / n;
    ctx.beginPath(); ctx.moveTo(trailPts[i - 1].x, trailPts[i - 1].y); ctx.lineTo(trailPts[i].x, trailPts[i].y);
    ctx.strokeStyle = trailCol(n - i); ctx.globalAlpha = k * 0.55; ctx.lineWidth = pr * 1.7 * k; ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
}
function drawPlayer(o, live) {
  const p = ppos(o), pr = live ? prOf() : PRK * S, c1 = trailCol(0);
  const blink = live && G.grace > 0 && G.fever <= 0 && Math.floor(tNow * 20) % 2;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = live && G.fever > 0 ? 0.4 : 0.22; ctx.fillStyle = c1;
  ctx.beginPath(); ctx.arc(p.x, p.y, pr * 2.7, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = blink ? 0.35 : 1;
  ctx.beginPath(); ctx.arc(p.x, p.y, pr, 0, TAU); ctx.fillStyle = coreCol(); ctx.fill();
  ctx.strokeStyle = c1; ctx.lineWidth = 2; ctx.stroke();
  ctx.globalAlpha = 1;
  if (!live) return;
  if (G.shield) {
    ctx.globalAlpha = 0.65 + 0.3 * Math.sin(tNow * 7); ctx.strokeStyle = '#8ab4dc'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + tNow * 1.5, r = pr * 2.05; i ? ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r) : ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); }
    ctx.closePath(); ctx.stroke();
  }
  if (G.magnet > 0) {
    ctx.globalAlpha = G.magnet < 1.5 ? (Math.floor(tNow * 10) % 2 ? 0.9 : 0.25) : 0.8;
    ctx.strokeStyle = '#7bc4bd'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -tNow * 30;
    ctx.beginPath(); ctx.arc(p.x, p.y, pr * 2.6, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    ctx.globalAlpha = 0.9; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, pr * 3.1, -Math.PI / 2, -Math.PI / 2 + G.magnet / 8 * TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawWaves() {
  for (const w of waves) {
    const k = w.t / w.life, e = 1 - Math.pow(1 - k, 3);
    ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = w.col; ctx.lineWidth = w.lw * (1 - k) + 0.5;
    ctx.beginPath(); ctx.arc(w.x, w.y, Math.max(1, w.max * e), 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawParts() {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawPops() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of pops) {
    const k = p.life / p.max;
    ctx.globalAlpha = clamp(k * 1.6, 0, 1); ctx.fillStyle = p.col;
    ctx.font = `italic 600 ${Math.round(S * 0.036 * p.size * (1 + (1 - k) * 0.15))}px ${FD}`;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}
function drawHUD() {
  const fs = clamp(S * 0.085, 28, 58), y = TOP + HUD * 0.18 + fs * 0.8;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = G.fever > 0 ? `hsl(${40 + 8 * Math.sin(tNow * 6)} 88% 74%)` : G.bestBroken ? '#d5b66f' : '#eee5d5';
  ctx.font = `italic 600 ${Math.round(fs)}px ${FD}`;
  ctx.fillText(fmt(G.score), W / 2, y);
  const ly = y + clamp(S * 0.045, 18, 24);
  ctx.font = `600 ${Math.round(clamp(S * 0.028, 12, 15))}px ${FU}`;
  ctx.fillStyle = '#b9aaa6';
  const best = G.bestBroken ? 'NEW BEST' : (G.prevBest > 0 ? 'BEST ' + fmt(G.prevBest) : 'FIRST RUN');
  ctx.fillText(`${best}   ◆ ${G.shards}   PHASE ${G.phase}   REVIVE ${G.revives}`, W / 2, ly);
  if (G.prevBest > 0 && !G.bestBroken) {
    const bw = Math.min(160, W * 0.4), bx = W / 2 - bw / 2, by = ly + 9, f = clamp(G.score / G.prevBest, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = f > 0.8 ? '#d5b66f' : '#b9aaa6'; ctx.fillRect(bx, by, bw * f, 3);
  }
  if (runsCount() < 2 && G.t < 8 && !G.focus) {
    ctx.globalAlpha = clamp((8 - G.t) / 1.5, 0, 1) * 0.9;
    ctx.font = `600 ${Math.round(clamp(S * 0.034, 13, 17))}px ${FU}`; ctx.fillStyle = '#eee5d5';
    ctx.fillText('Tap, Space or ↑↓ to switch orbit', W / 2, H - BOT - 26);
    ctx.globalAlpha = 1;
  }
}
function drawTapCue() {
  if (runsCount() > 0 || G.dead || G.fever > 0) return;
  for (const h of G.hz) {
    const d = h.a - G.ang;
    if (!h.dead && h.lane === G.tgt && d > 0 && d / G.omega < 0.6) {
      const p = ppos(G), out = Math.hypot(p.x, p.y) || 1;
      const x = p.x + p.x / out * S * 0.09, y = p.y + p.y / out * S * 0.09;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(tNow * 18);
      ctx.fillStyle = '#d5b66f'; ctx.font = `italic 600 ${Math.round(S * 0.04)}px ${FD}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TAP', x, y);
      ctx.globalAlpha = 1; return;
    }
  }
}
function fitFont(weight, size, fam, text, maxW) {
  ctx.font = `${weight} ${Math.round(size)}px ${fam}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) { size *= maxW / w; ctx.font = `${weight} ${Math.round(size)}px ${fam}`; }
  return size;
}
function drawToast() {
  if (G.focus) return;
  const t = toasts[0]; if (!t) return;
  const k = t.life / t.max, a = Math.min(1, (t.max - t.life) / 0.18, t.life / 0.35);
  const y = TOP + HUD + clamp(S * 0.05, 18, 34);
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = t.col; fitFont('italic 600', clamp(S * 0.042, 16, 26) * (1 + (1 - k) * 0.04), FD, t.title.toUpperCase(), W - 32);
  ctx.fillText(t.title.toUpperCase(), W / 2, y);
  ctx.fillStyle = '#b9aaa6'; fitFont(500, clamp(S * 0.028, 12, 15), FU, t.sub, W - 32);
  ctx.fillText(t.sub, W / 2, y + clamp(S * 0.042, 17, 24));
  ctx.globalAlpha = 1;
}
function pill(g, lane, x, y, maxW, alpha, yMin) {
  ctx.font = `600 15px ${FU}`;
  const lines = wrapText(g.opts[lane], maxW - 24).slice(0, 4);
  const w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width)) + 28), h = lines.length * 19 + 18;
  x = clamp(x, w / 2 + 8, W - w / 2 - 8); y = clamp(y, yMin + h / 2 + 16, H - BOT - h / 2 - 8);
  const res = g.done, sel = !res && G.tgt === lane;
  let border = lane ? '#7bc4bd' : '#d5b66f';
  if (res) border = lane === g.correct ? '#82c89c' : (lane === g.chose ? '#ee8991' : 'rgba(185,170,166,.35)');
  ctx.globalAlpha = alpha * (res || sel ? 1 : 0.72);
  if (sel) { ctx.save(); ctx.shadowColor = border; ctx.shadowBlur = 18; rr(x - w / 2, y - h / 2, w, h, 12); ctx.fillStyle = 'rgba(33,25,29,.95)'; ctx.fill(); ctx.restore(); }
  rr(x - w / 2, y - h / 2, w, h, 12); ctx.fillStyle = 'rgba(33,25,29,.95)'; ctx.fill();
  ctx.lineWidth = sel || res ? 3 : 1.5; ctx.strokeStyle = border; ctx.stroke();
  ctx.fillStyle = '#eee5d5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x, y - (lines.length - 1) * 9.5 + i * 19));
  ctx.font = `700 10px ${FU}`; ctx.fillStyle = border;
  const tag = res ? (lane === g.correct ? '✓ ANSWER' : lane === g.chose ? '✕ YOUR PICK' : '') : (lane ? 'OUTER ORBIT' : 'INNER ORBIT');
  if (tag) ctx.fillText(tag, x, y - h / 2 - 8);
  ctx.globalAlpha = 1;
}
