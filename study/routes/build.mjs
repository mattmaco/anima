// node study/routes/build.mjs [slug...]
// Reads the cycle data from study/local/routes/data/index.mjs (git-ignored course material; override with ROUTES_DATA)
// and writes study/local/routes/out/<NN-name>-route.html and -light.html (override with ROUTES_OUT).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ACTORS } from "./actors.mjs";
import { sample, smooth, pl, esc, f } from "./lib.mjs";
import { FORMS, WAVES } from "./forms.mjs";
import { pathToFileURL } from "node:url";

const here = new URL(".", import.meta.url).pathname;
const DATA = process.env.ROUTES_DATA || here + "../local/routes/data/index.mjs";
const OUT = (process.env.ROUTES_OUT || here + "../local/routes/out").replace(/\/$/, "") + "/";
const { CYCLES } = await import(pathToFileURL(DATA).href);
const FORMS_SRC = readFileSync(here + "forms.mjs", "utf8").replace(/export /g, "");
const RUNTIME = readFileSync(here + "runtime.js", "utf8").replace("/*FORMS*/", FORMS_SRC);
mkdirSync(OUT, { recursive: true });

const CSS = `
.iso{--page:#eef1f3;--card:#ffffff;--text:#3a3d42;--strong:#15171a;--muted:#6c7178;--line:#c9ced4;--faint:#e2e6ea;--ink:#2a2d31;
--red:#d7322a;--blue:#2a5caa;--route:#e8590c;--amber:#b86e00;--badge:#2a5caa;
--water:#e9f4fb;--waveline:#3d8fd1;--soil:#efe4d1;--grain:#b9a27e;
--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--sans:"Helvetica Neue",Arial,ui-sans-serif,system-ui,sans-serif}
.iso[data-theme="dark"]{--page:#0b0c0d;--card:#15171a;--text:#b4b9bf;--strong:#eceef0;--muted:#80868d;--line:#3a3f45;--faint:#2a2e33;--ink:#d8dbde;
--red:#ff5a4f;--blue:#6d9bff;--route:#ff8a3d;--amber:#e4ad55;--badge:#3f73d6;
--water:#122230;--waveline:#4f9fe0;--soil:#241d14;--grain:#6b5a40;
}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--text);font:14px/1.6 var(--sans);-webkit-font-smoothing:antialiased}
.iso-page{width:min(900px,100% - 32px);margin:40px auto 96px}
.back{display:inline-block;margin:0 0 14px;font:12px var(--mono);color:var(--text);text-decoration:none}
.back:hover{color:var(--strong)}
.pn{display:flex;align-items:center;gap:10px;margin:0 0 14px;font:12px var(--mono)}
.pn-a{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--anatomy-strong);text-decoration:none;border:1px solid var(--anatomy-faint);padding:8px 10px;background:var(--anatomy-card)}
.pn-a[rel="next"]{text-align:right}.pn-a:hover{border-color:var(--anatomy-mid)}.pn-a:focus-visible{outline:2px solid var(--anatomy-lit);outline-offset:2px}
.pn-n{color:var(--muted);flex:none}
.iso-plate{position:relative;padding:44px 16px;background:var(--card);box-shadow:0 0 0 1px var(--line)}
.corners{position:absolute;inset:14px 16px;pointer-events:none}
.corner{position:absolute;color:var(--muted);font:10.5px/1 var(--mono);letter-spacing:.04em;white-space:nowrap}
.corner[data-c="fig"]{top:0;left:0;color:var(--text)}
.corner[data-c="title"]{top:0;right:0;font:italic 600 15px/1 var(--sans);color:var(--strong);letter-spacing:0}
.corner[data-c="hint"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}
.corner[data-c="readout"]{right:0;bottom:0;color:var(--text);font-variant-numeric:tabular-nums}
.rt-fig{display:block;width:100%;height:auto;overflow:visible}
.ln{fill:none;stroke:var(--bodyline);stroke-width:.9;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.ln[data-tone="lo"],.ln[data-tone="faint"]{stroke:var(--line)}
.ln[data-tone="hi"]{stroke:var(--ink)}
.tb-out,.tb-in,.tb-sh{fill:none;stroke-linecap:round;stroke-linejoin:round}
.water{fill:var(--water);stroke:none}
.soil{fill:var(--soil)}.grains circle{fill:var(--grain)}
.asex{fill:none;stroke:var(--amber);stroke-width:2;stroke-dasharray:4 4}
.lab{fill:var(--text);font:600 12.5px var(--sans);paint-order:stroke;stroke:var(--card);stroke-width:4px;stroke-linejoin:round}
.lab .role{fill:var(--muted);font:10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase}
.lab .amb{fill:var(--amber)}
.lab.small{font-size:11.5px;font-weight:400}
.leader{fill:none;stroke:var(--muted);stroke-width:.8;stroke-dasharray:2 2}
.ldot{fill:var(--ink)}
.arw{fill:none;stroke-width:7;stroke-linecap:butt;stroke-linejoin:round}
.arw.red{stroke:var(--red)}.arw.blue{stroke:var(--blue)}
.arh.red{fill:var(--red)}.arh.blue{fill:var(--blue)}
.trk{fill:none;stroke:var(--route);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;opacity:.3}
.trk.now{opacity:.95}
.trk.side{stroke:var(--amber)}
.cap .bdg{fill:var(--badge)}
.cap .bdgn{fill:#fff;font:700 13px var(--sans);text-anchor:middle;dominant-baseline:central}
.cap.side .bdg{fill:var(--amber)}
.cap .ring{fill:none;stroke:var(--route);stroke-width:2.5;opacity:0}
.cap.on .ring{opacity:1}
.cap text.ct{fill:var(--text);font:12.5px/1.3 var(--sans)}
.cap.on text.ct{fill:var(--strong);font-weight:600}
.box rect{fill:var(--card);stroke:var(--ink);stroke-width:1.2}
.box .bt{fill:var(--text);font:12px var(--sans)}
.box .gl{fill:var(--muted);font:11px var(--sans);text-anchor:middle}
.minarw{fill:var(--red)}
.ic-inf{fill:var(--red);font:22px/1 "Segoe UI Symbol","Noto Sans Symbols","DejaVu Sans",sans-serif;text-anchor:middle;dominant-baseline:central}
.ic-dx{fill:none;stroke:var(--ink);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.legend-t{fill:var(--text);font:12px var(--sans)}
.hot{cursor:help;outline:none}
.dim{opacity:.3;transition:opacity .2s}.dim:hover,.dim:focus-visible,.dim.is-stage{opacity:1}
.strand{fill:none;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
.strand-out{stroke:var(--anatomy-lit);stroke-width:5}.strand-in{stroke:var(--anatomy-paper);stroke-width:2.4}.strand-in.tape{stroke-dasharray:5 1.6;stroke-linecap:butt}
.hot.is-hot,.hot.is-stage{filter:drop-shadow(0 0 3px var(--route))}
.hot:focus-visible{outline:2px solid var(--route);outline-offset:3px}
.sp{pointer-events:none}
.rt-controls{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:center;margin:14px 2px 6px;font:12.5px var(--mono);color:var(--text)}
.rt-controls button{border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;padding:8px 10px;cursor:pointer;min-height:40px}
.rt-seg{display:flex;flex-wrap:wrap}
.rt-seg button b{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--badge);color:#fff;font-weight:700;font-size:11px;margin-right:5px}
.rt-seg button.side-b b{background:var(--amber)}
.rt-seg button+button{border-left:0}
.rt-seg button[aria-pressed="true"]{background:var(--strong);color:var(--card);border-color:var(--strong)}
#pause{margin-left:auto}
.cap .bdgn{pointer-events:none}
.rt-controls :focus-visible{outline:2px solid var(--route);outline-offset:3px}
.rt-progress{height:2px;background:var(--faint);margin:2px 2px 14px}
.rt-progress i{display:block;height:100%;background:var(--route);transform-origin:left;transform:scaleX(0)}
.rt-stage{margin:0 2px;min-height:9.5em}
.rt-stage h2{font:600 16px var(--sans);color:var(--strong);margin:0 0 6px}
.rt-stage p{margin:0 0 8px;font-size:14.5px;line-height:1.6}
.rt-when{color:var(--strong);border-left:3px solid var(--route);padding-left:10px;font:13px/1.55 var(--mono)}
.rt-info{min-height:4.5em;font:12.5px/1.55 var(--mono);color:var(--text);margin:10px 2px;border-left:3px solid var(--line);padding-left:10px}
.legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin:12px 2px 0;color:var(--muted);font-size:12.5px}
.legend i{display:inline-block;width:20px;height:0;border-top:5px solid var(--red);vertical-align:middle;margin-right:6px}
.legend i.b{border-top-color:var(--blue)}.legend i.r{border-top:2.4px solid var(--route)}.legend i.a{border-top:2px dashed var(--amber)}
.caption{color:var(--muted);font-size:13px;line-height:1.55;margin:10px 2px 0}
.rt-key{margin:18px 0 0;padding-top:12px;border-top:1px solid var(--line)}
.sources{margin:22px 2px;color:var(--muted);font-size:12.5px;line-height:1.65}
.sources h2{font:600 13px var(--sans);color:var(--text);margin:16px 0 8px}
.sources ul{padding-left:18px}.sources li{margin:5px 0}

/* Anatomy is drawn in greys so the moving parasite is the only lit thing. */
.og-edge,.ln{fill:none;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.tb-out,.tb-in,.tb-sh{fill:none;stroke-linecap:round;stroke-linejoin:round}
.water{stroke:none}.wave{fill:none;stroke-linecap:round}
.iso{--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;--anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;--anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;--anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-blue:#3e63dd;--anatomy-green:#30a46c;--water:#e8eff3;--waveline:#a9bfcc;--soil:#ece4d8;--grain:#b9a88f;--page:#f2f2ef;--card:#fbfbfa;--inset:#fbfbfa;}
.iso[data-theme="dark"]{--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;--anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;--anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;--anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-blue:#6b9bff;--anatomy-green:#6be0a0;--water:#101a22;--waveline:#2f4a5e;--soil:#1a1611;--grain:#4a4033;--page:#0b0b0b;--card:#131313;--inset:#131313;}
.halo{fill:var(--anatomy-halo);opacity:var(--anatomy-halo-opacity);filter:blur(8px)}
.body{fill:var(--anatomy-shade-1)}
.body-edge{stroke:var(--anatomy-mid)!important;stroke-width:.9!important}
.og-base,#H-muscle .og-base{fill:var(--anatomy-shade-2)}.og-shade{fill:var(--anatomy-shade-0);opacity:.55}.og-hl{fill:var(--anatomy-top);opacity:.6}
.og-edge,#H-muscle .og-edge{stroke:var(--anatomy-hi);stroke-width:.8}
.ln{stroke:var(--anatomy-mid);stroke-width:.8}.ln[data-tone="lo"],.ln[data-tone="faint"]{stroke:var(--anatomy-lo)}.ln[data-tone="hi"]{stroke:var(--anatomy-hi)}
.tb-out{stroke:var(--anatomy-hi)}.tb-in{stroke:var(--anatomy-shade-2)}.tb-sh{stroke:var(--anatomy-top);opacity:.7}
.tb-in.vein{stroke:color-mix(in srgb,var(--anatomy-blue) 22%,var(--anatomy-shade-2))}
.tb-in.lymph{stroke:color-mix(in srgb,var(--anatomy-green) 22%,var(--anatomy-shade-2))}
.tb-in.gutline{stroke:var(--anatomy-shade-0)}
.dot,.eye{fill:var(--anatomy-hi)}
.wave{stroke:var(--waveline);stroke-width:1.4;opacity:1}.wave.top{stroke-width:1.6}
.inset-bg{fill:var(--anatomy-paper)}.inset-rim{fill:none;stroke:var(--anatomy-hi);stroke-width:1.1}
.inset-halo{fill:var(--anatomy-halo);opacity:.7;filter:blur(8px)}
.hot.is-hot,.hot.is-stage{filter:drop-shadow(0 0 2.5px var(--anatomy-lit))}
.f-shell,.f-body{fill:var(--anatomy-paper);stroke:var(--anatomy-lit);stroke-width:1.5;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.f-in{fill:none;stroke:var(--anatomy-lit);stroke-width:1;vector-effect:non-scaling-stroke}
.f-dot{fill:var(--anatomy-lit);stroke:none}
.f-op,.f-cil,.f-tailfork,.f-worm{fill:none;stroke:var(--anatomy-lit);stroke-width:1.1;vector-effect:non-scaling-stroke;stroke-linecap:round}
.f-worm{stroke-width:1.5}
.f-tail{fill:none;stroke:var(--anatomy-lit);stroke-width:1.8;vector-effect:non-scaling-stroke;stroke-linecap:round}
.f-thread{fill:none;stroke:var(--anatomy-lit);stroke-linecap:round}
.f-core{fill:none;stroke:var(--anatomy-paper);stroke-linecap:round}
.f-seg{stroke-dasharray:.035 .012;stroke-linecap:butt}.f-beads{stroke-dasharray:.0 .07;stroke-linecap:round}
.f-sheath{fill:none;stroke:var(--anatomy-lit);opacity:.3;stroke-linecap:round}
.sp{filter:drop-shadow(0 0 1.5px var(--anatomy-paper)) drop-shadow(0 0 3px var(--anatomy-lit))}
.trk{stroke:var(--red);stroke-width:2.6;opacity:.3}.trk.now{opacity:.85}.trk.side{stroke:var(--amber)}
.cap .ring{stroke:var(--anatomy-lit)}
.legend i.r{border-top-color:var(--red);border-top-width:2.6px;opacity:.85}
.rt-progress i{background:var(--anatomy-lit)}
.rt-when{border-left-color:var(--anatomy-lit)}

.glyph .f-body,.glyph .f-shell{fill:var(--anatomy-face);stroke:var(--anatomy-hi);stroke-width:1.3}
.glyph .f-in,.glyph .f-op,.glyph .f-cil,.glyph .f-tailfork,.glyph .f-worm,.glyph .f-tail,.glyph .f-thread,.glyph .f-sheath{stroke:var(--anatomy-hi)}
.glyph .f-in{stroke:var(--anatomy-mid)}.glyph .f-dot{fill:var(--anatomy-mid)}.glyph .f-core{stroke:var(--anatomy-face)}
.rt-caps{display:none}
@media (max-width:640px){.rt-caps{display:grid;gap:2px;list-style:none;margin:10px 0 0;padding:0}.rt-caps button{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;background:none;border:0;padding:6px 4px 6px 6px;font:14px/1.45 var(--sans);color:var(--text);cursor:pointer;min-height:40px}.rt-caps b{flex:none;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--badge);color:#fff;font-size:12px;margin-top:1px}.rt-caps .side b{background:var(--amber)}.rt-caps .on button{color:var(--strong);font-weight:600}.rt-caps .on b{box-shadow:0 0 0 2px var(--card),0 0 0 4px var(--anatomy-lit)}.rt-caps button:focus-visible{outline:2px solid var(--route);outline-offset:2px}}
@media (max-width:640px){.cap text.ct,.box .gl{display:none}.cap .bdg{r:16px}.cap .ring{r:21px}.cap .bdgn{font-size:16px}.iso-plate{padding:40px 4px 60px}.corner[data-c="hint"]{bottom:20px}.corner[data-c="title"]{font-size:12px}.rt-seg{width:100%}.rt-seg button{flex:1 1 33%;border-left:1px solid var(--line)!important;margin:-1px 0 0 -1px}#pause{margin-left:0;flex:1}#theme{flex:1}.iso-page{margin-top:20px}}
`;

// static drawing of a parasite form (waves frozen)
function glyph(form, x, y, s, ang = 0, cls = "glyph") {
  const html = FORMS[form].replace(/data-wave="(\w+)"/g, (m, w) => `d="${WAVES[w](0.4)}"`);
  return `<g class="${cls} f-${form}" transform="translate(${f(x)} ${f(y)}) rotate(${ang}) scale(${f(s)})">${html}</g>`;
}
function wrap(text, w, size = 12.5) {
  const per = Math.max(8, Math.floor(w / (size * 0.52)));
  const out = []; let cur = "";
  for (const word of text.split(" ")) { if ((cur + " " + word).trim().length > per) { out.push(cur.trim()); cur = word; } else cur += " " + word; }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function arrow(pts, c) {
  const d = sample(pts, 4); const n = d.length;
  const [x2, y2] = d[n - 1]; const [x1, y1] = d[Math.max(0, n - 4)];
  const a = Math.atan2(y2 - y1, x2 - x1), L = 15, W = 10;
  const bx = x2 - Math.cos(a) * L, by = y2 - Math.sin(a) * L;
  const trimmed = d.filter(([x, y]) => Math.hypot(x - x2, y - y2) > L - 1); trimmed.push([bx, by]);
  const head = `M${f(x2)} ${f(y2)}L${f(bx - Math.sin(a) * W)} ${f(by + Math.cos(a) * W)}L${f(bx + Math.sin(a) * W)} ${f(by - Math.cos(a) * W)}Z`;
  return `<path class="arw ${c}" d="${smooth(trimmed)}"/><path class="arh ${c}" d="${head}"/>`;
}
const ICON = {
  inf: (x, y) => `<text class="ic-inf" x="${x}" y="${y}">☣</text>`,
  dx: (x, y) => `<g class="ic-dx" transform="translate(${x - 10} ${y - 11})"><path d="M2 20H18M6 20V17H14M7 13H13M6 4L10 2L13.5 9L9.5 11ZM12 15C16 14 16.5 9 13 7"/></g>`,
};

// Size policy: adults must fit the organ they live in. Caps are in world px (sprite size x 1.45).
const CAP = { worm: 32, larva: 22, mf: 18, fluke: 28, pair: 30, acanth: 34, hydatid: 30, diplo: 42, mono: 36, polystoma: 30, coil: 32, tape: 30, cysticercus: 22, tcyst: 18, protoscolex: 16 };
function capMove(m) {
  const big = Math.max(...m.size) * 1.45;
  if ((m.form === "tape" || m.form2 === "tape") && big > 50)
    return { ...m, form: m.form === "tape" ? "scolex" : m.form, form2: m.form2 === "tape" ? "scolex" : m.form2, size: [7, 7], strand: { kind: "tape", grow: true } };
  if ((m.form === "worm" || m.form2 === "worm") && big > 60 && !m.n)
    return { ...m, size: [8, 8], strand: { kind: "worm", len: 76 }, hideSprite: true };
  const c = Math.min(CAP[m.form2] ?? 99, CAP[m.form] ?? 99) / 1.45;
  return { ...m, size: m.size.map((v) => Math.min(v, c)) };
}
const GLYPH_MAX = (form) => (/^egg/.test(form) ? 80 : 64);

function place(a) {
  const k = a.s ?? 1, w = a.def.w;
  return ([x, y]) => [a.x + (a.flip ? (w - x) : x) * k, a.y + y * k];
}

const ORDER = CYCLES; // already in index order
function navHtml(cy, theme) {
  const i = ORDER.findIndex((c) => c.slug === cy.slug), n = ORDER.length;
  const pv = ORDER[(i - 1 + n) % n], nx = ORDER[(i + 1) % n];
  const a = (c, rel, label) => `<a class="pn-a" rel="${rel}" href="${c.file}${theme === "light" ? "-light" : ""}.html" data-dark="${c.file}.html" data-light="${c.file}-light.html">${label}</a>`;
  return `<nav class="pn" aria-label="Other animations">${a(pv, "prev", `← ${esc(pv.name)}`)}<span class="pn-n">${i + 1} / ${n}</span>${a(nx, "next", `${esc(nx.name)} →`)}</nav>`;
}
function build(cy, theme) {
  const actors = {};
  let art = "";
  let clipN = 0;
  for (const a of cy.actors) {
    const def = ACTORS[a.type](a.id, { ...a, info: a.info, hot: (a.hot || []) });
    const A = { ...a, def }; A.tf = place(A); actors[a.id] = A;
    const k = a.s ?? 1;
    const tr = a.flip ? `translate(${f(a.x + def.w * k)} ${f(a.y)}) scale(${-k} ${k})` : `translate(${f(a.x)} ${f(a.y)}) scale(${k})`;
    let svgA = def.svg;
    if (a.type === "human" || a.type === "quad" || a.type === "rodent") {
      // Fade organs this parasite never uses; they come back on hover.
      const keep = new Set([`${a.id}-body`, ...Object.keys(a.info || {}).map((k) => `${a.id}-${k}`), ...cy.stages.flatMap((s) => s.hot || [])]);
      svgA = svgA.replace(/<g class="hot ([^"]*)"((?: data-c="[^"]*")?) id="([^"]+)"/g, (m0, cls, dc, gid) => keep.has(gid) ? m0 : `<g class="hot dim ${cls}"${dc} id="${gid}"`);
    }
    let g = `<g transform="${tr}">${svgA}</g>`;
    if (a.inset) {
      const { cx, cy: icy, r } = a.inset; const cid = `clip${clipN++}`;
      g = `<g class="inset"><circle class="inset-halo" cx="${cx}" cy="${icy + 5}" r="${r + 4}"/><circle class="inset-bg" cx="${cx}" cy="${icy}" r="${r}"/><clipPath id="${cid}"><circle cx="${cx}" cy="${icy}" r="${r}"/></clipPath><g clip-path="url(#${cid})">${a.inset.under || ""}${g}</g><circle class="inset-rim" cx="${cx}" cy="${icy}" r="${r}"/>${a.inset.asex ? `<circle class="asex" cx="${cx}" cy="${icy}" r="${r + 7}"/>` : ""}</g>`;
    }
    art += g;
  }
  const ref = (r) => {
    if (Array.isArray(r)) return [r];
    const [aid, rest] = r.split(".");
    const A = actors[aid]; if (!A) throw new Error(`${cy.slug}: no actor ${aid}`);
    if (rest.includes(":")) {
      const [ln, span] = rest.split(":"); const [from, to] = span.split(">");
      const names = A.def.lines[ln]; const i = names.indexOf(from), j = names.indexOf(to);
      if (i < 0 || j < 0) throw new Error(`${cy.slug}: bad span ${r}`);
      const seg = i <= j ? names.slice(i, j + 1) : names.slice(j, i + 1).reverse();
      return seg.map((n) => A.tf(A.def.pts[n]));
    }
    const p = A.def.pts[rest]; if (!p) throw new Error(`${cy.slug}: no point ${r}`);
    return [A.tf(p)];
  };
  const routes = [];
  const stages = cy.stages.map((st) => ({
    ...st,
    moves: st.moves.map(capMove).map((m) => {
      let pts = m.path.flatMap(ref);
      pts = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.5);
      routes.push(pts.length > 1 ? sample(pts, 6) : pts);
      return { ...m, r: routes.length - 1, path: undefined };
    }),
  }));
  const tracks = stages.map((st, si) => st.moves.filter((m) => m.track !== false && routes[m.r].length > 1).map((m) => `<path class="trk${st.side ? " side" : ""}" data-stage="${si}" d="${pl(routes[m.r])}"/>`).join("")).join("");
  const arrows = (cy.arrows || []).map((a) => arrow(a.p, a.c || "red")).join("");
  const boxes = (cy.boxes || []).map((b) => {
    let g = `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="4"/>`;
    g += b.glyphs.map((q, i) => glyph(q.form, q.x, q.y, Math.min(q.s, 80), q.ang || 0) + (q.label ? `<text class="gl" x="${q.x}" y="${b.y + b.h - 10}">${esc(q.label)}</text>` : "") + (i < b.glyphs.length - 1 ? `<path class="minarw" d="M${q.x + q.gap} ${q.y - 5}L${q.x + q.gap + 16} ${q.y - 5}L${q.x + q.gap + 16} ${q.y - 10}L${q.x + q.gap + 28} ${q.y}L${q.x + q.gap + 16} ${q.y + 10}L${q.x + q.gap + 16} ${q.y + 5}L${q.x + q.gap} ${q.y + 5}Z"/>` : "")).join("");
    if (b.title) g += `<text class="bt" x="${b.x + b.w / 2}" y="${b.y + b.h + 18}" text-anchor="middle">${esc(b.title)}</text>`;
    return `<g class="box">${g}</g>`;
  }).join("");
  const caps = stages.map((st, si) => {
    const c = st.cap; if (!c || !c.text) return "";
    let g = "";
    if (st.glyph) g += glyph(st.glyph.form, st.glyph.x, st.glyph.y, Math.min(st.glyph.s, GLYPH_MAX(st.glyph.form)), st.glyph.ang || 0);
    if (c.lead) g += `<path class="leader" d="M${c.x} ${c.y}L${c.lead[0]} ${c.lead[1]}"/><circle class="ldot" cx="${c.lead[0]}" cy="${c.lead[1]}" r="2"/>`;
    g += `<circle class="ring" cx="${c.x}" cy="${c.y}" r="17"/><circle class="bdg" cx="${c.x}" cy="${c.y}" r="12"/><text class="bdgn" x="${c.x}" y="${c.y + 0.5}">${si + 1}</text>`;
    const lines = wrap(st.cap.text, c.w || 170);
    const tx = c.left ? c.x - 20 : c.x + 20, anchor = c.left ? "end" : "start";
    g += `<text class="ct" x="${tx}" y="${c.y - (lines.length - 1) * 7.5 + 4}" text-anchor="${anchor}">${lines.map((l, i) => `<tspan x="${tx}" dy="${i ? 15 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
    if (st.icon) g += ICON[st.icon](st.iconAt?.[0] ?? (st.glyph ? st.glyph.x + 34 : c.x), st.iconAt?.[1] ?? (st.glyph ? st.glyph.y + 26 : c.y + 26));
    return `<g class="cap${st.side ? " side" : ""}" data-stage="${si}">${g}</g>`;
  }).join("");
  const labels = (cy.labels || []).map((l) => {
    const lead = l.to ? `<path class="leader" d="M${l.to[0]} ${l.to[1]}L${l.lx ?? l.x} ${l.ly ?? l.y - 4}"/><circle class="ldot" cx="${l.to[0]}" cy="${l.to[1]}" r="1.8"/>` : "";
    const lines = [l.role ? `<tspan class="role${l.amb ? " amb" : ""}" x="${l.x}" dy="0">${esc(l.role)}</tspan>` : "", l.text ? `<tspan x="${l.x}" dy="${l.role ? 15 : 0}">${esc(l.text)}</tspan>` : ""].join("");
    return `${lead}<text class="lab${l.small ? " small" : ""}" x="${l.x}" y="${l.y}" text-anchor="${l.anchor || "start"}">${lines}</text>`;
  }).join("");
  const [, , VW, VH] = (cy.viewBox || "0 0 1000 700").split(" ").map(Number);
  const hasInf = stages.some((s) => s.icon === "inf"), hasDx = stages.some((s) => s.icon === "dx");
  const legend = `<g transform="translate(24 ${VH - 34})">${hasInf ? ICON.inf(10, 0) + `<text class="legend-t" x="26" y="4">Infective stage</text>` : ""}${hasDx ? `<g transform="translate(0 ${hasInf ? 26 : 0})">${ICON.dx(10, 0)}<text class="legend-t" x="26" y="4">Diagnostic stage</text></g>` : ""}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="rt-fig" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="${esc(cy.aria)}">${art}${arrows}<g>${tracks}</g>${boxes}${labels}${caps}${legend}<g id="sprites"></g></svg>`;
  // On phones the in-figure captions are too small to read, so they are repeated as a list under the figure.
  const capList = `<ol class="rt-caps" aria-label="Stages">${stages.map((st, si) => st.cap && st.cap.text ? `<li class="cap${st.side ? " side" : ""}" data-stage="${si}"><button type="button"><b>${si + 1}</b><span>${esc(st.cap.text)}</span></button></li>` : "").join("")}</ol>`;
  const buttons = stages.map((s, i) => `<button type="button" class="${s.side ? "side-b" : ""}" aria-pressed="${i === 0}"><b>${i + 1}</b>${esc(s.short)}</button>`).join("");
  const DATA = { stages: stages.map((s) => ({ title: s.title, when: s.when || "", text: s.text, readout: s.readout, dur: s.dur || 4200, hot: s.hot || [], moves: s.moves, still: s.still })), routes };
  const src = (cy.sources || []).map((s) => `<li>${s}</li>`).join("");
  const simp = (cy.simplified || []).map((s) => `<li>${esc(s)}</li>`).join("");
  const cycleHref = cy.cycle + (theme === "light" ? "-light" : "") + ".html";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(cy.name)} route | Anima study</title><style>${CSS}</style></head><body class="iso" data-theme="${theme}"><main class="iso-page">
${navHtml(cy, theme)}<a class="back" href="index.html">← All life cycles</a> <a class="back" id="cyc" data-dark="${cy.cycle}.html" data-light="${cy.cycle}-light.html" href="${cycleHref}" style="margin-left:14px">← ${esc(cy.name)} cycle diagram</a>
<figure style="margin:0"><div class="iso-plate"><div class="corners" aria-hidden="true"><span class="corner" data-c="fig">Fig ${esc(cy.fig)}</span><span class="corner" data-c="title">${esc(cy.title)}</span><span class="corner" data-c="hint">tap a stage · hover a part · space: pause</span><span class="corner" data-c="readout" data-readout></span></div>${svg}</div>
${capList}</figure>
<div class="rt-controls"><div class="rt-seg" role="group" aria-label="Stage">${buttons}</div><button id="pause" type="button" aria-pressed="false">Pause tour</button><button id="theme" type="button" aria-label="Switch colour theme">☾ Dark</button></div>
<div class="rt-progress" aria-hidden="true"><i id="bar"></i></div>
<section class="rt-stage" aria-live="polite"><h2 id="st-title"></h2><p class="rt-when" id="st-when"></p><p id="st-text"></p></section>
<p id="info" class="rt-info">Hover or tap any part of the figure for details.</p>
<section class="rt-key" aria-label="Key and scale"><div class="legend"><span><i></i>life cycle</span><span><i class="b"></i>${esc(cy.blueLabel || "into or out of the definitive host")}</span><span><i class="r"></i>route of the moving stage (thin)</span>${cy.actors.some((a) => a.inset?.asex) ? `<span><i class="a"></i>asexual multiplication</span>` : ""}</div>
<p class="caption">${esc(cy.caption)} Stages aren’t drawn to scale with each other or the host: adults are sized to fit the organ they live in, and very long worms are drawn as a strand along it. Real sizes are in each stage’s note. Faded organs play no part in this cycle; hover to see them.</p></section>
<footer class="sources"><h2>Sources</h2><ul>${src}</ul><h2>What was simplified</h2><ul>${simp}</ul><p>Educational study figure. Check it against your course materials; not medical advice.</p></footer>
</main><script>window.CYCLE=${JSON.stringify(DATA)};</script><script type="module">${RUNTIME}</script></body></html>`;
}

const only = process.argv.slice(2);
for (const cy of CYCLES) {
  if (only.length && !only.includes(cy.slug)) continue;
  for (const th of ["dark", "light"]) writeFileSync(`${OUT}${cy.file}${th === "light" ? "-light" : ""}.html`, build(cy, th));
  console.log("built", cy.file);
}
