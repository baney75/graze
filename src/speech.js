/* ================= speech: listen, speak, record ================= */
const SPEECH = (() => {
  const synth = (() => { try { return window.speechSynthesis || null; } catch (e) { return null; } })();
  let voices = [];
  const load = () => { try { voices = synth ? synth.getVoices() : []; } catch (e) { voices = []; } };
  if (synth) { load(); try { synth.addEventListener('voiceschanged', load); } catch (e) { synth.onvoiceschanged = load; } }
  const norm = l => String(l || '').toLowerCase().replace('_', '-');
  function voiceFor(lang) {
    const l = norm(lang), base = l.split('-')[0];
    const ok = voices.filter(v => norm(v.lang) === l), alt = voices.filter(v => norm(v.lang).split('-')[0] === base);
    const pick = list => list.find(v => /google|natural|premium|enhanced|siri/i.test(v.name)) || list.find(v => v.localService) || list[0];
    return pick(ok) || pick(alt) || null;
  }
  function canSay(lang) { if (!synth || !lang) return false; if (!voices.length) load(); return !voices.length || !!voiceFor(lang); }
  function stop() { try { if (synth) synth.cancel(); } catch (e) {} try { if (rec) rec.abort(); } catch (e) {} }
  function say(text, lang, rate) {
    return new Promise(res => {
      if (!synth || !text || SV.muted) return res(false);
      try {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(String(text).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[…]/g, '').trim());
        u.lang = lang; const v = voiceFor(lang); if (v) u.voice = v;
        u.rate = rate || 0.92; u.pitch = 1; u.volume = 1;
        let done = false; const fin = ok => { if (!done) { done = true; res(ok); } };
        u.onend = () => fin(true); u.onerror = () => fin(false);
        setTimeout(() => fin(true), 8000 + text.length * 120);
        synth.speak(u);
      } catch (e) { res(false); }
    });
  }

  /* recognition */
  const SR = (() => { try { return window.SpeechRecognition || window.webkitSpeechRecognition || null; } catch (e) { return null; } })();
  let rec = null;
  const canHear = () => !!SR;
  function hear(lang, ms) {
    return new Promise(res => {
      if (!SR) return res({ alts: [], err: 'unsupported' });
      try { if (rec) rec.abort(); } catch (e) {}
      let r; try { r = new SR(); } catch (e) { return res({ alts: [], err: 'unsupported' }); }
      rec = r; r.lang = lang; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
      let out = null; const fin = o => { if (out) return; out = o; try { r.stop(); } catch (e) {} res(o); };
      r.onresult = e => { const alts = []; for (const res0 of e.results) for (let i = 0; i < res0.length; i++) alts.push(res0[i].transcript); fin({ alts }); };
      r.onerror = e => fin({ alts: [], err: e.error || 'error' });
      r.onend = () => fin({ alts: [], err: 'no-speech' });
      setTimeout(() => fin({ alts: [], err: 'timeout' }), ms || 7000);
      try { r.start(); } catch (e) { fin({ alts: [], err: 'busy' }); }
    });
  }
  const strip = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\([^)]*\)/g, ' ').replace(/[¡!¿?.,;:'"«»„“”‘’()\-–—…。、！？「」]/g, ' ').replace(/\s+/g, ' ').trim();
  function lev(a, b) {
    if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[b.length];
  }
  // Similarity 0..1 of the best alternative to any accepted target form.
  function score(alts, targets, lang) {
    const cjk = /^(ja|zh|ko)/.test(norm(lang));
    const T = targets.filter(Boolean).map(t => strip(t)).map(t => cjk ? t.replace(/\s/g, '') : t).filter(Boolean);
    let best = 0, heard = alts[0] || '';
    for (const a0 of alts) {
      let a = strip(a0); if (cjk) a = a.replace(/\s/g, '');
      for (const t of T) {
        const sim = 1 - lev(a, t) / Math.max(a.length, t.length, 1);
        const contains = a.includes(t) && t.length >= 2 ? 0.95 : 0;
        const s = Math.max(sim, contains);
        if (s > best) { best = s; heard = a0; }
      }
    }
    return { score: best, heard, ok: best >= (cjk ? 0.6 : 0.75) };
  }

  /* record yourself, then compare with the voice */
  let mr = null;
  const canRecord = () => { try { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); } catch (e) { return false; } };
  async function record(ms) {
    if (!canRecord()) return { err: 'unsupported' };
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return { err: e && e.name === 'NotAllowedError' ? 'not-allowed' : 'no-mic' }; }
    return new Promise(res => {
      const chunks = []; try { mr = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(t => t.stop()); return res({ err: 'unsupported' }); }
      mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' }); res({ url: URL.createObjectURL(blob) }); };
      mr.start(); setTimeout(() => { try { if (mr.state !== 'inactive') mr.stop(); } catch (e) {} }, ms || 3000);
    });
  }
  const errText = e => ({ 'not-allowed': 'Microphone blocked. Allow it in your browser, or play on the web version.', 'service-not-allowed': 'Speech recognition is blocked here. Try the web version in Chrome, Edge or Safari.', unsupported: 'This browser has no speech recognition. Chrome, Edge and Safari do.', 'no-speech': 'I did not hear anything. Tap and speak right away.', timeout: 'I did not catch that. Try again.', network: 'Speech recognition needs a connection.', 'audio-capture': 'No microphone found.', 'no-mic': 'No microphone found.' })[e] || 'Could not listen. Try again.';
  return { canSay, say, stop, canHear, hear, score, canRecord, record, errText };
})();

/* Voice controls shared by lessons and the Feed. Returns a row element. */
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>',
  slow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 12h4"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  rec: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
};
function vbtn(icon, label) { const b = document.createElement('button'); b.className = 'vbtn'; b.innerHTML = ICON[icon]; b.appendChild(document.createTextNode(label)); return b; }
function voiceRow(card, opts) {
  opts = opts || {};
  const lang = cardLang(card), wrap = el('div', 'sec'), row = el('div', 'voice'), out = el('div', 'heard');
  if (!lang || !speakable(card)) return null;
  const text = card.say || card.c, C = COURSES[card.deck];
  if (SPEECH.canSay(lang)) {
    const p = vbtn('play', 'Listen'); p.addEventListener('click', () => SPEECH.say(text, lang)); row.appendChild(p);
    const s = vbtn('slow', 'Slow'); s.addEventListener('click', () => SPEECH.say(text, lang, 0.6)); row.appendChild(s);
  }
  if (C && C.speak === 'recognize' && SPEECH.canHear()) {
    const m = vbtn('mic', opts.micLabel || 'Say it');
    m.addEventListener('click', async () => {
      SPEECH.stop(); m.classList.add('live'); out.className = 'heard'; out.textContent = 'Listening…';
      const r = await SPEECH.hear(lang, 6500); m.classList.remove('live');
      if (!r.alts.length) { out.textContent = SPEECH.errText(r.err); return; }
      const sc = SPEECH.score(r.alts, [card.c, card.say, card.r], lang);
      out.className = 'heard ' + (sc.ok ? 'ok' : 'bad'); out.textContent = '';
      out.append(document.createTextNode('Heard: '), el('b', '', sc.heard), document.createTextNode(` · ${Math.round(sc.score * 100)}%${sc.ok ? '' : ' · try again'}`));
      ginc('spoke', 1); if (sc.ok) { ginc('spokeOk', 1); sfx.learn(); } else sfx.miss();
      save();
      if (opts.onResult) opts.onResult(sc);
    });
    row.appendChild(m);
  } else if (SPEECH.canRecord()) {
    const m = vbtn('rec', 'Record me');
    m.addEventListener('click', async () => {
      SPEECH.stop(); m.classList.add('live'); out.className = 'heard'; out.textContent = 'Recording for 3 seconds…';
      const r = await SPEECH.record(3000); m.classList.remove('live');
      if (r.err) { out.textContent = SPEECH.errText(r.err); return; }
      out.textContent = 'You, then the voice. Compare them.';
      const a = new Audio(r.url); a.onended = () => SPEECH.say(text, lang); a.play().catch(() => {});
      ginc('spoke', 1); save();
    });
    row.appendChild(m);
  }
  if (!row.children.length) return null;
  wrap.append(row, out);
  if (C && C.speak === 'listen' && C.key === 'latin') wrap.appendChild(el('div', 'heard', 'Italian voice, close to church pronunciation'));
  if (C && C.key === 'greek') wrap.appendChild(el('div', 'heard', 'Modern Greek voice; ancient pronunciation differed'));
  return wrap;
}
