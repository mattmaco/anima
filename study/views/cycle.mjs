// A life cycle as a loop of stages coloured by host, with side routes (autoinfection, dead ends) and "break a link" cuts.
// Spec: cycle: { hosts: [{ key, label, short?, role? }],
//                stages: [{ key, label, host, where?, how }],             // in order; `how` leads to the next stage; adult last
//                side?: [{ key, label, host, where?, from, how, back?, backHow?, pos?: [fx, fy] }],  // no `back` = dead end
//                cuts?: { name: { links: ["from>to", ...], text } } }
// The build fills params (step, cut), states, model and readout, so a cycle spec is data only.
// The model returns { step, dim, broken, caption, text }: dim lists stages that stop forming once the cut links break.
import { esc } from "../esc.mjs";

const NODE = { wide: [138, 40], narrow: [150, 38] };
const SIDE_NARROW_W = 112;
const CAPTION = { wide: 44, narrow: 90 };
const ROW = 66; // narrow: one stage per row
const CHAR = 6.7; // approximate advance of an 11px mono glyph

function legend(spec, w) {
  let x = 0, y = 0;
  const items = spec.cycle.hosts.map((h, i) => {
    const text = h.role ? `${h.label} · ${h.role}` : h.label;
    const width = 20 + CHAR * text.length + 18;
    if (x > 0 && x + width > w) { x = 0; y += 18; }
    const item = { h, i, text, x, y };
    x += width;
    return item;
  });
  return { items, h: y + 18 + 10 };
}

const ringH = (spec) => (spec.cycle.stages.length > 6 ? 380 : 340);
const narrowRows = (spec) => spec.cycle.stages.length + Math.max(0, (spec.cycle.side ?? []).length - 1) * 0.5;

export const cycleHeight = {
  wide: (spec) => legend(spec, 720).h + ringH(spec) + CAPTION.wide,
  narrow: (spec) => legend(spec, 320).h + narrowRows(spec) * ROW + 20 + CAPTION.narrow,
};

const hostIndex = (spec, key) => spec.cycle.hosts.findIndex((h) => h.key === key);

// Stage and side-node centres for one layout.
function place(spec, box, narrow) {
  const c = spec.cycle, n = c.stages.length, side = c.side ?? [];
  const lg = legend(spec, box.w);
  const top = box.y + lg.h, bottom = box.y + box.h - CAPTION[narrow ? "narrow" : "wide"];
  const [nw, nh] = NODE[narrow ? "narrow" : "wide"];
  const pos = {};
  if (!narrow) {
    const cx = box.x + box.w / 2, cy = (top + bottom) / 2;
    const rx = box.w / 2 - nw / 2 - 8, ry = (bottom - top) / 2 - nh / 2 - 10;
    c.stages.forEach((s, i) => {
      const a = -Math.PI / 2 + (Math.PI * (2 * i - 1)) / n;
      pos[s.key] = { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), w: nw, h: nh };
    });
    // Side nodes sit on a row through the centre, ordered left to right by where their links point.
    const target = (s) => { const f = pos[s.from], b = pos[s.back] ?? f; return { x: (f.x + b.x) / 2, y: (f.y + b.y) / 2 }; };
    const order = [...side].sort((a, b) => target(a).x - target(b).x);
    order.forEach((s, i) => {
      const t = target(s), k = order.length;
      const x = s.pos ? cx + s.pos[0] * rx : k === 1 ? cx + 0.3 * (t.x - cx) : cx + (i - (k - 1) / 2) * (nw + 28);
      const y = s.pos ? cy + s.pos[1] * ry : cy + 0.2 * (t.y - cy);
      pos[s.key] = { x, y, w: nw, h: nh };
    });
    return { pos, center: { x: cx, y: cy }, lg, bottom };
  }
  const x = side.length ? box.x + 30 + nw / 2 : box.x + box.w / 2 + 8;
  c.stages.forEach((s, i) => { pos[s.key] = { x, y: top + 14 + nh / 2 + i * ROW, w: nw, h: nh }; });
  const sx = box.x + box.w - SIDE_NARROW_W / 2 - 2;
  const used = [];
  for (const s of side) {
    const f = pos[s.from], b = pos[s.back] ?? f;
    let y = (f.y + b.y) / 2;
    while (used.some((u) => Math.abs(u - y) < nh + 8)) y += nh + 10;
    used.push(y);
    pos[s.key] = { x: sx, y, w: SIDE_NARROW_W, h: nh };
  }
  return { pos, center: { x: box.x + box.w / 2, y: (top + bottom) / 2 }, lg, bottom };
}

const inside = (p, r, m = 4) => Math.abs(p.x - r.x) < r.w / 2 + m && Math.abs(p.y - r.y) < r.h / 2 + m;

// A quadratic curve from rect a to rect b, trimmed to the rect edges, with an arrowhead at b.
function curve(a, b, control) {
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, u = 1 - t;
    pts.push({ x: u * u * a.x + 2 * u * t * control.x + t * t * b.x, y: u * u * a.y + 2 * u * t * control.y + t * t * b.y });
  }
  const mid = pts[30];
  const kept = pts.filter((p) => !inside(p, a) && !inside(p, b));
  return { pts: kept.length > 1 ? kept : [a, b], mid, all: pts };
}

const hits = (box, rects) => rects.some((r) => box.x0 < r.x + r.w / 2 && r.x - r.w / 2 < box.x1 && box.y0 < r.y + r.h / 2 && r.y - r.h / 2 < box.y1);

// Slide a label along its curve until it clears every node; the ✗ goes on the other half of the curve.
function spots(all, lines, rects) {
  const w = Math.max(...lines.map((l) => l.length)) * 6.1 + 6, h = lines.length * 11 + 4;
  const boxAt = (p) => ({ x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - h / 2, y1: p.y + h / 2 });
  let at = 30;
  for (const i of [30, 25, 35, 20, 40, 16, 44]) if (!hits(boxAt(all[i]), rects)) { at = i; break; }
  const xAt = at <= 30 ? 44 : 16;
  return { label: all[at], x: all[xAt] };
}

function edgeSvg({ key, note, pts, mid, all, rects, how, cls, labelled }) {
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");
  const end = pts[pts.length - 1], prev = pts[Math.max(0, pts.length - 4)];
  const ang = Math.atan2(end.y - prev.y, end.x - prev.x), s = 7;
  const head = `M${end.x.toFixed(1)} ${end.y.toFixed(1)}L${(end.x - s * Math.cos(ang - 0.45)).toFixed(1)} ${(end.y - s * Math.sin(ang - 0.45)).toFixed(1)}L${(end.x - s * Math.cos(ang + 0.45)).toFixed(1)} ${(end.y - s * Math.sin(ang + 0.45)).toFixed(1)}Z`;
  let label = "", xm = mid;
  if (labelled && how && all) {
    const lines = wrap(how, 14).slice(0, 4);
    const spot = spots(all, lines, rects);
    const p = spot.label;
    xm = spot.x;
    const y0 = p.y - ((lines.length - 1) * 11) / 2 + 3.5;
    label = `<text class="cyc-how" x="${p.x.toFixed(1)}" y="${y0.toFixed(1)}" text-anchor="middle">${lines.map((l, i) => `<tspan x="${p.x.toFixed(1)}" dy="${i ? 11 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
  }
  return `<g class="cyc-edge ${cls}" data-edge="${esc(key)}" tabindex="0" data-note="${esc(note)}"><path class="cyc-line" d="${d}"/><path class="cyc-head" d="${head}"/>${label}<text class="cyc-x" x="${xm.x.toFixed(1)}" y="${(xm.y + 6).toFixed(1)}" text-anchor="middle">✗</text></g>`;
}

function wrap(text, max) {
  const lines = [""];
  for (const word of String(text).split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length > max) lines.push(word);
    else lines[lines.length - 1] = last ? `${last} ${word}` : word;
  }
  return lines;
}

function nodeSvg(spec, s, r, isSide) {
  const c = spec.cycle, hi = hostIndex(spec, s.host), h = c.hosts[hi];
  const tag = h.short ?? h.label;
  const next = isSide ? s.back ? (c.stages.find((x) => x.key === s.back) ?? s).label : null : null;
  const note = spec.notes?.[s.key] ?? `${s.label}: ${h.label}${s.where ? `, ${s.where}` : ""}.${isSide && !s.back ? " Dead end: the cycle cannot continue from here." : ""}${next ? ` Rejoins the cycle at ${next}.` : ""}`;
  const dead = isSide && !s.back ? `<text class="cyc-dead" x="${r.x.toFixed(1)}" y="${(r.y + r.h / 2 + 13).toFixed(1)}" text-anchor="middle">dead end</text>` : "";
  return `<g id="cyc-n-${esc(s.key)}" class="cyc-node cyc-h${hi % 4}${isSide ? " cyc-side-node" : ""}" tabindex="0" data-note="${esc(note)}"><rect x="${(r.x - r.w / 2).toFixed(1)}" y="${(r.y - r.h / 2).toFixed(1)}" width="${r.w}" height="${r.h}" rx="7"/><text class="cyc-name" x="${r.x.toFixed(1)}" y="${(r.y - 3).toFixed(1)}" text-anchor="middle">${esc(s.label)}</text><text class="cyc-host" x="${r.x.toFixed(1)}" y="${(r.y + 12).toFixed(1)}" text-anchor="middle">${esc(tag)}</text>${dead}</g>`;
}

function edges(spec) {
  const c = spec.cycle, n = c.stages.length, out = [];
  c.stages.forEach((s, i) => out.push({ from: s.key, to: c.stages[(i + 1) % n].key, how: s.how, ring: true, wrap: i === n - 1 }));
  for (const s of c.side ?? []) {
    out.push({ from: s.from, to: s.key, how: s.how, ring: false, pair: s.back === s.from });
    if (s.back) out.push({ from: s.key, to: s.back, how: s.backHow ?? "", ring: false, pair: s.back === s.from });
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
  for (const h of c.hosts) if (String(h.short ?? h.label).length > 20) errors.push(`host ${h.key}: tag over 20 characters (add short)`);
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
  frame(spec, box) {
    const narrow = box.w < 500;
    const { pos, center, lg, bottom } = place(spec, box, narrow);
    const legendSvg = lg.items.map(({ h, i, text, x, y }) => `<g class="cyc-legend cyc-h${i % 4}" tabindex="0" data-note="${esc(h.role ? `${h.label}: ${h.role}.` : h.label)}"><rect class="cyc-sw" x="${box.x + x}" y="${box.y + y + 2}" width="13" height="13" rx="3"/><text x="${box.x + x + 20}" y="${box.y + y + 12.5}">${esc(text)}</text></g>`).join("");
    const out = edges(spec).map((e) => {
      const a = pos[e.from], b = pos[e.to];
      const key = `${e.from}>${e.to}`;
      const note = e.how ? `${key.replace(">", " → ")}: ${e.how}` : key.replace(">", " → ");
      if (narrow && e.wrap) {
        // Return path down the left margin, back up to the first stage.
        const xm = box.x + 10, ya = a.y, yb = b.y;
        const pts = [{ x: a.x - a.w / 2 - 4, y: ya }, { x: xm, y: ya }, { x: xm, y: yb }, { x: b.x - b.w / 2 - 4, y: yb }];
        return edgeSvg({ key, note, pts, mid: { x: xm, y: (ya + yb) / 2 }, how: e.how, cls: "cyc-ring-edge", labelled: false });
      }
      let ctrl;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (e.ring && !narrow) {
        const dx = mx - center.x, dy = my - center.y, len = Math.hypot(dx, dy) || 1;
        const chord = Math.hypot(b.x - a.x, b.y - a.y);
        ctrl = { x: mx + (dx / len) * chord * 0.16, y: my + (dy / len) * chord * 0.16 };
      } else ctrl = { x: mx, y: my };
      let a2 = a, b2 = b;
      if (!e.ring) {
        // Side routes run straight; an out-and-back pair is pushed apart (the normal flips with direction).
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        const off = e.pair ? 7 : 0;
        const ox = (-dy / len) * off, oy = (dx / len) * off;
        a2 = { ...a, x: a.x + ox, y: a.y + oy }; b2 = { ...b, x: b.x + ox, y: b.y + oy };
        ctrl = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 };
      }
      const { pts, mid, all } = curve(a2, b2, ctrl);
      return edgeSvg({ key, note, pts, mid, all, rects: Object.values(pos), how: e.how, cls: e.ring ? "cyc-ring-edge" : "cyc-side", labelled: !narrow && e.ring });
    }).join("");
    const nodes = [...spec.cycle.stages.map((s) => nodeSvg(spec, s, pos[s.key], false)), ...(spec.cycle.side ?? []).map((s) => nodeSvg(spec, s, pos[s.key], true))].join("");
    const cap = `<text id="cyc-caption" class="cyc-caption" x="${box.x + 4}" y="${(bottom + 14).toFixed(1)}"></text>`;
    return `<g class="study-cycle">${legendSvg}${out}${nodes}${cap}</g>`;
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
.cyc-legend text{fill:var(--anatomy-text);font:11px var(--anatomy-mono)}
.cyc-legend,.cyc-node,.cyc-edge{outline:none}
.cyc-sw,.cyc-node rect{fill-opacity:.18;stroke-width:1.5}
.cyc-h0 rect{fill:var(--anatomy-blue);stroke:var(--anatomy-blue)}
.cyc-h1 rect{fill:var(--anatomy-red);stroke:var(--anatomy-red)}
.cyc-h2 rect{fill:var(--anatomy-green);stroke:var(--anatomy-green)}
.cyc-h3 rect{fill:var(--anatomy-strong);stroke:var(--anatomy-strong)}
.cyc-side-node rect{stroke-dasharray:5 3}
.cyc-node.cyc-on rect{stroke-width:3;fill-opacity:.34}
.cyc-node:focus-visible rect,.cyc-legend:focus-visible rect{stroke-width:3}
.cyc-name{fill:var(--anatomy-strong);font:700 11.5px var(--anatomy-mono)}
.cyc-host{fill:var(--anatomy-text);font:10px var(--anatomy-mono)}
.cyc-dead{fill:var(--study-red-ink,var(--anatomy-red));font:10px var(--anatomy-mono)}
.cyc-line{fill:none;stroke:var(--anatomy-mid);stroke-width:1.5}
.cyc-head{fill:var(--anatomy-mid)}
.cyc-side .cyc-line{stroke-dasharray:5 4}
.cyc-how{fill:var(--anatomy-text);font:10px var(--anatomy-mono);paint-order:stroke;stroke:var(--anatomy-card);stroke-width:4px;stroke-linejoin:round}
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
