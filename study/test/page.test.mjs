import { after, before, describe, test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { buildExample, hostFor, openPage, playwright } from "./page-helpers.mjs";

const skip = !playwright && "playwright not available";
let browser, demo;
before(async () => {
  if (skip) return;
  demo = buildExample("study-hardy-weinberg");
  browser = await playwright.chromium.launch();
});
after(async () => browser?.close());

const frameOf = async (page) => {
  await page.waitForFunction(() => window.msgs?.some((m) => m?.type === "anima:ready"));
  return page.frames().find((f) => f !== page.mainFrame());
};
const readout = (frame) => frame.locator("[data-readout]").textContent();
const send = (page, data) => page.evaluate((d) => document.getElementById("f").contentWindow.postMessage(d, "*"), data);

test("ready message and hash state", { skip }, async () => {
  const { page } = await openPage(browser, hostFor(demo, "#state=p=0.6"));
  const frame = await frameOf(page);
  const ready = await page.evaluate(() => msgs.find((m) => m.type === "anima:ready"));
  assert.deepEqual(ready, { type: "anima:ready", chunk: 2, states: ["p=0.5", "p=0.6"] });
  const text = await readout(frame);
  assert.match(text, /0\.36/);
  assert.match(text, /0\.48/);
});

test("anima:set switches state", { skip }, async () => {
  const { page } = await openPage(browser, hostFor(demo));
  const frame = await frameOf(page);
  await send(page, { type: "anima:set", state: "p=0.6" });
  await frame.waitForFunction(() => /0\.48/.test(document.querySelector("[data-readout]").textContent));
  await send(page, { type: "anima:set", params: { p: 0.5 } });
  await frame.waitForFunction(() => /0\.50/.test(document.querySelector("[data-readout]").textContent));
});

test("unknown-state", { skip }, async () => {
  const { page, errors } = await openPage(browser, hostFor(demo));
  const frame = await frameOf(page);
  const before = await readout(frame);
  await send(page, { type: "anima:set", state: "nope" });
  await page.waitForTimeout(200);
  assert.equal(await readout(frame), before);
  assert.deepEqual(errors, []);
});

test("no-autoplay", { skip }, async () => {
  const { page } = await openPage(browser, hostFor(demo));
  const frame = await frameOf(page);
  await page.waitForTimeout(500);
  assert.equal(await frame.evaluate(() => window.__raf), 0);
});

test("phone-width", { skip }, async () => {
  const { page } = await openPage(browser, pathToFileURL(demo).href, { width: 390 });
  assert.ok(await page.evaluate(() => document.scrollingElement.scrollWidth <= 390));
});

test("p at 0 and 1", { skip }, async () => {
  const { page } = await openPage(browser, pathToFileURL(demo).href);
  for (const value of ["0", "1"]) {
    await page.locator("#param-p").fill(value);
    assert.doesNotMatch(await page.locator("[data-readout]").textContent(), /NaN/);
  }
});

test("offline", { skip }, async () => {
  const { page, requests } = await openPage(browser, pathToFileURL(demo).href);
  await page.waitForTimeout(300);
  assert.ok(requests.every((url) => url.startsWith("file://")), requests.join("\n"));
});

describe("drift page", () => {
  let driftPage;
  before(async () => {
    if (skip) return;
    const { buildPage } = await import("../build.mjs");
    const spec = (await import("./fixtures/drift.mjs")).default;
    driftPage = join(mkdtempSync(join(tmpdir(), "study-drift-")), "drift.html");
    writeFileSync(driftPage, buildPage(spec));
  });

  test("restart", { skip }, async () => {
    const { page, errors } = await openPage(browser, pathToFileURL(driftPage).href);
    await page.waitForFunction(() => window.anima?.gen > 5);
    await page.locator("#param-N").selectOption("500");
    assert.ok(await page.evaluate(() => window.anima.gen) < 5);
    assert.equal(await page.locator(".study-run").count(), 20);
    assert.deepEqual(errors, []);
  });

  test("drift no-autoplay", { skip }, async () => {
    const { page } = await openPage(browser, hostFor(driftPage));
    const frame = await frameOf(page);
    await page.waitForTimeout(500);
    assert.equal(await frame.evaluate(() => window.__raf), 0);
  });

  test("drift phone-width", { skip }, async () => {
    const { page } = await openPage(browser, pathToFileURL(driftPage).href, { width: 390 });
    assert.ok(await page.evaluate(() => document.scrollingElement.scrollWidth <= 390));
  });

  test("reduced motion shows the last generation", { skip }, async () => {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.goto(pathToFileURL(driftPage).href);
    await page.waitForFunction(() => window.anima);
    assert.equal(await page.evaluate(() => window.anima.gen), 100);
  });
});
