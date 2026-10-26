import ok from "./ok.mjs";
const K = 2;
export default { ...ok, model: ({ p }) => ({ y: p * K }) };
