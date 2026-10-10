// Anatomy diagrams for diagram units: heart, neuron, brain, nephron, eye, lungs.
// Each entry: { name, vb, parts: { id: 'Display name' }, svg(part) } where svg(part)
// returns standalone SVG markup with that one part highlighted (null highlights nothing).
// Orientation follows OpenStax Anatomy and Physiology 2e figures. No text in the art.
var DIAGRAMS = (typeof DIAGRAMS !== 'undefined' && DIAGRAMS) || {};

(function () {
  var ST = '#b9aaa6', HF = '#d5b66f', HS = '#fff3cf';
  var F1 = '#3a2c32', F2 = '#2e2328', F3 = '#4a3840', RED = '#6b3a44', BLUE = '#3a4766';

  function n1(v) { return Math.round(v * 10) / 10; }
  function pt(p) { return n1(p[0]) + ' ' + n1(p[1]); }

  // Catmull-Rom spline through points, as cubic Bezier path data.
  function smooth(ps, closed) {
    var n = ps.length, d = 'M' + pt(ps[0]);
    var get = function (i) { return closed ? ps[(i + n) % n] : ps[Math.max(0, Math.min(n - 1, i))]; };
    var last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += 'C' + pt(c1) + ' ' + pt(c2) + ' ' + pt(p2);
    }
    return d + (closed ? 'Z' : '');
  }

  // Tapered branch polygon from a to b, widths wa and wb, with a rounded tip.
  function taper(a, b, wa, wb) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / L, ny = dx / L;
    return 'M' + pt([a[0] + nx * wa / 2, a[1] + ny * wa / 2]) + 'L' + pt([b[0] + nx * wb / 2, b[1] + ny * wb / 2]) +
      'A' + n1(wb / 2) + ' ' + n1(wb / 2) + ' 0 0 1 ' + pt([b[0] - nx * wb / 2, b[1] - ny * wb / 2]) +
      'L' + pt([a[0] - nx * wa / 2, a[1] - ny * wa / 2]) + 'Z';
  }

  function circ(cx, cy, r) {
    return 'M' + n1(cx - r) + ' ' + n1(cy) + 'a' + n1(r) + ' ' + n1(r) + ' 0 1 0 ' + n1(2 * r) + ' 0a' + n1(r) + ' ' + n1(r) + ' 0 1 0 ' + n1(-2 * r) + ' 0Z';
  }

  // Drawing context for one render of one diagram.
  function Ctx(key, vb, part) {
    var out = [], fid = 'gzA-' + key + '-glow', on = function (id) { return !!id && id === part; };
    var glow = ' filter="url(#' + fid + ')"';
    var c = {
      on: on,
      raw: function (s) { out.push(s); },
      // Simple filled path.
      p: function (id, d, fill, sw, extra) {
        extra = extra || '';
        if (on(id)) out.push('<path d="' + d + '" fill="' + HF + '" stroke="' + HS + '" stroke-width="2.5" stroke-linejoin="round"' + glow + extra + '/>');
        else out.push('<path d="' + d + '" fill="' + fill + '" stroke="' + ST + '" stroke-width="' + (sw || 1.6) + '" stroke-linejoin="round"' + extra + '/>');
      },
      // Several overlapping shapes drawn as one outlined silhouette.
      u: function (id, ds, fill, sw) {
        sw = sw || 1.6;
        var a = '', b = '', i;
        if (on(id)) {
          for (i = 0; i < ds.length; i++) { a += '<path d="' + ds[i] + '" fill="' + HS + '" stroke="' + HS + '" stroke-width="5" stroke-linejoin="round"/>'; b += '<path d="' + ds[i] + '" fill="' + HF + '"/>'; }
          out.push('<g' + glow + '>' + a + b + '</g>');
        } else {
          for (i = 0; i < ds.length; i++) { a += '<path d="' + ds[i] + '" fill="' + ST + '" stroke="' + ST + '" stroke-width="' + 2 * sw + '" stroke-linejoin="round"/>'; b += '<path d="' + ds[i] + '" fill="' + fill + '"/>'; }
          out.push(a + b);
        }
      },
      // Tube along a centerline (one or more path data strings) of width w.
      tube: function (id, ds, w, fill, sw, cap) {
        if (typeof ds === 'string') ds = [ds];
        sw = sw || 1.6; cap = cap || 'round';
        var a = '', b = '', i, base = ' fill="none" stroke-linecap="' + cap + '" stroke-linejoin="round"';
        if (on(id)) {
          for (i = 0; i < ds.length; i++) { a += '<path d="' + ds[i] + '"' + base + ' stroke="' + HS + '" stroke-width="' + (w + 5) + '"/>'; b += '<path d="' + ds[i] + '"' + base + ' stroke="' + HF + '" stroke-width="' + w + '"/>'; }
          out.push('<g' + glow + '>' + a + b + '</g>');
        } else {
          for (i = 0; i < ds.length; i++) { a += '<path d="' + ds[i] + '"' + base + ' stroke="' + ST + '" stroke-width="' + (w + 2 * sw) + '"/>'; b += '<path d="' + ds[i] + '"' + base + ' stroke="' + fill + '" stroke-width="' + w + '"/>'; }
          out.push(a + b);
        }
      },
      // Decorative stroke.
      line: function (d, w, op, col) {
        out.push('<path d="' + d + '" fill="none" stroke="' + (col || ST) + '" stroke-width="' + (w || 1.2) + '" stroke-linecap="round" stroke-linejoin="round"' + (op != null ? ' stroke-opacity="' + op + '"' : '') + '/>');
      },
      // A groove or fissure that is itself a part (drawn as a stroke).
      groove: function (id, d, w) {
        if (on(id)) out.push('<g' + glow + '><path d="' + d + '" fill="none" stroke="' + HF + '" stroke-width="' + (w + 7) + '" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="' + HS + '" stroke-width="' + Math.max(2.5, w) + '" stroke-linecap="round" stroke-linejoin="round"/></g>');
        else out.push('<path d="' + d + '" fill="none" stroke="' + ST + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>');
      },
      // Gold ring that calls out a small or thin highlighted part.
      ring: function (id, cx, cy, r) {
        if (!on(id)) return;
        out.push('<g fill="none"' + glow + '><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke="' + HF + '" stroke-width="3"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r + 6) + '" stroke="' + HF + '" stroke-width="1.2" stroke-opacity="0.55"/></g>');
      },
      svg: function (defs) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(' ') + '" width="' + vb[2] + '" height="' + vb[3] + '">' +
          '<defs><filter id="' + fid + '" filterUnits="userSpaceOnUse" x="' + vb[0] + '" y="' + vb[1] + '" width="' + vb[2] + '" height="' + vb[3] + '" color-interpolation-filters="sRGB">' +
          '<feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="b"/><feFlood flood-color="' + HF + '" flood-opacity="0.9"/><feComposite in2="b" operator="in" result="g"/>' +
          '<feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' + (defs || '') + '</defs>' +
          out.join('') + '</svg>';
      }
    };
    return c;
  }

  // AV valve flap hanging from edge (x0,y0)-(x1,y1) toward normal (nx,ny).
  function flap(x0, y0, x1, y1, nx, ny, d, skew) {
    skew = skew || 0;
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2, tx = mx + nx * d + skew * (x1 - x0), ty = my + ny * d + skew * (y1 - y0);
    return 'M' + pt([x0, y0]) + 'Q' + pt([x0 + nx * d * 0.7, y0 + ny * d * 0.7]) + ' ' + pt([tx, ty]) +
      'Q' + pt([x1 + nx * d * 0.7, y1 + ny * d * 0.7]) + ' ' + pt([x1, y1]) + 'Z';
  }
  // Semilunar cusp pocket across (x0,y0)-(x1,y1), bulging toward (nx,ny).
  function pocket(x0, y0, x1, y1, nx, ny, d) {
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return 'M' + pt([x0, y0]) + 'Q' + pt([mx + nx * d * 2, my + ny * d * 2]) + ' ' + pt([x1, y1]) +
      'Q' + pt([mx + nx * d * 0.5, my + ny * d * 0.5]) + ' ' + pt([x0, y0]) + 'Z';
  }
  function cusps(x0, y0, x1, y1, nx, ny, d, k) {
    var r = [];
    for (var i = 0; i < k; i++) {
      var a = i / k, b = (i + 1) / k;
      r.push(pocket(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b, nx, ny, d));
    }
    return r;
  }

  // ---------------------------------------------------------------- heart
  DIAGRAMS.heart = {
    name: 'Heart (anterior view)',
    vb: [0, 0, 400, 400],
    parts: {
      ra: 'Right atrium', rv: 'Right ventricle', la: 'Left atrium', lv: 'Left ventricle',
      aorta: 'Aorta (arch)', pt: 'Pulmonary trunk', svc: 'Superior vena cava', ivc: 'Inferior vena cava',
      pvn: 'Pulmonary veins', tv: 'Tricuspid valve', mv: 'Mitral valve', av: 'Aortic valve', pvl: 'Pulmonary valve',
      ivs: 'Interventricular septum'
    },
    svg: function (part) {
      var c = Ctx('heart', this.vb, part);
      var RCH = '#323d58', LCH = '#5a3440', MYO = F3;
      // Right pulmonary artery, passing behind the ascending aorta and the SVC.
      c.tube(null, smooth([[246, 134], [200, 140], [150, 146], [70, 150]]), 16, BLUE);
      // Right pulmonary veins emerge from behind the right atrium.
      c.tube('pvn', ['M58 176L112 180', 'M58 200L112 202'], 12, RED, 1.6, 'butt');
      // Myocardium (outer heart wall).
      c.p(null, 'M100 175C90 215 92 262 108 290C132 322 178 352 230 364C246 369 256 375 266 375C294 360 324 322 338 272C345 244 344 222 338 205L268 210L264 203L236 200L216 193L186 197L176 172C160 162 120 162 100 175Z', MYO, 1.8);
      // Aorta: brachiocephalic trunk, left common carotid and left subclavian arteries, then the arch.
      c.tube('aorta', ['M241 72L235 16', 'M274 60L274 12', 'M307 66L318 18'], 11, RED, 1.6, 'butt');
      c.p('aorta', 'M236 201C230 170 226 140 226 104C226 52 322 42 332 96L332 178L304 178L304 104C302 78 258 76 256 112C256 140 258 172 264 203Z', RED, 1.8);
      // Venae cavae.
      c.p('svc', 'M112 194L112 40A17 6 0 0 1 146 40L146 194Z', BLUE, 1.8);
      c.p('ivc', 'M110 262L110 346A15 5 0 0 0 140 346L140 262Z', BLUE, 1.8);
      // Left pulmonary artery passes in front of the descending aorta.
      c.tube(null, smooth([[248, 130], [290, 114], [352, 108]]), 17, BLUE, 1.6, 'butt');
      // Pulmonary trunk.
      c.p('pt', 'M188 199C184 172 194 148 216 134C232 124 252 118 268 124C274 138 264 150 250 156C232 164 220 178 216 195Z', BLUE, 1.8);
      // Left pulmonary veins enter the left atrium.
      c.tube('pvn', ['M326 166L382 156', 'M326 190L382 186'], 12, RED, 1.6, 'butt');
      // Chambers.
      c.p('ra', 'M108 184C102 216 104 250 108 268C112 282 126 288 140 274L174 252C178 228 176 200 166 180C150 170 122 170 108 184Z', RCH, 1.6);
      c.p('la', 'M270 207C266 186 270 160 290 150C310 143 330 152 335 172C338 190 332 202 322 207Z', LCH, 1.6);
      c.p('rv', 'M141 279L178 259C182 236 184 214 188 199L216 195C218 226 224 262 238 300C244 318 247 334 244 346C212 346 172 326 150 304C143 296 140 288 141 279Z', RCH, 1.6);
      c.p('lv', 'M240 214L322 214C326 244 318 288 298 320C284 340 268 350 256 350C256 334 255 318 250 300C242 274 238 244 238 214Z', LCH, 1.6);
      // Papillary muscles and chordae tendineae.
      c.p(null, 'M190 330C186 316 190 302 197 300C204 302 207 316 204 332Z', MYO, 1.2);
      c.p(null, 'M276 318C272 300 276 288 283 286C290 288 293 300 290 318Z', MYO, 1.2);
      c.p(null, 'M300 304C298 290 302 280 309 279C315 282 316 292 312 306Z', MYO, 1.2);
      c.line('M156 284L196 302M168 278L197 301M178 270L198 301', 1, 0.75);
      c.line('M287 238L283 288M290 240L284 288M309 233L309 281M312 232L310 281', 1, 0.75);
      // Interventricular septum.
      c.p('ivs', 'M216 194L236 198C238 232 246 268 256 302C262 322 264 340 260 358L246 352C247 336 245 320 240 302C226 264 220 228 216 194Z', MYO, 1.6);
      // Valves.
      var tvn = [0.48, 0.88];
      c.u('tv', [flap(137, 275, 150, 268, tvn[0], tvn[1], 15), flap(150, 268, 163, 260, tvn[0], tvn[1], 19), flap(163, 260, 176, 253, tvn[0], tvn[1], 15)], '#8a7a78', 1.2);
      c.ring('tv', 158, 272, 24);
      c.u('mv', [flap(272, 211, 296, 211, -0.1, 1, 28, 0.08), flap(296, 211, 320, 211, 0, 1, 22, -0.05)], '#8a7a78', 1.2);
      c.ring('mv', 296, 224, 28);
      c.u('av', cusps(237, 202, 265, 204, 0, 1, 5.5, 3), '#8a7a78', 1.1);
      c.ring('av', 251, 206, 21);
      c.u('pvl', cusps(187, 198, 217, 194, 0.12, 1, 5.5, 3), '#8a7a78', 1.1);
      c.ring('pvl', 202, 199, 21);
      return c.svg();
    }
  };

  // ---------------------------------------------------------------- neuron
  DIAGRAMS.neuron = {
    name: 'Multipolar motor neuron',
    vb: [0, 0, 400, 400],
    parts: {
      dend: 'Dendrites', soma: 'Cell body', nuc: 'Nucleus', hill: 'Axon hillock', axon: 'Axon',
      myelin: 'Myelin sheath', node: 'Node of Ranvier', term: 'Axon terminals'
    },
    svg: function (part) {
      var c = Ctx('neuron', this.vb, part);
      var cx = 106, cy = 200, rad = Math.PI / 180;
      // Dendrites: trunk, branches, twigs, from fixed angles (degrees, 0 = right, y up).
      var trees = [[50, 56, 1], [90, 64, -1], [130, 44, 1], [166, 30, -1], [196, 30, 1], [232, 44, -1], [270, 64, 1], [310, 56, -1]];
      var ds = [];
      var grow = function (x, y, ang, len, w0, w1, depth, flip) {
        var x2 = x + Math.cos(ang * rad) * len, y2 = y - Math.sin(ang * rad) * len;
        ds.push(taper([x, y], [x2, y2], w0, w1));
        if (depth <= 0) return;
        var sp = depth === 2 ? 26 : 30;
        grow(x2, y2, ang + sp * flip, len * 0.66, w1, w1 * 0.55, depth - 1, -flip);
        grow(x2, y2, ang - sp * 0.8 * flip, len * 0.6, w1 * 0.9, w1 * 0.5, depth - 1, flip);
      };
      trees.forEach(function (t) {
        var a = t[0], sx = cx + Math.cos(a * rad) * 28, sy = cy - Math.sin(a * rad) * 28;
        grow(sx, sy, a, t[1], 16, 7, 2, t[2]);
      });
      c.u('dend', ds, F1, 1.5);
      // Cell body.
      var sp = [];
      for (var i = 0; i < 16; i++) {
        var a = i * 360 / 16, r = 42 + (i % 2 ? -3 : 2);
        sp.push([cx + Math.cos(a * rad) * r, cy - Math.sin(a * rad) * r * 0.94]);
      }
      c.p('soma', smooth(sp, true), F1, 1.8);
      // Nucleus with nucleolus.
      c.p('nuc', circ(cx - 3, cy + 1, 17), F3, 1.6);
      if (!c.on('nuc')) c.p(null, circ(cx + 1, cy - 3, 4.5), F2, 1);
      // Axon, wrapped by the myelin sheath (Schwann cells) with gaps at the nodes of Ranvier.
      var segs = [[178, 211], [218, 251], [258, 291], [298, 331]];
      var axonD = 'M160 194.5L348 194.5L348 205.5L160 205.5Z';
      var drawAxon = function () { c.p('axon', axonD, F2, 1.5); };
      if (!c.on('axon')) drawAxon();
      c.u('myelin', segs.map(function (s) { return 'M' + (s[0] + 9) + ' 184H' + (s[1] - 9) + 'A9 16 0 0 1 ' + (s[1] - 9) + ' 216H' + (s[0] + 9) + 'A9 16 0 0 1 ' + (s[0] + 9) + ' 184Z'; }), '#55444b', 1.5);
      if (!c.on('myelin')) segs.forEach(function (s) { c.p(null, 'M' + ((s[0] + s[1]) / 2 - 7) + ' 188.5a7 3 0 1 0 14 0a7 3 0 1 0 -14 0Z', F2, 0.8); });
      if (c.on('axon')) drawAxon();
      // Node of Ranvier: the exposed axon between the second and third myelin segments.
      if (c.on('node')) { c.p('node', 'M251.5 191H257.5V209H251.5Z', F2); c.ring('node', 254.5, 200, 19); }
      // Axon terminals (telodendria) with synaptic end bulbs.
      var tb = [[[346, 200], [366, 180], 9, 6], [[366, 180], [384, 150], 6, 3.5], [[366, 180], [390, 184], 6, 3.5],
        [[346, 200], [366, 222], 9, 6], [[366, 222], [390, 218], 6, 3.5], [[366, 222], [382, 252], 6, 3.5]];
      var td = tb.map(function (b) { return taper(b[0], b[1], b[2], b[3]); });
      [[384, 150], [390, 184], [390, 218], [382, 252]].forEach(function (p) { td.push(circ(p[0], p[1], 7)); });
      c.u('term', td, F1, 1.5);
      // Axon hillock: the cone where the axon leaves the cell body.
      var hd = 'M132 181C146 187 154 193 164 194.5L164 205.5C154 207 146 213 132 219Z';
      if (c.on('hill')) { c.p('hill', hd, F1); c.ring('hill', 150, 200, 25); }
      else { c.p(null, hd, F1, 0, ' stroke-opacity="0"'); c.line('M140 184C150 189 156 193.5 164 194.5M140 216C150 211 156 206.5 164 205.5', 1.5); }
      return c.svg();
    }
  };

  // ---------------------------------------------------------------- brain
  DIAGRAMS.brain = {
    name: 'Brain (left lateral view)',
    vb: [0, 0, 400, 400],
    parts: {
      fl: 'Frontal lobe', pl: 'Parietal lobe', tl: 'Temporal lobe', ol: 'Occipital lobe',
      cb: 'Cerebellum', bs: 'Brainstem', cs: 'Central sulcus', ls: 'Lateral sulcus'
    },
    svg: function (part) {
      var c = Ctx('brain', this.vb, part), clip = 'gzA-brain-clip', cclip = 'gzA-brain-cbclip';
      var outline = 'M42 200C30 140 70 75 140 58C200 42 270 48 315 80C350 105 362 160 352 210C346 240 330 262 300 268C285 272 272 277 262 283C235 297 180 299 145 289C120 282 104 268 104 252C104 240 111 232 117 229C100 233 80 237 62 232C48 227 42 214 42 200Z';
      var cbD = 'M250 268C262 246 300 240 334 250C358 258 366 282 356 302C344 322 312 330 284 326C262 322 248 306 246 290C245 282 246 274 250 268Z';
      var LS = [[116, 229], [135, 226], [155, 222], [174, 217], [195, 211], [218, 204], [240, 196]];
      var CS = [[215, 50], [209, 70], [201, 98], [193, 124], [186, 150], [180, 178], [175, 206]];
      var poly = function (ps) { return 'M' + ps.map(pt).join('L') + 'Z'; };
      var rev = function (a) { return a.slice().reverse(); };
      var lsA = LS.filter(function (p) { return p[0] <= 174; }), lsB = LS.filter(function (p) { return p[0] >= 174; });
      var occTop = [304, 40], occMid = [289, 232], occBot = [284, 290];
      var lobes = {
        fl: poly([[0, 0], [216, 0]].concat(CS, [[175, 217]], rev(lsA), [[112, 233], [0, 238]])),
        pl: poly([[216, 0], [304, 0], occTop, occMid, [240, 196]].concat(rev(lsB).slice(1), [[175, 206]], rev(CS))),
        tl: poly([[0, 238], [112, 233]].concat(LS, [occMid, occBot, [284, 400], [0, 400]])),
        ol: poly([[304, 0], [400, 0], [400, 400], [284, 400], occBot, occMid, occTop])
      };
      c.raw('<clipPath id="' + clip + '"><path d="' + outline + '"/></clipPath><clipPath id="' + cclip + '"><path d="' + cbD + '"/></clipPath>');
      // Brainstem: midbrain hidden, pons bulging anteriorly, medulla tapering down.
      c.p('bs', 'M222 262C210 280 208 300 216 318C222 334 226 352 228 384L250 384C250 356 252 334 258 316C262 296 258 276 250 262Z', F1, 1.8);
      if (!c.on('bs')) c.line('M216 318C228 324 246 324 258 316', 1.1, 0.5);
      // Cerebellum with folia.
      c.p('cb', cbD, '#4a3840', 1.8);
      var fol = '';
      for (var k = 0; k < 7; k++) { var y = 256 + k * 10; fol += 'M240 ' + (y + 8) + 'C280 ' + (y - 6) + ' 330 ' + (y - 8) + ' 368 ' + (y + 6); }
      c.raw('<g clip-path="url(#' + cclip + ')">');
      c.line(fol, 1.1, c.on('cb') ? 0.7 : 0.45, c.on('cb') ? '#7a5f2f' : ST);
      c.raw('</g>');
      // Cerebral lobes, clipped to the hemisphere outline.
      var lobeFill = { fl: '#4a3840', pl: '#3a2c32', tl: '#43333a', ol: '#35282e' };
      ['fl', 'pl', 'tl', 'ol'].forEach(function (id) {
        if (c.on(id)) {
          c.raw('<g filter="url(#gzA-brain-glow)"><g clip-path="url(#' + clip + ')"><path d="' + lobes[id] + '" fill="' + HF + '" stroke="' + HS + '" stroke-width="3"/></g></g>');
        } else {
          c.raw('<g clip-path="url(#' + clip + ')"><path d="' + lobes[id] + '" fill="' + lobeFill[id] + '" stroke="' + ST + '" stroke-width="0.8" stroke-opacity="0.5"/></g>');
        }
      });
      // Gyri texture (minor sulci), faint.
      var gy = [
        smooth([[196, 44], [189, 74], [181, 102], [172, 130], [165, 160], [160, 196]]),
        smooth([[238, 48], [230, 78], [222, 104], [214, 130], [209, 160], [208, 190]]),
        smooth([[66, 112], [100, 104], [140, 100], [176, 102]]),
        smooth([[52, 160], [90, 152], [128, 152], [168, 152]]),
        smooth([[64, 206], [92, 196], [118, 200], [140, 192]]),
        smooth([[226, 140], [254, 128], [280, 120], [300, 96]]),
        smooth([[136, 262], [170, 252], [210, 244], [250, 232], [278, 226]]),
        smooth([[164, 284], [200, 276], [236, 270], [270, 264]]),
        smooth([[312, 120], [322, 150], [328, 180]]),
        smooth([[300, 196], [318, 218], [338, 228]]),
        smooth([[250, 216], [262, 206], [272, 196], [290, 190]]),
        smooth([[92, 130], [118, 138], [146, 128]]),
        smooth([[78, 186], [104, 176], [132, 180], [150, 172]]),
        smooth([[246, 98], [268, 90], [292, 78]]),
        smooth([[318, 252], [334, 236], [346, 212]]),
        smooth([[200, 268], [226, 262], [248, 252]])
      ];
      c.raw('<g clip-path="url(#' + clip + ')">');
      c.line(gy.join(''), 1.2, 0.35);
      c.raw('</g>');
      // Hemisphere outline.
      c.raw('<path d="' + outline + '" fill="none" stroke="' + ST + '" stroke-width="2"/>');
      // Named sulci.
      c.groove('cs', smooth(CS), 2.4);
      c.groove('ls', smooth(LS.concat([[250, 188], [257, 176]])), 2.6);
      return c.svg();
    }
  };

  // ---------------------------------------------------------------- nephron
  DIAGRAMS.nephron = {
    name: 'Nephron',
    vb: [0, 0, 400, 400],
    parts: {
      glom: 'Glomerulus', caps: "Glomerular (Bowman's) capsule", pct: 'Proximal convoluted tubule',
      dlh: 'Descending limb of the loop of Henle', alh: 'Ascending limb of the loop of Henle',
      dct: 'Distal convoluted tubule', cd: 'Collecting duct', aff: 'Afferent arteriole', eff: 'Efferent arteriole'
    },
    svg: function (part) {
      var c = Ctx('nephron', this.vb, part);
      var gx = 100, gy = 132, rad = Math.PI / 180;
      var P = function (r, a) { return [gx + r * Math.cos(a * rad), gy - r * Math.sin(a * rad)]; };
      // Collecting duct, receiving the distal convoluted tubule.
      // A connecting tubule from a neighboring nephron also drains into the duct.
      c.tube(null, smooth([[400, 150], [384, 158], [368, 172], [356, 182]]), 10, '#43363e', 1.4, 'butt');
      c.tube('cd', 'M352 14L352 392', 22, '#3a3440', 1.7, 'butt');
      // Distal convoluted tubule: rises from the loop, touches the vascular pole, then joins the duct.
      c.tube('dct', smooth([[232, 214], [236, 186], [262, 168], [272, 140], [244, 124], [206, 132], [178, 120], [158, 98], [138, 84],
        [146, 62], [178, 50], [214, 60], [252, 74], [290, 70], [320, 64], [343, 64]]), 12, '#43363e', 1.6, 'butt');
      // Proximal convoluted tubule: leaves the urinary pole and coils below the corpuscle.
      var pu = P(44, -72);
      c.tube('pct', smooth([pu, [pu[0] + 2, 194], [92, 200], [66, 212], [70, 238], [102, 242], [128, 222], [152, 202], [174, 214], [184, 238], [192, 258]]), 15, '#4a3840', 1.6, 'butt');
      // Loop of Henle.
      c.tube('dlh', smooth([[192, 256], [194, 300], [196, 348], [202, 370], [214, 377]]), 8, '#3a2c32', 1.5, 'butt');
      c.tube('alh', smooth([[213, 377], [225, 368], [229, 330], [230, 270], [232, 214]]), 12, '#35282e', 1.6, 'butt');
      // Afferent arteriole (wider) enters the vascular pole; efferent arteriole (narrower) leaves it.
      c.tube('eff', smooth([[92, 104], [80, 80], [56, 64], [24, 56], [2, 56]]), 9, RED, 1.5, 'butt');
      c.tube('aff', smooth([[108, 104], [116, 76], [124, 42], [128, 2]]), 14, RED, 1.6, 'butt');
      // Glomerular capsule: double-walled cup open at the vascular pole.
      var a1 = 118, a2 = 62, Ro = 44, Ri = 36;
      var capD = 'M' + pt(P(Ro, a1)) + 'A' + Ro + ' ' + Ro + ' 0 1 0 ' + pt(P(Ro, a2)) + 'L' + pt(P(Ri, a2)) + 'A' + Ri + ' ' + Ri + ' 0 1 1 ' + pt(P(Ri, a1)) + 'Z';
      c.p(null, circ(gx, gy, Ri), '#241c20', 0, ' stroke-opacity="0"');
      c.p('caps', capD, '#55444b', 1.6);
      // Glomerulus: tuft of capillary loops.
      var lobes = [[0, 0, 15], [-13, -8, 11], [12, -10, 11], [-15, 9, 11], [14, 10, 11], [0, 17, 11], [0, -17, 9]];
      c.u('glom', lobes.map(function (l) { return circ(gx + l[0], gy + l[1], l[2]); }), '#5e3440', 1.4);
      if (!c.on('glom')) c.line('M88 128c4-8 10-8 12 0s8 8 12 0M86 142c5 6 10 6 14 0s9-6 14 0M94 116c3 4 8 4 12 0', 1, 0.55);
      return c.svg();
    }
  };

  // ---------------------------------------------------------------- eye
  DIAGRAMS.eye = {
    name: 'Eye (sagittal section)',
    vb: [0, 0, 400, 400],
    parts: {
      cornea: 'Cornea', iris: 'Iris', pupil: 'Pupil', lens: 'Lens', cil: 'Ciliary body', sclera: 'Sclera',
      chor: 'Choroid', ret: 'Retina', fov: 'Fovea', on: 'Optic nerve', vit: 'Vitreous humor', ac: 'Anterior chamber (aqueous humor)'
    },
    svg: function (part) {
      var c = Ctx('eye', this.vb, part);
      var ex = 215, ey = 200, rad = Math.PI / 180;
      var P = function (r, a) { return [ex + r * Math.cos(a * rad), ey - r * Math.sin(a * rad)]; };
      var band = function (r1, r2, a1, a2) {
        var big = (a1 - a2) > 180 ? 1 : 0;
        return 'M' + pt(P(r2, a1)) + 'A' + r2 + ' ' + r2 + ' 0 ' + big + ' 1 ' + pt(P(r2, a2)) + 'L' + pt(P(r1, a2)) + 'A' + r1 + ' ' + r1 + ' 0 ' + big + ' 0 ' + pt(P(r1, a1)) + 'Z';
      };
      var mirror = function (d) { return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, function (m, x, y) { return x + ' ' + n1(400 - parseFloat(y)); }); };
      c.raw('<g transform="translate(200 200) scale(1.12) translate(-200 -200)">');
      // Interior base so no gaps show.
      c.p(null, circ(ex, ey, 113), '#262a36', 0, ' stroke-opacity="0"');
      // Vitreous humor fills the posterior cavity behind the lens.
      var v1 = P(105, 121), v2 = P(105, -121);
      c.p('vit', 'M' + pt(v1) + 'A105 105 0 1 1 ' + pt(v2) + 'C150 280 142 266 142 250L142 150C142 134 150 120 ' + pt(v1) + 'Z', '#2a2f3c', 1.2);
      // Sclera, choroid, retina.
      c.p('sclera', 'M108.5 125.4A130 130 0 1 1 108.5 274.6L116.7 268.8A120 120 0 1 0 116.7 131.2Z', '#4a3840', 1.8);
      c.p('chor', band(113, 120, 128, -128), '#6b3a44', 1.3);
      c.p('ret', band(105, 113, 121, -121), '#574553', 1.3);
      // Fovea: the central pit of the retina on the visual axis.
      var fd = 'M319.6 189C327 194 327.5 206 319.6 211Z';
      if (c.on('fov')) { c.p('fov', fd, F2); c.ring('fov', 322, 200, 20); }
      else c.p(null, fd, '#2a2f3c', 1.2);
      // Optic nerve leaves at the optic disc, below the visual axis.
      var o1 = [ex + Math.sqrt(105 * 105 - 22 * 22), 222], o2 = [ex + Math.sqrt(105 * 105 - 54 * 54), 254];
      c.p('on', 'M' + pt(o1) + 'C330 222 344 220 352 219L398 219L398 257L352 257C344 256 330 254 ' + pt(o2) + 'A105 105 0 0 0 ' + pt(o1) + 'Z', '#3f3138', 1.7);
      if (!c.on('on')) c.line('M332 230L396 230M334 238L396 238M332 246L396 246', 1, 0.35);
      // Cornea.
      c.p('cornea', 'M108.5 125.4A91.5 91.5 0 0 0 108.5 274.6L113 271A86 86 0 0 1 113 129Z', '#3f4a5c', 1.6);
      // Anterior chamber filled with aqueous humor.
      c.p('ac', 'M113 129A86 86 0 0 0 113 271L117 266L112 218L112 182L117 134Z', '#2f3b50', 1.2);
      // Lens, hung from the ciliary body by suspensory ligaments.
      c.line('M140 141L136 151M146 136L142 152M150 132L146 154' + ' ' + mirror('M140 141L136 151M146 136L142 152M150 132L146 154'), 0.9, 0.7);
      c.p('lens', 'M135 150C120 155 114 180 114 200C114 220 120 245 135 250C152 245 158 222 158 200C158 178 152 155 135 150Z', '#4d4b5e', 1.6);
      // Ciliary body.
      var cil = 'M116.3 133.5L' + pt(P(119, 128)) + 'L' + pt(P(119, 122)) + 'C150 112 152 126 148 134C146 140 141 144 136 145C128 145 121 142 116.3 133.5Z';
      c.p('cil', cil, '#5a3a40', 1.5);
      c.p('cil', mirror(cil), '#5a3a40', 1.5);
      // Iris, with the pupil between its margins.
      var ir = 'M116.5 132L123 136C122.5 155 121.5 170 119 182L112 182C112 165 113 148 116.5 132Z';
      c.p('iris', ir, '#5a4234', 1.5);
      c.p('iris', mirror(ir), '#5a4234', 1.5);
      var pd = 'M112 183L118.5 183C117 194 117 206 118.5 217L112 217C111.4 206 111.4 194 112 183Z';
      if (c.on('pupil')) { c.p('pupil', pd, F2); c.ring('pupil', 115, 200, 26); }
      else c.p(null, pd, '#1c1619', 0.8);
      c.ring('cil', 136, 126, 22);
      c.ring('cil', 136, 274, 22);
      c.raw('</g>');
      return c.svg();
    }
  };

  // ---------------------------------------------------------------- lungs
  DIAGRAMS.lungs = {
    name: 'Respiratory tract (anterior view)',
    vb: [0, 0, 400, 400],
    parts: {
      nasal: 'Nasal cavity', phar: 'Pharynx', lar: 'Larynx', tra: 'Trachea', rmb: 'Right main bronchus',
      lmb: 'Left main bronchus', bron: 'Bronchioles', alv: 'Alveoli', dia: 'Diaphragm',
      rl: 'Right lung', ll: 'Left lung'
    },
    svg: function (part) {
      var c = Ctx('lungs', this.vb, part), rad = Math.PI / 180, iclip = 'gzA-lungs-inset';
      var RL = 'M128 160C95 165 68 220 58 280C52 312 52 336 60 344C92 322 140 316 178 330C184 300 186 250 182 215C178 185 160 160 128 160Z';
      var LL = 'M272 160C305 165 332 220 342 280C348 312 348 336 340 344C312 328 272 326 240 336C234 324 238 312 250 305C258 296 256 276 236 268C222 262 218 240 218 215C222 185 240 160 272 160Z';
      // Head in sagittal profile (facing the viewer's left), faint.
      c.line('M236 4C200 -2 158 4 142 26C134 38 132 46 130 54L114 72L126 78C124 84 128 88 130 90C126 94 128 100 132 102C130 110 134 116 144 120C156 124 168 130 175 142M246 142C250 112 262 86 262 62C264 32 256 10 236 4', 1.4, 0.4);
      c.p(null, 'M136 86C152 78 186 76 200 84C206 94 204 106 198 112L170 106C156 102 142 96 136 86Z', '#2a2125', 1, ' stroke-opacity="0.5"');
      // Lungs and their fissures.
      c.p('rl', RL, '#3a2c32', 1.8);
      c.p('ll', LL, '#3a2c32', 1.8);
      var fc = function (id) { return c.on(id) ? '#7a5f2f' : ST; }, fo = function (id) { return c.on(id) ? 0.95 : 0.6; };
      c.line('M62 258C100 270 130 300 146 326', 1.5, fo('rl'), fc('rl'));
      c.line('M86 263C112 258 150 252 183 250', 1.5, fo('rl'), fc('rl'));
      c.line('M338 248C312 270 290 300 276 330', 1.5, fo('ll'), fc('ll'));
      // Bronchial tree inside the lungs: lobar and segmental bronchi, then bronchioles.
      var lob = [], seg = [], tw = [];
      var twig = function (x0, y0, x, y) {
        var a = Math.atan2(y - y0, x - x0);
        [-0.55, 0, 0.55].forEach(function (o) { tw.push('M' + pt([x, y]) + 'L' + pt([x + Math.cos(a + o) * 13, y + Math.sin(a + o) * 13])); });
      };
      var tree = function (h, lobes) {
        lobes.forEach(function (L) {
          lob.push('M' + pt(h) + 'L' + pt(L[0]));
          L[1].forEach(function (e) { seg.push('M' + pt(L[0]) + 'L' + pt(e)); twig(L[0][0], L[0][1], e[0], e[1]); });
        });
      };
      tree([170, 263], [[[150, 224], [[132, 188], [110, 212], [162, 192]]], [[160, 292], [[142, 312], [172, 312]]], [[124, 286], [[88, 268], [90, 306], [118, 318]]]]);
      tree([248, 257], [[[270, 222], [[262, 186], [298, 196], [306, 236]]], [[258, 290], [[264, 320], [284, 316]]], [[290, 286], [[322, 276], [318, 316]]]]);
      c.raw('<clipPath id="gzA-lungs-lclip"><path d="' + RL + '"/><path d="' + LL + '"/></clipPath>');
      // Main bronchi: right shorter, wider and more vertical; left longer, narrower and more horizontal.
      c.tube('rmb', 'M196 216L170 263', 15, '#4a3840', 1.6, 'round');
      c.tube('lmb', 'M204 216L248 257', 11, '#4a3840', 1.6, 'round');
      c.raw('<g clip-path="url(#gzA-lungs-lclip)">');
      c.tube(null, lob, 6.5, '#43363e', 1.2, 'round');
      c.tube(null, seg, 4.2, '#43363e', 1.1, 'round');
      c.tube('bron', tw, c.on('bron') ? 3 : 2.2, '#55454c', 0.9, 'round');
      c.raw('</g>');
      // Diaphragm: right dome higher than left.
      c.p('dia', 'M34 356C58 316 122 304 176 330C190 337 210 337 224 333C276 320 336 328 366 358L366 376C336 348 276 340 224 350C210 354 190 354 176 348C122 324 58 338 34 376Z', '#4a3840', 1.6);
      // Esophagus stub behind the trachea, then the trachea with cartilage rings.
      c.p(null, 'M220 146L234 146L232 176L222 176Z', '#2a2125', 1.2, ' stroke-opacity="0.6"');
      c.p('tra', 'M191 144L209 144L209 222L191 222Z', '#4a3840', 1.6);
      if (!c.on('tra')) { var rg = ''; for (var y = 151; y < 220; y += 8) rg += 'M193 ' + y + 'L207 ' + y; c.line(rg, 1.1, 0.5); }
      // Nasal cavity with conchae, pharynx, larynx.
      c.p('nasal', 'M130 60C142 50 160 44 188 44C198 44 204 48 206 54L206 72L136 76C131 72 128 66 130 60Z', '#3a2c32', 1.6);
      if (!c.on('nasal')) c.line('M204 53C188 50 172 52 162 57M204 61C186 58 170 60 156 65M204 68C188 66 172 67 158 71', 1.2, 0.6);
      c.p('phar', 'M206 46C218 42 232 46 234 58L234 148L220 148L220 118C218 108 212 102 206 96C208 90 208 84 206 78Z', '#3a2c32', 1.6);
      c.p('lar', 'M200 100C203 94 208 94 212 100L220 112L220 146L190 146L188 130C185 124 188 116 194 110Z', '#55444b', 1.6);
      if (!c.on('lar')) c.line('M192 128L216 126', 1, 0.5);
      c.ring('lar', 204, 122, 26);
      // Alveoli inset: a terminal bronchiole branching into alveolar ducts that end in alveolar sacs.
      var ix = 334, iy = 74, ir = 50;
      c.line('M300 114L292 186', 1, 0.6);
      c.raw('<clipPath id="' + iclip + '"><circle cx="' + ix + '" cy="' + iy + '" r="' + ir + '"/></clipPath>');
      c.raw('<circle cx="' + ix + '" cy="' + iy + '" r="' + ir + '" fill="#241c20" stroke="' + ST + '" stroke-width="1.5"/>');
      c.raw('<g clip-path="url(#' + iclip + ')">');
      c.tube('bron', smooth([[294, 132], [306, 110], [318, 92]]), 7, '#55454c', 1.2, 'butt');
      var sacs = [[332, 58], [354, 82], [318, 70]];
      c.tube('alv', sacs.map(function (q) { return 'M318 92L' + pt(q); }), 5, '#6b3a44', 1.1, 'round');
      sacs.forEach(function (q, j) {
        var r0 = j === 2 ? 0.8 : 1;
        for (var k = 0; k < 6; k++) { var a = (k * 60 + j * 25) * rad; c.p('alv', circ(q[0] + Math.cos(a) * 11 * r0, q[1] + Math.sin(a) * 11 * r0, 7.5 * r0), '#6b3a44', 1.1); }
        c.p('alv', circ(q[0], q[1], 7.5 * r0), '#6b3a44', 1.1);
      });
      c.raw('</g>');
      return c.svg();
    }
  };
})();
