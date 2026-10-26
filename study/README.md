# Study mode

Model-driven figures from a short spec, for turning study notes into figures you can play with. Each spec is a small ES module (about 1–2 KB); `study/build.mjs` turns it into a standalone page in Anima's frame (dark and light), plus a `manifest.json` that a reader app can use to show the right figure for the chunk being read.

Hand-built Anima figures draw a structure. Study figures run a model: Hardy-Weinberg genotype curves, drift in replicate populations, and so on. Use study mode when the idea is a calculation or a process over generations; use the hand-built workflow in `SKILL.md` when the idea is a structure.

## Build

```sh
node study/build.mjs <specDir>               # writes <specDir>/../out/*.html and manifest.json
node study/build.mjs <specDir> --out <dir>
node --test "study/test/*.test.mjs"          # unit and page tests (page tests need Playwright)
```

The build exits 1, writing nothing, if a spec is missing a field, names an unknown view, or has a model that closes over module scope, throws, or returns NaN at any param's default, min or max, any option, or any named state.

Public demo: `examples/study-hardy-weinberg/` (`node examples/study-hardy-weinberg/build.mjs`, add `--light` for the light page).

Keep course-derived specs in `study/local/` (git-ignored); course material should not go in this public repo.

## Spec

| Field | Type | Meaning |
|---|---|---|
| `chunk` | number | Chunk number in the source notes; the key a reader app joins on |
| `fig`, `title` | string | Card label and title |
| `view` | string or string[] | `curves`, `replicates`, `popgrid`; an array stacks views vertically |
| `params` | `{ name: { min, max, step, value, label, when? } }` or `{ name: { options, value, label, when? } }` | Sliders and selects. `when: { other: value }` hides the control unless params match |
| `model` | `(params, rng, lib) → data` | Pure; drives both the drawing and the readout |
| `readout` | `(data, params, gen) → string` | Bottom-right text; `gen` is the revealed generation for stepped views (undefined otherwise) |
| `states` | `{ name: partialParams }` | Named states (JSON only). The first is the initial state |
| `notes` | `{ partId: string }` | One-line notes shown on hover or focus |
| `sources` | string[] | Cites back to the notes, e.g. `"P1 11–12: p², 2pq, q²"` |
| `simplified` | string[] | What the figure leaves out |
| `seed` | number, optional | Seed for `rng` (default 1) |
| `quiz` | `{ course, chunks }`, optional | Copied into the manifest, for linking to a quiz bank whose chunk numbers differ |

Functions are copied into the page with `toString()`, so `model` and `readout` must be self-contained: no imports and no module-level constants. Use `lib` for shared helpers:

- `lib.mulberry32(seed)` returns a seeded `() => number` in [0, 1).
- `lib.binomial(n, p, rng)` returns an integer draw (normal approximation above n = 200).
- `lib.wrightFisher({ N, p0, generations, schedule }, rng)` returns `generations + 1` allele frequencies; `schedule(gen) → N` varies the size; the frequency holds after fixation.

## Views

**`curves`**: y-values against one swept param, with a marker and dots at the current value.
`curves: { x: "<param>", series: [{ key, label }], sweep: 101, fixed: { <param>: value } }`. The model must return each series `key` (y in 0–1); `fixed` forces params while sweeping (for example, a mode the sweep should ignore). If the model returns `data[x]`, the marker uses it.

**`replicates`**: many seeded runs over generations (left), and mean heterozygosity against its expectation (right).
`replicates: { runs, generations: "<param>" }`. The model returns `{ runs: number[][], meanH: number[], expectedH: number[] }`. The page reveals one generation every 50 ms.

**`popgrid`**: one population's individuals as an isometric grid, coloured by genotype, for the revealed generation.
The model returns `current: number[][]` (per generation, per individual: 2 = A1A1, 1 = A1A2, 0 = A2A2).

A view module exports `{ name, frame(spec, box) → svg, render(svg, data, params, box, ctx) }`. `frame` runs at build time; `render` is copied into the page and must be self-contained. `ctx` holds `{ spec, model, lib, cache, gen, generations }`.

## Embed contract

- `manifest.json`: `[{ chunk, file, fileLight, title, states, quiz? }]`.
- Host → figure: `postMessage({ type: "anima:set", state: "<name>" })`, or `{ type: "anima:set", params: { ... } }`. Unknown states and params are ignored.
- Figure → host: `{ type: "anima:ready", chunk, states }` on load, and `{ type: "anima:changed", params }` after user input.
- `#state=<name>` in the URL selects a state on load.
- Nothing autoplays when embedded. A stepped figure shows its final generation until the user or the host acts. Under `prefers-reduced-motion` it always shows the final generation.

```html
<iframe id="fig" src="out/02-hardy-weinberg.html"></iframe>
<script>
  const fig = document.getElementById("fig");
  addEventListener("message", (event) => {
    if (event.source !== fig.contentWindow) return;
    if (event.data?.type === "anima:ready") console.log("states:", event.data.states);
  });
  const show = (state) => fig.contentWindow.postMessage({ type: "anima:set", state }, "*");
</script>
```

**Storyteller** (a read-along study reader) can show these figures in a passive side panel. Its outline already marks chunks (`Chunk {n}.` leads from the study pack's level-2 headings). When reading reaches a chunk that has a manifest entry, the panel loads that figure, which stays still until touched.
