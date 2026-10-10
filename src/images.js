/* ================= images: diagrams, maps and flags for cards ================= */
const IMGS = new Map();
function cardSVG(card) {
  const im = card && card.img; if (!im) return null;
  try {
    if (im.k === 'diagram') { const D = typeof DIAGRAMS !== 'undefined' && DIAGRAMS[im.g]; return D ? D.svg(im.p) : null; }
    if (im.k === 'map') return typeof mapSVG === 'function' ? mapSVG(im.g, im.p) : null;
    if (im.k === 'flag') return typeof flagSVG === 'function' ? flagSVG(im.p) : null;
  } catch (e) { return null; }
  return null;
}
const svgURL = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
// Canvas use: returns { img, ok, ar } and loads on first call.
function cardImage(card) {
  const key = card.id; let e = IMGS.get(key);
  if (e) return e;
  e = { img: new Image(), ok: false, ar: 1, bad: false };
  const svg = cardSVG(card);
  if (!svg) { e.bad = true; IMGS.set(key, e); return e; }
  e.img.onload = () => { e.ok = true; e.ar = (e.img.naturalWidth || 4) / (e.img.naturalHeight || 3); };
  e.img.onerror = () => { e.bad = true; };
  e.img.src = svgURL(svg);
  if (IMGS.size > 160) IMGS.delete(IMGS.keys().next().value);
  IMGS.set(key, e);
  return e;
}
// DOM use: fill an <img> (or hide it).
function setCardImg(imgEl, card) {
  if (!imgEl) return;
  const svg = card && card.img ? cardSVG(card) : null;
  if (!svg) { imgEl.hidden = true; imgEl.removeAttribute('src'); return; }
  imgEl.src = svgURL(svg); imgEl.hidden = false;
  imgEl.alt = card.img.k === 'flag' ? 'A national flag' : card.img.k === 'map' ? 'A map with one region highlighted' : 'A diagram with one part highlighted';
}
// Reverse picture choice: the answer's part plus up to three look-alikes, preferring the card's distractors.
function canPick(card) { const D = card && card.img && card.img.k === 'diagram' && typeof DIAGRAMS !== 'undefined' && DIAGRAMS[card.img.g]; return !!(D && D.pick); }
function pickParts(card) {
  const D = DIAGRAMS[card.img.g], byName = {};
  for (const p of Object.keys(D.parts)) byName[D.parts[p]] = p;
  const out = [card.img.p];
  for (const nm of shuffle((card.d || []).slice())) { const p = byName[nm]; if (p && !out.includes(p) && out.length < 4) out.push(p); }
  const rest = shuffle(Object.keys(D.parts).filter(p => !out.includes(p)));
  while (out.length < 4 && rest.length) out.push(rest.pop());
  return shuffle(out);
}
function partImgEl(g, p) { const i = document.createElement('img'); i.className = 'pimg'; i.src = svgURL(DIAGRAMS[g].svg(p)); i.alt = 'A structure with one group highlighted'; return i; }
function cardImgEl(card, cls) { const i = document.createElement('img'); i.className = cls || 'cimg'; setCardImg(i, card); return i; }
