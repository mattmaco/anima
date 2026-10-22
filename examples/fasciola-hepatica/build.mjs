import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BIO_CSS, blobOf, blobSvg } from "../../kit/blob.mjs";
import { branchPieces, branchSvg } from "../../kit/branch.mjs";
import {
  cylinder,
  dotGrid,
  dotsSvg,
  figureSvg,
  fitProjection,
  iso,
  lineSvg,
  pageHtml,
  pathOf,
  plateHtml,
  ring,
  segment,
  slabOf,
  solidSvg,
  onTop,
} from "../../kit/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const light = process.argv.includes("--light");
const WIDTH = 880;
const HEIGHT = 520;
const LOOP = 26;

// Stage starts are seconds on a 26 s loop. Durations are compressed: see the sources block.
const STAGES = [
  {
    at: 0,
    name: "Adult in the bile ducts",
    note: "Adults are hermaphrodite and lay eggs into the bile. The eggs travel through the gut and leave in the feces, before any larva has formed.",
  },
  {
    at: 4,
    name: "Eggs develop in water",
    note: "Inside each egg a miracidium forms. This needs water and warmth: about 9 to 10 days at 22 to 26 °C.",
  },
  {
    at: 9,
    name: "Miracidia hatch and seek a snail",
    note: "Each miracidium swims free. It has about 3 hours to find a Galba truncatula snail, or it dies.",
  },
  {
    at: 12,
    name: "Sporocysts multiply in the snail",
    note: "The miracidium penetrates the snail and becomes a sporocyst. Its daughters multiply asexually. Snail stages take about 6 to 7 weeks in favourable conditions.",
  },
  {
    at: 16,
    name: "Cercariae leave and encyst on herbage",
    note: "Cercariae swim out of the snail and attach to wet vegetation. Each one there encysts as a metacercaria, the stage that infects the host.",
  },
  {
    at: 21,
    name: "Grazing: juvenile reaches the liver",
    note: "The animal eats the metacercariae with herbage. Juveniles excyst in the gut, cross the gut wall, and tunnel through the liver before reaching the bile ducts.",
  },
];

const organicRing = (cx, cy, rx, ry, z, phase = 0) =>
  Array.from({ length: 32 }, (_, index) => {
    const angle = (index / 32) * Math.PI * 2;
    const wobble = 1 + 0.05 * Math.sin(angle * 3 + phase) + 0.02 * Math.cos(angle * 5 - phase);
    return [cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble, z];
  });

// Scene geometry, world units with x and y on the floor and z up.
const liverRing = organicRing(-64, -6, 44, 30, 0, 0.6);
const pondRing = Array.from({ length: 40 }, (_, step) => {
  const angle = (step / 40) * Math.PI * 2;
  return [16 + 30 * Math.cos(angle), 44 + 30 * Math.sin(angle), 0];
});
const herbageBox = { x: 34, y: -44, w: 40, d: 30, r: 5 };
const adultAxis = [Math.cos(0.3), Math.sin(0.3)];
const adultRing = Array.from({ length: 28 }, (_, index) => {
  const angle = (index / 28) * Math.PI * 2;
  const x = 8 * Math.cos(angle);
  const y = 2.8 * Math.sin(angle);
  return [-44 + x * adultAxis[0] - y * adultAxis[1], -14 + x * adultAxis[1] + y * adultAxis[0], 1.6];
});
const snailBody = organicRing(-22, 52, 8, 4.6, 0, 1.1);
const herbRest = Array.from({ length: 6 }, (_, j) => [38 + (j % 3) * 6, -38 + Math.floor(j / 3) * 6, 1.2]);
const eggRests = [
  [10, 36, 0],
  [17, 42, 0],
  [22, 34, 0],
  [10, 48, 0],
];
const bounds = [
  ...liverRing,
  ...pondRing,
  [34, -44, 0],
  [74, -44, 0],
  [34, -14, 0],
  [74, -14, 1.6],
  [74, -44, 1.6],
  [-30, 46, 0],
  [-12, 62, 0],
  [-44, -14, 2],
];
const P = fitProjection(bounds, WIDTH, HEIGHT, { pad: 56, azimuth: 45, elevation: 30 });
const at = (point) => iso(point, P);
const screen = (route) => route.map((point) => at(point).map((value) => Number(value.toFixed(1))));

const label = (text, point, dx = 0, dy = 0, anchor = "start") => {
  const [x, y] = at(point);
  const tx = x + dx;
  const ty = y + dy;
  const connector = dx || dy ? `<path class="bio-label-line" d="${pathOf([[x, y], [tx - (anchor === "end" ? -3 : 3), ty + 2]])}"/>` : "";
  return `${connector}<text class="bio-label" x="${tx}" y="${ty}" text-anchor="${anchor}">${text}</text>`;
};

const ducts = [
  [[-44, -14, 1], [-36, -20, 1.2], [-28, -26, 1.4], [-22, -34, 1]],
  [[-36, -20, 1.2], [-46, -30, 1.2], [-54, -40, 1]],
  [[-44, -14, 1], [-54, -10, 1.2], [-66, -6, 1.2], [-80, -2, 1]],
  [[-44, -14, 1], [-50, 4, 1], [-58, 16, 1]],
];
const ductMarkup = ducts
  .flatMap((points) => branchPieces(points, 1.1, P, { maxLength: 14, spacing: 1.5 }))
  .sort((a, b) => a.depth - b.depth)
  .map((piece) => branchSvg(piece, { tone: "mid" }))
  .join("");

const adultGut = [-5, -2, 1, 4].map((offset) => {
  const x = -44 + offset * adultAxis[0];
  const y = -14 + offset * adultAxis[1];
  return lineSvg(segment([x, y - 1.8, 1.7], [x, y + 1.8, 1.7], P), { tone: "mid" });
}).join("");
const adultSuckers = [
  ring(-44 + 6 * adultAxis[0], -14 + 6 * adultAxis[1], 1.1, 1.8, P, 16),
  ring(-44 - 2 * adultAxis[0], -14 - 2 * adultAxis[1], 1.4, 1.8, P, 16),
].map((d) => lineSvg(d, { tone: "lit" })).join("");

const spiral = Array.from({ length: 44 }, (_, step) => {
  const radius = 3.6 * (1 - step / 46);
  const angle = step * 0.5;
  return [-23 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)];
});
const germPoints = [[-19.5, 51], [-17, 52.8], [-16, 50.6], [-19, 53.6], [-21, 52.4], [-17.8, 50.3], [-15.5, 52], [-20.5, 50.4]];
const germMarkup = germPoints
  .map(([x, y], index) => {
    const [cx, cy] = at([x, y, 1.6]);
    return `<circle class="germ" data-at="${(12.6 + index * 0.4).toFixed(1)}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.3" opacity="0"/>`;
  })
  .join("");

// Organisms are drawn at the origin, pointing along +x, and placed by a transform each frame.
const eggShape = `<ellipse class="org-body" rx="5" ry="3.2"/><path class="org-lid" d="M-4.6 -2.4 Q-7.2 0 -4.6 2.4"/><g class="embryo"><circle class="org-embryo" r="2.4"/></g>`;
const cilia = Array.from({ length: 10 }, (_, index) => {
  const angle = (index / 10) * Math.PI * 2;
  const [cx, cy] = [Math.cos(angle), Math.sin(angle)];
  return `M${(3.6 * cx).toFixed(1)} ${(2.2 * cy).toFixed(1)}L${(5.4 * cx).toFixed(1)} ${(3.4 * cy).toFixed(1)}`;
}).join("");
const miracidiumShape = `<path class="org-cilia" d="${cilia}"/><ellipse class="org-body" rx="3.6" ry="2.2"/>`;
const cercariaShape = `<path class="org-tail" d="M-2.6 0C-7 -2.6 -11 2.6 -15 0S-23 -2.6 -27 0"/><ellipse class="org-body" rx="2.8" ry="2"/>`;
const metacercariaShape = `<circle class="org-cyst" r="4.2"/><circle class="org-cyst-core" r="2.4"/>`;
const juvenileShape = `<ellipse class="org-juvenile" rx="4" ry="2.2"/>`;

// Each mover: a route in world units, a time window, and optional hide and shape-change times.
const eggHatch = (index) => 9 + index * 0.3;
const movers = [
  ...eggRests.map((rest, index) => ({
    kind: "egg",
    shape: eggShape,
    embryo: true,
    route: [[-44, -14, 1.6], [-30, -12, 1.6], [-20, -4, 0], [-6, 10, 0], rest],
    t0: 0.8 + index * 0.8,
    t1: 3 + index * 0.8,
    hideAt: eggHatch(index),
  })),
  ...eggRests.map((rest, index) => ({
    kind: "miracidium",
    shape: miracidiumShape,
    route: [rest, [0, 38, 0], [-12, 46, 0], [-18, 52, 0]],
    t0: eggHatch(index),
    t1: eggHatch(index) + 2.8,
    hideAt: eggHatch(index) + 2.9,
  })),
  ...herbRest.map((rest, index) => ({
    kind: "cercaria",
    shape: cercariaShape,
    becomes: metacercariaShape,
    route: [[-18, 52, 0], [-8, 40, 0], [8, 24, 0], [30, 4, 0], [34, -14, 0], rest],
    t0: 16.2 + index * 0.45,
    t1: 19.8 + index * 0.45,
    hideAt: index === 0 ? 21.5 : undefined,
  })),
  {
    kind: "juvenile",
    shape: juvenileShape,
    route: [herbRest[0], [26, -22, 0], [4, -16, 0], [-18, -12, 0], [-34, -16, 1.6]],
    t0: 21.5,
    t1: 25.2,
  },
];

// Route guides show each family's path while its movers travel it.
const guides = [
  { route: movers[0].route, from: 0.6, to: 3.8 },
  { route: movers[eggRests.length].route, from: 9, to: 12.4 },
  { route: movers[2 * eggRests.length].route, from: 16, to: 21.2 },
  { route: movers.at(-1).route, from: 21.3, to: 25.6 },
];
const guideMarkup = guides
  .map(({ route, from, to }) => `<g class="guide" data-from="${from}" data-to="${to}" opacity="0"><path class="guide-line" d="${pathOf(screen(route))}"/></g>`)
  .join("");

const moverMarkup = movers
  .map((mover, index) => {
    const b = mover.becomes ? `<g class="mv-b" display="none">${mover.becomes}</g>` : "";
    return `<g class="mover" data-mover="${index}" display="none" opacity="0"><g class="mv-a">${mover.shape}</g>${b}</g>`;
  })
  .join("");
const moverConfig = movers.map(({ kind, route, t0, t1, hideAt, becomes }) => ({
  kind,
  t0,
  t1,
  hideAt,
  becomes: Boolean(becomes),
  screen: screen(route),
}));

const liver = blobSvg(blobOf(liverRing, P, { tone: "hi", id: "liver" }));
const adult = blobSvg(blobOf(adultRing, P, { tone: "hi", id: "adult-fluke" }));
const snail = `${blobSvg(blobOf(snailBody, P, { tone: "mid", id: "snail-body" }))}${blobSvg(blobOf(organicRing(-23, 50, 5, 4.4, 3, 0.4), P, { tone: "hi", id: "snail-shell" }))}${lineSvg(onTop(spiral, 3.4, P), { tone: "mid" })}${lineSvg(segment([-27, 51, 1.6], [-31, 46, 4.4], P), { tone: "lo" })}${lineSvg(segment([-26, 50, 1.6], [-28, 44, 4.2], P), { tone: "lo" })}`;
const sporocystMarkup = `<g id="sporocyst" opacity="0">${blobSvg(blobOf(organicRing(-18, 52, 3.4, 2.4, 1.4, 0.4), P, { tone: "lit", id: "mother-sporocyst" }))}</g>`;
const pond = solidSvg(cylinder(16, 44, 30, 0, 1.6, P, 64), { tone: "lo" });
const pondEdge = lineSvg(ring(16, 44, 22, 1.8, P, 64), { tone: "mid", dashed: true, flow: true });
const herbage = `${solidSvg(slabOf(herbageBox, 0, 1.6, P, 6), { tone: "lo" })}${dotsSvg(dotGrid(38, -40, 7, 5, 5, 1.6, P), { size: 0.7, tone: "mid" })}`;

const svgBody = [
  pond,
  pondEdge,
  herbage,
  liver,
  ductMarkup,
  adult,
  adultGut,
  adultSuckers,
  snail,
  sporocystMarkup,
  germMarkup,
  guideMarkup,
  moverMarkup,
  label("liver", [-92, 22, 0], -2, 18, "start"),
  label("bile ducts", [-54, -40, 1], -26, -8, "end"),
  label("adult fluke", [-44, -14, 2], -18, 34, "end"),
  label("pond", [44, 66, 0], 6, 8, "start"),
  label("snail", [-22, 64, 0], 0, 14, "middle"),
  label("herbage", [56, -48, 1.6], 2, -8, "start"),
].join("");

const figure = figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Animated schematic of the Fasciola hepatica life cycle. Adults in the bile ducts lay eggs that leave in feces. Eggs develop in water and hatch miracidia, which swim to a Galba snail. Sporocysts multiply in the snail and cercariae leave it and encyst as metacercariae on herbage. Animals eat the metacercariae, and juveniles tunnel through the liver to the bile ducts.",
  body: svgBody,
  className: "fl-figure",
});

const stageButtons = STAGES.map(
  (stage, index) =>
    `<li><button class="stage-btn" type="button" data-stage="${index}">${index + 1}. ${stage.name}</button></li>`,
).join("");

const framed = plateHtml({
  fig: "Fig 1",
  title: "Liver fluke life cycle",
  hint: "Space: play or pause · ← →: previous or next stage",
  readout: `Stage 1 of ${STAGES.length} · ${STAGES[0].name}`,
  caption: "Schematic. Sizes, distances and time between stages are not to scale.",
  body: `<div class="fl-svg">${figure}</div><div class="transport"><p class="count-out" aria-live="off"></p><button class="motion-toggle" type="button" aria-pressed="false">Pause</button></div><ol class="stage-list">${stageButtons}</ol><p class="stage-note" aria-live="polite">${STAGES[0].note}</p>`,
});

const sources = `<footer class="bio-sources"><p>Timings and biology are from WikiVet’s <a href="https://en.wikivet.net/Fasciola_hepatica">Fasciola hepatica entry</a>: prepatent period 10 to 12 weeks; eggs need about 9 to 10 days at 22 to 26 °C to form miracidia; a miracidium must find a snail within about 3 hours; snail stages take about 6 to 7 weeks in favourable conditions; <i>Galba truncatula</i> is almost the only intermediate host in Europe. The average of 203 cercariae per miracidium comes from one 2013 experiment in <i>G. truncatula</i> at 26 °C (<a href="https://alicia.concytec.gob.pe/vufind/Record/REVUNFV_4dd4f1f89615d1e02865645db0f6056e">record</a>); treat it as an estimate. The animation shows only a handful of cercariae.</p><p>The 26-second loop compresses real durations; the stage times are not a clock. For education only; this figure is not medical advice.</p></footer>`;

const style = `
.fl-figure .bio-label{fill:var(--anatomy-text);font:9px var(--anatomy-mono);letter-spacing:.015em}
.fl-figure .bio-label-line{fill:none;stroke:var(--anatomy-faint);stroke-width:.65}
.fl-figure .org-body{fill:var(--anatomy-face);stroke:var(--anatomy-lit);stroke-width:.9}
.fl-figure .org-lid{fill:none;stroke:var(--anatomy-hi);stroke-width:.7}
.fl-figure .org-embryo{fill:var(--anatomy-mid)}
.fl-figure .org-cilia{fill:none;stroke:var(--anatomy-hi);stroke-width:.6;stroke-linecap:round}
.fl-figure .org-tail{fill:none;stroke:var(--anatomy-hi);stroke-width:.8;stroke-linecap:round}
.fl-figure .org-cyst{fill:var(--anatomy-face);stroke:var(--anatomy-lit);stroke-width:1}
.fl-figure .org-cyst-core{fill:var(--anatomy-mid)}
.fl-figure .org-juvenile{fill:var(--anatomy-face);stroke:var(--anatomy-hi);stroke-width:.8}
.fl-figure .germ{fill:var(--anatomy-hi)}
.fl-figure .guide-line{fill:none;stroke:var(--anatomy-muted);stroke-width:.7;stroke-dasharray:2 3}
.fl-figure .guide{transition:opacity 240ms ease}
.fl-figure .mover{will-change:transform}
.fl-svg{overflow-x:auto}
.fl-figure{min-width:640px}
.transport{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px}
.count-out{margin:0;font:12px var(--anatomy-mono);color:var(--anatomy-muted)}
.motion-toggle{border:1px solid var(--anatomy-faint);background:transparent;color:var(--anatomy-text);font:12px var(--anatomy-mono);padding:6px 10px;cursor:pointer;flex:none}
.motion-toggle:focus-visible,.stage-btn:focus-visible{outline:2px solid var(--anatomy-lit);outline-offset:3px}
.motion-toggle:disabled{opacity:.5;cursor:default}
.stage-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px;list-style:none;margin:14px 0 0;padding:0}
.stage-btn{width:100%;text-align:left;border:1px solid var(--anatomy-faint);background:transparent;color:var(--anatomy-text);font:12px/1.4 var(--anatomy-mono);padding:8px 10px;cursor:pointer}
.stage-btn[aria-current="step"]{border-color:var(--anatomy-lit);color:var(--anatomy-strong)}
.stage-note{min-height:3.4em;margin:12px 0 0;color:var(--anatomy-text);font-size:14px;line-height:1.55;max-width:70ch}
.bio-sources{max-width:760px;margin:14px auto;color:var(--anatomy-muted);font-size:12px;line-height:1.65}
.bio-sources a{color:var(--anatomy-text);text-underline-offset:2px}
@media(prefers-reduced-motion:reduce){.fl-figure .guide{transition:none}}
`;

const live = readFileSync(join(HERE, "live.js"), "utf8");
const DATA = {
  loop: LOOP,
  stages: STAGES.map(({ at, name, note }) => ({ at, name, note })),
  movers: moverConfig,
};
const script = `const DATA = ${JSON.stringify(DATA)};\n${live}`;

const html = pageHtml({
  title: "Fasciola hepatica life cycle | Anima",
  theme: light ? "light" : "dark",
  width: WIDTH + 40,
  body: `<style>${BIO_CSS}${style}</style>${framed}${sources}`,
  script,
});
const filename = light ? "fasciola-hepatica-light.html" : "fasciola-hepatica.html";
writeFileSync(join(HERE, filename), html);
console.log(`wrote examples/fasciola-hepatica/${filename}`);
