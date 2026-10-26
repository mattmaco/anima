// Two panels: p over generations in many seeded populations, and heterozygosity (simulated mean vs expected).
// Spec: replicates: { runs, generations: "<param>" }; model returns { runs, meanH, expectedH }.
const esc = (s) => String(s).replace(/"/g, "&quot;");

export const replicates = {
  name: "replicates",
  frame(spec, box) {
    const runs = spec.replicates.runs;
    const split = box.x + box.w * 0.6;
    const panel = (x0, x1, title, note, yTicks, id) => {
      const y0 = box.y + box.h - 34, y1 = box.y + 24;
      const ticks = yTicks.map(([v, label]) => `<line class="study-grid" x1="${x0}" x2="${x1}" y1="${y0 - (y0 - y1) * v}" y2="${y0 - (y0 - y1) * v}"/><text class="study-tick" x="${x0 - 6}" y="${y0 - (y0 - y1) * v + 3.5}" text-anchor="end">${label}</text>`).join("");
      const xTicks = [0, 0.5, 1].map((t, i) => `<text id="${id}-x${i}" class="study-tick" x="${x0 + (x1 - x0) * t}" y="${y0 + 14}" text-anchor="middle"></text>`).join("");
      return `<text class="study-axis-label" x="${x0}" y="${box.y + 12}" tabindex="0" data-note="${esc(note)}">${title}</text>${ticks}${xTicks}<line class="study-axis" x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}"/><line class="study-axis" x1="${x0}" x2="${x0}" y1="${y0}" y2="${y1}"/><text class="study-axis-label" x="${(x0 + x1) / 2}" y="${y0 + 28}" text-anchor="middle">generation</text>`;
    };
    const lines = Array.from({ length: runs }, () => `<polyline class="study-run"/>`).join("");
    return `<g class="study-replicates">${panel(box.x + 36, split - 16, "allele frequency p, one line per population", spec.notes?.runs ?? "", [[0, "0"], [0.5, "0.5"], [1, "1"]], "rp")}${panel(split + 30, box.x + box.w - 8, "heterozygosity H", spec.notes?.meanH ?? "", [[0, "0"], [0.5, "0.25"], [1, "0.5"]], "rh")}<g id="rep-runs">${lines}</g><polyline id="rep-expected" class="study-expected"/><polyline id="rep-mean" class="study-mean"/><line id="rep-now" class="study-marker"/><text class="study-key study-s0" x="${split + 30}" y="${box.y + box.h - 2}" tabindex="0" data-note="${esc(spec.notes?.expectedH ?? "")}">-- expected</text><text class="study-key" x="${split + 120}" y="${box.y + box.h - 2}" tabindex="0" data-note="${esc(spec.notes?.meanH ?? "")}">— simulated</text></g>`;
  },
  render: (svg, data, params, box, ctx) => {
    const split = box.x + box.w * 0.6;
    const y0 = box.y + box.h - 34, y1 = box.y + 24;
    const P = { x0: box.x + 36, x1: split - 16 }, Hp = { x0: split + 30, x1: box.x + box.w - 8 };
    const G = data.runs[0].length - 1;
    const g = Math.min(ctx.gen, G);
    if (ctx.cache.repData !== data) {
      ctx.cache.repData = data;
      const pt = (panel, t, v) => `${(panel.x0 + ((panel.x1 - panel.x0) * t) / G).toFixed(1)},${(y0 - (y0 - y1) * v).toFixed(1)}`;
      ctx.cache.repRuns = data.runs.map((run) => run.map((p, t) => pt(P, t, p)));
      ctx.cache.repMean = data.meanH.map((h, t) => pt(Hp, t, h / 0.5));
      ctx.cache.repExp = data.expectedH.map((h, t) => pt(Hp, t, h / 0.5));
      for (const [id, panel] of [["rp", P], ["rh", Hp]]) [0, 0.5, 1].forEach((t, i) => { svg.getElementById(`${id}-x${i}`).textContent = String(Math.round(G * t)); });
      svg.getElementById("rep-expected").setAttribute("points", ctx.cache.repExp.join(" "));
    }
    const lines = svg.querySelectorAll(".study-run");
    ctx.cache.repRuns.forEach((points, i) => lines[i]?.setAttribute("points", points.slice(0, g + 1).join(" ")));
    svg.getElementById("rep-mean").setAttribute("points", ctx.cache.repMean.slice(0, g + 1).join(" "));
    const x = (P.x0 + ((P.x1 - P.x0) * g) / G).toFixed(1);
    const now = svg.getElementById("rep-now");
    now.setAttribute("x1", x); now.setAttribute("x2", x); now.setAttribute("y1", y1); now.setAttribute("y2", y0);
  },
};
