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
function cardImgEl(card, cls) { const i = document.createElement('img'); i.className = cls || 'cimg'; setCardImg(i, card); return i; }
