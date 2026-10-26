import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPage, probeModel, validateSpec } from "../../study/build.mjs";
import spec from "./spec.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const light = process.argv.includes("--light");
const errors = [...validateSpec(spec), ...probeModel(spec)];
if (errors.length) {
  for (const error of errors) console.error(`spec.mjs: ${error}`);
  process.exit(1);
}
writeFileSync(join(HERE, `study-hardy-weinberg${light ? "-light" : ""}.html`), buildPage(spec, { theme: light ? "light" : "dark" }));
