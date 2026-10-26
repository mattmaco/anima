# Study figures: the low-token workflow

Use this when someone hands over study notes or a study guide and wants figures to revise with. The output is a set of small specs built by `study/build.mjs` (see `study/README.md`), not hand-built pages. The goal is a working figure per hard chunk for the cost of a 1–2 KB spec.

## Steps

1. **Read the notes as text, never as page images.** Prefer the Markdown or HTML source. For a PDF, run `pdftotext -layout notes.pdf study/local/<course>/notes.txt` and `grep -n` for chunk titles to get line ranges. Read only the chunks in the current round. Page images cost far more and add nothing a spec needs.
2. **Pick chunks that run as a model.** Starred or "likely tested" chunks with a calculation, an equilibrium or a process over time. Skip chunks that compare ideas (models of mate choice, lists of hypotheses); those suit a hand-built figure or none.
3. **Map each chunk to a view:** `curves` for a quantity against one variable; `replicates` and `popgrid` for chance over generations; `trajectory` and `table` when they exist (they are added in the round that first needs them).
4. **Write specs only.** Copy the nearest existing spec (specs cannot import each other). Use the notes' own worked examples as named states, so the figure reproduces numbers you can check. Put the notes' traps in `notes`. Cite back to the notes (`P1 18–20: …`); no web research for private course figures. Mark anything not in the notes (timings, founder counts) as schematic in `simplified`.
5. **Keep course material private.** Specs and pages go in `study/local/` (git-ignored). Run `git status --porcelain study/local` and expect no output.
6. **Build and check with text output first:** `node study/build.mjs study/local/<course>/specs` and `node --test "study/test/*.test.mjs"`.
7. **Look once.** Make one contact sheet of the round's pages, dark and light, with `reducedMotion: "reduce"` so stepped figures show their last generation. Read it for collisions, clipped grids and light-theme tones. Fix a layout fault in the view (committed), not by tweaking one spec.
8. **Record lessons** below before the next round.

Build one or two figures per round, picking chunks that need different views, so the spec format is corrected before many specs depend on it.

## Lessons

- **Round 1 (Hardy-Weinberg, drift).** Curves that end at the same value collided their labels (A1A2 and A2A2 both reach 0 at p = 1), and the first drift key sat on the axis labels. Both were caught only by looking. The page tests now fail when any SVG text overlaps other text, so later rounds catch this without a screenshot.
- `node --test <dir>` does not work on Node 22; pass the glob `"study/test/*.test.mjs"`.
- Run as root, the repo's Chrome scripts need `CHROME_PATH` pointing to a wrapper that adds `--no-sandbox`. A short Playwright script is the cheaper way to make a contact sheet.
- Bottleneck and founder events are an `event` param, not a schedule inside a state: states must stay JSON. Make the expected curve follow the same event (size schedule, founder sampling), or the gap between simulated and expected teaches the wrong thing.
- The notes' worked examples (p = 0.6; myoglobin p = 0.755 → 0.57, 0.37, 0.06; finches q² = 0.09; albinism q² = 0.00005) make the best named states: each is a number the student can check against the readout.
- A quiz bank may number chunks differently from the study pack (the evolution bank counts across the whole course). Record its numbers in the spec's `quiz` field.
- **Design pass (after round 1).** A 760-wide SVG scaled to a 390 px phone renders 11 px labels at about 5 px. Shrinking the font doesn't help; each view now frames a narrow 360-wide layout too, and the runtime swaps it in at 700 px and below. The page tests check that every SVG text renders at 9 px or more at 390 px, that the readout stays inside the plate, and that nothing overlaps, for every named state.
- Corner readouts are one line on desktop but must wrap on phones; a long readout (the drift one) otherwise runs off the plate. Keep readouts short anyway: the number to check first, then the rest.
- Put the worked-example state buttons directly under the plate, above the sliders, and mark the active one (`aria-pressed`, filled). They are the main way in, and the student needs to see which example the numbers belong to.
- A small population (N = 10) left most of the popgrid box empty with the key stranded on the far right. Let tiles grow (cap 40 units) and place the key beside the grid's real right edge at render time.
- Blue / neutral / red genotypes are safe for colour-blind readers (a blue–red diverging pair, with no red–green contrast), but red at 11 px is 3.78:1 on the light card. Study pages use `--study-red-ink: #d12f36` (4.86:1) for red text in light theme; strokes keep the kit red (graphics need only 3:1). Tick and axis text use `--anatomy-text`, not `muted` (3.2–3.6:1).
- Show "Space: play/pause" and bind Space only on stepped figures; on a static figure it promises something that does nothing.

