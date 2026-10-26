// y-values against one swept param, with a marker at the current value.
// Spec: curves: { x: "<param>", series: [{ key, label }], sweep: 101, fixed: { <param>: value } }
const PAD = { l: 44, r: 92, t: 12, b: 40 };

export const curves = {
  name: "curves",
  frame(spec, box) {
    const c = spec.curves;
    const x0 = box.x + PAD.l, x1 = box.x + box.w - PAD.r, y0 = box.y + box.h - PAD.b, y1 = box.y + PAD.t;
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    const param = spec.params[c.x];
    const xTick = (t) => `<line class="study-axis" x1="${x0 + (x1 - x0) * t}" y1="${y0}" x2="${x0 + (x1 - x0) * t}" y2="${y0 + 4}"/><text class="study-tick" x="${x0 + (x1 - x0) * t}" y="${y0 + 16}" text-anchor="middle">${+(param.min + (param.max - param.min) * t).toFixed(2)}</text>`;
    const yTick = (t) => `<line class="study-grid" x1="${x0}" y1="${y0 - (y0 - y1) * t}" x2="${x1}" y2="${y0 - (y0 - y1) * t}"/><text class="study-tick" x="${x0 - 8}" y="${y0 - (y0 - y1) * t + 3.5}" text-anchor="end">${t}</text>`;
    const series = c.series.map((s, i) => `<path id="curve-${s.key}" class="study-series study-s${i}"/><circle id="dot-${s.key}" class="study-dot study-s${i}" r="4"/><text id="label-${s.key}" class="study-label study-s${i}" x="${x1 + 8}" tabindex="0" data-note="${(spec.notes?.[s.key] ?? s.label).replace(/"/g, "&quot;")}">${s.label}</text>`).join("");
    return `<g class="study-curves">${ticks.map(yTick).join("")}${ticks.map(xTick).join("")}<line class="study-axis" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}"/><line class="study-axis" x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}"/><text class="study-axis-label" x="${(x0 + x1) / 2}" y="${y0 + 34}" text-anchor="middle">${param.label}</text><text class="study-axis-label" transform="translate(${box.x + 10} ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle">frequency</text><line id="curve-marker" class="study-marker" y1="${y1}" y2="${y0}"/>${series}</g>`;
  },
  render: (svg, data, params, box, ctx) => {
    const c = ctx.spec.curves;
    const pad = { l: 44, r: 92, t: 12, b: 40 };
    const x0 = box.x + pad.l, x1 = box.x + box.w - pad.r, y0 = box.y + box.h - pad.b, y1 = box.y + pad.t;
    const { min, max } = ctx.spec.params[c.x];
    const sx = (v) => x0 + ((x1 - x0) * (v - min)) / (max - min);
    const sy = (v) => y0 - (y0 - y1) * Math.min(1, Math.max(0, v));
    const key = JSON.stringify({ ...params, ...c.fixed, [c.x]: null });
    if (ctx.cache.curves !== key) {
      ctx.cache.curves = key;
      const n = c.sweep ?? 101;
      const rows = Array.from({ length: n }, (_, i) => {
        const x = min + ((max - min) * i) / (n - 1);
        return [x, ctx.model({ ...params, ...c.fixed, [c.x]: x }, ctx.lib.mulberry32(1), ctx.lib)];
      });
      for (const s of c.series) {
        svg.getElementById(`curve-${s.key}`).setAttribute("d", rows.map(([x, m], i) => `${i ? "L" : "M"}${sx(x).toFixed(1)},${sy(m[s.key]).toFixed(1)}`).join(""));
      }
      // Labels sit at each curve's right end, pushed apart so they never overlap.
      const labels = c.series.map((s) => ({ key: s.key, y: sy(rows.at(-1)[1][s.key]) + 4 })).sort((a, b) => a.y - b.y);
      for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 14);
      const over = labels.at(-1).y - (y0 + 4);
      if (over > 0) for (const label of labels) label.y -= over;
      for (let i = labels.length - 2; i >= 0; i--) labels[i].y = Math.min(labels[i].y, labels[i + 1].y - 14);
      for (const label of labels) svg.getElementById(`label-${label.key}`).setAttribute("y", label.y.toFixed(1));
    }
    const x = data[c.x] ?? params[c.x];
    const marker = svg.getElementById("curve-marker");
    marker.setAttribute("x1", sx(x).toFixed(1));
    marker.setAttribute("x2", sx(x).toFixed(1));
    for (const s of c.series) {
      const dot = svg.getElementById(`dot-${s.key}`);
      dot.setAttribute("cx", sx(x).toFixed(1));
      dot.setAttribute("cy", sy(data[s.key]).toFixed(1));
    }
  },
};
