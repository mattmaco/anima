import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { figureSvg, pageHtml, plateHtml } from "../kit/iso-kit.mjs";
import { lib } from "./lib.mjs";

export const VIEWS = ["curves", "replicates", "popgrid"];
const REQUIRED = ["chunk", "fig", "title", "view", "params", "model", "readout", "states", "sources", "simplified"];

// Turn a function back into a value from its source alone, so anything it closes over is lost.
export function revive(fn) {
  const src = fn.toString();
  const expr = /^(async\s+)?(function\b|\(|[\w$]+\s*=>)/.test(src) ? src : `function ${src}`;
  return new Function("lib", `return (${expr});`)(lib);
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

export function buildPage(spec, { theme = "dark" } = {}) {
  const width = 760, height = 360;
  const svg = figureSvg({ width, height, label: spec.title, body: "", className: "study-figure" });
  const plate = plateHtml({ fig: spec.fig, title: spec.title, hint: "Drag a slider · Space: pause", body: svg });
  return pageHtml({ title: `${spec.title} | Anima study`, theme, width: width + 40, body: plate });
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
    return { chunk: spec.chunk, file: `${slug}.html`, fileLight: `${slug}-light.html`, title: spec.title, states: Object.keys(spec.states) };
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
