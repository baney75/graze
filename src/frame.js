function drawFocus() {
  const g = G.focus || (G.gateFx && tNow - G.gateFx.fxT < 1.1 ? G.gateFx : null);
  if (!g) return;
  const card = CARDS[g.id], isMath = g.kind === 'math';
  if (!card && !isMath) return;
  const live = g === G.focus;
  const k = live ? clamp((tNow - g.t0) / 0.2, 0, 1) : clamp(1 - (tNow - g.fxT - 0.75) / 0.35, 0, 1);
  if (k <= 0) return;
  const dk = isMath ? { tag: 'MATH', col: '#a8c97a' } : DECKS[card.deck];
  const cue = isMath ? g.mq.q : g.rev ? card.a : card.c;
  const im = card && card.img ? cardImage(card) : null;
  const imH = im && !g.rev ? clamp(Math.min(H * 0.28, W * 0.5), 96, 250) : 0, imW = imH * (im ? im.ar : 1);
  const sub = card && card.r && !g.rev ? card.r : '';
  const y0 = TOP + HUD + clamp(S * 0.02, 8, 20);
  const fsB = clamp(S * (card && card.img ? 0.05 : 0.075), 18, 40);
  {
    ctx.font = `italic 600 ${Math.round(fsB)}px ${FD}`;
    let bw = Math.min(W - 16, ctx.measureText(cue).width + 48);
    let bh = 22 + fsB * 1.3 + (sub ? 20 : 0) + (imH ? imH + 12 : 0);
    if (g.kind === 'new') { ctx.font = `700 ${Math.round(clamp(S * 0.05, 17, 24))}px ${FU}`; const ln = wrapText('= ' + card.a, Math.min(W - 40, 520)).slice(0, 3); bw = Math.min(W - 16, Math.max(bw, Math.max(...ln.map(l => ctx.measureText(l).width)) + 48)); bh += ln.length * 26 + 8; }
    bw = Math.max(bw, 260, imW + 32);
    ctx.globalAlpha = k * (imH ? 0.92 : 0.82); rr(W / 2 - bw / 2, y0 - 16, bw, bh, 16); ctx.fillStyle = '#21191d'; ctx.fill();
    ctx.globalAlpha = k * 0.5; ctx.strokeStyle = dk.col; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 12px ${FU}`; ctx.fillStyle = dk.col;
  const chain = live && g.kind !== 'new' && G.rchain > 0 ? `  ·  CHAIN ×${G.rchain + 1}` : '';
  ctx.fillText((dk.tag || '') + (isMath ? '  ·  QUICK MATH' : g.kind === 'new' ? '  ·  NEW SIGIL  ·  REMEMBER THIS' : g.rev ? '  ·  REVERSE  ·  WHICH PROMPT?' : '  ·  RECALL') + chain, W / 2, y0);
  const fs = fitFont('italic 600', fsB, FD, cue, W - 32);
  ctx.fillStyle = '#eee5d5'; ctx.fillText(cue, W / 2, y0 + 10 + fs * 0.62);
  let yb = y0 + 14 + fs * 1.25;
  if (sub) { ctx.font = `500 14px ${FU}`; ctx.fillStyle = '#b9aaa6'; ctx.fillText(sub, W / 2, yb + 4); yb += 20; }
  if (imH) {
    if (im.ok) ctx.drawImage(im.img, W / 2 - imW / 2, yb + 4, imW, imH);
    else { ctx.fillStyle = 'rgba(255,255,255,.04)'; rr(W / 2 - imW / 2, yb + 4, imW, imH, 10); ctx.fill(); }
    yb += imH + 12;
  }
  if (g.kind === 'new') {
    ctx.font = `700 ${Math.round(clamp(S * 0.05, 17, 24))}px ${FU}`; ctx.fillStyle = '#d5b66f';
    const lines = wrapText('= ' + card.a, Math.min(W - 40, 520)).slice(0, 3);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, yb + 10 + i * 26));
    ctx.globalAlpha = 1; return;
  }
  const rev = live ? clamp((tNow - g.t0 - (isMath ? 0.35 : 0.7)) / 0.25, 0, 1) : 1;
  if (rev <= 0) {
    ctx.font = `600 13px ${FU}`; ctx.fillStyle = '#b9aaa6'; ctx.globalAlpha = k * (0.5 + 0.5 * Math.sin(tNow * 8));
    ctx.fillText(isMath ? 'Work it out…' : 'Recall it first…', W / 2, yb + 8);
    ctx.globalAlpha = 1; return;
  }
  const ox = cx + camX;
  pill(g, 0, ox, cy, Math.min(S * 0.5, 280), rev * k, yb);
  const r = (K1 + 0.12) * S * ZOOM;
  pill(g, 1, ox + Math.cos(g.a) * r, cy + Math.sin(g.a) * r, Math.min(W * 0.5, 280), rev * k, yb);
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
  if (feverVis > 0.01) { ctx.globalAlpha = feverVis; ctx.fillStyle = bgFever; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (focusVis > 0.01) { ctx.globalAlpha = focusVis; ctx.fillStyle = bgFocus; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  const sk = RM ? shake * 0.2 : shake;
  const sx = (Math.random() - 0.5) * sk, sy = (Math.random() - 0.5) * sk;
  const showG = G && mode !== 'menu';
  const P = showG ? G : demo;
  const z = 1 + (RM ? 0 : punch * 0.035); ZOOM = z;
  const quizFocus = showG && G.focus && G.focus.kind === 'quiz';
  ctx.save(); ctx.translate(cx + camX + sx, cy + sy); ctx.scale(z, z);
  drawStars(P.ang, RM ? 0 : feverVis);
  if (showG) drawCallout();
  drawDial(showG ? (G.fever > 0 ? G.fever / G.feverMax : G.feverM) : 0, showG && G.fever > 0);
  drawLanes(P.tgt, showG ? feverVis : 0, showG ? focusVis * (quizFocus ? 1 : 0.4) : 0);
  if (showG) { drawShards(); drawPU(); drawHazards(); drawGates(); }
  if (mode === 'menu') drawCore('TAP', 'TO PLAY', 0.5 + 0.5 * Math.sin(tNow * 2.4), '#d5b66f');
  else if (mode === 'results') drawCore('×' + G.maxMult, 'TOP MULT', 0, MULT_COL[G.maxMult - 1]);
  else if (quizFocus) drawCore('', '', 0, '#d5b66f');
  else if (G.fever > 0) drawCore('×' + G.mult, 'FEVER ' + G.fever.toFixed(1), G.fever / G.feverMax, `hsl(${40 + 8 * Math.sin(tNow * 6)} 88% 72%)`);
  else drawCore('×' + G.mult, G.rchain > 1 ? 'CHAIN ×' + G.rchain : 'MULTIPLIER', G.heat, MULT_COL[G.mult - 1]);
  if (!(showG && G.dead)) { drawTrail(); drawPlayer(P, showG); }
  drawWaves(); drawParts(); if (showG) { drawPops(); drawTapCue(); }
  ctx.restore();
  ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H);
  if (showG && mode !== 'results') { drawHUD(); drawToast(); drawFocus(); }
  if (mode === 'boon' || mode === 'revive') { ctx.fillStyle = 'rgba(20,12,16,.45)'; ctx.fillRect(0, 0, W, H); }
  if (flash > 0) { ctx.fillStyle = `rgba(${flashCol},${flash * 0.25})`; ctx.fillRect(0, 0, W, H); }
}

let lastMode = '', lastPanel = null;
function update(dt) {
  tNow += dt;
  if (mode !== lastMode || panel !== lastPanel) { lastMode = mode; lastPanel = panel; syncUpdBanner(); }
  const wide = W >= 900;
  const want = (mode === 'menu' || mode === 'results') && wide && !panel ? -Math.min(260, (W - 900) * 0.45 + 120) : 0;
  camX += (want - camX) * Math.min(1, dt * 5);
  shake = Math.max(0, shake - dt * 45); flash = Math.max(0, flash - dt * 2.4); multPulse = Math.max(0, multPulse - dt * 4); punch = Math.max(0, punch - dt * 5);
  const live = G && (mode === 'play' || mode === 'paused' || mode === 'boon' || mode === 'revive');
  feverVis += ((live && G.fever > 0 ? 1 : 0) - feverVis) * Math.min(1, dt * 6);
  focusVis += ((live && G.focus ? 1 : 0) - focusVis) * Math.min(1, dt * 8);

  if (mode === 'play') {
    let ts = 1; if (G.slowT > 0) { G.slowT -= dt; ts = 0.35; }
    if (G.focus) ts = Math.min(ts, 0.28);
    step(dt * ts);
  } else if (mode === 'dying') {
    G.deadT += dt; if (G.deadT > 0.9) endRun();
  } else if (mode === 'menu') {
    demo.ang += 1.15 * dt; demo.nt -= dt;
    if (demo.nt < 0) { demo.tgt = 1 - demo.tgt; demo.nt = rnd(0.6, 1.8); }
    const sp = dt / 0.11; demo.rf += clamp(demo.tgt - demo.rf, -sp, sp);
    trailPts.push(ppos(demo)); if (trailPts.length > 22) trailPts.shift();
  }
  if (mode !== 'paused' && mode !== 'boon') {
    const pdt = mode === 'dying' || mode === 'revive' ? dt * 0.6 : dt, drag = Math.pow(0.04, pdt);
    for (const p of parts) { p.x += p.vx * pdt; p.y += p.vy * pdt; p.vx *= drag; p.vy *= drag; p.life -= pdt; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    for (const p of pops) { p.life -= dt; p.y -= dt * S * 0.12; }
    for (let i = pops.length - 1; i >= 0; i--) if (pops[i].life <= 0) pops.splice(i, 1);
    for (const w of waves) w.t += dt;
    for (let i = waves.length - 1; i >= 0; i--) if (waves[i].t >= waves[i].life) waves.splice(i, 1);
    if (toasts[0] && !(G && G.focus)) { toasts[0].life -= dt; if (toasts[0].life <= 0) toasts.shift(); }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  update(dt); draw();
  requestAnimationFrame(frame);
}
window.__graze = { get G() { return G; }, get mode() { return mode; }, get SV() { return SV; }, get CARDS() { return CARDS; }, get SYNC() { return SYNC; },
  mergeState, exportState, makeTransfer, readTransfer, absorb, deriveLink, encryptStr, decryptStr, takeBoon, answerRevive,
  openLesson, openCourse: k => { openPanel('library'); renderLibrary('course', k); }, get COURSES() { return COURSES; }, mathProblem };
resize(); renderMenu(); initUpdates();
requestAnimationFrame(frame);
setTimeout(() => { if (!maybeOnboard()) maybeShowNews(); else lsSet('graze.seenVersion', VERSION); }, 500);
initSync().then(() => { if (mode === 'menu' && !panel) renderMenu(); });
