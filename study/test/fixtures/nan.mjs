import ok from "./ok.mjs";
export default { ...ok, model: ({ p }) => ({ y: 1 / p - 1 / p }) };
