# Brief for Graze course writers

Graze is a free arcade learning game. Players meet your items as fast two-choice recall gates, in a swipeable feed, and in short lessons, on a spaced-review schedule. Players chose your course because they want to really learn the subject. Accuracy and teaching quality are the whole point.

## Your job

Write one complete course in `/home/claude/graze/courses/<key>/` following `/home/claude/graze/courses/SPEC.md` exactly. Read the spec first.

1. Research. You have no internet from the shell. Use WebFetch and WebSearch. Fetch the main free reputable sources for your subject (open textbooks such as OpenStax and LibreTexts, university open courseware such as COERLL at UT Austin, government sources such as NIH/MedlinePlus, Wiktionary and established open dictionaries, Project Gutenberg for public-domain texts). Fetch each source you cite and confirm it loads; cite the specific chapter or section URL in each unit's `src` when you can confirm it, otherwise the book's main URL.
2. Write `meta.json`, then the units `u01.json` ... in teaching order, simplest first. Write one unit per file so each write stays small.
3. Run `node /home/claude/graze/scripts/check-course.mjs <key>` and fix every ERROR. Fix warnings unless there is a good reason.
4. Re-read every item once more as a strict examiner: Is the answer correct and the single best answer? Is each distractor definitely wrong but plausible? Is the cue unambiguous without context? Is the spelling, accent, gender, article, and tone mark right? Fix or delete anything doubtful. A smaller correct course beats a larger flawed one.

## Quality bar

- Teach the core of the subject a strong student would need, in a sensible order, the way a good instructor would.
- Cues stand alone: a player sees only the cue, then two options. Avoid cues that only make sense with the unit title.
- Distractors come from the same category (a wrong organelle for an organelle, a wrong verb form for a verb form, a wrong year from the same era).
- Mix item styles: terms to meanings, short questions, cause and effect, formulas, cloze sentences for grammar.
- Notes are short and genuinely clarifying: the rule or idea that makes the items make sense.
- Readings are original (except public-domain quotations), clear, and accurate.
- Do not write content about medical or psychological disorders framed at the learner, and do not include a unit on psychological disorders.
- American English for English text.

## Boundaries

- Only create or edit files inside `/home/claude/graze/courses/<key>/`. Do not touch any other file.
- Do not run git.

## Final reply

At most 8 lines: units, items, readings, the sources you fetched, and anything you removed or were unsure about.
