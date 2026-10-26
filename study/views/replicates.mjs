// Two panels: p over generations in many seeded populations, and heterozygosity (simulated mean vs expected).
// Spec: replicates: { runs, generations: "<param>" }; model returns { runs, meanH, expectedH }.
// Side by side in a wide box; stacked (p above H) in a narrow one.
import { esc } from "../esc.mjs";

// Panel rectangles for a box. Duplicated inside render, which is copied into the page and cannot see module scope.
function panels(box) {
  if (box.w >= 500) {
    const split = box.x + box.w * 0.6, y0 = box.y + box.h - 34, y1 = box.y + 24;
    return { P: { x0: box.x + 36, x1: split - 16, y0, y1, top: box.y }, H: { x0: split + 30, x1: box.x + box.w - 8, y0, y1, top: box.y } };
  }
  const half = box.h / 2;
  const at = (top) => ({ x0: box.x + 36, x1: box.x + box.w - 8, y0: top + half - 34, y1: top + 24, top });
  return { P: at(box.y), H: at(box.y + half) };
}

export const replicates = {
  name: "replicates",
  frame(spec, box) {
    const runs = spec.replicates.runs;
    const { P, H } = panels(box);
    const panel = ({ x0, x1, y0, y1, top }, title, note, yTicks, id) => {
      const ticks = yTicks.map(([v, label]) => `<line class="study-grid" x1="${x0}" x2="${x1}" y1="${y0 - (y0 - y1) * v}" y2="${y0 - (y0 - y1) * v}"/><text class="study-tick" x="${x0 - 6}" y="${y0 - (y0 - y1) * v + 3.5}" text-anchor="end">${label}</text>`).join("");
      const xTicks = [0, 0.5, 1].map((t, i) => `<text id="${id}-x${i}" class="study-tick" x="${x0 + (x1 - x0) * t}" y="${y0 + 14}" text-anchor="middle"></text>`).join("");
      return `<text class="study-axis-label" x="${x0}" y="${top + 12}" tabindex="0" data-note="${esc(note)}">${esc(title)}</text>${ticks}${xTicks}<line class="study-axis" x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}"/><line class="study-axis" x1="${x0}" x2="${x0}" y1="${y0}" y2="${y1}"/><text class="study-axis-label" x="${(x0 + x1) / 2}" y="${y0 + 28}" text-anchor="middle">generation</text>`;
    };
    const pTitle = box.w >= 500 ? "allele frequency p, one line per population" : "p, one line per population";
    const lines = Array.from({ length: runs }, () => `<polyline class="study-run"/>`).join("");
    return `<g class="study-replicates">${panel(P, pTitle, spec.notes?.runs ?? "", [[0, "0"], [0.5, "0.5"], [1, "1"]], "rp")}${panel(H, "heterozygosity H", spec.notes?.meanH ?? "", [[0, "0"], [0.5, "0.25"], [1, "0.5"]], "rh")}<g id="rep-runs">${lines}</g><polyline id="rep-expected" class="study-expected"/><polyline id="rep-mean" class="study-mean"/><line id="rep-now" class="study-marker"/><text class="study-key study-s0" x="${H.x1}" y="${H.top + 36}" text-anchor="end" tabindex="0" data-note="${esc(spec.notes?.expectedH ?? "")}">- - expected</text><text class="study-key" x="${H.x1}" y="${H.top + 50}" text-anchor="end" tabindex="0" data-note="${esc(spec.notes?.meanH ?? "")}">— simulated</text></g>`;
  },
  render: (svg, data, params, box, ctx) => {
    const half = box.h / 2;
    const at = (top) => ({ x0: box.x + 36, x1: box.x + box.w - 8, y0: top + half - 34, y1: top + 24 });
    const split = box.x + box.w * 0.6, y0 = box.y + box.h - 34, y1 = box.y + 24;
    const wide = box.w >= 500;
    const P = wide ? { x0: box.x + 36, x1: split - 16, y0, y1 } : at(box.y);
    const Hp = wide ? { x0: split + 30, x1: box.x + box.w - 8, y0, y1 } : at(box.y + half);
    const G = data.runs[0].length - 1;
    const g = Math.min(ctx.gen, G);
    if (ctx.cache.repData !== data) {
      ctx.cache.repData = data;
      const pt = (panel, t, v) => `${(panel.x0 + ((panel.x1 - panel.x0) * t) / G).toFixed(1)},${(panel.y0 - (panel.y0 - panel.y1) * v).toFixed(1)}`;
      ctx.cache.repRuns = data.runs.map((run) => run.map((p, t) => pt(P, t, p)));
      ctx.cache.repMean = data.meanH.map((h, t) => pt(Hp, t, h / 0.5));
      ctx.cache.repExp = data.expectedH.map((h, t) => pt(Hp, t, h / 0.5));
      for (const id of ["rp", "rh"]) [0, 0.5, 1].forEach((t, i) => { svg.getElementById(`${id}-x${i}`).textContent = String(Math.round(G * t)); });
      svg.getElementById("rep-expected").setAttribute("points", ctx.cache.repExp.join(" "));
    }
    const lines = svg.querySelectorAll(".study-run");
    ctx.cache.repRuns.forEach((points, i) => lines[i]?.setAttribute("points", points.slice(0, g + 1).join(" ")));
    svg.getElementById("rep-mean").setAttribute("points", ctx.cache.repMean.slice(0, g + 1).join(" "));
    const x = (P.x0 + ((P.x1 - P.x0) * g) / G).toFixed(1);
    const now = svg.getElementById("rep-now");
    now.setAttribute("x1", x); now.setAttribute("x2", x); now.setAttribute("y1", P.y1); now.setAttribute("y2", P.y0);
  },
};
