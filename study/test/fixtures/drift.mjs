// Generic Wright-Fisher drift: the model the private Fig 5 copies.
export default {
  chunk: 13,
  fig: "Fig 5",
  title: "Genetic drift",
  view: ["replicates", "popgrid"],
  seed: 1,
  replicates: { runs: 20, generations: "generations" },
  params: {
    N: { options: [10, 50, 500], value: 50, label: "population size N" },
    p0: { min: 0.05, max: 0.95, step: 0.05, value: 0.5, label: "starting p" },
    generations: { options: [50, 100, 200], value: 100, label: "generations" },
    event: { options: ["none", "bottleneck", "founder"], value: "none", label: "event" },
  },
  model: (params, rng, lib) => {
    const { N, p0, generations, event } = params;
    const RUNS = params.runs ?? 20;
    const FOUNDERS = 5;
    const sizeAt = (g) => (event === "bottleneck" && g >= 20 && g <= 25 ? 10 : N);
    const H = (p) => 2 * p * (1 - p);
    const runs = [];
    for (let r = 0; r < RUNS; r++) {
      const start = event === "founder" ? lib.binomial(2 * FOUNDERS, p0, rng) / (2 * FOUNDERS) : p0;
      runs.push(lib.wrightFisher({ N, p0: start, generations, schedule: sizeAt }, rng));
    }
    const meanH = runs[0].map((_, t) => runs.reduce((sum, run) => sum + H(run[t]), 0) / RUNS);
    const expectedH = [H(p0) * (event === "founder" ? 1 - 1 / (2 * FOUNDERS) : 1)];
    for (let g = 1; g <= generations; g++) expectedH.push(expectedH[g - 1] * (1 - 1 / (2 * sizeAt(g))));
    // One population drawn as individuals: its 2N alleles shuffled into pairs (2 = A1A1, 1 = A1A2, 0 = A2A2).
    const current = runs[0].map((p, g) => {
      const size = sizeAt(g);
      const alleles = Array.from({ length: 2 * size }, (_, i) => (i < Math.round(p * 2 * size) ? 1 : 0));
      for (let i = alleles.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [alleles[i], alleles[j]] = [alleles[j], alleles[i]];
      }
      return Array.from({ length: size }, (_, i) => alleles[2 * i] + alleles[2 * i + 1]);
    });
    return { runs, meanH, expectedH, current };
  },
  readout: (data, params, gen) => {
    const last = data.runs[0].length - 1;
    const g = Math.min(gen ?? last, last);
    const fixed = data.runs.filter((run) => run[g] === 0 || run[g] === 1).length;
    return `gen ${g} · fixed or lost ${fixed}/${data.runs.length} · H ${data.meanH[g].toFixed(2)} (expected ${data.expectedH[g].toFixed(2)})`;
  },
  states: {
    "N=10": { N: 10, event: "none" },
    "N=500": { N: 500, event: "none" },
    bottleneck: { N: 500, event: "bottleneck" },
    founder: { N: 500, event: "founder" },
  },
  notes: {
    runs: "Each line is one population. Same starting p, same N; only chance differs.",
    meanH: "Average heterozygosity across the populations.",
    expectedH: "Expected loss: H shrinks by a factor (1 − 1/2N) each generation.",
    grid: "One population's individuals this generation, coloured by genotype.",
  },
  sources: ["Wright-Fisher model of genetic drift (fixture; no course material)."],
  simplified: ["Neutral alleles, random mating, non-overlapping generations.", "Bottleneck: N = 10 for generations 20–25. Founder: 5 founders, then N."],
};
