import { after, before, test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { buildExample, openPage, phoneFaults, playwright } from "./page-helpers.mjs";

const skip = !playwright && "playwright not available";
let browser, demo, drift;

async function writePage(spec) {
  const { buildPage } = await import("../build.mjs");
  const file = join(mkdtempSync(join(tmpdir(), "study-design-")), "page.html");
  writeFileSync(file, buildPage(spec));
  return pathToFileURL(file).href;
}

before(async () => {
  if (skip) return;
  demo = pathToFileURL(buildExample("study-hardy-weinberg")).href;
  drift = await writePage((await import("./fixtures/drift.mjs")).default);
  browser = await playwright.chromium.launch();
});
after(async () => browser?.close());

const readout = (page) => page.locator("[data-readout]").textContent();

test("a malformed #state= link still draws the default figure", { skip }, async () => {
  const { page, errors } = await openPage(browser, `${demo}#state=%E0`);
  await page.waitForTimeout(100);
  assert.deepEqual(errors, []);
  assert.match(await readout(page), /0\.25/);
});

test("Space and its hint belong to stepped figures only", { skip }, async () => {
  const { page } = await openPage(browser, demo);
  assert.doesNotMatch(await page.locator('[data-corner="hint"]').textContent(), /space/i);
  const prevented = await page.evaluate(() => {
    const event = new KeyboardEvent("keydown", { code: "Space", cancelable: true, bubbles: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  assert.equal(prevented, false);
  const stepped = await openPage(browser, drift);
  assert.match(await stepped.page.locator('[data-corner="hint"]').textContent(), /space/i);
});

test("anima:set ignores inherited property names", { skip }, async () => {
  const { page, errors } = await openPage(browser, demo);
  const own = await page.evaluate(() => {
    window.anima.set({ constructor: 1, toString: 2, hasOwnProperty: 3 });
    return Object.keys(window.anima.params);
  });
  assert.deepEqual(own.sort(), ["aa", "mode", "p"]);
  assert.equal(await page.evaluate(() => window.anima.set("toString")), false);
  assert.deepEqual(errors, []);
});

test("view labels are escaped as text", { skip }, async () => {
  const spec = (await import("../../examples/study-hardy-weinberg/spec.mjs")).default;
  const label = `A<b>1</b> & "x"`;
  const url = await writePage({ ...spec, curves: { ...spec.curves, series: [{ key: "AA", label }, ...spec.curves.series.slice(1)] }, params: { ...spec.params, p: { ...spec.params.p, label: "p <i>&</i>" } } });
  const { page } = await openPage(browser, url);
  assert.equal(await page.locator("#label-AA").textContent(), label);
  assert.equal(await page.locator(".study-figure b").count(), 0);
  assert.match(await page.locator(".study-curves .study-axis-label").first().textContent(), /p <i>&<\/i>/);
});

test("anima:set is accepted only from the parent window", { skip }, async () => {
  const { page } = await openPage(browser, demo);
  const before = await readout(page);
  await page.evaluate(() => window.postMessage({ type: "anima:set", state: "p=0.6" }, "*"));
  await page.waitForTimeout(150);
  assert.equal(await readout(page), before);
});

test("state buttons show the active state with aria-pressed", { skip }, async () => {
  const { page } = await openPage(browser, demo);
  const pressed = () => page.locator("[data-state]").evaluateAll((els) => els.map((el) => el.getAttribute("aria-pressed")));
  assert.deepEqual(await pressed(), ["true", "false"]);
  await page.locator('[data-state="p=0.6"]').click();
  assert.deepEqual(await pressed(), ["false", "true"]);
  await page.locator("#param-p").fill("0.55");
  assert.deepEqual(await pressed(), ["false", "false"]);
});

test("every note target shows keyboard focus", { skip }, async () => {
  const { page } = await openPage(browser, drift);
  const count = await page.locator(".study-figure [data-note]").count();
  for (let i = 0; i < count; i++) {
    await page.keyboard.press("Tab");
    const visible = await page.evaluate(() => {
      const el = document.activeElement, s = getComputedStyle(el);
      return el.matches("[data-note]") && (s.outlineStyle !== "none" || s.textDecorationLine.includes("underline"));
    });
    assert.ok(visible, `note target ${i} has no focus indicator`);
  }
});

for (const [name, url] of [["Hardy-Weinberg", () => demo], ["drift", () => drift]]) {
  test(`${name} figure is legible at 390 px`, { skip }, async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 800 }, reducedMotion: "reduce" });
    await page.goto(url());
    await page.waitForFunction(() => window.anima);
    for (const state of await page.locator("[data-state]").evaluateAll((els) => els.map((el) => el.dataset.state))) {
      await page.evaluate((s) => window.anima.set(s), state);
      assert.deepEqual(await phoneFaults(page), [], state);
    }
    assert.ok(await page.evaluate(() => document.scrollingElement.scrollWidth <= 390));
  });
}

// Series labels are small text, so each series colour needs 4.5:1 against the card in both themes.
for (const theme of ["dark", "light"]) {
  test(`series labels reach 4.5:1 on the ${theme} card`, { skip }, async () => {
    const { buildPage } = await import("../build.mjs");
    const base = (await import("./fixtures/trajectory.mjs")).default;
    const keys = ["s0", "s1", "s2", "s3"];
    const spec = { ...base, trajectory: { ...base.trajectory, series: keys.map((key) => ({ key, label: key })) },
      model: ({ generations }) => ({ s0: [0, 0.2], s1: [0, 0.4], s2: [0, 0.6], s3: [0, 0.8], target: 1, fast: [0], generations }),
      readout: () => "fixture" };
    const file = join(mkdtempSync(join(tmpdir(), "study-contrast-")), "page.html");
    writeFileSync(file, buildPage(spec, { theme }));
    const { page } = await openPage(browser, pathToFileURL(file).href);
    const ratios = await page.evaluate(() => {
      const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
      const lum = (c) => { const [r, g, b] = rgb(c).map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      let el = document.querySelector(".study-figure"), bg = "";
      while (el && /rgba\(0, 0, 0, 0\)|transparent/.test((bg = getComputedStyle(el).backgroundColor))) el = el.parentElement;
      const card = lum(bg);
      return [...document.querySelectorAll(".study-trajectory .study-label")].map((t) => {
        const a = lum(getComputedStyle(t).fill);
        return [t.textContent, +((Math.max(a, card) + 0.05) / (Math.min(a, card) + 0.05)).toFixed(2)];
      });
    });
    for (const [label, ratio] of ratios) assert.ok(ratio >= 4.5, `${label} is ${ratio}:1`);
  });
}
