export default {
  chunk: 3, fig: "Fig 3", title: "Trajectory fixture",
  view: "trajectory",
  trajectory: { series: [{ key: "fast", label: "fast" }, { key: "slow", label: "slow" }], marks: [{ key: "target", label: "target" }], y: "auto", ylabel: "value" },
  params: {
    rate: { min: 0.01, max: 0.5, step: 0.01, value: 0.1, label: "rate" },
    target: { options: [1, 0.001], value: 1, label: "target" },
    generations: { options: [50, 5000], value: 50, label: "generations" },
  },
  model: ({ rate, target, generations }) => {
    const run = (r) => {
      const out = [0];
      for (let g = 1; g <= generations; g++) out.push(out[g - 1] + r * (target - out[g - 1]));
      return out;
    };
    return { fast: run(rate), slow: run(rate / 4), target };
  },
  readout: (m) => `fast ${m.fast.at(-1).toPrecision(3)} · target ${m.target}`,
  states: { big: { target: 1, generations: 50 }, small: { target: 0.001, generations: 5000 } },
  notes: { fast: "The faster run.", slow: "The slower run.", target: "Where both runs settle." },
  sources: ["fixture"],
  simplified: ["fixture"],
};
