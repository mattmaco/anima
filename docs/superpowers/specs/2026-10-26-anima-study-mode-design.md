# Anima study mode: model-driven figures from study notes — design

Date: 2026-10-26 · Status: approved in brainstorming, awaiting spec review

## 1. Purpose and success criteria

**Who:** Matt, studying for BIOL 2040 (Evolution) Midterm 2, and later any student who hands Claude a study guide.

**What he said:**
- The figures are for his own studying, not the public gallery.
- Token cost matters; build one or two figures at a time and learn as we go.
- Non-PDF source formats are welcome.
- He wants the work to expand what Anima can do, and to plug into Storyteller (`mattmaco/The-Mattmaco-Storyteller`), his local TTS read-along study reader, currently being built.

**Assumptions (correct me):**
- Course-derived specs and pages stay out of the public repo (git-ignored); the generic extension and one non-course demo are committed.
- Slide cites from the study guide are sufficient sources for the private figures.

**Success:**
- For each hard chunk, Matt opens a standalone page, moves the key variable, and sees the idea work (for example, drift fixes alleles faster at small N).
- A new figure costs a 1–2 KB spec, not a 20–50 KB hand-written build.
- Storyteller can show the right figure for the chunk being read, using only a manifest and a postMessage API.

**Out of scope:** gallery-standard sourcing for private figures; sexual-selection chunks (28, 34), which compare ideas rather than run a model; any change to the Storyteller repo (it gets an integration note only).

## 2. What study mode adds to Anima

Existing Anima figures are hand-built structural pictures. Study mode adds **model-driven figures generated from a short spec**, cheap enough to cover a whole study guide. It reuses Anima's frame (`plateHtml`, `pageHtml` from `kit/iso-kit.mjs`): the `Fig n` card, title, hint, live readout, hover notes, sources and simplifications blocks, both themes, pause on Space, still frame under `prefers-reduced-motion`.

## 3. Layout

```
study/                           committed
  build.mjs                      specs → standalone pages (dark + light) + manifest.json
  runtime.js                     in-page: controls, readout, named states, postMessage
  views/<name>.mjs               one file per view; built only when a figure needs it
  README.md                      spec format, views, embed contract
references/study.md              committed: the low-token workflow for Claude
examples/study-hardy-weinberg/   committed: public demo from general textbook knowledge
study/local/                     git-ignored
  biol2040/specs/NN-<slug>.mjs
  biol2040/out/*.html, manifest.json
```

`SKILL.md` gains a short "Study figures" entry under Workflow that routes study-guide requests to `references/study.md`.

## 4. Spec format

A spec is a plain ES module with a default export:

| Field | Type | Meaning |
|---|---|---|
| `chunk` | number | Chunk number in the source notes (the join key for Storyteller) |
| `fig`, `title` | string | Card label and title |
| `view` | string or string[] | One or more of the view names in §5 |
| `params` | `{name: {min, max, step, value, label}}` or `{name: {options: [...], value, label}}` | Sliders and toggles |
| `model` | pure function `(params, rng?) → data` | Drives both the drawing and the readout; `rng` only for stochastic views |
| `readout` | `(data, params) → string` | Bottom-right live text |
| `states` | `{name: partialParams}` | Named states; first one is the initial state |
| `notes` | `{partId: string}` | One-line hover/focus explanations |
| `sources` | string[] | Cites back to the notes, e.g. `"P1 11–12: p², 2pq, q²"` |
| `simplified` | string[] | What the figure leaves out |
| `seed` | number (optional) | Seed for stochastic models |

The builder serialises `model`, `readout` and view options into the page with `Function.prototype.toString`, so models must be self-contained (no closures over module scope). The build fails with a clear message if a model references an undefined name (checked by evaluating it once at build time).

## 5. Views

Each view is `render(svgRoot, data, params, theme)` plus a static `frame(spec)` that returns the axes, legend and labels as SVG at build time.

| View | Draws | First used by |
|---|---|---|
| `curves` | y-values against a swept x param, with a marker at the current value | Fig 1 (round 1) |
| `replicates` | many seeded runs of a stochastic model over generations; summary line | Fig 5 (round 1) |
| `popgrid` | isometric grid of individuals coloured by genotype, one generation at a time (uses `iso`, `fitProjection`) | Fig 5 (round 1) |
| `trajectory` | one deterministic run over generations | round 2 |
| `table` | editable 2×2 counts with derived ratios | round 4 |

Views are written only in the round that first needs them.

## 6. Runtime and the embed contract

`runtime.js` is inlined into every page. It binds controls to params, re-runs `model`, calls each view's `render`, and updates the readout. Stochastic models step one generation per animation frame, paused offscreen and under reduced motion (which shows the final state).

**Embed contract (for Storyteller or any host):**
- `manifest.json`: `[{chunk, file, fileLight, title, states: [names]}]`.
- Host → figure: `postMessage({type: "anima:set", state: "<name>"})`; also accepts `{type: "anima:set", params: {...}}`.
- Figure → host: `postMessage({type: "anima:ready", chunk, states})` on load, and `{type: "anima:changed", params}` after user input.
- URL hash `#state=<name>` selects a state on load, so a plain link also works.
- Nothing autoplays when embedded; animation starts only on user input or `anima:set`.

Storyteller's intended use (option A, passive panel): when reading reaches a chunk with an entry in the manifest, its side panel loads that figure and stays still until touched. Storyteller's outline already identifies chunks (`Chunk {n}.` leads, level-2 TOC entries).

## 7. Low-token workflow (`references/study.md`)

1. Read notes as text (Markdown/HTML source, or `pdftotext -layout`), never as page images; read only the chunks in the current round.
2. Pick starred or flagged chunks that run as a model; map each to a view; skip chunks that only compare ideas.
3. Write specs only. Cite back to the notes. No web research for private figures.
4. Build; run the text checks (§8); take one contact-sheet screenshot of the round's figures in both themes.
5. Record lessons from the round in `references/study.md`.

## 8. Verification

- `node study/build.mjs <specDir>` exits non-zero on a spec missing a required field, an unknown view, a non-self-contained model, or a model that throws or returns NaN at the default, min and max of each param.
- Unit checks (Node's built-in `node:test`) for the models in round 1: HW genotype frequencies sum to 1 for p in [0, 1]; drift with a fixed seed is reproducible; mean heterozygosity across many replicates tracks H₀(1 − 1/2N)^t within tolerance.
- Existing scripts on each page: `scripts/lines.mjs` for label and leader-line checks, and one `scripts/capture.mjs` contact sheet per round.
- Pages open from `file://` with no network requests.

## 9. Rounds

| Round | Figures | New views |
|---|---|---|
| 1 | Fig 1 Hardy-Weinberg genotypes (chunks 2–3, P1 8–26); Fig 5 Genetic drift (chunks 13–14, 17–18, P3 29–36, P4 3–16); public HW demo | `curves`, `replicates`, `popgrid` |
| 2 | Fig 2 Selection and relative fitness (4–6); Fig 4 Mutation-selection balance (9) | `trajectory` |
| 3 | Fig 3 Balancing vs disruptive selection (7–8); Fig 6 Effective population size (15) | none |
| 4 | Fig 7 dN/dS and McDonald-Kreitman (20–21); Fig 8 Linkage disequilibrium (22–23) | `table` |
| 5 | Fig 9 Muller's ratchet (26–27) | none |

After each round Matt reviews the pages; spec-format or view changes and lessons go into `references/study.md` before the next round. The order of rounds 2–5 may change.

**Round 1 figure details:**
- *Fig 1:* param `p` (0–1). `curves` plots p², 2pq, q² against p with a marker at the current p. Toggle `recessive`: an `aa` frequency slider replaces `p`, readout shows q = √(aa) and carrier frequency 2pq. States: `p=0.6` (the slides' worked example), `p=0.5`.
- *Fig 5:* params `N` (options 10, 50, 500), `p0` (0.5 default), `generations` (100). `replicates` draws about 20 seeded Wright-Fisher runs plus mean heterozygosity against H₀(1 − 1/2N)^t; `popgrid` shows one run's current generation as 2N alleles in an isometric grid. States: `N=10`, `N=500`, `bottleneck` (N drops to 10 for a few generations, then recovers), `founder` (starts from a small sample of a large population).

## 10. Risks

- **Serialising functions** breaks if a model closes over module scope; the build-time check in §8 catches this.
- **Course content in a public repo:** `study/local/` is git-ignored; the public demo uses only general textbook facts with no slide cites.
- **Views too generic for some topics:** such topics go to the existing hand-built workflow or are skipped.
