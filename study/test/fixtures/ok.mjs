export default {
  chunk: 1, fig: "Fig 1", title: "Fixture",
  view: "curves",
  curves: { x: "p", series: [{ key: "y", label: "y" }], sweep: 11 },
  params: { p: { min: 0, max: 1, step: 0.01, value: 0.5, label: "p" } },
  model: ({ p }) => ({ y: p * p }),
  readout: (m) => `y ${m.y.toFixed(2)}`,
  states: { half: { p: 0.5 } },
  notes: {},
  sources: ["fixture"],
  simplified: ["fixture"],
};
