export default {
  chunk: 2,
  fig: "Fig 1",
  title: "Hardy-Weinberg genotypes",
  view: "curves",
  curves: {
    x: "p",
    sweep: 101,
    fixed: { mode: "allele" },
    series: [
      { key: "AA", label: "A1A1 = p²" },
      { key: "Aa", label: "A1A2 = 2pq" },
      { key: "aa", label: "A2A2 = q²" },
    ],
  },
  params: {
    mode: { options: ["allele", "recessive"], value: "allele", label: "start from" },
    p: { min: 0, max: 1, step: 0.01, value: 0.5, label: "p (frequency of A1)", when: { mode: "allele" } },
    aa: { min: 0, max: 0.25, step: 0.001, value: 0.04, label: "observed A2A2 frequency", when: { mode: "recessive" } },
  },
  model: ({ mode, p, aa }) => {
    const P = mode === "recessive" ? 1 - Math.sqrt(aa) : p;
    const q = 1 - P;
    return { p: P, q, AA: P * P, Aa: 2 * P * q, aa: q * q };
  },
  readout: (m, params) =>
    params.mode === "recessive"
      ? `q = √${params.aa} = ${m.q.toFixed(2)} · carriers 2pq ${m.Aa.toFixed(2)}`
      : `A1A1 ${m.AA.toFixed(2)} · A1A2 ${m.Aa.toFixed(2)} · A2A2 ${m.aa.toFixed(2)}`,
  states: {
    "p=0.5": { mode: "allele", p: 0.5 },
    "p=0.6": { mode: "allele", p: 0.6 },
  },
  notes: {
    AA: "Both alleles A1: probability p × p.",
    Aa: "Two ways to get one of each (A1 then A2, or A2 then A1), so 2pq. It peaks at 0.5 when p = q = 0.5.",
    aa: "Both alleles A2: q × q. For a recessive trait this is the only visible class, so q = √(A2A2).",
  },
  sources: [
    "Hardy-Weinberg principle as stated in introductory evolution and genetics textbooks: with random mating and no evolutionary processes, genotype frequencies are p², 2pq and q².",
  ],
  simplified: [
    "One locus with two alleles; diploid, sexual, non-overlapping generations.",
    "Random mating; no selection, mutation, migration or drift (infinite population).",
    "The recessive estimate assumes the population is in Hardy-Weinberg equilibrium.",
  ],
};
