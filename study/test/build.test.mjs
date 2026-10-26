import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildAll, probeModel, validateSpec } from "../build.mjs";
import { lib } from "../lib.mjs";
import ok from "./fixtures/ok.mjs";
import closure from "./fixtures/closure.mjs";
import nan from "./fixtures/nan.mjs";

const FIXTURES = new URL("./fixtures/", import.meta.url).pathname;

test("validateSpec lists missing fields", () => {
  assert.deepEqual(validateSpec({ ...ok, sources: undefined }), ["missing field: sources"]);
  assert.match(validateSpec({ ...ok, view: "pie" })[0], /unknown view: pie/);
});
test("probeModel rejects closures", () => assert.match(probeModel(closure)[0], /not defined/));
test("probeModel rejects NaN at a param edge", () => assert.match(probeModel(nan)[0], /NaN.*p=0/));
test("probeModel accepts ok", () => assert.deepEqual(probeModel(ok), []));
test("mulberry32 is reproducible", () => {
  const a = lib.mulberry32(7), b = lib.mulberry32(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});
test("wrightFisher holds after fixation", () => {
  const run = lib.wrightFisher({ N: 2, p0: 0.5, generations: 200 }, lib.mulberry32(3));
  const end = run.at(-1);
  assert.ok(end === 0 || end === 1);
  assert.equal(run.length, 201);
});
test("buildAll writes pages and manifest", async () => {
  const specDir = mkdtempSync(join(tmpdir(), "study-specs-"));
  const out = mkdtempSync(join(tmpdir(), "study-out-"));
  copyFileSync(join(FIXTURES, "ok.mjs"), join(specDir, "ok.mjs"));
  const { manifest, errors } = await buildAll(specDir, out);
  assert.deepEqual(errors, []);
  assert.deepEqual(Object.keys(manifest[0]), ["chunk", "file", "fileLight", "title", "states"]);
  assert.ok(existsSync(join(out, "ok.html")) && existsSync(join(out, "ok-light.html")));
  assert.ok(existsSync(join(out, "manifest.json")));
});

test("manifest carries the optional quiz link", async () => {
  const specDir = mkdtempSync(join(tmpdir(), "study-specs-"));
  const out = mkdtempSync(join(tmpdir(), "study-out-"));
  writeFileSync(join(specDir, "q.mjs"), `import ok from ${JSON.stringify(join(FIXTURES, "ok.mjs"))}; export default { ...ok, quiz: { course: "evolution", chunks: [17, 18] } };`);
  const { manifest } = await buildAll(specDir, out);
  assert.deepEqual(manifest[0].quiz, { course: "evolution", chunks: [17, 18] });
});
