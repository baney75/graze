# Graze

**A one-tap orbit arcade game that builds real memory.** Tap to jump between two orbits and dodge as late as you dare. Every few seconds time slows at a recall gate: steer into the lane with the right answer. What you learn comes back on a spaced-review schedule until it sticks.

**[Play Graze](https://baney75.github.io/graze/play/)** · [Project site](https://baney75.github.io/graze/) · Made by [Donovan Baney](https://dbaney.com)

![Graze in play](site/assets/hero.jpg)

## What's in it

- **Arcade loop.** Grazes, perfect dodges, a multiplier up to ×8, Fever mode, shields, magnets, novas, bonus rushes, lane-hopping blocks, boons after each rush, and a soundtrack that builds with your multiplier.
- **Recall gates.** Two-choice retrieval under light time pressure, with a recall-first pause before the answers appear, reverse gates for strong items, recall chains, and a recall revive when you crash.
- **Spaced review.** Each item moves through intervals of 10 minutes, then 1, 3, 7, 16, 35, 90 and 180 days. New items are capped at ten a day, because spacing only works when it is paced.
- **Content.** Eleven packs (525 items): Roots, Words, Logic & Bias, Philosophy & Theology, Body & Cell, Capitals, Number Sense, and opt-in Organic Chemistry, Latin, German and Polish. Twenty Codex reading pages with comprehension questions. The Forge takes your own `prompt = answer` lists.
- **Progress.** Saved on your device. Transfer codes and backup files move it between devices and merge rather than overwrite. Inside Claude, it also keeps a cloud save and supports encrypted link codes.
- **Updates.** Installable and offline-capable on the web. New versions download in the background and wait for you to tap Update, and you see what changed once.

## The science, briefly

Graze builds in what holds up: retrieval practice and spacing ([Dunlosky et al., 2013](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html)), vocabulary and word roots, reading with comprehension checks ([Rayner et al., 2016](https://www.psychologicalscience.org/news/releases/speed-reading-promises-are-too-good-to-be-true-scientists-find.html)), if-then cues for a daily habit, and learning built into the core mechanic rather than bolted on ([Habgood & Ainsworth, 2011](https://shura.shu.ac.uk/3556/)). It leaves out brain-training IQ claims, which don't hold up ([Simons et al., 2016](https://news.illinois.edu/review-finds-little-evidence-that-brain-training-games-yield-real-world-benefits/)), and speed reading. Graze helps you remember what you practice; it makes no promise about intelligence.

## Run it locally

Requires Node 18+ and nothing else.

```sh
npm test          # builds dist/ and runs the content and version checks
npm run serve     # builds, then serves dist/ at http://localhost:8080
```

`dist/index.html` is the project site, `dist/play/` is the game, and `dist/artifact.html` is the single-file copy published inside Claude.

## Releasing an update

1. Make the change in `src/` (or `site/` for the project page).
2. Add an entry at the top of `changelog.json` with a higher version, a date, a short name and a few notes. The version there is the single source of truth: the build stamps it into the game, the service worker, `play/version.json`, `package.json` and the project site.
3. Run `npm test`, commit and push to `main`. The Pages workflow builds, checks and deploys.

Players with the game open see an Update button within half an hour, or the next time they return to it. Their next run starts on the new version, and they see your notes once.

Save data carries a schema version (`v: 2`). If you change its shape, add the conversion in `normalize()` / `migrate()` in `src/core.js` so older saves keep working.

## Layout

```
src/
  shell.html          page structure and styles (Martyr Night palette)
  content-core.js     roots, words and the first twelve Codex pages
  content-packs.js    the other packs and eight more Codex pages
  core.js             storage, mergeable save format, sync, crypto, review scheduler
  game-setup.js       constants, boons, workshop, trails, missions
  audio.js            sound effects, adaptive soundtrack, layout
  game.js             gameplay, gates, boons, revive, menus and panels
  updates.js          version checks, What's new, service worker wiring
  render.js           canvas drawing
  frame.js            focus overlay, frame loop, start-up
public/               service worker, manifest, icons
site/                 project page and screenshots
scripts/build.mjs     concatenates src/ into dist/
scripts/check.mjs     CI checks: script parses, packs are well formed, versions agree
```

## License

MIT. Fonts are loaded from Google Fonts (Source Serif 4 and Karla, both under the SIL Open Font License).
