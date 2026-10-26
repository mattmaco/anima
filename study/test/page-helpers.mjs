import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
export const playwright = (() => { try { return require("playwright"); } catch { return null; } })();
// CI sets STUDY_REQUIRE_PLAYWRIGHT=1 so missing Playwright fails the run instead of skipping every page test.
if (!playwright && process.env.STUDY_REQUIRE_PLAYWRIGHT === "1") throw new Error("Playwright is required (STUDY_REQUIRE_PLAYWRIGHT=1) but could not be loaded");
export const ROOT = new URL("../../", import.meta.url).pathname;

export function buildExample(name) {
  execFileSync(process.execPath, [join(ROOT, "examples", name, "build.mjs")]);
  return join(ROOT, "examples", name, `${name}.html`);
}

// A host page that embeds the figure in an iframe and records every message it posts.
export function hostFor(file, hash = "") {
  const dir = mkdtempSync(join(tmpdir(), "study-host-"));
  const host = join(dir, "host.html");
  writeFileSync(host, `<!doctype html><body style="margin:0"><iframe id="f" style="width:800px;height:900px;border:0" src="${pathToFileURL(file).href}${hash}"></iframe>
<script>window.msgs=[];addEventListener("message",(e)=>msgs.push(e.data));</script></body>`);
  return pathToFileURL(host).href;
}

export async function openPage(browser, url, { width = 1000 } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.addInitScript(() => {
    window.__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { window.__raf++; return raf(cb); };
  });
  await page.goto(url);
  return { page, errors, requests };
}

// At phone width the figure must keep its text legible (rendered ≥ 9 px), inside the plate and free of collisions.
export const phoneFaults = (page) => page.evaluate(() => {
  const faults = [];
  const plate = document.querySelector(".iso-plate").getBoundingClientRect();
  const texts = [...document.querySelectorAll(".study-figure text")].filter((t) => t.textContent.trim() && t.getBBox().width > 0);
  for (const t of texts) {
    const m = t.getScreenCTM(), px = parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b);
    if (px < 9) faults.push(`${t.textContent.trim()} at ${px.toFixed(1)}px`);
  }
  const corner = document.querySelector("[data-readout]").getBoundingClientRect();
  if (corner.left < plate.left || corner.right > plate.right) faults.push("readout outside the plate");
  const boxes = texts.map((t) => ({ text: t.textContent.trim(), ...t.getBoundingClientRect().toJSON() }));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) faults.push(`${a.text} × ${b.text}`);
  }
  return faults;
});
