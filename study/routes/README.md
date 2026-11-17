# Life-cycle route animations

Builds one standalone page per parasite life cycle: a schematic host (or hosts) with the parasite moving stage by stage along its route, numbered stage callouts, cycle arrows, a stage tour with play/pause, hover notes, a dark/light toggle and previous/next links between cycles. Every page is written in a dark and a light version.

```sh
node study/routes/build.mjs            # all cycles
node study/routes/build.mjs ascaris    # one cycle, by slug
```

## Where things live

| Path | What it is |
|---|---|
| `build.mjs` | Page template and CSS, size policy for adults (`CAP`, long worms drawn as strands), fading of organs a cycle doesn't use, arrows, numbered callouts, legend, previous/next links. |
| `runtime.js` | The in-page tour: stage timing, moving sprites, strands, track reveal, hover notes, keyboard, reduced motion, theme toggle. |
| `actors.mjs` | Host and setting drawings with named route points and centrelines: human, generic mammal, rodent (rat or rabbit), flea, snail, fish, gill close-up, crab, copepod, fly or mosquito (optional salivary glands), insect, annelid, frog, tadpole, plants, water, soil, cloth (clothing, bedding, mattress seams). |
| `forms.mjs` | Parasite stage drawings (eggs, miracidium, cercaria, cysts, flukes, worms, tapeworm, cysticercus, hydatid, microfilaria; trypanosomes, Leishmania, Plasmodium stages, gut flagellates, Balantidium, amoebae; leech, Argulus, ticks, mites, lice, bed bug, flea, mosquito and ked stages), shared by the static drawings and the moving sprites. |
| `lib.mjs` | Geometry and drawing helpers: smooth paths, organs, tubes. |
| `tools/` | Checks run in headless Chromium: `collide.cjs` (label collisions), `sheet.cjs` and `stg.cjs` (contact sheets), `pix.cjs` (before/after pixel comparison), `shot.cjs`, `zoom.cjs`, `sizes.mjs` (adults and drawings whose data sizes exceed the caps; the build clamps them). |

## Data stays out of git

The per-cycle data (stage text, routes, captions and sources) is written from course notes, so it lives in `study/local/routes/data/`, which `.gitignore` already excludes, like other course material (see `references/study.md`). `data/index.mjs` there must export `CYCLES` in index order. Built pages go to `study/local/routes/out/`.

Optional per-cycle `blueLabel` renames the blue legend entry (default "into or out of the definitive host").

Point the build elsewhere with `ROUTES_DATA=/path/to/index.mjs` and `ROUTES_OUT=/path/to/dir`.

## Checks

```sh
node study/routes/tools/collide.cjs 04-schistosoma-route 18-ascaris-route   # page names in the out folder, without .html
node study/routes/tools/sizes.mjs
```
