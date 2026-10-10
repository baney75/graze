# AGENTS.md

Instructions for anyone, human or AI agent, working on Graze. Read this first, then [PROJECT.md](PROJECT.md) for the idea and the history behind it.

## What Graze is

A one-tap orbit arcade game with a library of real courses inside it. Players learn in short lessons, recall what they learned at gates in the arcade game, and keep it in an endless Feed built to replace scrolling. Everything runs on one spaced-review engine.

Two commitments shape every change:

1. **It should be as compelling as a game people can't put down, and every minute spent in it should teach something true.** Streaks, combos, golden cards and missions exist to drive real retrieval practice, never to waste time.
2. **It is honest.** Graze helps people remember what they practice, read better and learn languages and subjects. It never claims to raise IQ. The content must be accurate enough to learn from like a textbook.

- Play: https://baney75.github.io/graze/play/
- Project site: https://baney75.github.io/graze/
- Claude-hosted copy: a private artifact the owner publishes from `dist/artifact.html`
- Owner: Donovan Baney (https://dbaney.com). Graze is listed in his portfolio (`baney75/dbaney.com`, `content/projects.md`) and his GitHub profile README (`baney75/baney75`). Update both when the project's description changes.

## Commands

```sh
npm test        # build dist/ and run all checks (CI runs exactly this)
npm run serve   # build, then serve dist/ at http://localhost:8080
npm run geo     # regenerate src/geo.js from the map and flag packages (needs npm install)
node scripts/check-course.mjs <key>      # validate one course
node scripts/courses-compile.mjs         # print course, unit, item and reading counts
```

Node 18+ is the only requirement for building and testing. `npm install` is needed only for `npm run geo`.

## Layout

```
courses/<key>/meta.json, u01.json...   one folder per course (format: courses/SPEC.md)
courses/_diagrams/<key>.json           picture units, merged into their course at build time
courses/BRIEF.md, LANG.md, REVIEW.md   briefs for course writers and reviewers
src/*.js                               game source, concatenated in a fixed order
src/shell.html                         markup and CSS; build markers /*__VERSION__*/ and /*__JS__*/
site/                                  project landing page and screenshots
public/                                service worker, manifest, icons
scripts/build.mjs                      compiles courses and builds dist/
scripts/check.mjs                      CI checks
changelog.json                         version history; the first entry is the current version
```

## How the code fits together

- **One script, one scope.** `scripts/build.mjs` concatenates `src/` files in the `ORDER` list into a single IIFE inside `shell.html`, and stamps `VERSION`, `CHANGELOG` and `COURSE_DATA` (the compiled courses) above it. Function declarations are hoisted across files; `const` and `let` are not. A top-level statement must only use constants from files earlier in `ORDER`. Add a new file to `ORDER` in the right place.
- **Order:** content, geo, diagrams, courses, core, game-setup, audio, speech, images, game, library, feed, updates, render, frame. `frame.js` starts everything.
- **No dependencies at runtime, no network required.** The page loads Google Fonts and nothing else. Diagrams, maps and flags are inline SVG. The web build is an installable, offline PWA; `dist/artifact.html` is the same game as one file with the manifest and worker stripped.
- **Main modules:**
  - `courses.js`: the course registry, the legacy quick decks and the mental-math generator. Math answers are computed, never typed.
  - `core.js`: the save format, merging, sync and crypto, plus the card model and the scheduler.
  - `game.js`: the arcade loop, gates, menus and panels.
  - `library.js`: the Library, onboarding, lessons and speaking practice.
  - `feed.js`: the Feed.
  - `speech.js`: text-to-speech, speech recognition and recording.
  - `images.js`: card pictures.
  - `frame.js`: the gate overlay and the frame loop.

### Memory engine

- Review intervals (`IV` in `core.js`): 10 minutes, then 1, 3, 7, 16, 35, 90 and 180 days. A wrong answer resets an item to box 0. Box 5 counts as mastered.
- New items per day come from `prefs.newCap` (5 to 30, default 10), shared by gates, lessons and the Feed. The Feed may run up to twice the cap when nothing else is left.
- New items come from the player's course order. The first course is the focus and supplies about 65% of new items; the rest rotate. Within a course, items come unit by unit, starting from the unit the player last chose.
- Lessons put items into review at box 0, due in 90 seconds if answered right, so the next run reviews them.

### Card IDs are permanent

A card's ID is derived from its content. Changing it resets every player's progress on that item.

| Kind | ID |
|---|---|
| Course text item | `p:<courseKey>:<cue>` |
| Legacy roots / words decks | `r:<cue>` / `l:<cue>` |
| Diagram part | `g:<diagram>:<partId>` |
| Map region | `m:<world\|us>:<code>` |
| Flag | `f:<iso2>` |
| Codex card | `c:<pageId><index>` |
| Player's own list | `u:<lowercased prompt>` |

So: fix answers, distractors and examples freely, but change a cue (`c`) only when the cue itself is wrong. Never rename a course key. The legacy pack keys `latin`, `german`, `polish`, `orgo`, `logic`, `capitals` and `nums` became full courses that reuse the old cue strings, which kept players' progress.

### Save format

Save schema `v: 2`, stored in localStorage key `graze.save.v2`, built to merge across devices:

- Counters are per-device G-counters in `gc`.
- Cards are last-writer-wins by `u`.
- Sets merge by union.
- `prefs` and `math` are last-writer-wins by their `u`.

Any new field needs:

1. a default in `fresh()`;
2. a type guard in `normalize()`;
3. a merge rule in `mergeState()`.

Old saves must keep loading. `migrate()` converts v1 saves.

## Content rules

Read `courses/SPEC.md` and `courses/BRIEF.md` before touching a course. In short:

- **Sources:** write against free, reputable sources (OpenStax, LibreTexts, COERLL, Dickinson College Commentaries, Perseus, MedlinePlus, the Stanford Encyclopedia of Philosophy, Project Gutenberg and similar). Every URL cited in `meta.json` or a unit's `src` must be one that actually loaded.
- **Wording:** write in original wording. Quote public-domain texts (Gutenberg, the KJV) exactly. Copyrighted books (for example *Sapiens*) can be covered by their ideas, never by excerpts.
- **One correct answer:** every item has one best answer. Every distractor must be definitely wrong and plausible, from the same category. A distractor that is a real secondary meaning of the cue counts as a second correct answer; that was the most common error the reviews caught.
- **Doubt:** when unsure, delete the item.
- **Contested questions:** present them neutrally. Phrase disputed authorship as tradition ("traditionally attributed to").
- **Excluded content:** no units on psychological disorders. Never frame content around the learner's own health.
- **Spelling:** American English for English text.
- **Validation:** run `node scripts/check-course.mjs <key>` until it reports 0 errors. CI also checks that every picture item points at a real diagram part, map region or flag.
- **Review:** new or heavily changed courses get an independent item-by-item review following `courses/REVIEW.md`, done by someone or something other than the writer.
- **Picture units** live in `courses/_diagrams/<course>.json`. Their `p` must exist in `DIAGRAMS[dg].parts` (in `src/diagrams-*.js`) or in `GEO`. Their `a` must equal the part's display name. `DG_AFTER` in `scripts/courses-compile.mjs` places each diagram unit after the text unit it illustrates.

## Design rules

- **Palette (Martyr Night):** canvas `#21191d`, gold `#d5b66f`, text `#eee5d5`, muted `#b9aaa6`, rose hazards `#ee8991`, good `#82c89c`.
- **Type:** Source Serif 4 (italic 600 for display) and Karla for UI.
- **Landing page:** the Martyr Day palette (paper `#f4f1e9`, ink `#65283b`, slab `#592637`).
- **Icons:** inline SVG with `currentColor`.
- **Layout:** check every UI change at 390 px (phone) and 1280 px (desktop) widths. There must be no horizontal scroll.
- **Accessibility:** keyboard play must keep working: Space or arrows in runs; F for the Feed; 1 to 4, Enter, the arrows and Escape in panels. Respect `prefers-reduced-motion`.

## Releasing

1. Change `src/`, `courses/` or `site/`.
2. Add an entry at the top of `changelog.json` with a higher version, the date, a short name and two or three plain notes. The build stamps this version into the game, the service worker, `play/version.json`, `package.json` and the site. Players see an Update button and then these notes once.
3. Run `npm test`. For UI changes, also load the built game in a browser (Playwright with the preinstalled Chromium works) and look at screenshots at both widths.
4. Commit and push to `main`. The Pages workflow builds, checks and deploys.
5. Verify live: `play/version.json` shows the new version, and `/` and `/play/` both return 200.
6. Republish the Claude-hosted copy from `dist/artifact.html`, and update the portfolio entry if the description changed.

**GitHub Pages note:** the repository's Pages source should be set to "GitHub Actions". While it is set to "Deploy from a branch", every push also runs GitHub's branch build, which publishes the raw repository. The workflow's deploy job waits for that build to finish and then deploys `dist/`, so the built site wins either way.

## Conventions

- Commits are authored by `Claude <noreply@anthropic.com>` when an agent makes them, with the session's `Co-Authored-By` attribution lines.
- Do not commit `dist/` or `node_modules/`.
- Before claiming something works, run a check that could have failed. Say which of these a change has reached: prepared, verified, deployed or live.
