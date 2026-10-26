// Shared helpers for study models. Every member is serialised into the page with toString(),
// so each must be self-contained: it may refer to other members only through `lib`.
export const lib = {
  mulberry32: (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  binomial: (n, p, rng) => {
    if (p <= 0) return 0;
    if (p >= 1) return n;
    if (n > 200) {
      const u = 1 - rng(), v = rng();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return Math.min(n, Math.max(0, Math.round(n * p + z * Math.sqrt(n * p * (1 - p)))));
    }
    let k = 0;
    for (let i = 0; i < n; i++) if (rng() < p) k++;
    return k;
  },
  wrightFisher: ({ N, p0, generations, schedule }, rng) => {
    const run = [p0];
    let p = p0;
    for (let gen = 1; gen <= generations; gen++) {
      if (p > 0 && p < 1) {
        const size = schedule ? schedule(gen) : N;
        p = lib.binomial(2 * size, p, rng) / (2 * size);
      }
      run.push(p);
    }
    return run;
  },
};
