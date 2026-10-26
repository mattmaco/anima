# Anima study mode, round 1: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the study-mode builder, runtime and three views, then ship Fig 1 (Hardy-Weinberg, public demo and private course version) and Fig 5 (genetic drift, private).

**Architecture:** `study/build.mjs` loads spec modules, validates and probes them, and writes standalone pages through the kit's `plateHtml`/`pageHtml`, plus `manifest.json`. Spec functions, a small shared `lib` (seeded random number generator, Wright-Fisher) and the view renderers are serialised with `toString()` into one inlined `runtime.js` script per page. Views draw into a single SVG.

**Tech Stack:** Node 20.10+ built-ins only (`node:test`, `node:fs`, `node:url`); the existing `kit/iso-kit.mjs`; the pre-installed Playwright/Chromium for page tests (tests skip when `require('playwright')` fails).

**Spec:** `docs/superpowers/specs/2026-10-26-anima-study-mode-design.md`

## Global Constraints

- Zero runtime dependencies; built pages make no network requests and work from `file://`.
- Every page is built twice: dark and `-light` (Anima convention: `name.html`, `name-light.html`).
- Course-derived files live only under `study/local/` (git-ignored). The public demo carries no slide cites.
- Nothing autoplays when embedded (`window.top !== window`); animation starts only on user input or `anima:set`.
- Under `prefers-reduced-motion`, stochastic views show the final generation with no animation.
- Space pauses and resumes; animation pauses while the figure is offscreen (IntersectionObserver).
- Spec fields and the embed contract are exactly as in spec §4 and §6, with one addition decided here: `model(params, rng, lib)`, where `lib` is the shared helper object from `study/lib.mjs`.
- CI rebuilds every `examples/*/build.mjs` and fails on any diff, so the demo build must be deterministic.

## Review Focus

1. **Allele frequency at 0 or 1** (p slider at its ends, or drift reaching fixation): readouts show numbers or "fixed", never NaN; drift runs stop adding generations after fixation. Covered in Task 1's probe test and Task 3's `fixation` test.
2. **Unknown state name from the host** (`anima:set` with a typo): ignored without throwing; the figure stays as it was. Covered in Task 2's `unknown-state` page test.
3. **Changing N or the state while a drift run is animating:** the run restarts from generation 0 with the same seed, with no leftover replicate lines. Covered in Task 3's `restart` page test.
4. **Opening a page inside an iframe:** no animation frames run until a message or user input arrives. Covered in Task 2's `no-autoplay` page test.
5. **Phone width (390 px):** no horizontal page scroll; the SVG scales down. Covered in Task 2's `phone-width` page test, re-run for Fig 5 in Task 3.

---

### Task 1: Builder core (spec loading, validation, model probe, manifest)

**Files:**
- Create: `study/build.mjs`, `study/lib.mjs`, `study/test/build.test.mjs`, `study/test/fixtures/ok.mjs`, `study/test/fixtures/closure.mjs`, `study/test/fixtures/nan.mjs`
- Modify: `.gitignore` (add `study/local/`)

**Interfaces:**
- Produces in `study/lib.mjs`: `export const lib = { mulberry32(seed) → () => number in [0,1), binomial(n, p, rng) → integer, wrightFisher({ N, p0, generations, schedule }, rng) → number[] }` where `schedule` is an optional `(gen) => N` and the returned array has `generations + 1` frequencies and holds its last value after fixation. Every member must be self-contained, because they are serialised.
- Produces in `study/build.mjs`:
  - `validateSpec(spec) → string[]`: one message per problem. Required fields are `chunk`, `fig`, `title`, `view`, `params`, `model`, `readout`, `states`, `sources`, `simplified`. `view` names must be in `VIEWS`, the exported list of known view names: `["curves", "replicates", "popgrid"]` this round.
  - `probeModel(spec) → string[]`: rebuilds `model` and `readout` from their source text with `new Function`, so a closure over module scope fails here. It runs them at each param's default, min and max (and each option of an `options` param) with `lib.mulberry32(spec.seed ?? 1)`, and reports thrown errors, and `NaN` or `undefined` anywhere in the returned data or readout string.
  - `buildPage(spec, { theme }) → string`: full HTML (filled in by Task 2; this task returns a `pageHtml` shell containing the plate and an empty SVG).
  - `buildAll(specDir, outDir) → Promise<{ manifest, errors }>`: loads every `*.mjs` in `specDir` in filename order, writes `<slug>.html` and `<slug>-light.html` (slug = spec file's basename) and `manifest.json` as `[{ chunk, file, fileLight, title, states }]`.
  - CLI: `node study/build.mjs <specDir> [--out <dir>]` (default out is `<specDir>/../out`). It prints each error as `<file>: <message>` and exits 1 if there are any, writing nothing.

- [ ] **Step 1: Write the failing tests in `study/test/build.test.mjs`**

```js
test("validateSpec lists missing fields", () => {
  assert.deepEqual(validateSpec({ ...ok, sources: undefined }), ["missing field: sources"]);
  assert.match(validateSpec({ ...ok, view: "pie" })[0], /unknown view: pie/);
});
test("probeModel rejects closures", () => assert.match(probeModel(closure)[0], /not defined/));
test("probeModel rejects NaN at a param edge", () => assert.match(probeModel(nan)[0], /NaN.*p=0/));
test("probeModel accepts ok", () => assert.deepEqual(probeModel(ok), []));
test("mulberry32 is reproducible", () => {
  const a = lib.mulberry32(7), b = lib.mulberry32(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});
test("wrightFisher holds after fixation", () => {
  const run = lib.wrightFisher({ N: 2, p0: 0.5, generations: 200 }, lib.mulberry32(3));
  const end = run.at(-1);
  assert.ok(end === 0 || end === 1);
  assert.equal(run.length, 201);
});
test("buildAll writes pages and manifest", async () => {
  const { manifest, errors } = await buildAll(fixturesOkOnlyDir, tmpOut);
  assert.deepEqual(errors, []);
  assert.deepEqual(Object.keys(manifest[0]), ["chunk", "file", "fileLight", "title", "states"]);
  assert.ok(existsSync(join(tmpOut, "ok.html")) && existsSync(join(tmpOut, "ok-light.html")));
});
```

`ok.mjs` is a minimal `curves` spec with a `p` param in [0, 1]. `closure.mjs` has a model that references a module-level `const K`. `nan.mjs` has a model that returns `{ y: 1 / p - 1 / p }`, which is NaN at p = 0. For `fixturesOkOnlyDir`, copy `ok.mjs` into a temp directory in the test.

- [ ] **Step 2:** Run `node --test study/test/` and expect FAIL (module not found).
- [ ] **Step 3:** Implement `study/lib.mjs` and `study/build.mjs` to the interfaces above. `binomial` may use the normal approximation when `n > 200` (with `Math.round` and clamping to [0, n]), otherwise direct Bernoulli sums.
- [ ] **Step 4:** Run `node --test study/test/` and expect PASS.
- [ ] **Step 5:** Commit: `study: builder core with spec validation, model probe and manifest`.

---

### Task 2: Runtime, `curves` view, embed contract, public Hardy-Weinberg demo

**Files:**
- Create: `study/runtime.js`, `study/views/curves.mjs`, `examples/study-hardy-weinberg/spec.mjs`, `examples/study-hardy-weinberg/build.mjs`, `study/test/page.test.mjs`
- Modify: `study/build.mjs` (`buildPage` fills in controls, the view frame and the inlined runtime), `.github/workflows/ci.yml` (add the step `node --test study/test/` after the kit smoke test)
- Output (committed): `examples/study-hardy-weinberg/study-hardy-weinberg.html`, `-light.html`

**Interfaces:**
- Consumes: `buildPage`, `lib` (Task 1).
- Produces:
  - A view module exports `{ name, frame(spec, box) → svgString, render(svg, data, params, box) → void }`, where `box = { x, y, w, h }` is the view's region inside the figure. `render` must be self-contained (it is serialised); it updates elements by `id` or class inside `svg` and creates none it has already created.
  - `curves`: the spec supplies `view: "curves"` and `curves: { x: "p", series: [{ key, label }], sweep: 101 }`. The frame draws axes 0–1, ticks every 0.25 and a label per series at its right end. `render` calls `model` across the sweep once per param change (cached by the non-x params), then moves a marker and a dot per series to the current x.
  - The runtime exposes on `window.anima`: `{ set(nameOrParams), params, play(), pause() }`. It handles the messages in spec §6: it posts `anima:ready` on load and `anima:changed` after user input, and reads `#state=<name>` on load.
  - Controls: `<input type="range">` for numeric params, `<select>` for `options`, plus a state button row; all have labels; the page's `<output>` reflects values.
- `examples/study-hardy-weinberg/build.mjs` follows the other examples: `node build.mjs` writes the dark page and `--light` writes the light page, next to itself, through `buildPage`.
- Demo spec content: param `p`; series `AA` (p²), `Aa` (2pq), `aa` (q²). An option param `mode: ["allele", "recessive"]`. In `recessive` mode an `aa` slider (0–0.25) sets q = √aa and the readout shows `q = …, carriers 2pq = …`. States `p=0.5` and `p=0.6`. Sources: general textbook statement of Hardy-Weinberg (no slide cites). Simplified: one locus, two alleles, random mating, no selection, mutation, migration or drift.

- [ ] **Step 1: Write failing page tests in `study/test/page.test.mjs`**, using Playwright on the built demo page via `file://`. Skip the file if `import("playwright")` fails.

```js
test("ready message and hash state", async () => {   // open in an iframe host page
  assert.deepEqual(readyMsg, { type: "anima:ready", chunk: 2, states: ["p=0.5", "p=0.6"] });
  // load with #state=p=0.6 → readout contains "0.36" and "0.48"
});
test("anima:set switches state", async () => { /* post {type:"anima:set", state:"p=0.5"} → readout contains "0.50" for Aa */ });
test("unknown-state", async () => { /* post state "nope" → no page error, readout unchanged */ });
test("no-autoplay", async () => { /* in iframe: count requestAnimationFrame callbacks over 500 ms = 0 before any message */ });
test("phone-width", async () => { /* viewport 390 → document.scrollingElement.scrollWidth <= 390 */ });
test("p at 0 and 1", async () => { /* set slider to 0 then 1 → readout has no "NaN" */ });
test("offline", async () => { /* page.on("request") sees only the file:// page itself */ });
```

The demo uses `chunk: 2`, which is the generic Hardy-Weinberg position; it is metadata only.

- [ ] **Step 2:** Run `node examples/study-hardy-weinberg/build.mjs && node --test study/test/` and expect FAIL.
- [ ] **Step 3:** Implement `curves.mjs`, `runtime.js` and the `buildPage` additions, then the demo spec and build. Draw series with the kit's `.iso` colour variables, so both themes work without new CSS.
- [ ] **Step 4:** Run the build for both themes and `node --test study/test/`, and expect PASS. Then run `node scripts/lines.mjs examples/study-hardy-weinberg/study-hardy-weinberg.html` and expect exit 0. Run the build twice and check `git diff --exit-code examples/study-hardy-weinberg` to confirm the output is deterministic.
- [ ] **Step 5:** Commit: `study: runtime, curves view, embed contract and Hardy-Weinberg demo`.

---

### Task 3: `replicates` and `popgrid` views, animation and the drift test spec

**Files:**
- Create: `study/views/replicates.mjs`, `study/views/popgrid.mjs`, `study/test/fixtures/drift.mjs`, `study/test/drift.test.mjs`
- Modify: `study/build.mjs` (`VIEWS` adds the two names; a spec whose `view` is an array stacks the views vertically), `study/runtime.js` (step loop), `study/test/page.test.mjs` (drift page tests)

**Interfaces:**
- Consumes: `lib.wrightFisher`, `lib.mulberry32`, the view module shape (Task 2).
- Produces:
  - **Stochastic spec fields:** `replicates: { runs: 20, generations: "generations" }` (the name of the param holding the length). `model(params, rng, lib)` returns `{ runs: number[][], meanH: number[], expectedH: number[], current: number[] }`, where `current` is one run's genotype counts per generation, as `[AA, Aa, aa]` per generation.
  - **Runtime step loop:** when a spec has `replicates`, the runtime computes the full model once per param or state change (seeded, so it is deterministic), then reveals one generation per animation frame. The step loop stops at the last generation, under reduced motion it jumps straight to the end, and after a change it restarts at generation 0 with the same seed. Space toggles play.
  - **`replicates` view:** draws the runs as thin polylines (generation on x, p from 0 to 1 on y) up to the revealed generation, the `meanH` line and a dashed `expectedH` line on a second scale 0–0.5 at the right edge, and a "fixed" tick at the y = 0 and y = 1 edges counting fixed runs.
  - **`popgrid` view:** an isometric grid (via `fitProjection` and `iso`, computed at build time in `frame`) of `N` individual tiles for the revealed generation, coloured by genotype with three kit tones. Tiles are created once per N; `render` only changes classes.
  - **`fixtures/drift.mjs`:** the generic drift model the private Fig 5 also uses. Params: `N` options [10, 50, 500], `p0` 0.05–0.95 (default 0.5), `generations` options [50, 100, 200] (default 100). States: `N=10`, `N=500`, `bottleneck` (`schedule`: N = 500, then 10 for generations 20–25, then 500), `founder` (N = 500, `p0` drawn as the frequency in a sample of 5 individuals from p = 0.5). Per run, H = 2p(1 − p); `expectedH[t] = H0 * (1 - 1/(2N))^t` (spec §8).

- [ ] **Step 1: Write failing tests in `study/test/drift.test.mjs`**

```js
test("drift is reproducible", () => assert.deepEqual(run(drift, { N: 50 }, 1), run(drift, { N: 50 }, 1)));
test("mean H tracks expectation", () => {   // 400 runs, N=50, 60 generations
  const { meanH, expectedH } = run(drift, { N: 50, generations: 100 }, 1, { runs: 400 });
  assert.ok(Math.abs(meanH[60] - expectedH[60]) < 0.03);
});
test("fixation", () => {                     // N=10, 200 generations: every fixed run is constant after fixing
  const { runs } = run(drift, { N: 10, generations: 200 }, 2);
  for (const r of runs) { const i = r.findIndex((p) => p === 0 || p === 1); if (i >= 0) assert.ok(r.slice(i).every((p) => p === r[i])); }
});
test("bottleneck lowers H more than constant N=500", () => { /* meanH at gen 40: bottleneck < N=500 */ });
```

Here `run(spec, params, seed, overrides)` is a test helper that calls `spec.model` with `lib.mulberry32(seed)`. Also add page tests for `restart` (change N mid-run, then the revealed generation resets to 0 and the polyline count stays at `runs`), and for `phone-width` and `no-autoplay` on a page built from `fixtures/drift.mjs`.

- [ ] **Step 2:** Run `node --test study/test/` and expect FAIL.
- [ ] **Step 3:** Implement both views, the runtime step loop, the stacked-view layout and the fixture spec.
- [ ] **Step 4:** Run `node --test study/test/` and expect PASS.
- [ ] **Step 5:** Commit: `study: replicates and popgrid views with seeded drift animation`.

---

### Task 4: Private BIOL 2040 figures (Fig 1 and Fig 5)

**Files (all git-ignored, never committed):**
- Create: `study/local/biol2040/notes.txt` (`pdftotext -layout` of the uploaded pack), `study/local/biol2040/specs/02-hardy-weinberg.mjs`, `study/local/biol2040/specs/13-genetic-drift.mjs`
- Output: `study/local/biol2040/out/*.html`, `manifest.json`

**Interfaces:**
- Consumes: the demo spec (Task 2) and `fixtures/drift.mjs` (Task 3) as starting points; copy them, because specs cannot import (they are serialised).

- [ ] **Step 1:** Extract the text with `pdftotext -layout <pack.pdf> study/local/biol2040/notes.txt` and read only chunks 2–3, 13–14 and 17–18 from it.
- [ ] **Step 2:** Write `02-hardy-weinberg.mjs` with `chunk: 2` and `fig: "Fig 1"`. Its sources are slide cites from the notes, for example `"P1 11–12: genotype frequencies p², 2pq, q² under random mating"` and `"P1 14–16: worked example p = 0.6 → 0.36, 0.48, 0.16"`. Add the recessive-allele cites from chunk 3. Notes and simplifications use the notes' own wording and traps, such as "2pq is the heterozygote frequency, not 2p or p × q".
- [ ] **Step 3:** Write `13-genetic-drift.mjs` with `chunk: 13` and `fig: "Fig 5"`, with sources from P3 29–36 and P4 3–16. Where the notes give the bottleneck example (northern elephant seal) or the founder examples (Manx cats, black spruce), name them in the state labels and notes. Don't invent numbers the notes lack.
- [ ] **Step 4:** Run `node study/build.mjs study/local/biol2040/specs` and expect exit 0 and a two-entry manifest. Then confirm `git status --porcelain study/local` prints nothing (the folder is ignored).
- [ ] **Step 5:** Run `node scripts/capture.mjs` once per page, dark and light (4 captures), with `--out` under the scratchpad, then combine them into one contact-sheet image for the round review. Look for overlapping labels, unreadable light-theme tones and clipped grids, and fix any you find in the views (committed) or the specs (private).
- [ ] **Step 6:** No commit for the private files. Commit any view fixes from Step 5 with a message describing the fix.

---

### Task 5: Documentation: `study/README.md`, `references/study.md`, `SKILL.md` entry

**Files:**
- Create: `study/README.md`, `references/study.md`
- Modify: `SKILL.md` (Workflow section: add a 3–5 line "Study figures" entry that routes requests to `references/study.md`), `README.md` (one gallery row for the study demo), `CHANGELOG.md` (one Unreleased entry)

**Contents:**
- `study/README.md`:
  - The spec field table from spec §4, with the `model(params, rng, lib)` signature and the `lib` members.
  - The view list with each view's spec fields.
  - The embed contract from spec §6, word for word, including a 10-line host example: an iframe, `anima:ready` handling and `anima:set`.
  - A "Storyteller" paragraph: the manifest is keyed by chunk number, matching Storyteller's `Chunk {n}.` outline leads, and the panel is passive.
- `references/study.md`: the workflow from spec §7, plus a **Lessons** section seeded with what Tasks 1–4 turned up: anything that was surprising, broke or cost more than expected.

- [ ] **Step 1:** Write the three documentation changes.
- [ ] **Step 2:** Check every command in `study/README.md` by running it as written, and expect the outputs it states.
- [ ] **Step 3:** Run `node --test study/test/` and rebuild all examples (the CI loop), then check `git status --porcelain` and expect it clean apart from the intended changes.
- [ ] **Step 4:** Commit: `study: document study mode, the low-token workflow and the embed contract`, then push to `claude/gallant-goodall-ntrad3`.
