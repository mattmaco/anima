// Geometry and drawing helpers for the life-cycle route figures.
export const f = (n) => (Math.round(n * 10) / 10).toString();
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Catmull-Rom → cubic Bézier path through points (open or closed).
export function smooth(pts, closed = false, t = 0.5) {
  const n = pts.length;
  if (n < 2) return "";
  const P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + "Z" : d;
}

// Sample a Catmull-Rom curve as a dense polyline (for motion).
export function sample(pts, per = 8) {
  if (pts.length < 2) return pts.map((p) => [...p]);
  const out = [];
  const n = pts.length;
  const P = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k = Math.max(2, Math.ceil(len / per));
    for (let j = 0; j < k; j++) {
      const u = j / k, u2 = u * u, u3 = u2 * u;
      const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u2 + (-a + 3 * b - 3 * c2 + d) * u3);
      out.push([+c(p0[0], p1[0], p2[0], p3[0]).toFixed(1), +c(p0[1], p1[1], p2[1], p3[1]).toFixed(1)]);
    }
  }
  out.push([...pts[n - 1]]);
  return out;
}

export const centroid = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
const scaleAbout = (pts, c, k, dx = 0, dy = 0) => pts.map(([x, y]) => [c[0] + (x - c[0]) * k + dx, c[1] + (y - c[1]) * k + dy]);
export const ellipsePts = (cx, cy, rx, ry, n = 14, rot = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2, c = Math.cos(rot), s = Math.sin(rot);
  const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
  return [cx + x * c - y * s, cy + x * s + y * c];
});

// An organ: base, inner shade, highlight and a crisp edge (same recipe as the kit's bio-blob).
export function organ(pts, { id, info, label, tone = "hi", cls = "", base = "", c: col = "" } = {}) {
  const c = centroid(pts);
  const span = Math.max(...pts.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1])));
  const sh = scaleAbout(pts, c, 0.9, span * 0.03, span * 0.05);
  const hl = scaleAbout(pts, c, 0.62, -span * 0.12, -span * 0.16);
  const inner = `<path class="og-base ${base}" d="${smooth(pts, true)}"/><path class="og-shade" d="${smooth(sh, true)}"/><path class="og-hl" d="${smooth(hl, true)}"/><path class="og-edge" data-tone="${tone}" d="${smooth(pts, true)}"/>`;
  return hot(id, info, label, inner, cls, col);
}

// A tube along a centreline: outline, body, shine.
export function tube(pts, w, { id, info, label, tone = "hi", cls = "", body = "", c = "" } = {}) {
  const d = smooth(pts);
  const sh = pts.map(([x, y]) => [x - w * 0.18, y - w * 0.22]);
  const inner = `<path class="tb-out" data-tone="${tone}" d="${d}" stroke-width="${f(w + 1.6)}"/><path class="tb-in ${body}" d="${d}" stroke-width="${f(w)}"/><path class="tb-sh" d="${smooth(sh)}" stroke-width="${f(Math.max(0.6, w * 0.3))}"/>`;
  return hot(id, info, label, inner, cls, c);
}

export function hot(id, info, label, inner, cls = "", c = "") {
  const dc = c ? ` data-c="${c}"` : "";
  if (!id) return `<g class="${cls}"${dc}>${inner}</g>`;
  return `<g class="hot ${cls}"${dc} id="${id}" tabindex="0" aria-label="${esc(label || id)}" data-info="${esc(info || label || id)}">${inner}</g>`;
}

export const line = (d, tone = "mid", extra = "") => `<path class="ln" data-tone="${tone}" d="${d}" ${extra}/>`;
export const pl = (pts) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join("L");
