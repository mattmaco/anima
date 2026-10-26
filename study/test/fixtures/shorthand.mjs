import ok from "./ok.mjs";
export default { ...ok, model({ p }) { return { y: p * p }; }, readout(m) { return `y ${m.y.toFixed(2)}`; } };
