// One population as an isometric grid of individuals coloured by genotype, for the revealed generation.
// Model returns current: number[][] (per generation, one entry per individual: 2 = A1A1, 1 = A1A2, 0 = A2A2).
const esc = (s) => String(s).replace(/"/g, "&quot;");

export const popgrid = {
  name: "popgrid",
  frame(spec, box) {
    const keyX = box.x + box.w - 170;
    const key = [["2", "A1A1", "study-s0"], ["1", "A1A2", "study-s1"], ["0", "A2A2", "study-s2"]]
      .map(([g, label, cls], i) => `<rect class="study-swatch ${cls}" x="${keyX}" y="${box.y + 60 + i * 24}" width="10" height="10" rx="2"/><text class="study-key" x="${keyX + 18}" y="${box.y + 69 + i * 24}">${label} <tspan id="pop-n${g}"></tspan></text>`).join("");
    return `<g class="study-popgrid"><text class="study-axis-label" x="${box.x + 36}" y="${box.y + 12}" tabindex="0" data-note="${esc(spec.notes?.grid ?? "")}">one population, this generation</text><g id="pop-tiles"></g>${key}<text id="pop-size" class="study-key" x="${keyX}" y="${box.y + 150}"></text></g>`;
  },
  render: (svg, data, params, box, ctx) => {
    const G = data.current.length - 1;
    const genotypes = data.current[Math.min(ctx.gen, G)];
    const n = genotypes.length;
    const group = svg.getElementById("pop-tiles");
    if (ctx.cache.popN !== n) {
      ctx.cache.popN = n;
      const cols = Math.ceil(Math.sqrt(n));
      const c = Math.cos(Math.PI / 6), s = 0.5;
      const area = { w: box.w - 240, h: box.h - 40 };
      const unit = Math.min(area.w / (2 * cols * c), (area.h - 10) / (2 * cols * s + 0.6), 26);
      const ox = box.x + 36 + area.w / 2, oy = box.y + 28 + 0.6 * unit;
      const pt = (i, j, z) => `${(ox + (i - j) * c * unit).toFixed(1)},${(oy + (i + j) * s * unit - z * unit).toFixed(1)}`;
      const h = 0.55, gap = 0.12;
      const cells = Array.from({ length: n }, (_, k) => [k % cols, Math.floor(k / cols), k]).sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
      ctx.cache.popOrder = cells.map((cell) => cell[2]);
      group.innerHTML = cells.map(([i, j]) => {
        const a = i + gap, b = j + gap, A = i + 1 - gap, B = j + 1 - gap;
        return `<g class="study-ind"><polygon class="t" points="${pt(a, b, h)} ${pt(A, b, h)} ${pt(A, B, h)} ${pt(a, B, h)}"/><polygon class="l" points="${pt(a, B, h)} ${pt(A, B, h)} ${pt(A, B, 0)} ${pt(a, B, 0)}"/><polygon class="r" points="${pt(A, b, h)} ${pt(A, B, h)} ${pt(A, B, 0)} ${pt(A, b, 0)}"/></g>`;
      }).join("");
    }
    const tiles = group.children;
    const counts = [0, 0, 0];
    ctx.cache.popOrder.forEach((k, idx) => {
      const g = genotypes[k];
      counts[g]++;
      tiles[idx].setAttribute("class", `study-ind g${g}`);
    });
    for (const g of [0, 1, 2]) svg.getElementById(`pop-n${g}`).textContent = String(counts[g]);
    svg.getElementById("pop-size").textContent = `N = ${n}`;
  },
};
