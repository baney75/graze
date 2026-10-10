/* ================= diagrams: biology and chemistry =================
   Registry entries: { name, vb: [0, 0, W, H], parts: { id: 'Display name' }, svg(part) }.
   svg(part) returns standalone SVG markup with that one part highlighted; svg(null) highlights nothing. */
var DIAGRAMS = (typeof DIAGRAMS !== 'undefined' && DIAGRAMS) || {};
(function () {
  'use strict';
  var K = {
    fill: '#3a2c32', dark: '#2e2328', mid: '#4a3840', line: '#b9aaa6', dot: '#968782',
    hi: '#d5b66f', hiDeep: '#b8954e', hiLine: '#fff3cf', hiInk: '#7a5c2a', text: '#eee5d5',
    green: '#3f5a45', greenDark: '#28392d', vac: '#343a47', wall: '#4b4136'
  };
  var SW = 1.8, HSW = 2.5;

  /* ---------- shared helpers ---------- */
  function n(v) { return String(Math.round(v * 10) / 10); }
  function P(p) { return n(p[0]) + ' ' + n(p[1]); }
  function rad(a) { return a * Math.PI / 180; }
  function polar(cx, cy, r, a) { return [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))]; }
  function gid(key) { return 'gz-glow-' + key; }
  function frame(key, W, H, body, blur) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      '<defs><filter id="' + gid(key) + '" filterUnits="userSpaceOnUse" x="-20" y="-20" width="' + (W + 40) + '" height="' + (H + 40) + '">' +
      '<feGaussianBlur in="SourceGraphic" stdDeviation="' + (blur || 3.5) + '" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' + body + '</svg>';
  }
  function paint(on, fill, sw) {
    return on ? 'fill="' + K.hi + '" stroke="' + K.hiLine + '" stroke-width="' + HSW + '"'
      : 'fill="' + fill + '" stroke="' + K.line + '" stroke-width="' + (sw || SW) + '"';
  }
  function glow(on, key, inner) { return on ? '<g filter="url(#' + gid(key) + ')">' + inner + '</g>' : inner; }
  function ring(x, y, r) {
    return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '" fill="none" stroke="' + K.hi + '" stroke-width="1.6"/>';
  }
  /* a stroked "tube": a light outline with a fill-colored core (ER, Golgi cisternae, membranes) */
  function tube(d, w, on, fill) {
    var cap = ' fill="none" stroke-linecap="round" stroke-linejoin="round"';
    return '<path d="' + d + '"' + cap + ' stroke="' + (on ? K.hiLine : K.line) + '" stroke-width="' + n(w + (on ? 5 : 3.6)) + '"/>' +
      '<path d="' + d + '"' + cap + ' stroke="' + (on ? K.hi : fill) + '" stroke-width="' + n(w) + '"/>';
  }
  function tubes(ds, w, on, fill) {
    var cap = ' fill="none" stroke-linecap="round" stroke-linejoin="round"', o = '', c = '';
    ds.forEach(function (d) {
      o += '<path d="' + d + '"' + cap + ' stroke="' + (on ? K.hiLine : K.line) + '" stroke-width="' + n(w + (on ? 5 : 3.6)) + '"/>';
      c += '<path d="' + d + '"' + cap + ' stroke="' + (on ? K.hi : fill) + '" stroke-width="' + n(w) + '"/>';
    });
    return o + c;
  }
  function smooth(pts) { /* closed Catmull-Rom spline through pts */
    var m = pts.length, d = 'M' + P(pts[0]);
    for (var i = 0; i < m; i++) {
      var p0 = pts[(i - 1 + m) % m], p1 = pts[i], p2 = pts[(i + 1) % m], p3 = pts[(i + 2) % m];
      d += 'C' + P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' +
        P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + P(p2);
    }
    return d + 'Z';
  }
  function blob(cx, cy, rx, ry, wob, ph, egg) {
    var pts = [];
    for (var i = 0; i < 40; i++) {
      var t = i / 40 * 2 * Math.PI;
      var k = 1 + wob * (0.6 * Math.sin(3 * t + ph) + 0.4 * Math.cos(5 * t + ph * 1.7));
      var yr = ry * (1 - (egg || 0) * Math.cos(t));
      pts.push([cx + rx * k * Math.cos(t), cy + yr * k * Math.sin(t)]);
    }
    return smooth(pts);
  }
  function arc(cx, cy, r, a0, a1) {
    var s = polar(cx, cy, r, a0), e = polar(cx, cy, r, a1);
    return 'M' + P(s) + 'A' + n(r) + ' ' + n(r) + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' ' + (a1 > a0 ? 1 : 0) + ' ' + P(e);
  }
  function band(cx, cy, r1, r2, a0, a1) { /* annular sector */
    var lg = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return 'M' + P(polar(cx, cy, r2, a0)) + 'A' + n(r2) + ' ' + n(r2) + ' 0 ' + lg + ' 1 ' + P(polar(cx, cy, r2, a1)) +
      'L' + P(polar(cx, cy, r1, a1)) + 'A' + n(r1) + ' ' + n(r1) + ' 0 ' + lg + ' 0 ' + P(polar(cx, cy, r1, a0)) + 'Z';
  }
  function rrect(x, y, w, h, r) {
    return 'M' + n(x + r) + ' ' + n(y) + 'H' + n(x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + n(x + w) + ' ' + n(y + r) +
      'V' + n(y + h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + n(x + w - r) + ' ' + n(y + h) + 'H' + n(x + r) +
      'A' + r + ' ' + r + ' 0 0 1 ' + n(x) + ' ' + n(y + h - r) + 'V' + n(y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + n(x + r) + ' ' + n(y) + 'Z';
  }
  function rng(seed) { /* mulberry32: deterministic layout */
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- organelle painters ---------- */
  function nucleusSVG(key, o, hiWhole, hiNucleolus, hiEnvelope) {
    var s = '', inner = o.r - 8;
    var plasm = '<circle cx="' + o.x + '" cy="' + o.y + '" r="' + inner + '" ' +
      (hiWhole ? 'fill="' + K.hi + '" stroke="none"' : 'fill="' + K.fill + '" stroke="none"') + '/>';
    var chrom = '<g transform="translate(' + o.x + ' ' + o.y + ') scale(' + n(o.r / 80) + ')" fill="none" stroke="' +
      (hiWhole ? K.hiInk : '#6e5a63') + '" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.85">' +
      '<path d="M-52 18c6-9 12 6 18-3s11 5 17-2 9 7 15 1"/><path d="M-30 44c7-6 11 6 18 0s10 6 17 0 10 5 16-1"/>' +
      '<path d="M18 -48c6 6-4 12 3 18s-5 11 2 17 -3 10 4 15"/><path d="M30 10c7-5 10 7 17 2s9 7 14 1"/>' +
      '<path d="M-40 -28c5 7 11-4 16 3s10-5 14 3"/><path d="M5 30c4 7 10-2 14 5s9-3 13 4"/></g>';
    var nl = o.nl;
    var nucleolus = '<path d="' + blob(nl[0], nl[1], nl[2], nl[2] * 0.9, 0.06, 0.4) + '" ' +
      (hiNucleolus ? paint(true) : hiWhole ? 'fill="' + K.hiDeep + '" stroke="' + K.hiLine + '" stroke-width="1.5"' : paint(false, K.dark)) + '/>';
    var env = '', segs = 12, gap = 5;
    for (var i = 0; i < segs; i++) {
      var a0 = i * 360 / segs + gap / 2 + 8, a1 = (i + 1) * 360 / segs - gap / 2 + 8;
      env += '<path d="' + band(o.x, o.y, inner, o.r, a0, a1) + '" ' + paint(hiWhole || hiEnvelope, K.mid, 1.5) + '/>';
    }
    if (hiWhole) return glow(true, key, plasm + chrom + nucleolus + env);
    s += plasm + chrom + glow(hiNucleolus, key, nucleolus) + glow(hiEnvelope, key, env);
    return s;
  }
  function mitoSVG(cx, cy, rx, ry, rot, on) {
    var s = '<g transform="translate(' + n(cx) + ' ' + n(cy) + ') rotate(' + rot + ')">';
    s += '<ellipse rx="' + rx + '" ry="' + ry + '" ' + paint(on, K.mid) + '/>';
    var ix = rx - 4.5, iy = ry - 4.5, k = Math.max(3, Math.round(rx / 7.5)), d = '';
    s += '<ellipse rx="' + ix + '" ry="' + iy + '" fill="' + (on ? K.hiDeep : K.fill) + '" stroke="' + (on ? K.hiLine : K.line) + '" stroke-width="1.3"/>';
    for (var i = 0; i < k; i++) {
      var x = -ix + (i + 1) * 2 * ix / (k + 1), yy = iy * Math.sqrt(1 - (x / ix) * (x / ix)), top = i % 2 === 0;
      d += 'M' + n(x) + ' ' + n(top ? -yy : yy) + 'L' + n(x) + ' ' + n(top ? yy * 0.3 : -yy * 0.3);
    }
    s += '<path d="' + d + '" fill="none" stroke="' + (on ? K.hiLine : K.line) + '" stroke-width="2.4" stroke-linecap="round"/>';
    return s + '</g>';
  }
  function golgiSVG(gx, gy, toward, on) { /* stacked cisternae, convex (cis) face toward the nucleus */
    var u = [Math.cos(rad(toward)), Math.sin(rad(toward))], c = [gx - 78 * u[0], gy - 78 * u[1]], s = '';
    var radii = [48, 59, 70, 81, 92], half = [24, 27, 26, 23, 19];
    for (var i = 0; i < radii.length; i++) {
      var hw = half[i] * 180 / Math.PI / radii[i] * 1.4;
      s += tube(arc(c[0], c[1], radii[i], toward - hw, toward + hw), 6.5, on, K.mid);
    }
    return s;
  }
  function rerSVG(cx, cy, radii, a0, a1, on, riboOn) {
    var s = '', dots = '';
    for (var i = 0; i < radii.length; i++) {
      var r = radii[i], pad = i * 4;
      s += tube(arc(cx, cy, r, a0 + pad, a1 - pad), 6.5, on, K.mid);
      var step = 560 / r;
      for (var a = a0 + pad + 2; a <= a1 - pad - 1; a += step) {
        dots += riboDot(polar(cx, cy, r + 6.5, a), riboOn, false);
      }
    }
    return { er: s, ribo: dots };
  }
  function riboDot(p, on, withRing) {
    return (on ? '<circle cx="' + n(p[0]) + '" cy="' + n(p[1]) + '" r="2.9" fill="' + K.hi + '" stroke="' + K.hiLine + '" stroke-width="1"/>' +
      (withRing ? ring(p[0], p[1], 6.5) : '')
      : '<circle cx="' + n(p[0]) + '" cy="' + n(p[1]) + '" r="2.5" fill="' + K.dot + '"/>');
  }
  function lysoSVG(x, y, r, on) {
    var s = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" ' + paint(on, K.mid) + '/>', R = rng(x * 7 + y);
    for (var i = 0; i < 7; i++) {
      var a = R() * 360, d = Math.sqrt(R()) * (r - 5), p = polar(x, y, d, a);
      s += '<circle cx="' + n(p[0]) + '" cy="' + n(p[1]) + '" r="1.6" fill="' + (on ? K.hiInk : K.line) + '" fill-opacity="0.8"/>';
    }
    return s;
  }
  function peroxSVG(x, y, r, on) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" ' + paint(on, K.fill) + '/>' +
      '<rect x="' + n(x - r * 0.42) + '" y="' + n(y - r * 0.42) + '" width="' + n(r * 0.84) + '" height="' + n(r * 0.84) + '" rx="1.5" transform="rotate(45 ' + x + ' ' + y + ')" fill="' +
      (on ? K.hiDeep : K.mid) + '" stroke="' + (on ? K.hiLine : K.line) + '" stroke-width="1.2"/>';
  }
  function vesSVG(x, y, r, on) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" ' + paint(on, K.fill) + '/>' + (on ? ring(x, y, r + 5.5) : '');
  }
  function centriole(x, y, w, h, on) {
    var s = '<rect x="' + n(x - w / 2) + '" y="' + n(y - h / 2) + '" width="' + w + '" height="' + h + '" rx="2" ' + paint(on, K.mid) + '/>';
    var d = '';
    if (w > h) for (var i = 1; i < 4; i++) d += 'M' + n(x - w / 2 + 3) + ' ' + n(y - h / 2 + i * h / 4) + 'H' + n(x + w / 2 - 3);
    else for (var j = 1; j < 4; j++) d += 'M' + n(x - w / 2 + j * w / 4) + ' ' + n(y - h / 2 + 3) + 'V' + n(y + h / 2 - 3);
    return s + '<path d="' + d + '" stroke="' + (on ? K.hiInk : K.line) + '" stroke-width="1" stroke-opacity="0.8"/>';
  }

  /* ---------- 1. animal cell ---------- */
  (function () {
    var key = 'cell', W = 640, H = 480;
    var CX = 320, CY = 240, RX = 286, RY = 204;
    var outline = blob(CX, CY, RX, RY, 0.03, 0.6, 0.07);
    var NU = { x: 272, y: 228, r: 80, nl: [256, 220, 22] };
    var RER = { radii: [92, 107, 122], a0: -62, a1: 56 };
    var GOLGI = { x: 200, y: 336, toward: -55 };
    var MITO = [[468, 116, 36, 16, 20], [540, 222, 34, 15, 82], [300, 398, 36, 16, -10]];
    var LYSO = [[392, 84, 15], [98, 296, 14]];
    var PEROX = [[140, 118, 12], [548, 310, 11]];
    var VES = [[171, 377, 6.5], [149, 371, 5.5], [238, 418, 6.5], [566, 160, 7], [584, 268, 6], [250, 60, 6]];
    var CENT = { x: 164, y: 196 };
    var SER = ['M346 338C362 350 378 352 394 344S426 330 446 340 482 362 506 346',
      'M394 344C400 362 414 374 434 374S468 370 488 384', 'M446 340C452 324 466 316 484 318S506 312 516 300',
      'M434 374C428 386 418 392 404 394'];
    /* free ribosomes: deterministic scatter clear of every organelle */
    var free = (function () {
      var R = rng(20240), out = [], tries = 0;
      var obst = [[NU.x, NU.y, 94], [GOLGI.x, GOLGI.y, 50], [CENT.x, CENT.y, 30]];
      MITO.forEach(function (m) { obst.push([m[0], m[1], m[2] + 8]); });
      LYSO.concat(PEROX).forEach(function (c) { obst.push([c[0], c[1], c[2] + 9]); });
      VES.forEach(function (c) { obst.push([c[0], c[1], c[2] + 9]); });
      while (out.length < 30 && tries++ < 5000) {
        var x = CX + (R() * 2 - 1) * RX, y = CY + (R() * 2 - 1) * RY;
        var ex = (x - CX) / (RX * 0.88), ey = (y - CY) / (RY * 0.84);
        if (ex * ex + ey * ey > 1) continue;
        var dx = x - NU.x, dy = y - NU.y, dn = Math.sqrt(dx * dx + dy * dy), an = Math.atan2(dy, dx) * 180 / Math.PI;
        if (dn < 146 && an > RER.a0 - 14 && an < RER.a1 + 14) continue;
        if (x > 350 && x < 525 && y > 300 && y < 395) continue;
        var bad = obst.some(function (o) { var a = x - o[0], b = y - o[1]; return a * a + b * b < o[2] * o[2]; });
        if (bad || out.some(function (p) { var a = x - p[0], b = y - p[1]; return a * a + b * b < 22 * 22; })) continue;
        out.push([x, y]);
      }
      return out;
    })();
    DIAGRAMS.cell = {
      name: 'Animal cell',
      vb: [0, 0, W, H],
      parts: {
        membrane: 'Plasma membrane', cytoplasm: 'Cytoplasm', nucleus: 'Nucleus', nucleolus: 'Nucleolus',
        envelope: 'Nuclear envelope', rer: 'Rough endoplasmic reticulum', ser: 'Smooth endoplasmic reticulum',
        golgi: 'Golgi apparatus', mitochondrion: 'Mitochondrion', ribosome: 'Ribosomes', lysosome: 'Lysosome',
        peroxisome: 'Peroxisome', vesicle: 'Vesicle', centrosome: 'Centrosome'
      },
      svg: function (part) {
        var h = function (id) { return part === id; }, s = '';
        s += glow(h('cytoplasm'), key, '<path d="' + outline + '" fill="' + (h('cytoplasm') ? K.hi : K.dark) + '" fill-opacity="' + (h('cytoplasm') ? 0.82 : 1) + '"/>');
        s += glow(h('ser'), key, tubes(SER, 6.5, h('ser'), K.mid));
        var r = rerSVG(NU.x, NU.y, RER.radii, RER.a0, RER.a1, h('rer'), h('ribosome'));
        s += glow(h('rer'), key, r.er) + glow(h('ribosome'), key, r.ribo);
        s += nucleusSVG(key, NU, h('nucleus'), h('nucleolus'), h('envelope'));
        s += glow(h('golgi'), key, golgiSVG(GOLGI.x, GOLGI.y, GOLGI.toward, h('golgi')));
        var v = ''; VES.forEach(function (c) { v += vesSVG(c[0], c[1], c[2], h('vesicle')); });
        s += glow(h('vesicle'), key, v);
        var m = ''; MITO.forEach(function (c) { m += mitoSVG(c[0], c[1], c[2], c[3], c[4], h('mitochondrion')); });
        s += glow(h('mitochondrion'), key, m);
        var l = ''; LYSO.forEach(function (c) { l += lysoSVG(c[0], c[1], c[2], h('lysosome')); });
        s += glow(h('lysosome'), key, l);
        var p = ''; PEROX.forEach(function (c) { p += peroxSVG(c[0], c[1], c[2], h('peroxisome')); });
        s += glow(h('peroxisome'), key, p);
        var on = h('centrosome');
        var ce = '<circle cx="' + (CENT.x + 2) + '" cy="' + (CENT.y + 1) + '" r="21" fill="' + (on ? K.hi : K.fill) + '" fill-opacity="' + (on ? 0.25 : 0.55) + '" stroke="' +
          (on ? K.hi : K.line) + '" stroke-opacity="0.5" stroke-width="1" stroke-dasharray="2 3"/>' +
          centriole(CENT.x - 4, CENT.y + 6, 26, 10, on) + centriole(CENT.x + 9, CENT.y - 4, 10, 26, on) + (on ? ring(CENT.x + 2, CENT.y + 1, 27) : '');
        s += glow(on, key, ce);
        var fr = ''; free.forEach(function (q) { fr += riboDot(q, h('ribosome'), true); });
        s += glow(h('ribosome'), key, fr);
        s += glow(h('membrane'), key, tube(outline, 4, h('membrane'), K.mid));
        return frame(key, W, H, s);
      }
    };
  })();

  /* ---------- 2. plant cell ---------- */
  (function () {
    var key = 'plantcell', W = 640, H = 480;
    var wallOut = rrect(10, 10, 620, 460, 30), wallIn = rrect(27, 27, 586, 426, 16), mem = rrect(33, 33, 574, 414, 12);
    var VAC = blob(394, 248, 172, 150, 0.018, 2.2, 0);
    var NU = { x: 128, y: 138, r: 56, nl: [118, 130, 15] };
    var RER = { radii: [70, 84], a0: 6, a1: 98 };
    var GOLGI = { x: 112, y: 352, toward: -70 };
    var MITO = [[176, 268, 27, 12, 68], [168, 424, 28, 12, -8], [548, 438, 24, 11, 4]];
    var CHL = [[300, 68, 0], [458, 66, -4], [576, 168, 86], [578, 330, 94], [430, 428, 4], [290, 428, -6], [214, 372, 72]];
    var PD = [[180, 'v'], [400, 'v'], [250, 'v2'], [500, 'v2'], [250, 'h'], [370, 'h2'], [120, 'h2']];
    function chloro(cx, cy, rot, on) {
      var s = '<g transform="translate(' + cx + ' ' + cy + ') rotate(' + rot + ')">' +
        '<ellipse rx="32" ry="15" ' + paint(on, K.green) + '/>' +
        '<ellipse rx="28" ry="11.5" fill="none" stroke="' + (on ? K.hiLine : K.line) + '" stroke-width="1" stroke-opacity="0.7"/>' +
        '<path d="M-22 0H22" stroke="' + (on ? K.hiInk : '#8fae95') + '" stroke-width="1.1"/>';
      [-15, 0, 15].forEach(function (gx) {
        for (var i = 0; i < 4; i++) s += '<rect x="' + (gx - 5) + '" y="' + n(-7 + i * 3.6) + '" width="10" height="2.8" rx="1.2" fill="' + (on ? K.hiDeep : K.greenDark) + '" stroke="' + (on ? K.hiInk : '#8fae95') + '" stroke-width="0.7"/>';
      });
      return s + '</g>';
    }
    function pd(pos, kind, on) {
      var x, y, w, h, cx, cy;
      /* a membrane-lined channel straight through the wall, with a central desmotubule */
      var vert = kind === 'v' || kind === 'v2';
      if (kind === 'v') { x = pos - 3.5; y = 8; cx = pos; cy = 20; }
      else if (kind === 'v2') { x = pos - 3.5; y = 448; cx = pos; cy = 460; }
      else if (kind === 'h') { x = 8; y = pos - 3.5; cx = 20; cy = pos; }
      else { x = 608; y = pos - 3.5; cx = 620; cy = pos; }
      w = vert ? 7 : 24; h = vert ? 24 : 7;
      return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + w + '" height="' + h + '" rx="2.5" ' + (on ? paint(true) : 'fill="' + K.dark + '" stroke="' + K.line + '" stroke-width="1.5"') + '/>' +
        '<path d="' + (vert ? 'M' + cx + ' ' + (y + 3) + 'V' + (y + h - 3) : 'M' + (x + 3) + ' ' + cy + 'H' + (x + w - 3)) + '" stroke="' + (on ? K.hiInk : K.line) + '" stroke-width="1.2" stroke-opacity="0.8"/>' +
        (on ? ring(cx, cy, 15) : '');
    }
    DIAGRAMS.plantcell = {
      name: 'Plant cell',
      vb: [0, 0, W, H],
      parts: {
        wall: 'Cell wall', membrane: 'Plasma membrane', vacuole: 'Central vacuole', chloroplast: 'Chloroplast',
        nucleus: 'Nucleus', nucleolus: 'Nucleolus', mitochondrion: 'Mitochondrion', rer: 'Rough endoplasmic reticulum',
        golgi: 'Golgi apparatus', plasmodesmata: 'Plasmodesmata'
      },
      svg: function (part) {
        var h = function (id) { return part === id; }, s = '';
        s += glow(h('wall'), key, '<path d="' + wallOut + wallIn + '" fill-rule="evenodd" ' + paint(h('wall'), K.wall) + '/>');
        s += '<path d="' + mem + '" fill="' + K.dark + '"/>';
        var p = ''; PD.forEach(function (q) { p += pd(q[0], q[1], h('plasmodesmata')); });
        s += glow(h('plasmodesmata'), key, p);
        s += glow(h('membrane'), key, tube(mem, 3.5, h('membrane'), K.mid));
        s += glow(h('vacuole'), key, '<path d="' + VAC + '" ' + paint(h('vacuole'), K.vac) + '/>');
        var r = rerSVG(NU.x, NU.y, RER.radii, RER.a0, RER.a1, h('rer'), false);
        s += glow(h('rer'), key, r.er) + r.ribo;
        s += nucleusSVG(key, NU, h('nucleus'), h('nucleolus'), false);
        s += glow(h('golgi'), key, golgiSVG(GOLGI.x, GOLGI.y, GOLGI.toward, h('golgi')));
        var c = ''; CHL.forEach(function (q) { c += chloro(q[0], q[1], q[2], h('chloroplast')); });
        s += glow(h('chloroplast'), key, c);
        var m = ''; MITO.forEach(function (q) { m += mitoSVG(q[0], q[1], q[2], q[3], q[4], h('mitochondrion')); });
        s += glow(h('mitochondrion'), key, m);
        return frame(key, W, H, s);
      }
    };
  })();

  /* ---------- 3. periodic table ---------- */
  (function () {
    var key = 'ptable';
    var SYM = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr ' +
      'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu ' +
      'Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr ' +
      'Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' ');
    var NAME = ('Hydrogen Helium Lithium Beryllium Boron Carbon Nitrogen Oxygen Fluorine Neon Sodium Magnesium Aluminum ' +
      'Silicon Phosphorus Sulfur Chlorine Argon Potassium Calcium Scandium Titanium Vanadium Chromium Manganese Iron Cobalt ' +
      'Nickel Copper Zinc Gallium Germanium Arsenic Selenium Bromine Krypton Rubidium Strontium Yttrium Zirconium Niobium ' +
      'Molybdenum Technetium Ruthenium Rhodium Palladium Silver Cadmium Indium Tin Antimony Tellurium Iodine Xenon Cesium ' +
      'Barium Lanthanum Cerium Praseodymium Neodymium Promethium Samarium Europium Gadolinium Terbium Dysprosium Holmium ' +
      'Erbium Thulium Ytterbium Lutetium Hafnium Tantalum Tungsten Rhenium Osmium Iridium Platinum Gold Mercury Thallium ' +
      'Lead Bismuth Polonium Astatine Radon Francium Radium Actinium Thorium Protactinium Uranium Neptunium Plutonium ' +
      'Americium Curium Berkelium Californium Einsteinium Fermium Mendelevium Nobelium Lawrencium Rutherfordium Dubnium ' +
      'Seaborgium Bohrium Hassium Meitnerium Darmstadtium Roentgenium Copernicium Nihonium Flerovium Moscovium Livermorium ' +
      'Tennessine Oganesson').split(' ');
    /* Layout: La and Ac sit in group 3; Ce-Lu and Th-Lr form the two rows below, under groups 4-17. */
    function place(z) { /* -> { period, group (0 for f rows), row (1-7 main, 8-9 f rows), col (1-18), block } */
      var period, start;
      if (z <= 2) { period = 1; start = 1; }
      else { var st = [3, 11, 19, 37, 55, 87]; for (var i = st.length - 1; i >= 0; i--) if (z >= st[i]) { period = i + 2; start = st[i]; break; } }
      var o = z - start, group, row = period, col;
      if (period === 1) group = z === 1 ? 1 : 18;
      else if (period <= 3) group = o < 2 ? o + 1 : o + 11;
      else if (period <= 5) group = o + 1;
      else if (o <= 2) group = o + 1;                       /* Cs Ba La / Fr Ra Ac */
      else if (o <= 16) { group = 0; row = period + 2; col = o + 1; } /* Ce..Lu / Th..Lr -> columns 4..17 */
      else group = o - 13;                                   /* Hf.. / Rf.. -> groups 4..18 */
      if (group) col = group;
      var block = row > 7 ? 'f' : (group <= 2 || z === 2) ? 's' : group <= 12 ? 'd' : 'p';
      return { period: period, group: group, row: row, col: col, block: block };
    }
    var PITCH = 34, CELL = 30, M = 10, FGAP = 12;
    var W = M * 2 + 18 * PITCH - (PITCH - CELL), H = M * 2 + 9 * PITCH - (PITCH - CELL) + FGAP;
    var TINT = { s: '#4d3439', p: '#33414b', d: '#3b4538', f: '#463a51' };
    var LAYOUT = [], parts = {};
    for (var z = 1; z <= 118; z++) {
      var q = place(z);
      q.z = z; q.sym = SYM[z - 1]; q.name = NAME[z - 1];
      q.x = M + (q.col - 1) * PITCH; q.y = M + (q.row - 1) * PITCH + (q.row > 7 ? FGAP : 0);
      LAYOUT.push(q); parts[q.sym] = q.name + ' (' + q.sym + ')';
    }
    function cell(q, on) {
      if (on) return '<g filter="url(#' + gid(key) + ')"><rect x="' + q.x + '" y="' + q.y + '" width="' + CELL + '" height="' + CELL + '" rx="5" fill="' + K.hi + '" stroke="' + K.hiLine + '" stroke-width="2.5"/>' +
        '<rect x="' + (q.x - 4.5) + '" y="' + (q.y - 4.5) + '" width="' + (CELL + 9) + '" height="' + (CELL + 9) + '" rx="8" fill="none" stroke="' + K.hi + '" stroke-width="2.2"/></g>';
      return '<rect x="' + q.x + '" y="' + q.y + '" width="' + CELL + '" height="' + CELL + '" rx="5" fill="' + TINT[q.block] + '" stroke="' + K.line + '" stroke-width="1.5" stroke-opacity="0.45"/>';
    }
    DIAGRAMS.ptable = {
      name: 'Periodic table',
      vb: [0, 0, W, H],
      parts: parts,
      layout: LAYOUT,
      svg: function (part) {
        var s = '', hi = null;
        LAYOUT.forEach(function (q) { if (q.sym === part) hi = q; else s += cell(q, false); });
        if (hi) s += cell(hi, true);
        return frame(key, W, H, s);
      }
    };
  })();

  /* ---------- 4. functional groups (skeletal formulas) ---------- */
  (function () {
    var key = 'fg', W = 300, H = 200, L = 46;
    function step(p, a) { return [p[0] + L * Math.cos(rad(a)), p[1] + L * Math.sin(rad(a))]; }
    function chain(dirs, start) { var pts = [start || [0, 0]]; dirs.forEach(function (a) { pts.push(step(pts[pts.length - 1], a)); }); return pts; }
    /* molecule: atoms [[x, y, label]], bonds [[i, j, order, style]], hb: highlighted bond indices, ha: highlighted atom indices.
       style for order 2: 'c' centered, or +1 / -1 for an inner line offset to one side. */
    function M(atoms, bonds, hb, ha) { return { atoms: atoms, bonds: bonds, hb: hb, ha: ha }; }
    function lab(pts, labels) { return pts.map(function (p, i) { return [p[0], p[1], labels[i] || '']; }); }
    function lin(k) { var b = []; for (var i = 0; i < k; i++) b.push([i, i + 1, 1]); return b; }

    var MOL = {};
    (function () {
      var p, b;
      /* alkene: (E)-pent-2-ene */
      p = chain([-30, 30, -30, 30]); b = lin(4); b[1] = [1, 2, 2, 1];
      MOL.alkene = M(lab(p, []), b, [1], []);
      /* alkyne: pent-2-yne, C1-C2#C3-C4 collinear */
      p = chain([-30, -30, -30, 30]); b = lin(4); b[1] = [1, 2, 3];
      MOL.alkyne = M(lab(p, []), b, [1], []);
      /* arene: toluene */
      p = []; for (var k = 0; k < 6; k++) p.push([L * Math.cos(rad(-90 + 60 * k)), L * Math.sin(rad(-90 + 60 * k))]);
      p.push([0, -2 * L]);
      b = []; for (var j = 0; j < 6; j++) b.push([j, (j + 1) % 6, j % 2 === 0 ? 2 : 1, 'in']); b.push([0, 6, 1]);
      MOL.arene = M(lab(p, []), b, [0, 1, 2, 3, 4, 5], []);
      /* alkyl halide: 2-chlorobutane */
      p = chain([-30, 30, -30]); p.push(step(p[1], -90)); b = lin(3); b.push([1, 4, 1]);
      MOL['alkyl halide'] = M(lab(p, ['', '', '', '', 'Cl']), b, [3], [4]);
      /* alcohol: butan-1-ol */
      p = chain([-30, 30, -30, 30]);
      MOL.alcohol = M(lab(p, ['', '', '', '', 'OH']), lin(4), [3], [4]);
      /* ether: diethyl ether */
      p = chain([30, -30, 30, -30]);
      MOL.ether = M(lab(p, ['', '', 'O']), lin(4), [1, 2], [2]);
      /* thiol: propane-1-thiol */
      p = chain([30, -30, 30]);
      MOL.thiol = M(lab(p, ['', '', '', 'SH']), lin(3), [2], [3]);
      /* amine: butan-1-amine */
      p = chain([30, -30, 30, -30]);
      MOL.amine = M(lab(p, ['', '', '', '', 'NH2']), lin(4), [3], [4]);
      /* carbonyl scaffold: chain ending at a carbonyl carbon at a peak, C=O straight up, X down-right */
      function acyl(dirs, x, xl) {
        var q = chain(dirs), c = q.length - 1, o = step(q[c], -90), xx = step(q[c], 30), bb = lin(c);
        q.push(o, xx); bb.push([c, c + 1, 2, 'c'], [c, c + 2, 1]);
        return { p: q, b: bb, c: c, labels: (function () { var l = []; l[c + 1] = 'O'; l[c + 2] = xl; return l; })() };
      }
      var a;
      /* aldehyde: butanal (explicit aldehyde H) */
      a = acyl([-30, 30, -30], 'H', 'H');
      MOL.aldehyde = M(lab(a.p, a.labels), a.b, [a.c, a.c + 1], [a.c + 1, a.c + 2]);
      /* ketone: pentan-3-one */
      p = chain([30, -30, 30, -30], [0, 0]); p.push(step(p[2], -90)); b = lin(4); b.push([2, 5, 2, 'c']);
      MOL.ketone = M(lab(p, ['', '', '', '', '', 'O']), b, [4], [5]);
      /* carboxylic acid: butanoic acid */
      a = acyl([-30, 30, -30], 'X', 'OH');
      MOL['carboxylic acid'] = M(lab(a.p, a.labels), a.b, [a.c, a.c + 1], [a.c + 1, a.c + 2]);
      /* ester: ethyl acetate */
      p = chain([-30, 30, -30, 30]); p.push(step(p[1], -90)); b = lin(4); b.push([1, 5, 2, 'c']);
      MOL.ester = M(lab(p, ['', '', 'O', '', '', 'O']), b, [1, 2, 4], [2, 5]);
      /* amide: propanamide */
      a = acyl([30, -30], 'X', 'NH2');
      MOL.amide = M(lab(a.p, a.labels), a.b, [a.c, a.c + 1], [a.c + 1, a.c + 2]);
      /* acyl chloride: propanoyl chloride */
      a = acyl([30, -30], 'X', 'Cl');
      MOL['acyl chloride'] = M(lab(a.p, a.labels), a.b, [a.c, a.c + 1], [a.c + 1, a.c + 2]);
      /* acid anhydride: acetic anhydride */
      p = chain([-30, 30, -30, 30]); p.push(step(p[1], -90), step(p[3], -90)); b = lin(4); b.push([1, 5, 2, 'c'], [3, 6, 2, 'c']);
      MOL['acid anhydride'] = M(lab(p, ['', '', 'O', '', '', 'O', 'O']), b, [1, 2, 4, 5], [2, 5, 6]);
      /* nitrile: butanenitrile, C-C#N collinear */
      p = chain([-30, 30, -30, -30]); b = lin(4); b[3] = [3, 4, 3];
      MOL.nitrile = M(lab(p, ['', '', '', '', 'N']), b, [3], [4]);
      /* epoxide: 2-ethyloxirane */
      p = [[0, 0], [L, 0], [L / 2, -L * Math.sin(rad(60))]]; p.push(step(p[0], 150)); p.push(step(p[3], 210));
      MOL.epoxide = M(lab(p, ['', '', 'O']), [[0, 1, 1], [1, 2, 1], [2, 0, 1], [0, 3, 1], [3, 4, 1]], [0, 1, 2], [2]);
      /* imine: N-methylbutan-2-imine */
      p = chain([-30, 30, -30]); p.push(step(p[1], -90)); p.push(step(p[4], -30)); b = lin(3); b.push([1, 4, 2, 'c'], [4, 5, 1]);
      MOL.imine = M(lab(p, ['', '', '', '', 'N']), b, [3], [4]);
      /* phenol: OH on a benzene ring */
      p = []; for (var k2 = 0; k2 < 6; k2++) p.push([L * Math.cos(rad(-90 + 60 * k2)), L * Math.sin(rad(-90 + 60 * k2))]);
      p.push([0, -2 * L]);
      b = []; for (var j2 = 0; j2 < 6; j2++) b.push([j2, (j2 + 1) % 6, j2 % 2 === 0 ? 2 : 1, 'in']); b.push([0, 6, 1]);
      MOL.phenol = M(lab(p, ['', '', '', '', '', '', 'OH']), b, [6], [6]);
      /* sulfide: diethyl sulfide */
      p = chain([30, -30, 30, -30]);
      MOL.sulfide = M(lab(p, ['', '', 'S']), lin(4), [1, 2], [2]);
      /* disulfide: diethyl disulfide */
      p = chain([30, -30, 30, -30, 30]);
      MOL.disulfide = M(lab(p, ['', '', 'S', 'S']), lin(5), [1, 2, 3], [2, 3]);
      /* thioester: S-ethyl ethanethioate */
      p = chain([-30, 30, -30, 30]); p.push(step(p[1], -90)); b = lin(4); b.push([1, 5, 2, 'c']);
      MOL.thioester = M(lab(p, ['', '', 'S', '', '', 'O']), b, [1, 2, 4], [2, 5]);
      /* plain: hexane, nothing to highlight */
      MOL._plain = M(lab(chain([-30, 30, -30, 30, -30]), []), lin(5), [], []);
    })();

    var NAMES = {
      alkene: 'Alkene', alkyne: 'Alkyne', arene: 'Arene', 'alkyl halide': 'Alkyl halide', alcohol: 'Alcohol', ether: 'Ether',
      thiol: 'Thiol', amine: 'Amine', aldehyde: 'Aldehyde', ketone: 'Ketone', 'carboxylic acid': 'Carboxylic acid', ester: 'Ester',
      amide: 'Amide', 'acyl chloride': 'Acyl chloride', 'acid anhydride': 'Acid anhydride', nitrile: 'Nitrile', epoxide: 'Epoxide', imine: 'Imine',
      phenol: 'Phenol', sulfide: 'Sulfide', disulfide: 'Disulfide', thioester: 'Thioester'
    };
    var FONT = 'font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="600"';
    function trimFor(l) { return !l ? 0 : l === 'Cl' ? 12 : 10; }
    function text(x, y, t, size) { return '<text x="' + n(x) + '" y="' + n(y + size * 0.36) + '" text-anchor="middle" font-size="' + size + '" fill="' + K.text + '">' + t + '</text>'; }
    function label(x, y, l) {
      if (l === 'OH' || l === 'SH') return text(x, y, l[0], 18) + text(x + 13.5, y, 'H', 18);
      if (l === 'NH') return text(x, y, 'N', 18) + text(x + 14, y, 'H', 18);
      if (l === 'NH2') return text(x, y, 'N', 18) + text(x + 14, y, 'H', 18) + text(x + 23, y + 5, '2', 12);
      return text(x, y, l, 18);
    }
    function lineSeg(a, b, t0, t1, off, color, w) {
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
      var x0 = a[0] + ux * t0 - uy * off, y0 = a[1] + uy * t0 + ux * off, x1 = b[0] - ux * t1 - uy * off, y1 = b[1] - uy * t1 + ux * off;
      return '<line x1="' + n(x0) + '" y1="' + n(y0) + '" x2="' + n(x1) + '" y2="' + n(y1) + '" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round"/>';
    }
    function draw(m, on, dk, DW, DH) {
      dk = dk || key; DW = DW || W; DH = DH || H;
      var A = m.atoms, xs = [], ys = [];
      A.forEach(function (a) { xs.push(a[0]); ys.push(a[1]); if (a[2].length > 1) xs.push(a[0] + 26); });
      var minx = Math.min.apply(null, xs) - 10, maxx = Math.max.apply(null, xs) + 10, miny = Math.min.apply(null, ys) - 10, maxy = Math.max.apply(null, ys) + 10;
      var sc = Math.min(1, (DW - 8) / (maxx - minx), (DH - 8) / (maxy - miny));
      var dx = DW / 2 - sc * (minx + maxx) / 2, dy = DH / 2 - sc * (miny + maxy) / 2;
      var ctr = [0, 0]; A.forEach(function (a) { ctr[0] += a[0] / A.length; ctr[1] += a[1] / A.length; });
      var halo = '', hiB = '', plain = '', labels = '';
      m.bonds.forEach(function (bd, idx) {
        var a = A[bd[0]], b = A[bd[1]], t0 = trimFor(a[2]), t1 = trimFor(b[2]), isHi = on && m.hb.indexOf(idx) >= 0;
        var col = isHi ? K.hi : K.line, w = isHi ? 2.8 : 2, s = '';
        if (isHi) halo += lineSeg(a, b, t0 * 0.6, t1 * 0.6, 0, K.hi, 18).replace('/>', ' stroke-opacity="0.2"/>');
        if (bd[2] === 1) s += lineSeg(a, b, t0, t1, 0, col, w);
        else if (bd[2] === 3) s += lineSeg(a, b, t0, t1, 0, col, w) + lineSeg(a, b, t0, t1, 5.2, col, w) + lineSeg(a, b, t0, t1, -5.2, col, w);
        else if (bd[3] === 'c') s += lineSeg(a, b, t0, t1, 3.6, col, w) + lineSeg(a, b, t0, t1, -3.6, col, w);
        else {
          var side = bd[3];
          if (side === 'in') { /* offset toward the ring center */
            var mx = (a[0] + b[0]) / 2 - ctrRing[0], my = (a[1] + b[1]) / 2 - ctrRing[1], ux = b[0] - a[0], uy = b[1] - a[1];
            side = (-uy * mx + ux * my) > 0 ? -1 : 1;
          }
          s += lineSeg(a, b, t0, t1, 0, col, w) + lineSeg(a, b, Math.max(t0, 6), Math.max(t1, 6), 7.5 * side, col, w);
        }
        if (isHi) hiB += s; else plain += s;
      });
      A.forEach(function (a, i) {
        if (on && m.ha.indexOf(i) >= 0) halo += '<circle cx="' + n(a[0] + (a[2].length > 1 ? 6 : 0)) + '" cy="' + n(a[1]) + '" r="' + (a[2].length > 1 ? 16 : 13) + '" fill="' + K.hi + '" fill-opacity="0.3"/>';
        if (a[2]) labels += label(a[0], a[1], a[2]);
      });
      var tr = '<g transform="translate(' + n(dx) + ' ' + n(dy) + ')' + (sc < 1 ? ' scale(' + n(sc * 100) / 100 + ')' : '') + '"';
      return frame(dk, DW, DH, (halo ? '<g filter="url(#' + gid(dk) + ')">' + tr + '>' + halo + hiB + '</g></g>' : '') +
        tr + ' ' + FONT + '>' + plain + labels + '</g>', 1.8);
    }
    var ctrRing = [0, 0];
    DIAGRAMS.fg = {
      name: 'Functional groups',
      pick: true,
      cue: function () { return 'Name the highlighted functional group'; },
      vb: [0, 0, W, H],
      parts: NAMES,
      svg: function (part) {
        var m = MOL[part];
        if (!m) return draw(MOL._plain, false);
        ctrRing = [0, 0];
        return draw(m, true);
      }
    };

    /* ---------- functional groups in real molecules: one group highlighted at a time ---------- */
    function benz() {
      var r = []; for (var i = 0; i < 6; i++) r.push([L * Math.cos(rad(-90 + 60 * i)), L * Math.sin(rad(-90 + 60 * i))]);
      var bb = []; for (var j = 0; j < 6; j++) bb.push([j, (j + 1) % 6, j % 2 === 0 ? 2 : 1, 'in']);
      return { p: r, b: bb };
    }
    var RING = [0, 1, 2, 3, 4, 5];
    /* mol(atoms, labels, extra bonds, groups: { part: [bond indices, atom indices] }) */
    function mol(ring, extra, labels, bonds, groups) {
      var p = ring.p.concat(extra), b = ring.b.concat(bonds);
      var out = { base: M(lab(p, labels), b, [], []) };
      Object.keys(groups).forEach(function (g) { out[g] = M(lab(p, labels), b, groups[g][0], groups[g][1]); });
      return out;
    }
    var MM = {}, MOLNAME = {}, R, e = [];
    function add(name, title, x) { Object.keys(x).forEach(function (g) { if (g !== 'base') { MM[name + ':' + g] = x[g]; MOLNAME[name + ':' + g] = title; } }); }
    function lbl(k, map) { var l = []; for (var i = 0; i < k; i++) l.push(map[i] || ''); return l; }

    /* aspirin: COOH on C1 (top), acetyl ester O on C2 (upper right) */
    R = benz(); e = [];
    e[0] = step(R.p[0], -90); e[1] = step(e[0], -30); e[2] = step(e[0], -150);   /* 6 C, 7 =O, 8 OH */
    e[3] = step(R.p[1], -30); e[4] = step(e[3], 30); e[5] = step(e[4], 90); e[6] = step(e[4], -30); /* 9 O, 10 C, 11 =O, 12 CH3 */
    add('aspirin', 'aspirin', mol(R, e, lbl(13, { 7: 'O', 8: 'OH', 9: 'O', 11: 'O' }),
      [[0, 6, 1], [6, 7, 2, 'c'], [6, 8, 1], [1, 9, 1], [9, 10, 1], [10, 11, 2, 'c'], [10, 12, 1]],
      { 'carboxylic acid': [[7, 8], [7, 8]], ester: [[9, 10, 11], [9, 11]], arene: [RING, []] }));

    /* acetaminophen: OH on C1 (top), NHC(=O)CH3 on C4 (bottom) */
    R = benz(); e = [];
    e[0] = step(R.p[0], -90); e[1] = step(R.p[3], 90); e[2] = step(e[1], 30); e[3] = step(e[2], -30); e[4] = step(e[2], 90); /* 6 OH, 7 NH, 8 C, 9 =O, 10 CH3 */
    add('acetaminophen', 'acetaminophen', mol(R, e, lbl(11, { 6: 'OH', 7: 'NH', 9: 'O' }),
      [[0, 6, 1], [3, 7, 1], [7, 8, 1], [8, 9, 2, 'c'], [8, 10, 1]],
      { phenol: [[6], [6]], amide: [[8, 9], [7, 9]] }));

    /* vanillin: CHO on C1 (top), OCH3 on C3 (lower right), OH on C4 (bottom) */
    R = benz(); e = [];
    e[0] = step(R.p[0], -90); e[1] = step(e[0], -30); e[2] = step(e[0], -150);   /* 6 C, 7 =O, 8 H */
    e[3] = step(R.p[2], 30); e[4] = step(e[3], -30); e[5] = step(R.p[3], 90);    /* 9 O, 10 CH3, 11 OH */
    add('vanillin', 'vanillin', mol(R, e, lbl(12, { 7: 'O', 8: 'H', 9: 'O', 11: 'OH' }),
      [[0, 6, 1], [6, 7, 2, 'c'], [6, 8, 1], [2, 9, 1], [9, 10, 1], [3, 11, 1]],
      { aldehyde: [[7, 8], [7, 8]], ether: [[9, 10], [9]], phenol: [[11], [11]] }));

    /* cinnamaldehyde: ring-CH=CH-CHO from C2 (upper right) */
    R = benz(); e = [];
    e[0] = step(R.p[1], -30); e[1] = step(e[0], 30); e[2] = step(e[1], -30); e[3] = step(e[2], 30); e[4] = step(e[2], -90); /* 6, 7, 8 C, 9 =O, 10 H */
    add('cinnamaldehyde', 'cinnamaldehyde', mol(R, e, lbl(11, { 9: 'O', 10: 'H' }),
      [[1, 6, 1], [6, 7, 2, 1], [7, 8, 1], [8, 9, 2, 'c'], [8, 10, 1]],
      { alkene: [[7], []], aldehyde: [[9, 10], [9, 10]] }));

    /* benzocaine: ethyl ester on C1 (top), NH2 on C4 (bottom) */
    R = benz(); e = [];
    e[0] = step(R.p[0], -90); e[1] = step(e[0], -150); e[2] = step(e[0], -30); e[3] = step(e[2], 30); e[4] = step(e[3], -30); e[5] = step(R.p[3], 90);
    /* 6 C, 7 =O, 8 O, 9 CH2, 10 CH3, 11 NH2 */
    add('benzocaine', 'benzocaine', mol(R, e, lbl(12, { 7: 'O', 8: 'O', 11: 'NH2' }),
      [[0, 6, 1], [6, 7, 2, 'c'], [6, 8, 1], [8, 9, 1], [9, 10, 1], [3, 11, 1]],
      { ester: [[7, 8, 9], [7, 8]], amine: [[11], [11]] }));

    /* raspberry ketone: 4-(4-hydroxyphenyl)butan-2-one */
    R = benz(); e = [];
    e[0] = step(R.p[1], -30); e[1] = step(e[0], 30); e[2] = step(e[1], -30); e[3] = step(e[2], -90); e[4] = step(e[2], 30); e[5] = step(R.p[4], 150);
    /* 6 CH2, 7 CH2, 8 C, 9 =O, 10 CH3, 11 OH */
    add('raspberry ketone', 'raspberry ketone', mol(R, e, lbl(12, { 9: 'O', 11: 'OH' }),
      [[1, 6, 1], [6, 7, 1], [7, 8, 1], [8, 9, 2, 'c'], [8, 10, 1], [4, 11, 1]],
      { ketone: [[9], [9]], phenol: [[11], [11]] }));

    /* alanine (neutral form): CH3-CH(NH2)-COOH */
    R = { p: [], b: [] }; e = [[0, 0]];
    e[1] = step(e[0], -30); e[2] = step(e[1], -90); e[3] = step(e[1], 30); e[4] = step(e[3], 90); e[5] = step(e[3], -30);
    /* 0 CH3, 1 C, 2 NH2, 3 C, 4 =O, 5 OH */
    add('alanine', 'alanine', mol(R, e, lbl(6, { 2: 'NH2', 4: 'O', 5: 'OH' }),
      [[0, 1, 1], [1, 2, 1], [1, 3, 1], [3, 4, 2, 'c'], [3, 5, 1]],
      { amine: [[1], [2]], 'carboxylic acid': [[3, 4], [4, 5]] }));

    var MW = 340, MH = 240;
    var GNAME = {}; Object.keys(MM).forEach(function (k) { GNAME[k] = NAMES[k.split(':')[1]] || 'Alkene'; });
    DIAGRAMS.fgm = {
      name: 'Groups in real molecules',
      vb: [0, 0, MW, MH],
      parts: GNAME,
      cue: function (part) { return MOLNAME[part] ? 'Name the highlighted group in ' + MOLNAME[part] : ''; },
      svg: function (part) {
        var m = MM[part] || MM['aspirin:arene'];
        ctrRing = [0, 0];
        return draw(m, !!MM[part], 'fgm', MW, MH);
      }
    };
  })();
})();
