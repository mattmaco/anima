# Study figures: the low-token workflow

Use this when someone hands over study notes or a study guide and wants figures to revise with. The output is a set of small specs built by `study/build.mjs` (see `study/README.md`), not hand-built pages. The goal is a working figure per hard chunk for the cost of a 1–2 KB spec.

## Steps

1. **Read the notes as text, never as page images.** Prefer the Markdown or HTML source. For a PDF, run `pdftotext -layout notes.pdf study/local/<course>/notes.txt` and `grep -n` for chunk titles to get line ranges. Read only the chunks in the current round. Page images cost far more and add nothing a spec needs.
2. **Pick chunks that run as a model.** Starred or "likely tested" chunks with a calculation, an equilibrium or a process over time. Skip chunks that compare ideas (models of mate choice, lists of hypotheses); those suit a hand-built figure or none.
3. **Map each chunk to a view:** `curves` for a quantity against one variable; `replicates` and `popgrid` for chance over generations; `trajectory` for deterministic runs over generations; `table` for checks the student reads (expected vs observed, two ratios).
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
- **Round 2 (selection, mutation-selection balance).** One `trajectory` view served both figures: three dominance cases on one plot for selection, and a single q line against a dashed q* for mutation-selection balance. Comparing cases as series on one plot beats a dominance toggle: the shapes (fast then slow, slow then fast) are the point.
- Put the notes' one-generation table in the readout (ω̄, the three after-selection frequencies, p′) so each worked example (pigeons ω̄ 0.3325, pocket mice ω̄ 0.9767) checks in one glance. Expect last-digit differences where the notes round intermediate values; say so rather than tune the model.
- Order inside a generation matters for an equilibrium the student checks: selection then mutation gives the slides' q* = µ/s exactly; mutation then selection lands about 13 % low.
- Mutation-selection frequencies are around 10⁻⁴; a 0–1 axis shows a flat line. `y: "auto"` picks a round top (1, 2, 2.5 or 5 × 10ⁿ). Draw marks above series, or the dashed q* disappears under a run that has settled on it.
- Do not invent a parameter to reproduce a slide claim that omits it (the lava-field "about 400 generations" gives no s); list it under `simplified` instead.

- **Round 3 (balancing vs disruptive selection, effective population size).** Both figures used `trajectory`, with no new view. Several starting frequencies as series against one dashed p* mark show stable vs unstable at a glance: runs converge (overdominance, negative frequency dependence) or diverge (underdominance, positive). Give over- and underdominance the same p* so that only the stability differs.
- `when` tests equality only. Split a four-way mode into two selects (fitness depends on genotype or frequency × balancing or disruptive); here that also matched the notes' own key distinction.
- When the notes give no numbers (no fitness values for sickle cell, NZW/NZB mice, snails or sitters and rovers), name the states after the examples, say first in `simplified` that every value is schematic, and label any standard formula the slides omit (p* = t/(s + t)) as not from the slides.
- Plot heterozygosity as H/H₀ when the notes give no starting H; the 1/2Ne decay is the point, not the level.
- Normalise ω in a readout to the most fit genotype or phenotype: the notes define ω as proportion ÷ most fit, so ω > 1 contradicts them.
- A fourth series is green, and its 11 px label was 3.05:1 on the light card. Light theme now uses `--study-green-ink: #1f7a50` (5.1:1), and a page test checks every series label colour in both themes.
- Changing `#state=` on an open page does not reload it; a checking script must click the state buttons (or call `anima.set`) or it reads the first state every time.
- **Round 4 (dN/dS and McDonald-Kreitman, linkage disequilibrium).** A new `table` view. Its rows are the checks the notes make: the three equilibrium criteria as rows of expected vs observed with a flagged "no", and the MK test as two rows (within, between) whose ratios are compared. A table stacked over a `trajectory` of |D| lets one slider (generations of recombination) turn every "no" into "yes".
- Put both verdicts in one readout when two rules are easy to confuse: "MK: pN/pS 0.200 < dN/dS 0.600 → positive · dN/dS < 1 → purifying" shows the notes' trap of carrying the dN/dS rule over to MK.
- Do the notes' own process in the model rather than pasting its result: the selection survivors are computed from pool 1's zygotes (fewer than 3 capitals die), which gives the haplotype frequencies the slides leave out. Say so in `simplified`.
- A three-column table at 390 px left only 5 px between "0.0000" and "✗ -0.0400". The overlap check passed, so only looking caught it. The table test now asks for an 8 px gap between cells in a row, and narrow tables give the label column 28% of the width.
- `trajectory` clamps at 0, so plot |D|; the notes phrase it the same way ("recombination brings |D| to 0").
- **Round 5 (Muller's ratchet).** A seeded stochastic model on `trajectory` is enough: the asexual population's least-loaded class is a staircase that only climbs, and the sexual one moves both ways. The irreversibility shows in the shape, so no new view was needed.
- Two populations × two statistics as four series put red and green inside one population, and nothing grouped the colours. Plot one statistic per population and put the other in the readout; `trajectory` has no per-series line style to pair them.
- A checking script must pass the spec's own `seed` to the model; with `mulberry32(1)` against a spec seeded 3, the numbers did not match the page.
- Chunks that compare hypotheses (Fisher-Muller, Daphnia, Red Queen) get no figure; say so in the nearest figure's `simplified`.
