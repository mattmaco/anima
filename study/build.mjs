import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { figureSvg, pageHtml, plateHtml } from "../kit/iso-kit.mjs";
import { esc } from "./esc.mjs";
import { lib } from "./lib.mjs";
import { curves } from "./views/curves.mjs";
import { popgrid } from "./views/popgrid.mjs";
import { replicates } from "./views/replicates.mjs";
import { trajectory } from "./views/trajectory.mjs";

export const VIEWS = ["curves", "replicates", "popgrid", "trajectory"];
const REQUIRED = ["chunk", "fig", "title", "view", "params", "model", "readout", "states", "sources", "simplified"];

// Turn a function back into a value from its source alone, so anything it closes over is lost.
// Source of a function as an expression; method shorthand (`model(p) {…}`) becomes a function expression.
export function fnSource(fn) {
  const src = fn.toString();
  return /^(async\s+)?(function\b|\(|[\w$]+\s*=>)/.test(src) ? src : `function ${src}`;
}

export function revive(fn) {
  return new Function("lib", `return (${fnSource(fn)});`)(lib);
}

export function validateSpec(spec) {
  const errors = REQUIRED.filter((key) => spec[key] === undefined).map((key) => `missing field: ${key}`);
  for (const view of [spec.view ?? []].flat()) if (!VIEWS.includes(view)) errors.push(`unknown view: ${view}`);
  for (const key of ["model", "readout"]) if (spec[key] !== undefined && typeof spec[key] !== "function") errors.push(`${key} must be a function`);
  return errors;
}

export function defaults(spec) {
  return Object.fromEntries(Object.entries(spec.params).map(([name, param]) => [name, param.value]));
}

function probeCases(spec) {
  const base = { ...defaults(spec), ...Object.values(spec.states)[0] };
  const cases = [base];
  for (const [name, param] of Object.entries(spec.params)) {
    const values = param.options ?? [param.min, param.value, param.max];
    for (const value of values) cases.push({ ...base, [name]: value });
  }
  for (const state of Object.values(spec.states)) cases.push({ ...base, ...state });
  return cases;
}

function badValue(value) {
  if (value === undefined || (typeof value === "number" && Number.isNaN(value))) return true;
  if (Array.isArray(value)) return value.some(badValue);
  if (value && typeof value === "object") return Object.values(value).some(badValue);
  return false;
}

export function probeModel(spec) {
  let model, readout;
  try {
    model = revive(spec.model);
    readout = revive(spec.readout);
  } catch (error) {
    return [`cannot serialise: ${error.message}`];
  }
  const errors = [];
  for (const params of probeCases(spec)) {
    const where = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(", ");
    try {
      const data = model(params, lib.mulberry32(spec.seed ?? 1), lib);
      if (badValue(data)) { errors.push(`NaN or undefined in model at ${where}`); continue; }
      const text = readout(data, params);
      if (typeof text !== "string" || /NaN|undefined/.test(text)) errors.push(`bad readout at ${where}: ${text}`);
    } catch (error) {
      errors.push(`${error.message} (at ${where})`);
    }
    if (errors.length) break;
  }
  return errors;
}

const VIEW_MODULES = { curves, replicates, popgrid, trajectory };
// Two layouts per page: wide (the static SVG) and narrow, which the runtime swaps in on phones so text stays legible.
const LAYOUT = {
  wide: { width: 760, height: { curves: 320, replicates: 300, popgrid: 260, trajectory: 300 } },
  narrow: { width: 360, height: { curves: 280, replicates: 480, popgrid: 240, trajectory: 280 } },
};
const RUNTIME = readFileSync(new URL("./runtime.js", import.meta.url), "utf8");
const TOP = 40;
const BOTTOM = 44;

function layout(spec, kind = "wide") {
  const { width, height } = LAYOUT[kind];
  let y = TOP;
  const boxes = [spec.view].flat().map((name) => {
    const box = { name, box: { x: 20, y, w: width - 40, h: height[name] } };
    y += height[name];
    return box;
  });
  const frames = boxes.map(({ name, box }) => VIEW_MODULES[name].frame(spec, box)).join("");
  return { boxes, width, height: y + BOTTOM, frames };
}

function controlsHtml(spec) {
  const inputs = Object.entries(spec.params).map(([name, param]) => {
    const when = param.when ? ` data-when="${esc(JSON.stringify(param.when))}"` : "";
    const field = param.options
      ? `<select id="param-${name}">${param.options.map((option) => `<option value="${esc(option)}">${esc(option)}</option>`).join("")}</select>`
      : `<input id="param-${name}" type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}">`;
    return `<label${when}><span>${esc(param.label)} <output for="param-${name}"></output></span>${field}</label>`;
  });
  const states = Object.keys(spec.states).map((name) => `<button type="button" data-state="${esc(name)}" aria-pressed="false">${esc(name)}</button>`).join("");
  return `<div class="study-states" role="group" aria-labelledby="study-states-title"><span id="study-states-title" class="study-kicker">Worked examples</span>${states}</div><div class="study-controls" role="group" aria-label="Model controls">${inputs.join("")}</div><p class="study-note" aria-live="polite">Hover or focus a label for a note.</p><p class="study-live" aria-live="polite"></p>`;
}

function notesHtml(spec) {
  const list = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
  return `<section class="study-meta"><h2>Sources</h2>${list(spec.sources)}<h2>Simplified</h2>${list(spec.simplified)}<p class="study-edu">Educational study figure. Check it against your course materials.</p></section>`;
}

const STUDY_CSS = `
.study-figure{display:block;width:100%;height:auto}
.study-axis{stroke:var(--anatomy-lo);stroke-width:1}
.study-grid{stroke:var(--anatomy-faint);stroke-width:1}
.study-marker{stroke:var(--anatomy-mid);stroke-width:1;stroke-dasharray:3 3}
.study-tick,.study-axis-label{fill:var(--anatomy-text);font:10.5px var(--anatomy-mono)}
.study-label{font:11px var(--anatomy-mono);outline:none}
.study-figure [data-note]:focus-visible{text-decoration:underline}
body[data-theme="light"]{--study-red-ink:#d12f36;--study-green-ink:#1f7a50}
.study-series{fill:none;stroke-width:2}
.study-dot{stroke:var(--anatomy-card);stroke-width:1.5}
.study-s0{stroke:var(--anatomy-blue)}.study-label.study-s0,.study-dot.study-s0{fill:var(--anatomy-blue)}
.study-s1{stroke:var(--anatomy-strong)}.study-label.study-s1,.study-dot.study-s1{fill:var(--anatomy-strong)}
.study-s2{stroke:var(--anatomy-red)}.study-dot.study-s2{fill:var(--anatomy-red)}.study-label.study-s2{fill:var(--study-red-ink,var(--anatomy-red))}
.study-s3{stroke:var(--anatomy-green)}.study-dot.study-s3{fill:var(--anatomy-green)}.study-label.study-s3{fill:var(--study-green-ink,var(--anatomy-green))}
.study-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 20px;margin:16px 0 8px}
.study-controls label{display:grid;gap:4px;font:12px var(--anatomy-mono);color:var(--anatomy-text)}
.study-controls label[hidden]{display:none}
.study-controls output{color:var(--anatomy-strong)}
.study-controls input,.study-controls select{width:100%;accent-color:var(--anatomy-blue)}
.study-states{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:16px 0 8px}
.study-kicker{flex-basis:100%;font:11px var(--anatomy-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--anatomy-text)}
.study-states button{font:12px var(--anatomy-mono);color:var(--anatomy-strong);background:var(--anatomy-face);border:1px solid var(--anatomy-mid);border-radius:6px;padding:6px 12px;cursor:pointer}
.study-states button:hover{border-color:var(--anatomy-strong)}
.study-states button[aria-pressed="true"]{background:var(--anatomy-strong);border-color:var(--anatomy-strong);color:var(--anatomy-card)}
.study-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.study-note{min-height:1.6em;color:var(--anatomy-strong);margin:8px 0 20px}
.study-meta h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--anatomy-muted);margin:18px 0 4px}
.study-meta ul{margin:0;padding-left:18px}
.study-edu{color:var(--anatomy-muted);font-size:12px}
.study-mark{stroke:var(--anatomy-text);stroke-width:1;stroke-dasharray:5 4}
.study-mark-label{fill:var(--anatomy-text)}
.study-run{fill:none;stroke:var(--anatomy-mid);stroke-width:1;opacity:.75}
.study-mean{fill:none;stroke:var(--anatomy-strong);stroke-width:2}
.study-expected{fill:none;stroke:var(--anatomy-blue);stroke-width:1.5;stroke-dasharray:5 4}
.study-key{fill:var(--anatomy-text);font:11px var(--anatomy-mono);outline:none}
.study-key.study-s0{fill:var(--anatomy-blue)}
.study-axis-label[tabindex]{outline:none}
.study-swatch.study-s0{fill:var(--anatomy-blue)}.study-swatch.study-s1{fill:var(--anatomy-strong)}.study-swatch.study-s2{fill:var(--anatomy-red)}
.study-ind polygon{stroke:var(--anatomy-card);stroke-width:.4}
.study-ind .l{opacity:.78}.study-ind .r{opacity:.6}
.study-ind.g2 polygon{fill:var(--anatomy-blue)}.study-ind.g1 polygon{fill:var(--anatomy-strong)}.study-ind.g0 polygon{fill:var(--anatomy-red)}
.study-figure[data-layout="narrow"]{max-width:480px}
@media (max-width:560px){.iso-plate-corner[data-corner="hint"]{display:none}.iso-plate-corner[data-corner="readout"]{left:0;white-space:normal;text-align:right;line-height:1.35}}
`;

// The wide layout is the static SVG; only the narrow one ships as a string (the runtime keeps the wide markup from the DOM).
function bootScript(spec, wide, narrow) {
  const config = Object.fromEntries(Object.entries(spec).filter(([, value]) => typeof value !== "function"));
  const libSrc = `{${Object.entries(lib).map(([name, fn]) => `${name}: ${fn}`).join(",\n")}}`;
  const names = [...new Set(wide.boxes.map(({ name }) => name))];
  const renders = names.map((name) => `${JSON.stringify(name)}: ${VIEW_MODULES[name].render}`);
  const layouts = {
    wide: { width: wide.width, height: wide.height, boxes: wide.boxes },
    narrow: { width: narrow.width, height: narrow.height, boxes: narrow.boxes, svg: narrow.frames },
  };
  return `const SPEC = ${JSON.stringify(config)};\nconst lib = ${libSrc};\nconst model = ${fnSource(spec.model)};\nconst readout = ${fnSource(spec.readout)};\nconst RENDERS = {${renders.join(",\n")}};\nconst LAYOUTS = ${JSON.stringify(layouts)};\n${RUNTIME}`;
}

export function buildPage(spec, { theme = "dark" } = {}) {
  const wide = layout(spec, "wide");
  const narrow = layout(spec, "narrow");
  const svg = figureSvg({ width: wide.width, height: wide.height, label: `${spec.title}. Interactive figure; use the controls below.`, body: wide.frames, className: "study-figure" });
  const hint = spec.replicates ? "Drag a slider · Space: play/pause" : "Drag a slider";
  const plate = plateHtml({ fig: spec.fig, title: spec.title, hint, body: svg });
  return pageHtml({
    title: `${spec.title} | Anima study`,
    theme,
    width: wide.width + 40,
    body: `<style>${STUDY_CSS}</style>${plate}${controlsHtml(spec)}${notesHtml(spec)}`,
    script: bootScript(spec, wide, narrow),
  });
}

async function loadSpecs(specDir) {
  const files = readdirSync(specDir).filter((name) => name.endsWith(".mjs")).sort();
  const specs = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(resolve(specDir, file)).href);
    specs.push({ file, slug: basename(file, ".mjs"), spec: mod.default });
  }
  return specs;
}

export async function buildAll(specDir, outDir) {
  const specs = await loadSpecs(specDir);
  const errors = [];
  for (const { file, spec } of specs) {
    const problems = validateSpec(spec);
    if (!problems.length) problems.push(...probeModel(spec));
    errors.push(...problems.map((message) => `${file}: ${message}`));
  }
  if (errors.length) return { manifest: [], errors };
  mkdirSync(outDir, { recursive: true });
  const manifest = specs.map(({ slug, spec }) => {
    writeFileSync(join(outDir, `${slug}.html`), buildPage(spec, { theme: "dark" }));
    writeFileSync(join(outDir, `${slug}-light.html`), buildPage(spec, { theme: "light" }));
    const entry = { chunk: spec.chunk, file: `${slug}.html`, fileLight: `${slug}-light.html`, title: spec.title, states: Object.keys(spec.states) };
    if (spec.quiz) entry.quiz = spec.quiz;
    return entry;
  });
  writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, errors };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  const outAt = args.indexOf("--out");
  const out = outAt >= 0 ? args.splice(outAt, 2)[1] : null;
  const specDir = args[0];
  if (!specDir) {
    console.log("usage: node study/build.mjs <specDir> [--out <dir>]");
    process.exit(1);
  }
  const outDir = resolve(out ?? join(dirname(resolve(specDir)), "out"));
  const { manifest, errors } = await buildAll(specDir, outDir);
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  console.log(`built ${manifest.length} figure(s) into ${outDir}`);
}
