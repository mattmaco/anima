// One deterministic run per series over generations, with dashed horizontal marks (an equilibrium, a target).
// Spec: trajectory: { series: [{ key, label }], marks: [{ key, label }], y: "auto" | max, ylabel }
// Model returns { <series key>: number[] (one value per generation), <mark key>: number }.
// Marks draw above the series, so an equilibrium stays visible once a run settles on it.
import { esc } from "../esc.mjs";

const PAD = { l: 64, r: 96, t: 12, b: 40 };

export const trajectory = {
  name: "trajectory",
  frame(spec, box) {
    const t = spec.trajectory;
    const x0 = box.x + PAD.l, x1 = box.x + box.w - PAD.r, y0 = box.y + box.h - PAD.b, y1 = box.y + PAD.t;
    const yTicks = [0, 1, 2, 3, 4].map((i) => `<line class="study-grid" x1="${x0}" x2="${x1}" y1="${y0 - ((y0 - y1) * i) / 4}" y2="${y0 - ((y0 - y1) * i) / 4}"/><text id="traj-y${i}" class="study-tick study-ytick" x="${x0 - 8}" y="${y0 - ((y0 - y1) * i) / 4 + 3.5}" text-anchor="end"></text>`).join("");
    const xTicks = [0, 0.5, 1].map((f, i) => `<text id="traj-x${i}" class="study-tick" x="${x0 + (x1 - x0) * f}" y="${y0 + 16}" text-anchor="middle"></text>`).join("");
    const label = (id, cls, key, text) => `<text id="${id}" class="${cls}" x="${x1 + 8}" tabindex="0" data-note="${esc(spec.notes?.[key] ?? text)}">${esc(text)}</text>`;
    const marks = (t.marks ?? []).map((m) => `<line id="mark-${m.key}" class="study-mark" x1="${x0}" x2="${x1}"/>${label(`mark-label-${m.key}`, "study-label study-mark-label", m.key, m.label)}`).join("");
    const series = t.series.map((s, i) => `<path id="traj-${s.key}" class="study-series study-s${i}"/>${label(`traj-label-${s.key}`, `study-label study-s${i}`, s.key, s.label)}`).join("");
    return `<g class="study-trajectory"><rect id="traj-frame" x="${x0}" y="${y1}" width="${x1 - x0}" height="${y0 - y1}" fill="none"/>${yTicks}${xTicks}<line class="study-axis" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}"/><line class="study-axis" x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}"/><text class="study-axis-label" x="${(x0 + x1) / 2}" y="${y0 + 34}" text-anchor="middle">generation</text><text class="study-axis-label" transform="translate(${box.x + 4} ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle">${esc(t.ylabel ?? "frequency")}</text>${series}${marks}</g>`;
  },
  render: (svg, data, params, box, ctx) => {
    const t = ctx.spec.trajectory;
    const pad = { l: 64, r: 96, t: 12, b: 40 };
    const x0 = box.x + pad.l, x1 = box.x + box.w - pad.r, y0 = box.y + box.h - pad.b, y1 = box.y + pad.t;
    const marks = t.marks ?? [];
    const G = data[t.series[0].key].length - 1;
    let top = typeof t.y === "number" ? t.y : 0;
    if (t.y === "auto" || top <= 0) {
      const peak = Math.max(...t.series.flatMap((s) => data[s.key]), ...marks.map((m) => data[m.key]));
      const k = 10 ** Math.floor(Math.log10(peak > 0 ? peak : 1));
      top = k * ([1, 2, 2.5, 5, 10].find((f) => f * k >= peak * (1 - 1e-9)) ?? 10);
    }
    const sx = (g) => x0 + ((x1 - x0) * g) / Math.max(G, 1);
    const sy = (v) => y0 - (y0 - y1) * Math.min(1, Math.max(0, v / top));
    const fmt = (v) => (v === 0 ? "0" : String(+v.toPrecision(3)));
    for (let i = 0; i < 5; i++) svg.getElementById(`traj-y${i}`).textContent = fmt((top * i) / 4);
    [0, 0.5, 1].forEach((f, i) => { svg.getElementById(`traj-x${i}`).textContent = String(Math.round(G * f)); });
    const step = Math.max(1, Math.ceil(G / 400));
    const labels = [];
    for (const s of t.series) {
      const values = data[s.key];
      const points = [];
      for (let g = 0; g <= G; g += step) points.push([g, values[g]]);
      if (points.at(-1)[0] !== G) points.push([G, values[G]]);
      svg.getElementById(`traj-${s.key}`).setAttribute("d", points.map(([g, v], i) => `${i ? "L" : "M"}${sx(g).toFixed(1)},${sy(v).toFixed(1)}`).join(""));
      labels.push({ id: `traj-label-${s.key}`, y: sy(values[G]) + 4 });
    }
    for (const m of marks) {
      const y = sy(data[m.key]).toFixed(1);
      const line = svg.getElementById(`mark-${m.key}`);
      line.setAttribute("y1", y); line.setAttribute("y2", y);
      labels.push({ id: `mark-label-${m.key}`, y: +y + 4 });
    }
    // Labels sit at the right end, pushed apart so they never overlap and kept inside the plot.
    labels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 14);
    const over = labels.at(-1).y - (y0 + 4);
    if (over > 0) for (const label of labels) label.y -= over;
    for (let i = labels.length - 2; i >= 0; i--) labels[i].y = Math.min(labels[i].y, labels[i + 1].y - 14);
    for (const label of labels) svg.getElementById(label.id).setAttribute("y", label.y.toFixed(1));
  },
};
