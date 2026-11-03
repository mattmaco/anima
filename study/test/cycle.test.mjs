import { after, before, test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { buildPage, prepare, probeModel, validateSpec } from "../build.mjs";
import { cycleModel } from "../views/cycle.mjs";
import spec from "./fixtures/cycle.mjs";
import { phoneFaults, playwright } from "./page-helpers.mjs";

const run = (params) => cycleModel({ step: 1, cut: "none", ...params }, null, null, JSON.parse(JSON.stringify(spec)));

test("a data-only cycle spec gets params, states, model and readout, and probes clean", () => {
  const full = prepare(spec);
  assert.deepEqual(Object.keys(full.params), ["step", "cut"]);
  assert.deepEqual(Object.keys(full.states), ["Full cycle", "Shoes", "Drug", "Sewage"]);
  assert.deepEqual(validateSpec(spec), []);
  assert.deepEqual(probeModel(spec), []);
});

test("a cut fades what stops forming, but not what a surviving loop still feeds", () => {
  assert.deepEqual(run({}).dim, []);
  // Skin entry blocked: the internal loop (adult → internal larva → migrant → adult) keeps the host stages going.
  assert.deepEqual(run({ cut: "Shoes" }).dim, []);
  // Internal loop blocked: only the internal larva stops; the main loop still feeds the rest.
  assert.deepEqual(run({ cut: "Drug" }).dim, ["auto"]);
  // No eggs outside: the outside stages and the stray cyst stop; the internal loop keeps the host stages going.
  assert.deepEqual(run({ cut: "Sewage" }).dim.sort(), ["dead", "egg", "lar"]);
  assert.match(run({ cut: "Drug" }).text, /^✗ Drug/);
  assert.match(run({ step: 3 }).caption, /^3\/4 Migrant/);
});

test("the build rejects unknown hosts, stages and links", () => {
  const bad = structuredClone({ ...spec, cycle: { ...spec.cycle, cuts: { x: { links: ["egg>adu"], text: "" } }, side: [{ key: "s", label: "S", host: "zz", from: "nope", how: "" }] } });
  const errors = validateSpec(bad).join("\n");
  assert.match(errors, /unknown host zz/);
  assert.match(errors, /unknown stage nope/);
  assert.match(errors, /no link egg>adu/);
});

test("facts, the step list and escaped text reach the page", () => {
  const html = buildPage(spec);
  assert.match(html, /<h2>Key facts<\/h2><dl><dt>Entry<\/dt><dd>Skin &lt;b&gt;&amp;&lt;\/b&gt;\.<\/dd>/);
  assert.match(html, /The cycle, step by step/);
  assert.match(html, /dead end/);
  assert.doesNotMatch(html.split("<script")[0], /<b>&<\/b>/);
});

const skip = !playwright && "playwright not available";
let browser, url;
before(async () => {
  if (skip) return;
  const file = join(mkdtempSync(join(tmpdir(), "study-cycle-")), "cycle.html");
  writeFileSync(file, buildPage(spec));
  url = pathToFileURL(file).href;
  browser = await playwright.chromium.launch();
});
after(async () => browser?.close());

for (const width of [1000, 390]) {
  test(`cycle draws, fades and cuts without overlaps at ${width} px`, { skip }, async () => {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.anima);
    for (const state of ["Full cycle", "Sewage"]) {
      await page.evaluate((s) => window.anima.set(s), state);
      assert.deepEqual(await phoneFaults(page), [], `${state} at ${width}`);
    }
    assert.equal(await page.locator("#cyc-n-egg.cyc-dim").count(), 1);
    assert.equal(await page.locator('[data-edge="adu>egg"].cyc-cut').count(), 1);
    assert.match(await page.textContent("[data-readout]"), /✗ Sewage/);
    assert.match(await page.textContent("#cyc-caption"), /no eggs outside/);
    assert.deepEqual(errors, []);
    await page.close();
  });
}
