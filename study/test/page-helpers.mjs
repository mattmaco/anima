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
