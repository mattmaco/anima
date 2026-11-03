// A life cycle as a loop of stages coloured by host, with side routes (autoinfection, dead ends) and "break a link" cuts.
// Spec: cycle: { hosts: [{ key, label, short?, role? }],
//                stages: [{ key, label, host, where?, how }],             // in order; `how` leads to the next stage; adult last
//                side?: [{ key, label, host, where?, from, how, back?, backHow?, pos?: [fx, fy] }],  // no `back` = dead end
//                cuts?: { name: { links: ["from>to", ...], text } } }
// The build fills params (step, cut), states, model and readout, so a cycle spec is data only.
// The model returns { step, dim, broken, caption, text }: dim lists stages that stop forming once the cut links break.
import { esc } from "../esc.mjs";

// Wide: one horizontal band per host (hosts order = top to bottom), stage cards in their band, orthogonal arrows.
// A band that holds side routes gets a second row under its main row. Phones: one column, tinted runs per host.
const CARD = { w: 150, h: 58 };
const BAND = { top: 26, bottom: 22, gap: 10, rowGap: 34 };
const NCARD = { h: 52, gap: 24, strip: 22 };
const SIDE_NARROW_W = 136;
const CAPTION = { wide: 46, narrow: 92 };
const CH = 6.1; // advance of a 10px mono glyph

const hostIndex = (spec, key) => spec.cycle.hosts.findIndex((h) => h.key === key);

function wrap(text, max) {
  const lines = [""];
  for (const word of String(text).split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length > max) lines.push(word);
    else lines[lines.length - 1] = last ? `${last} ${word}` : word;
  }
  return lines.filter(Boolean);
}

// Band heights depend only on the spec (which bands hold side routes), so the build can size the box first.
function bandRows(spec) {
  const c = spec.cycle;
  return c.hosts.map((h) => ((c.side ?? []).some((s) => s.host === h.key) && c.stages.some((s) => s.host === h.key) ? 2 : 1));
}
const bandH = (rows) => BAND.top + rows * CARD.h + (rows - 1) * BAND.rowGap + BAND.bottom;

function narrowWalk(spec, top = 0) {
  const ring = spec.cycle.stages, ys = [], runs = [];
  let y = top;
  ring.forEach((s, i) => {
    if (i === 0 || s.host !== ring[i - 1].host) { runs.push({ host: s.host, y0: y, first: i }); y += NCARD.strip; }
    ys.push(y + NCARD.h / 2);
    y += NCARD.h + NCARD.gap;
    runs[runs.length - 1].y1 = y - NCARD.gap + 6;
  });
  return { ys, runs, h: y - top };
}

export const cycleHeight = {
  wide: (spec) => 6 + bandRows(spec).reduce((sum, r) => sum + bandH(r) + BAND.gap, 0) + CAPTION.wide,
  narrow: (spec) => 8 + Math.max(narrowWalk(spec).h, (spec.cycle.side ?? []).length * (NCARD.h + 14)) + CAPTION.narrow,
};

// Columns: the adult sits in column 0; each next stage moves one column right, or stays in the column when it
// crosses into another band (a vertical arrow), so host changes read as arrows crossing band edges.
function columns(spec) {
  const c = spec.cycle, ring = c.stages, n = ring.length, col = {}, taken = new Set();
  const band = (s) => hostIndex(spec, s.host);
  const adult = ring[n - 1];
  col[adult.key] = adult.col ?? 0;
  taken.add(`${band(adult)}:${col[adult.key]}`);
  const clear = (k, b0, b1) => { for (let b = Math.min(b0, b1) + 1; b < Math.max(b0, b1); b++) if (taken.has(`${b}:${k}`)) return false; return true; };
  let prev = adult;
  ring.slice(0, n - 1).forEach((s, i) => {
    let k = s.col;
    if (k === undefined) {
      k = band(s) !== band(prev) && clear(col[prev.key], band(prev), band(s)) ? col[prev.key] : col[prev.key] + 1;
      while (taken.has(`${band(s)}:${k}`)) k++;
      // The stage before the adult must not sit straight under it behind other cards.
      if (i === n - 2 && band(s) !== band(adult) && k === col[adult.key] && !clear(k, band(s), band(adult))) { k++; while (taken.has(`${band(s)}:${k}`)) k++; }
    }
    col[s.key] = k;
    taken.add(`${band(s)}:${k}`);
    prev = s;
  });
  return col;
}

function placeWide(spec, box) {
  const c = spec.cycle, side = c.side ?? [];
  const col = columns(spec);
  const rows = bandRows(spec);
  const bands = [];
  let y = box.y + 6;
  rows.forEach((r, b) => { bands.push({ b, y, h: bandH(r), rows: r }); y += bandH(r) + BAND.gap; });
  const rowY = (b, sub) => bands[b].y + BAND.top + CARD.h / 2 + sub * (CARD.h + BAND.rowGap);
  const rowOf = (b, sub) => bands.slice(0, b).reduce((sum, x) => sum + x.rows, 0) + sub;
  // Side nodes: the side row of their band, at the column nearest their `from` that no vertical arrow crosses.
  const ringKeys = c.stages.map((s) => s.key);
  const verticalCols = new Set();
  c.stages.forEach((s, i) => {
    const t = c.stages[(i + 1) % c.stages.length];
    if (s.host !== t.host) verticalCols.add(col[s.key]);
  });
  const sideTaken = new Set();
  for (const s of side) {
    const b = hostIndex(spec, s.host), from = col[s.from] ?? 0;
    let k = s.col;
    if (k === undefined) {
      for (const d of [0, 1, -1, 2, -2, 3, 4, 5]) {
        const cand = from + d;
        if (cand < 0 || sideTaken.has(`${b}:${cand}`)) continue;
        if (rows[b] === 1 && Object.entries(col).some(([key, k]) => k === cand && ringKeys.includes(key) && c.stages.find((x) => x.key === key).host === s.host)) continue;
        if (verticalCols.has(cand) && rows[b] === 2 && bands.some((x) => x.b > b)) continue;
        k = cand;
        break;
      }
    }
    col[s.key] = k ?? from;
    sideTaken.add(`${b}:${col[s.key]}`);
  }
  const ncols = Math.max(3, ...Object.values(col)) + 1;
  const pitch = Math.min(230, (box.w - 24 - CARD.w) / Math.max(1, ncols - 1));
  const w = Math.max(112, Math.min(CARD.w, pitch - 40));
  const total = (ncols - 1) * pitch + w;
  const x0 = box.x + (box.w - total) / 2 + w / 2;
  const pos = {}, cells = {};
  for (const s of [...c.stages, ...side]) {
    const b = hostIndex(spec, s.host), sub = ringKeys.includes(s.key) || rows[b] === 1 ? 0 : 1;
    pos[s.key] = { x: x0 + col[s.key] * pitch, y: rowY(b, sub), w, h: CARD.h, row: rowOf(b, sub), col: col[s.key], band: b };
    cells[`${pos[s.key].row}:${col[s.key]}`] = s.key;
  }
  return { pos, bands, cells, pitch, w, ncols, x0 };
}

// Orthogonal route between two cards: straight in a row or column, an elbow otherwise, or a hop over a blocked row.
function route(a, b, grid) {
  const { cells, ncols, x0, pitch } = grid;
  const busy = (row, from, to) => { for (let k = Math.min(from, to) + 1; k < Math.max(from, to); k++) if (cells[`${row}:${k}`]) return true; return false; };
  const colBusy = (k, r0, r1) => { for (let r = Math.min(r0, r1) + 1; r < Math.max(r0, r1); r++) if (cells[`${r}:${k}`]) return true; return false; };
  const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
  if (a.row === b.row) {
    if (!busy(a.row, a.col, b.col)) return [{ x: a.x + dx * a.w / 2, y: a.y }, { x: b.x - dx * (b.w / 2 + 3), y: b.y }];
    const yu = a.y - a.h / 2 - 13;
    return [{ x: a.x + dx * 16, y: a.y - a.h / 2 }, { x: a.x + dx * 16, y: yu }, { x: b.x - dx * 16, y: yu }, { x: b.x - dx * 16, y: b.y - b.h / 2 - 3 }];
  }
  const start = { x: a.x, y: a.y + dy * a.h / 2 }, end = { x: b.x, y: b.y - dy * (b.h / 2 + 3) };
  const nearA = a.y + dy * (a.h / 2 + 15), nearB = b.y - dy * (b.h / 2 + 15);
  if (a.col === b.col && !colBusy(a.col, a.row, b.row)) return [start, end];
  // Turn next to the source first: the source column often carries the arrow coming the other way.
  if (!colBusy(b.col, a.row, b.row)) return [start, { x: a.x, y: nearA }, { x: b.x, y: nearA }, end];
  if (!colBusy(a.col, a.row, b.row)) return [start, { x: a.x, y: nearB }, { x: b.x, y: nearB }, end];
  // Detour through the clear column nearest both ends, or past the last column.
  let best = ncols, cost = Infinity;
  for (let k = 0; k < ncols; k++) if (!colBusy(k, a.row, b.row) && !cells[`${a.row}:${k}`] && !cells[`${b.row}:${k}`]) {
    const d = Math.abs(k - a.col) + Math.abs(k - b.col);
    if (d < cost) { cost = d; best = k; }
  }
  const xk = best < ncols ? x0 + best * pitch : x0 + (ncols - 1) * pitch + a.w / 2 + 14;
  return [start, { x: a.x, y: nearA }, { x: xk, y: nearA }, { x: xk, y: nearB }, { x: b.x, y: nearB }, end];
}

function edgeSvg({ key, note, pts, how, cls, labelled, maxW, boxes, bounds, xAt, pending }) {
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");
  const end = pts[pts.length - 1], prev = pts[pts.length - 2];
  const ang = Math.atan2(end.y - prev.y, end.x - prev.x), s = 7;
  const head = `M${end.x.toFixed(1)} ${end.y.toFixed(1)}L${(end.x - s * Math.cos(ang - 0.45)).toFixed(1)} ${(end.y - s * Math.sin(ang - 0.45)).toFixed(1)}L${(end.x - s * Math.cos(ang + 0.45)).toFixed(1)} ${(end.y - s * Math.sin(ang + 0.45)).toFixed(1)}Z`;
  // Try each segment, longest first: above or below a horizontal run, right or left of a vertical one.
  // Take the first spot that clears cards, other labels and the canvas edge; the ✗ goes on that segment.
  const segs = pts.slice(0, -1).map((p, i) => ({ p, q: pts[i + 1], len: Math.hypot(pts[i + 1].x - p.x, pts[i + 1].y - p.y) })).sort((u, v) => v.len - u.len);
  const longest = segs[0];
  let mid = xAt ?? { x: (longest.p.x + longest.q.x) / 2, y: (longest.p.y + longest.q.y) / 2 };
  let label = "";
  if (labelled && how) {
    const spots = [];
    for (const { p, q, len } of segs) {
      const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      if (Math.abs(q.x - p.x) > Math.abs(q.y - p.y)) {
        // A wide wrap first; a narrow one (more lines) if the arrow is short.
        for (const chars of [Math.max(14, Math.floor((len - 14) / CH)), Math.max(8, Math.floor((len - 18) / CH))]) {
          const lines = wrap(how, chars).slice(0, 5);
          const w = Math.max(...lines.map((l) => l.length)) * CH, h = lines.length * 11;
          for (const t of [0.5, 0.3, 0.7]) {
            const x = p.x + (q.x - p.x) * t;
            spots.push({ lines, anchor: "middle", x, y: m.y - 10 - (lines.length - 1) * 11, box: { x0: x - w / 2, x1: x + w / 2, y0: m.y - 9 - h, y1: m.y - 7 } });
            spots.push({ lines, anchor: "middle", x, y: m.y + 17, box: { x0: x - w / 2, x1: x + w / 2, y0: m.y + 7, y1: m.y + 9 + h } });
          }
        }
      } else {
        const lines = wrap(how, Math.max(10, Math.floor(maxW / CH))).slice(0, 3);
        const w = Math.max(...lines.map((l) => l.length)) * CH, h = lines.length * 11;
        for (const dy of [0, -16, 16, -30, 30]) {
          const yc = m.y + dy;
          if (yc < Math.min(p.y, q.y) || yc > Math.max(p.y, q.y)) continue;
          const y0 = yc - ((lines.length - 1) * 11) / 2 + 3.5;
          spots.push({ lines, anchor: "start", x: m.x + 11, y: y0, box: { x0: m.x + 10, x1: m.x + 12 + w, y0: y0 - 9, y1: y0 - 9 + h } });
          spots.push({ lines, anchor: "end", x: m.x - 11, y: y0, box: { x0: m.x - 12 - w, x1: m.x - 10, y0: y0 - 9, y1: y0 - 9 + h } });
        }
      }
    }
    const inBounds = (b) => !bounds || (b.x0 >= bounds.x0 && b.x1 <= bounds.x1);
    const spot = spots.find((sp) => inBounds(sp.box) && !boxes.some((b) => hits(b, sp.box))) ?? spots.find((sp) => inBounds(sp.box)) ?? spots[0];
    boxes.push(spot.box);
    label = `<text class="cyc-how" x="${spot.x.toFixed(1)}" y="${spot.y.toFixed(1)}" text-anchor="${spot.anchor}">${spot.lines.map((l, i) => `<tspan x="${spot.x.toFixed(1)}" dy="${i ? 11 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
  }
  // Wide figures place every ✗ after all labels are down (see placeX); phones pass a fixed spot.
  const xMark = xAt || !pending ? `x="${mid.x.toFixed(1)}" y="${(mid.y + 6).toFixed(1)}"` : `@@X${pending.push(pts) - 1}@@`;
  return `<g class="cyc-edge ${cls}" data-edge="${esc(key)}" tabindex="0" data-note="${esc(note)}"><path class="cyc-line" d="${d}"/><path class="cyc-head" d="${head}"/>${label}<text class="cyc-x" ${xMark} text-anchor="middle">✗</text></g>`;
}

function nodeSvg(spec, s, r, isSide) {
  const c = spec.cycle, hi = hostIndex(spec, s.host), h = c.hosts[hi];
  const next = isSide && s.back ? (c.stages.find((x) => x.key === s.back) ?? s).label : null;
  const note = spec.notes?.[s.key] ?? `${s.label}: ${h.label}${s.where ? `, ${s.where}` : ""}.${isSide && !s.back ? " Dead end: the cycle cannot continue from here." : ""}${next ? ` Rejoins the cycle at ${next}.` : ""}`;
  const max = Math.floor((r.w - 14) / CH);
  const lines = wrap(s.where ?? "", max).slice(0, isSide && !s.back ? 1 : 2);
  const left = r.x - r.w / 2 + 8, top = r.y - r.h / 2;
  const desc = lines.map((l, i) => `<text class="cyc-desc" x="${left.toFixed(1)}" y="${(top + 33 + i * 12).toFixed(1)}">${esc(l)}</text>`).join("");
  const dead = isSide && !s.back ? `<text class="cyc-dead" x="${left.toFixed(1)}" y="${(top + 33 + lines.length * 12).toFixed(1)}">dead end</text>` : "";
  return `<g id="cyc-n-${esc(s.key)}" class="cyc-node cyc-h${hi % 5}${isSide ? " cyc-side-node" : ""}${s.amp ? " cyc-amp" : ""}" tabindex="0" data-note="${esc(note)}"><rect x="${(r.x - r.w / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${r.w}" height="${r.h}" rx="6"/><text class="cyc-name" x="${left.toFixed(1)}" y="${(top + 18).toFixed(1)}">${esc(s.label)}</text>${desc}${dead}</g>`;
}

// The point on an arrow nearest its middle whose ✗ clears every label.
function placeX(pts, boxes) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const samples = [];
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    for (let t = 0; t <= l; t += 4) samples.push({ x: a.x + ((b.x - a.x) * t) / l, y: a.y + ((b.y - a.y) * t) / l, at: Math.abs(run + t - total / 2) });
    run += l;
  }
  samples.sort((u, v) => u.at - v.at);
  const pt = samples.find((q) => !boxes.some((b) => hits(b, { x0: q.x - 11, x1: q.x + 11, y0: q.y - 14, y1: q.y + 13 }))) ?? samples[0];
  return `x="${pt.x.toFixed(1)}" y="${(pt.y + 6).toFixed(1)}"`;
}

const hits = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const segBox = (p, q) => ({ x0: Math.min(p.x, q.x) - 2, x1: Math.max(p.x, q.x) + 2, y0: Math.min(p.y, q.y) - 2, y1: Math.max(p.y, q.y) + 2 });

// Band title: role in caps, then the host; put in whichever corner strip no arrow or label crosses.
function bandSvg(spec, band, box, blockers) {
  const h = spec.cycle.hosts[band.b], role = (h.role ?? "").toUpperCase(), label = h.label;
  const w = role.length * 7 + label.length * CH + 18;
  const corners = [["l", band.y + 16], ["l", band.y + band.h - 8], ["r", band.y + 16], ["r", band.y + band.h - 8]];
  let pick = corners[0];
  for (const cn of corners) {
    const x0 = cn[0] === "l" ? box.x + 12 : box.x + box.w - 12 - w;
    if (!blockers.some((b) => hits(b, { x0, x1: x0 + w, y0: cn[1] - 10, y1: cn[1] + 3 }))) { pick = cn; break; }
  }
  const x = pick[0] === "l" ? box.x + 12 : box.x + box.w - 12;
  const anchor = pick[0] === "l" ? "start" : "end";
  return `<rect class="cyc-band cyc-h${band.b % 5}" x="${box.x}" y="${band.y.toFixed(1)}" width="${box.w}" height="${band.h}" rx="10"/><text class="cyc-band-title" x="${x}" y="${pick[1].toFixed(1)}" text-anchor="${anchor}">${role ? `<tspan class="cyc-band-role">${esc(role)}</tspan> ` : ""}<tspan class="cyc-band-sub">${esc(label)}</tspan></text>`;
}

function frameWide(spec, box) {
  const grid = placeWide(spec, box);
  const { pos, bands, pitch } = grid;
  const cardBoxes = Object.values(pos).map((r) => ({ x0: r.x - r.w / 2 - 2, x1: r.x + r.w / 2 + 2, y0: r.y - r.h / 2 - 2, y1: r.y + r.h / 2 + 2 }));
  const labels = [...cardBoxes], lines = [];
  const bounds = { x0: box.x + 4, x1: box.x + box.w - 4 };
  const pending = [];
  let out = edges(spec).map((e) => {
    const a = pos[e.from], b = pos[e.to], key = `${e.from}>${e.to}`;
    let pts = route(a, b, grid);
    if (e.pair) pts = pts.map((p) => ({ x: p.x + (e.back ? -6 : 6), y: p.y + (e.back ? -6 : 6) }));
    for (let i = 1; i < pts.length; i++) lines.push(segBox(pts[i - 1], pts[i]));
    const note = e.how ? `${key.replace(">", " → ")}: ${e.how}` : key.replace(">", " → ");
    return edgeSvg({ key, note, pts, how: e.how, cls: `${e.ring ? "cyc-ring-edge" : "cyc-side"}${e.amp ? " cyc-amp" : ""}`, labelled: true, maxW: pitch - 30, boxes: labels, bounds, pending });
  }).join("");
  out = out.replace(/@@X(\d+)@@/g, (_, i) => placeX(pending[+i], labels));
  const nodes = [...spec.cycle.stages.map((s) => nodeSvg(spec, s, pos[s.key], false)), ...(spec.cycle.side ?? []).map((s) => nodeSvg(spec, s, pos[s.key], true))].join("");
  const bandSvgs = bands.map((band) => bandSvg(spec, band, box, [...lines, ...labels])).join("");
  const last = bands[bands.length - 1];
  return { svg: `${bandSvgs}${out}${nodes}`, bottom: last.y + last.h };
}

function frameNarrow(spec, box) {
  const c = spec.cycle, side = c.side ?? [];
  const top = box.y + 8;
  const { ys, runs } = narrowWalk(spec, top);
  const cw = side.length ? box.w - 34 - SIDE_NARROW_W : box.w - 30;
  const cx = box.x + 24 + cw / 2;
  const pos = {};
  c.stages.forEach((s, i) => { pos[s.key] = { x: cx, y: ys[i], w: cw, h: NCARD.h }; });
  const used = [];
  for (const s of side) {
    const f = pos[s.from], b = pos[s.back] ?? f;
    let y = (f.y + b.y) / 2;
    while (used.some((u) => Math.abs(u - y) < NCARD.h + 10)) y += NCARD.h + 12;
    used.push(y);
    pos[s.key] = { x: box.x + box.w - SIDE_NARROW_W / 2 - 2, y, w: SIDE_NARROW_W, h: NCARD.h };
  }
  const runSvg = runs.map((r) => {
    const hi = hostIndex(spec, r.host), h = c.hosts[hi];
    const room = Math.floor((cw + 4) / CH);
    let title = `${(h.role ?? "").toUpperCase()} ${h.label}`.trim();
    if (title.length > room) title = `${title.slice(0, room - 1)}…`;
    return `<rect class="cyc-band cyc-h${hi % 5}" x="${box.x + 18}" y="${r.y0.toFixed(1)}" width="${cw + 12}" height="${(r.y1 - r.y0).toFixed(1)}" rx="8"/><text class="cyc-band-title" x="${box.x + 24}" y="${(r.y0 + 15).toFixed(1)}"><tspan class="cyc-band-sub">${esc(title)}</tspan></text>`;
  }).join("");
  const out = edges(spec).map((e) => {
    const a = pos[e.from], b = pos[e.to], key = `${e.from}>${e.to}`;
    const note = e.how ? `${key.replace(">", " → ")}: ${e.how}` : key.replace(">", " → ");
    let pts;
    if (e.wrap) {
      const xm = box.x + 9;
      pts = [{ x: a.x - a.w / 2, y: a.y }, { x: xm, y: a.y }, { x: xm, y: b.y }, { x: b.x - b.w / 2 - 3, y: b.y }];
    } else if (e.ring) pts = [{ x: a.x, y: a.y + a.h / 2 }, { x: b.x, y: b.y - b.h / 2 - 3 }];
    else {
      const off = e.pair ? (e.back ? -7 : 7) : 0;
      const ax = a.x < b.x ? a.x + a.w / 2 : a.x - a.w / 2, bx = a.x < b.x ? b.x - b.w / 2 - 3 : b.x + b.w / 2 + 3;
      const xm = (ax + bx) / 2;
      pts = Math.abs(a.y - b.y) < 2 ? [{ x: ax, y: a.y + off }, { x: bx, y: b.y + off }] : [{ x: ax, y: a.y + off }, { x: xm + off, y: a.y + off }, { x: xm + off, y: b.y + off }, { x: bx, y: b.y + off }];
    }
    const p0 = pts[0], p1 = pts[1], len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1, t = Math.min(10, len / 2) / len;
    const xAt = e.wrap ? { x: pts[1].x, y: (pts[1].y + pts[2].y) / 2 } : { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t + 4 };
    return edgeSvg({ key, note, pts, how: e.how, cls: `${e.ring ? "cyc-ring-edge" : "cyc-side"}${e.amp ? " cyc-amp" : ""}`, labelled: false, maxW: 0, boxes: [], xAt });
  }).join("");
  const nodes = [...c.stages.map((s) => nodeSvg(spec, s, pos[s.key], false)), ...side.map((s) => nodeSvg(spec, s, pos[s.key], true))].join("");
  const lastY = Math.max(...Object.values(pos).map((r) => r.y + r.h / 2));
  return { svg: `${runSvg}${out}${nodes}`, bottom: lastY + 4 };
}

function edges(spec) {
  const c = spec.cycle, n = c.stages.length, out = [];
  c.stages.forEach((s, i) => out.push({ from: s.key, to: c.stages[(i + 1) % n].key, how: s.how, ring: true, wrap: i === n - 1, amp: !!s.amp }));
  for (const s of c.side ?? []) {
    out.push({ from: s.from, to: s.key, how: s.how, ring: false, pair: s.back === s.from });
    if (s.back) out.push({ from: s.key, to: s.back, how: s.backHow ?? "", ring: false, pair: s.back === s.from, back: true });
  }
  return out;
}

export function validateCycle(spec) {
  const c = spec.cycle, errors = [];
  if (!c || !Array.isArray(c.hosts) || !Array.isArray(c.stages)) return ["cycle needs hosts and stages"];
  const hosts = new Set(c.hosts.map((h) => h.key));
  const nodes = [...c.stages, ...(c.side ?? [])];
  const keys = new Set(nodes.map((s) => s.key));
  if (c.stages.length < 3 || c.stages.length > 8) errors.push("cycle needs 3–8 stages");
  if (keys.size !== nodes.length) errors.push("cycle stage keys must be unique");
  for (const s of nodes) {
    if (!hosts.has(s.host)) errors.push(`stage ${s.key}: unknown host ${s.host}`);
    if (String(s.label).length > 18) errors.push(`stage ${s.key}: label over 18 characters`);
  }
  for (const s of c.side ?? []) for (const k of [s.from, s.back].filter(Boolean)) if (!keys.has(k)) errors.push(`side ${s.key}: unknown stage ${k}`);
  const links = new Set(edges(spec).map((e) => `${e.from}>${e.to}`));
  for (const [name, cut] of Object.entries(c.cuts ?? {})) for (const link of cut.links ?? []) if (!links.has(link)) errors.push(`cut ${name}: no link ${link}`);
  for (const f of spec.facts ?? []) if (!Array.isArray(f) || f.length !== 2) errors.push("facts must be [term, text] pairs");
  return errors;
}

// Self-contained: copied into the page with toString(). `spec` is the page's data-only spec.
export const cycleModel = (params, rng, lib, spec) => {
  const c = spec.cycle, ring = c.stages, side = c.side ?? [], n = ring.length;
  const cuts = c.cuts ?? {};
  const name = params.cut ?? "none";
  const cut = name !== "none" && Object.hasOwn(cuts, name) ? cuts[name] : null;
  const broken = cut ? cut.links : [];
  const order = {};
  ring.forEach((s, i) => { order[s.key] = i; });
  for (const s of side) order[s.key] = order[s.from] + 0.5;
  const keys = Object.keys(order);
  const next = Object.fromEntries(keys.map((k) => [k, []]));
  const link = (a, b) => { if (!broken.includes(`${a}>${b}`)) next[a].push(b); };
  ring.forEach((s, i) => link(s.key, ring[(i + 1) % n].key));
  for (const s of side) { link(s.from, s.key); if (s.back) link(s.key, s.back); }
  const reach = (starts, forwardOnly) => {
    const seen = new Set(), todo = [...starts];
    while (todo.length) {
      const v = todo.pop();
      if (seen.has(v)) continue;
      seen.add(v);
      for (const w of next[v]) if (!forwardOnly || order[w] >= order[v]) todo.push(w);
    }
    return seen;
  };
  // Stages a surviving loop still feeds keep forming; the rest downstream of a cut (up to the adult) stop.
  const live = new Set();
  for (const k of keys) { const r = reach(next[k], false); if (r.has(k)) for (const v of r) live.add(v); }
  const downstream = reach(broken.map((l) => l.split(">")[1]), true);
  const dim = keys.filter((k) => downstream.has(k) && !live.has(k));
  const i = Math.min(n, Math.max(1, Math.round(params.step ?? 1))) - 1;
  const s = ring[i], host = c.hosts.find((h) => h.key === s.host);
  return {
    step: i,
    dim,
    broken,
    caption: `${i + 1}/${n} ${s.label} (${host ? host.label : ""}${s.where ? `, ${s.where}` : ""}) → ${s.how}`,
    cutText: cut ? `✗ ${name}: ${cut.text}` : "",
    text: cut ? `✗ ${name}` : "Unbroken cycle",
  };
};

export const cycleReadout = (data) => data.text;

export function cycleDefaults(spec) {
  const c = spec.cycle, cuts = Object.keys(c?.cuts ?? {});
  if (!c?.stages) return spec;
  const params = { step: { min: 1, max: c.stages.length, step: 1, value: 1, label: "walk the cycle: stage" } };
  if (cuts.length) params.cut = { options: ["none", ...cuts], value: "none", label: "break a link" };
  const states = cuts.length ? { "Full cycle": { cut: "none" }, ...Object.fromEntries(cuts.map((k) => [k, { cut: k }])) } : { "Full cycle": { step: 1 } };
  return { params, states, model: cycleModel, readout: cycleReadout, ...spec };
}

export const cycle = {
  name: "cycle",
  hint: "Slide through the stages · break a link",
  width: { wide: 1000 },
  frame(spec, box) {
    const narrow = box.w < 500;
    const { svg, bottom } = narrow ? frameNarrow(spec, box) : frameWide(spec, box);
    const cap = `<text id="cyc-caption" class="cyc-caption" x="${box.x + 4}" y="${(bottom + 20).toFixed(1)}"></text>`;
    return `<g class="study-cycle">${svg}${cap}</g>`;
  },
  render: (svg, data, params, box, ctx) => {
    const c = ctx.spec.cycle, n = c.stages.length;
    const dim = new Set(data.dim), broken = new Set(data.broken);
    const on = c.stages[data.step].key, onEdge = `${on}>${c.stages[(data.step + 1) % n].key}`;
    for (const s of [...c.stages, ...(c.side ?? [])]) {
      const el = svg.getElementById(`cyc-n-${s.key}`);
      if (!el) continue;
      el.classList.toggle("cyc-dim", dim.has(s.key));
      el.classList.toggle("cyc-on", s.key === on);
    }
    for (const el of svg.querySelectorAll("[data-edge]")) {
      const key = el.dataset.edge, [a, b] = key.split(">");
      const cut = broken.has(key);
      el.classList.toggle("cyc-cut", cut);
      el.classList.toggle("cyc-dim", !cut && (dim.has(a) || dim.has(b)));
      el.classList.toggle("cyc-on", key === onEdge);
    }
    const cap = svg.getElementById("cyc-caption");
    if (!cap) return;
    const max = Math.floor((box.w - 8) / 6.7);
    const wrapped = (text) => {
      const lines = [""];
      for (const word of text.split(" ")) {
        const last = lines[lines.length - 1];
        if (last && `${last} ${word}`.length > max) lines.push(word);
        else lines[lines.length - 1] = last ? `${last} ${word}` : word;
      }
      return lines.filter(Boolean);
    };
    const lines = [...wrapped(data.caption).slice(0, 3).map((t) => [t, ""]), ...wrapped(data.cutText).slice(0, 3).map((t) => [t, "cyc-cut-line"])];
    while (cap.firstChild) cap.firstChild.remove();
    lines.forEach(([text, cls], i) => {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      t.setAttribute("x", cap.getAttribute("x"));
      t.setAttribute("dy", i ? "14" : "0");
      if (cls) t.setAttribute("class", cls);
      t.textContent = text;
      cap.appendChild(t);
    });
  },
  // The cycle in words under the figure, so the page reads without the drawing.
  html(spec) {
    const c = spec.cycle, host = (k) => c.hosts.find((h) => h.key === k)?.label ?? "";
    const steps = c.stages.map((s, i) => `<li><b>${esc(s.label)}</b> <span class="cyc-in">(${esc(host(s.host))}${s.where ? `, ${esc(s.where)}` : ""})</span> → ${esc(s.how)} → <b>${esc(c.stages[(i + 1) % c.stages.length].label)}</b></li>`).join("");
    const side = (c.side ?? []).map((s) => {
      const from = c.stages.find((x) => x.key === s.from)?.label ?? s.from;
      const back = s.back ? `, then ${esc(s.backHow ?? "rejoins")} → <b>${esc(c.stages.find((x) => x.key === s.back)?.label ?? s.back)}</b>` : " <span class=\"cyc-in\">(dead end)</span>";
      return `<li><b>${esc(from)}</b> → ${esc(s.how)} → <b>${esc(s.label)}</b> <span class="cyc-in">(${esc(host(s.host))}${s.where ? `, ${esc(s.where)}` : ""})</span>${back}</li>`;
    }).join("");
    const cuts = Object.entries(c.cuts ?? {}).map(([name, cut]) => `<li><b>${esc(name)}</b>: ${esc(cut.text)}</li>`).join("");
    return `<section class="study-meta cyc-text"><h2>The cycle, step by step</h2><ol>${steps}</ol>${side ? `<h2>Side routes</h2><ul>${side}</ul>` : ""}${cuts ? `<h2>Break a link</h2><ul>${cuts}</ul>` : ""}</section>`;
  },
  css: `
.study-cycle{--cyc-amp:#e4ad55}
body[data-theme="light"] .study-cycle{--cyc-amp:#9a5a0c}
.cyc-h0{--h:var(--anatomy-blue)}.cyc-h1{--h:var(--anatomy-red)}.cyc-h2{--h:var(--anatomy-green)}.cyc-h3{--h:var(--anatomy-strong)}.cyc-h4{--h:var(--anatomy-mid)}
.cyc-band{fill:var(--h);fill-opacity:.07;stroke:var(--h);stroke-opacity:.4;stroke-width:1}
.cyc-band-title{font:10px var(--anatomy-mono);fill:var(--anatomy-text)}
.cyc-band-role{font-weight:700;letter-spacing:.08em;fill:var(--anatomy-strong)}
.cyc-node,.cyc-edge{outline:none}
.cyc-node rect{fill:var(--anatomy-face);stroke:var(--h);stroke-width:1.2}
.cyc-side-node rect{stroke-dasharray:5 3}
.cyc-node.cyc-amp rect{stroke:var(--cyc-amp);stroke-width:2}
.cyc-node.cyc-on rect{stroke:var(--anatomy-strong);stroke-width:3}
.cyc-node:focus-visible rect{stroke-width:3}
.cyc-name{fill:var(--anatomy-strong);font:700 11.5px var(--anatomy-mono)}
.cyc-desc{fill:var(--anatomy-text);font:10px var(--anatomy-mono)}
.cyc-dead{fill:var(--study-red-ink,var(--anatomy-red));font:10px var(--anatomy-mono)}
.cyc-line{fill:none;stroke:var(--anatomy-mid);stroke-width:1.5}
.cyc-head{fill:var(--anatomy-mid)}
.cyc-side .cyc-line{stroke-dasharray:5 4}
.cyc-how{fill:var(--anatomy-text);font:10px var(--anatomy-mono);paint-order:stroke;stroke:var(--anatomy-card);stroke-width:4px;stroke-linejoin:round}
.cyc-edge.cyc-amp .cyc-line{stroke:var(--cyc-amp);stroke-width:2}
.cyc-edge.cyc-amp .cyc-head{fill:var(--cyc-amp)}
.cyc-edge.cyc-amp .cyc-how{fill:var(--cyc-amp);font-weight:700}
.cyc-x{display:none;fill:var(--study-red-ink,var(--anatomy-red));font:700 17px var(--anatomy-mono);paint-order:stroke;stroke:var(--anatomy-card);stroke-width:4px}
.cyc-edge.cyc-on .cyc-line{stroke:var(--anatomy-strong);stroke-width:2.5}
.cyc-edge.cyc-on .cyc-head{fill:var(--anatomy-strong)}
.cyc-edge.cyc-cut .cyc-line{stroke:var(--anatomy-red);stroke-dasharray:3 3}
.cyc-edge.cyc-cut .cyc-head{fill:var(--anatomy-red)}
.cyc-edge.cyc-cut .cyc-x{display:inline}
.cyc-edge:focus-visible .cyc-line{stroke-width:3}
.cyc-dim{opacity:.25}
.cyc-caption{fill:var(--anatomy-strong);font:11px var(--anatomy-mono)}
.cyc-cut-line{fill:var(--study-red-ink,var(--anatomy-red))}
.cyc-text ol,.cyc-text ul{line-height:1.5}
.cyc-in{color:var(--anatomy-muted)}
`,
};
