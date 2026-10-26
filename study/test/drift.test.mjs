import { test } from "node:test";
import assert from "node:assert/strict";
import { lib } from "../lib.mjs";
import { defaults } from "../build.mjs";
import drift from "./fixtures/drift.mjs";

const run = (spec, params, seed, overrides = {}) =>
  spec.model({ ...defaults(spec), ...params, ...overrides }, lib.mulberry32(seed), lib);

test("drift is reproducible", () => assert.deepEqual(run(drift, { N: 50 }, 1), run(drift, { N: 50 }, 1)));

test("mean H tracks expectation", () => {
  const { meanH, expectedH } = run(drift, { N: 50, generations: 100 }, 1, { runs: 400 });
  assert.ok(Math.abs(meanH[60] - expectedH[60]) < 0.03, `${meanH[60]} vs ${expectedH[60]}`);
});

test("fixation", () => {
  const { runs } = run(drift, { N: 10, generations: 200 }, 2);
  for (const r of runs) {
    const i = r.findIndex((p) => p === 0 || p === 1);
    if (i >= 0) assert.ok(r.slice(i).every((p) => p === r[i]));
  }
});

test("bottleneck lowers H more than constant N=500", () => {
  const constant = run(drift, drift.states["N=500"], 3, { runs: 200 });
  const bottleneck = run(drift, drift.states.bottleneck, 3, { runs: 200 });
  assert.ok(bottleneck.meanH[40] < constant.meanH[40] - 0.05, `${bottleneck.meanH[40]} vs ${constant.meanH[40]}`);
});

test("population matches the run's allele count", () => {
  const data = run(drift, { N: 50 }, 4);
  for (const [t, genotypes] of data.current.entries()) {
    const a1 = genotypes.reduce((sum, g) => sum + g, 0);
    assert.equal(a1, Math.round(data.runs[0][t] * 2 * genotypes.length));
  }
});
