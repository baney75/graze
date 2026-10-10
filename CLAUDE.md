# CLAUDE.md

@AGENTS.md

The file above holds the full instructions. Read [PROJECT.md](PROJECT.md) for the idea, the decisions and the history. What follows is specific to working in Claude.

## Working style

- Act on clear requests and carry them through to a checked, deployed result. Ask only about choices that would change the outcome.
- Be direct and report what was verified, with the check that verified it. Do not claim verification from a check that could not have failed.
- The owner sees the result, not the process: lead with what changed and what it means for players.

## Content work with subagents

Courses were written and reviewed by parallel subagents, and that is still the fastest way to add or fix content:

- **Writers** get one course each and read `courses/BRIEF.md` and `courses/SPEC.md`, plus `courses/LANG.md` for languages. They write only inside `courses/<key>/`.
- **Reviewers** are separate agents that did not write the course and follow `courses/REVIEW.md`. Give each one a single course and name the sources to check against.
- **Picture work** (new diagrams in `src/diagrams-*.js`, map data in `src/geo.js`) needs a visual check: render every part highlighted into contact sheets with Playwright and look at them.
- **Rate limits:** WebFetch rate-limits under heavy parallel use (HTTP 429). Tell agents to spend fetches on the facts they are least sure of rather than retrying.
- **Concurrency:** at most 20 subagents can run at once.

After content changes, run `npm test`, then release following AGENTS.md.

## Testing the game

A local server on `dist/` plus Playwright (Python, Chromium preinstalled) covers everything:

- **Seeding:** put a save in localStorage with `add_init_script` (`graze.save.v2`) and set `graze.seenVersion` to skip What's new.
- **Test hooks:** `window.__graze` exposes `G`, `mode`, `SV`, `CARDS` and `COURSES`, plus `openLesson(key, unit)`, `openCourse(key)` and `mathProblem(level)`.
- **Gates:** a bot that steers into `G.focus.correct` can play runs to reach gates.
- **Speech:** recognition and microphone access cannot be tested headless. Check that the controls appear, and test real speech in a desktop browser.
