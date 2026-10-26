import { after, before, test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { buildPage, probeModel, validateSpec } from "../build.mjs";
import spec from "./fixtures/trajectory.mjs";
import { phoneFaults, playwright } from "./page-helpers.mjs";

test("trajectory is a known view and the fixture probes clean", () => {
  assert.deepEqual(validateSpec(spec), []);
  assert.deepEqual(probeModel(spec), []);
});

const skip = !playwright && "playwright not available";
let browser, url;
before(async () => {
  if (skip) return;
  const file = join(mkdtempSync(join(tmpdir(), "study-trajectory-")), "trajectory.html");
  writeFileSync(file, buildPage(spec));
  url = pathToFileURL(file).href;
  browser = await playwright.chromium.launch();
});
after(async () => browser?.close());

// Screen y of a value on the plot, read from the drawn axis ticks' own scale.
const lineY = (page, id) => page.evaluate((i) => { const b = document.getElementById(i).getBBox(); return b.y + b.height / 2; }, id);

for (const width of [1000, 390]) {
  test(`trajectory draws every series and mark at ${width} px`, { skip }, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await page.goto(url);
    await page.waitForFunction(() => window.anima);
    for (const state of ["big", "small"]) {
      await page.evaluate((s) => window.anima.set(s), state);
      for (const key of ["fast", "slow"]) assert.ok((await page.locator(`#traj-${key}`).getAttribute("d"))?.length > 20, `${state}: ${key} not drawn`);
      const top = await page.evaluate(() => { const b = document.getElementById("traj-frame").getBBox(); return b.y; });
      assert.ok(Math.abs((await lineY(page, "mark-target")) - top) < 30, `${state}: auto y should put the target near the top`);
      assert.deepEqual(await phoneFaults(page), [], `${state} at ${width}`);
    }
  });
}

test("trajectory y ticks follow the auto scale", { skip }, async () => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.waitForFunction(() => window.anima);
  await page.evaluate(() => window.anima.set("small"));
  const ticks = await page.locator(".study-trajectory .study-ytick").allTextContents();
  assert.ok(ticks.some((t) => /0\.001/.test(t)), ticks.join(" "));
});
