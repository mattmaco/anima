import { after, before, test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { buildPage, probeModel, validateSpec } from "../build.mjs";
import spec from "./fixtures/table.mjs";
import { phoneFaults, playwright } from "./page-helpers.mjs";

test("table is a known view and the fixture probes clean", () => {
  assert.deepEqual(validateSpec(spec), []);
  assert.deepEqual(probeModel(spec), []);
});

test("a stacked table grows with its rows", () => {
  const rows = (n) => Array.from({ length: n }, (_, i) => ({ key: `r${i}`, label: `row ${i}` }));
  const height = (n) => +buildPage({ ...spec, table: { ...spec.table, rows: rows(n) } }).match(/viewBox="0 0 \d+ (\d+)"/)[1];
  assert.ok(height(8) > height(2) + 100);
});

const skip = !playwright && "playwright not available";
let browser, url;
before(async () => {
  if (skip) return;
  const file = join(mkdtempSync(join(tmpdir(), "study-table-")), "table.html");
  writeFileSync(file, buildPage(spec));
  url = pathToFileURL(file).href;
  browser = await playwright.chromium.launch();
});
after(async () => browser?.close());

const cell = (page, row, col) => page.locator(`#cell-${row}-${col}`).textContent();

for (const width of [1000, 390]) {
  test(`table writes and flags cells at ${width} px`, { skip }, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await page.goto(url);
    await page.waitForFunction(() => window.anima);
    assert.equal(await cell(page, "x", "v"), "0.20");
    assert.equal(await cell(page, "x", "ok"), "yes");
    assert.equal(await page.locator("#cell-x-ok.study-flag").count(), 0);
    assert.deepEqual(await phoneFaults(page), [], "low");
    await page.evaluate(() => window.anima.set("high"));
    assert.equal(await cell(page, "x", "v"), "0.90");
    assert.equal(await cell(page, "x", "ok"), "✗ no");
    assert.equal(await page.locator("#cell-x-ok.study-flag").count(), 1);
    assert.deepEqual(await phoneFaults(page), [], "high");
    const label = await page.locator("#row-x").textContent();
    assert.equal(label, width > 700 ? "a long row label <b>x</b> & more" : "x <b>row</b>");
    assert.equal(await page.locator(".study-figure b").count(), 0);
    assert.equal(await page.locator("#row-x").getAttribute("data-note"), "The x row.");
    const gaps = await page.evaluate(() => [...document.querySelectorAll(".study-table")].flatMap(() => {
      const box = (id) => document.getElementById(id).getBoundingClientRect();
      return [["row-z", "cell-z-e"], ["cell-z-e", "cell-z-v"], ["cell-z-v", "cell-z-ok"]].map(([a, b]) => box(b).left - box(a).right);
    }));
    for (const gap of gaps) assert.ok(gap >= 8, `cells ${gap.toFixed(1)} px apart`);
  });
}
