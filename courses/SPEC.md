# Graze course format

Each course lives in `courses/<key>/`:

- `meta.json`: course metadata
- `u01.json`, `u02.json`, ...: one file per unit, in teaching order

`npm run check:course <key>` validates a course. `npm test` validates all of them.

## meta.json

```json
{
  "key": "spanish",
  "name": "Spanish",
  "group": "Languages",
  "tag": "ESPAÑOL",
  "lang": "es-ES",
  "speak": "recognize",
  "level": "Beginner to A2",
  "blurb": "One or two sentences on what the learner can do after the course.",
  "sources": [
    { "t": "Acceso, COERLL, University of Texas at Austin", "u": "https://acceso.coerll.utexas.edu/" }
  ]
}
```

- `group`: one of `Languages`, `Sciences`, `Medicine`, `Math`, `Mind`, `World`, `Reading`, `Skills`.
- `tag`: 3 to 8 uppercase characters, shown at gates.
- `lang`: BCP-47 code used for text-to-speech and speech recognition. Omit for non-language courses.
- `speak`: `recognize` (the browser's speech recognition supports this language), `listen` (text-to-speech only, for example Latin), or omit.
- `sources`: 2 to 6 free, reputable references the content was written against and checked against. Every URL must be one you actually fetched successfully.

## Unit file

```json
{
  "title": "Greetings and introductions",
  "note": "A short teaching note shown before the items: a grammar rule, pattern, or concept, in 1 to 3 sentences (max 400 characters).",
  "src": { "t": "Acceso, Unit 1", "u": "https://..." },
  "items": [
    { "c": "hola", "a": "hello", "d": ["goodbye", "please"], "ex": "¡Hola, Marta!", "exT": "Hi, Marta!" }
  ],
  "read": {
    "title": "Short title",
    "text": ["Paragraph one.", "Paragraph two."],
    "q": [ { "q": "Question?", "o": ["Right answer", "Wrong", "Wrong"], "k": 0 } ]
  }
}
```

### Items

- `c` (cue): what the player sees first. Language courses: the target-language word, phrase, or cloze sentence. Other courses: a short term or question. Max 64 characters; aim for 40 or fewer.
- `a` (answer): the meaning, translation, or answer. Max 90 characters; aim for 50 or fewer. Must be a single best answer.
- `d` (distractors): 1 to 3 wrong answers from the same category as `a`, of similar length and form, plausible to a learner but clearly wrong to someone who knows. Never a synonym of `a`, never another correct answer.
- `ex`, `exT` (optional): an example sentence using the item and its English translation (languages), or a one-line clarifying fact (other courses: put it in `ex`, omit `exT`).
- `r` (optional): reading aid. Japanese: romaji (Hepburn, with macrons). Mandarin: pinyin with tone marks. Omit for Latin-script languages.
- `say` (optional): text for text-to-speech when it differs from `c`. Omit when `c` is speakable as written. Cloze items with `___` are never spoken.

Rules:

- 15 to 40 items per unit.
- Within a course, every `c` is unique (case-insensitive), and no two items share the same `a` within a unit.
- Each item tests one fact. No trick questions, no "all of the above".
- Every fact must be correct and consistent with the cited sources. When unsure, leave the item out.
- Write original wording. Facts are free to use; do not copy sentences from the sources (Project Gutenberg public-domain texts are the exception and must be quoted exactly).

### Readings (`read`, optional)

- Science, medicine, math, mind, and world courses: include a reading in most units. 120 to 260 words, original, plain, accurate, written to teach the unit's core idea. 2 or 3 comprehension questions that need the reading, 3 or 4 options each, `k` = index of the right option.
- Language courses: include a reading in about every third unit, written in the target language at the learner's level, mostly using vocabulary already taught, 50 to 160 words. Questions are in English.
- Reading course (classics): `text` is an exact public-domain excerpt, and `src.u` is its Project Gutenberg page.
