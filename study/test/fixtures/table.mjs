export default {
  chunk: 4, fig: "Fig 4", title: "Table fixture",
  view: "table",
  table: {
    columns: [{ key: "e", label: "expected" }, { key: "v", label: "observed value", short: "observed" }, { key: "ok", label: "equal?" }],
    rows: [{ key: "x", label: "a long row label <b>x</b> & more", short: "x <b>row</b>" }, { key: "y", label: "y row" }, { key: "z", label: "z" }],
  },
  params: { a: { min: 0, max: 1, step: 0.01, value: 0.2, label: "a" } },
  model: ({ a }) => ({
    cells: {
      x: { v: a.toFixed(2), ok: a > 0.5 ? { text: "no", flag: true } : "yes" },
      y: { v: (1 - a).toFixed(2), ok: "yes" },
      z: { e: "0.0000", v: { text: (-a / 10).toFixed(4), flag: true }, ok: { text: (-a / 10).toFixed(4), flag: true } },
    },
  }),
  readout: (m) => `x ${m.cells.x.v}`,
  states: { low: { a: 0.2 }, high: { a: 0.9 } },
  notes: { x: "The x row.", v: "The observed column." },
  sources: ["fixture"],
  simplified: ["fixture"],
};
