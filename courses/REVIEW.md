# Brief for Graze course reviewers

You are the independent accuracy reviewer for one Graze course. You did not write it. Players will learn from it as if it were a textbook, so every wrong item teaches something false.

1. Read `/home/claude/graze/courses/SPEC.md` and `/home/claude/graze/courses/BRIEF.md`, then every file in the course folder.
2. Check every item:
   - The answer is correct and the single best answer for the cue as written.
   - Each distractor is definitely wrong, yet plausible.
   - The cue is unambiguous on its own.
   - Spelling, accents and diacritics, gender, articles, tone marks and romanization are right.
   - Example sentences and their translations are correct and natural.
3. Check every note, reading and reading question the same way. The right option in reading questions should not always be in the same position; vary `k` if it is.
4. Check doubtful facts against the cited free sources and established dictionaries with WebFetch. The fetch proxy rate-limits (HTTP 429): if that happens, do not retry the same URL repeatedly; spend fetches on the items you are least sure of.
5. Fix problems directly with small edits. Keep `c` unchanged unless the cue itself is wrong, because `c` identifies the item. Delete an item rather than leave something doubtful.
6. Run `node /home/claude/graze/scripts/check-course.mjs <key>` until it reports 0 errors.

Only edit files inside your course folder. No git.

Final reply, at most 10 lines: items reviewed, number of fixes, up to 12 representative fixes (before → after), and any remaining doubts.
