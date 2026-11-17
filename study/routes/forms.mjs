// ----- parasite forms, unit length along +x, head at +x. Outlined so internal structure stays visible. -----
export const W = (n, amp, waves, phase, taper = 0) => { let d = ""; for (let i = 0; i <= n; i++) { const x = -0.5 + i / n; const y = amp * Math.sin(waves * Math.PI * 2 * (x + 0.5) - phase) * (taper ? (0.3 + 0.7 * (x + 0.5)) : 1); d += (i ? "L" : "M") + x.toFixed(3) + " " + y.toFixed(3); } return d; };
export const cilia = (rx, ry, n, k = 1.28, cx = 0) => { let d = ""; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; d += `M${(cx + x).toFixed(3)} ${(y).toFixed(3)}L${(cx + x * k).toFixed(3)} ${(y * k).toFixed(3)}`; } return d; };
const hooks = (cx, cy, r, n) => { let d = ""; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5; d += `M${(cx + Math.cos(a) * r * 0.3).toFixed(3)} ${(cy + Math.sin(a) * r * 0.3).toFixed(3)}L${(cx + Math.cos(a) * r).toFixed(3)} ${(cy + Math.sin(a) * r).toFixed(3)}`; } return d; };
const ring = (cx, cy, r, n, k = 1.6) => cilia(r, r, n, k, cx).replace(/(M|L)(-?[\d.]+) (-?[\d.]+)/g, (m, c, x, y) => `${c}${x} ${(+y + cy).toFixed(3)}`);
const SH = (d) => `<path class="f-shell" d="${d}"/>`, BO = (d) => `<path class="f-body" d="${d}"/>`, IN = (d) => `<path class="f-in" d="${d}"/>`;
const E = (cx, cy, rx, ry, cls = "f-in") => `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
const DOT = (cx, cy, r = 0.035) => `<circle class="f-dot" cx="${cx}" cy="${cy}" r="${r}"/>`;
const LEMON = "M-0.5 0C-0.36 -0.2 -0.16 -0.3 0 -0.3C0.16 -0.3 0.36 -0.2 0.5 0C0.36 0.2 0.16 0.3 0 0.3C-0.16 0.3 -0.36 0.2 -0.5 0Z";
const PLUGGED = "M-0.42 0C-0.42 -0.2 -0.2 -0.27 0 -0.27C0.2 -0.27 0.42 -0.2 0.42 0C0.42 0.2 0.2 0.27 0 0.27C-0.2 0.27 -0.42 0.2 -0.42 0Z";
const COIL = "M-0.24 0.04C-0.2 0.18 0.16 0.2 0.22 0.02C0.26 -0.12 0.04 -0.2 -0.1 -0.14C-0.2 -0.08 -0.12 0.06 0.02 0.03";
export const FORMS = {
  egg: E(0, 0, 0.5, 0.33, "f-shell") + E(0, 0, 0.32, 0.19) + DOT(-0.1, -0.02) + DOT(0.08, 0.05) + DOT(0.12, -0.06),
  eggop: E(0, 0, 0.5, 0.34, "f-shell") + '<path class="f-op" d="M0.34 -0.25Q0.46 0 0.34 0.25"/>' + E(-0.04, 0, 0.26, 0.18) + DOT(-0.1, 0.02) + DOT(0.06, -0.05),
  eggspine: E(0, 0, 0.5, 0.3, "f-shell") + '<path class="f-op" d="M0.04 -0.3L0.2 -0.52L0.22 -0.28"/>' + IN("M0.3 0C0.3 -0.12 0.1 -0.17 -0.05 -0.14C-0.25 -0.1 -0.3 0 -0.24 0.05C-0.12 0.16 0.12 0.16 0.3 0Z"),
  eggl: E(0, 0, 0.5, 0.36, "f-shell") + `<path class="f-worm" d="${COIL}"/>`,
  eggplug: SH(PLUGGED) + E(-0.46, 0, 0.05, 0.08, "f-op") + E(0.46, 0, 0.05, 0.08, "f-op") + E(0, 0, 0.26, 0.14) + DOT(-0.06, 0) + DOT(0.08, 0.03),
  eggplugl: SH(PLUGGED) + E(-0.46, 0, 0.05, 0.08, "f-op") + E(0.46, 0, 0.05, 0.08, "f-op") + `<path class="f-worm" d="${COIL}"/>`,
  eggflat: SH("M-0.5 0.12C-0.5 -0.16 -0.2 -0.3 0.05 -0.3C0.3 -0.3 0.5 -0.15 0.5 0.08C0.5 0.16 0.45 0.2 0.35 0.2L-0.4 0.2C-0.47 0.2 -0.5 0.17 -0.5 0.12Z") + '<path class="f-worm" d="M-0.3 0.06C-0.2 -0.12 0.2 -0.14 0.3 0C0.32 0.1 0.1 0.12 -0.05 0.05"/>',
  miracidium: BO("M0.5 0C0.5 -0.2 0.2 -0.3 -0.1 -0.22C-0.4 -0.14 -0.5 0 -0.4 0.08C-0.2 0.26 0.2 0.28 0.5 0Z") + '<path class="f-cil" d="' + cilia(0.46, 0.25, 16) + '"/>' + DOT(0.3, -0.07, 0.04) + DOT(0.3, 0.07, 0.04) + E(-0.12, 0, 0.07, 0.06) + E(0.04, 0.04, 0.06, 0.05),
  coracidium: '<circle class="f-body" r="0.38"/><path class="f-cil" d="' + cilia(0.38, 0.38, 18) + '"/>' + E(0, 0, 0.2, 0.2) + '<path class="f-op" d="M-0.08 -0.16L-0.04 -0.06M0 -0.18L0 -0.07M0.08 -0.16L0.04 -0.06"/>',
  oncosphere: E(0, 0, 0.42, 0.42, "f-shell") + E(0, 0, 0.26, 0.26) + '<path class="f-op" d="M-0.1 -0.16L-0.04 -0.04M0 -0.18L0 -0.05M0.1 -0.16L0.04 -0.04M-0.1 0.16L-0.04 0.04M0 0.18L0 0.05M0.1 0.16L0.04 0.04"/>',
  sac: BO("M0.5 0C0.5 -0.24 0.1 -0.3 -0.2 -0.26C-0.5 -0.2 -0.5 0.2 -0.2 0.26C0.1 0.3 0.5 0.24 0.5 0Z") + E(-0.18, -0.04, 0.09, 0.09) + E(0.04, 0.07, 0.09, 0.09) + E(0.26, -0.06, 0.08, 0.08) + E(-0.02, -0.12, 0.06, 0.06),
  cercaria: '<path class="f-tail" data-wave="tail"/><path class="f-tailfork" data-wave="fork"/>' + E(0.28, 0, 0.22, 0.14, "f-body") + E(0.43, 0, 0.045, 0.045) + E(0.24, 0.02, 0.05, 0.05) + IN("M0.38 0L0.3 -0.07M0.38 0L0.3 0.07"),
  cyst: '<circle class="f-shell" r="0.5"/><circle class="f-in" r="0.38"/><path class="f-worm" d="M-0.2 0.05C-0.15 0.22 0.12 0.22 0.19 0.04C0.23 -0.09 0.08 -0.19 -0.06 -0.14"/>' + DOT(0.12, -0.02),
  fluke: BO("M0.5 0C0.46 -0.12 0.3 -0.22 0 -0.24C-0.3 -0.22 -0.5 -0.08 -0.5 0C-0.5 0.08 -0.3 0.22 0 0.24C0.3 0.22 0.46 0.12 0.5 0Z") + E(0.42, 0, 0.045, 0.045) + E(0.24, 0, 0.055, 0.055) + IN("M0.38 0L0.3 -0.08L-0.4 -0.08M0.38 0L0.3 0.08L-0.4 0.08M0.1 -0.08L0 -0.16M-0.1 -0.08L-0.2 -0.16M0.1 0.08L0 0.16M-0.1 0.08L-0.2 0.16"),
  pair: '<path class="f-thread" data-wave="male" style="stroke-width:.12"/><path class="f-core" data-wave="male" style="stroke-width:.07"/><path class="f-thread" data-wave="female" style="stroke-width:.035"/>',
  worm: '<path class="f-thread" data-wave="worm" style="stroke-width:.075"/><path class="f-core" data-wave="worm" style="stroke-width:.035"/>',
  larva: '<path class="f-thread" data-wave="larva" style="stroke-width:.09"/>',
  mf: '<path class="f-sheath" data-wave="mf" style="stroke-width:.16"/><path class="f-thread" data-wave="mf2" style="stroke-width:.06"/>',
  tape: '<path class="f-thread" data-wave="tape" style="stroke-width:.06"/><path class="f-core f-seg" data-wave="tape" style="stroke-width:.04"/>' + E(0.5, 0, 0.035, 0.035, "f-body"),
  scolex: E(0.1, 0, 0.36, 0.26, "f-body") + E(0.2, -0.1, 0.07, 0.07) + E(0.2, 0.1, 0.07, 0.07) + IN("M-0.26 0L-0.5 0"),
  cysticercus: E(0, 0, 0.5, 0.36, "f-shell") + E(0.22, 0, 0.13, 0.11) + DOT(0.2, -0.05, 0.03) + DOT(0.2, 0.05, 0.03) + IN("M0.09 0L-0.1 0"),
  hydatid: '<circle class="f-shell" r="0.5"/><circle class="f-in" r="0.42"/>' + E(-0.18, -0.12, 0.12, 0.12) + E(0.16, 0.14, 0.11, 0.11) + E(0.2, -0.18, 0.08, 0.08) + DOT(-0.18, -0.12) + DOT(0.16, 0.14) + DOT(-0.05, 0.2) + DOT(0.02, -0.02) + DOT(-0.25, 0.12),
  protoscolex: E(0, 0, 0.42, 0.28, "f-body") + '<path class="f-op" d="' + ring(0.28, 0, 0.1, 10) + '"/>' + E(0.1, -0.1, 0.06, 0.06) + E(0.1, 0.1, 0.06, 0.06),
  proglottid: '<rect class="f-body" x="-0.5" y="-0.3" width="1" height="0.6" rx="0.06"/>' + IN("M-0.36 0L0.36 0M-0.2 0L-0.24 -0.18M-0.2 0L-0.24 0.18M0 0L-0.04 -0.2M0 0L-0.04 0.2M0.2 0L0.16 -0.18M0.2 0L0.16 0.18"),
  tcyst: SH(LEMON) + `<path class="f-worm" d="${COIL}"/>`,
  oncomiracidium: E(0.05, 0, 0.42, 0.22, "f-body") + '<path class="f-cil" d="' + cilia(0.42, 0.22, 14, 1.25, 0.05) + '"/>' + DOT(0.3, -0.06) + DOT(0.3, 0.06) + IN("M-0.36 -0.1L-0.44 -0.16M-0.36 0.1L-0.44 0.16M-0.38 0L-0.47 0"),
  mono: BO("M0.5 0C0.48 -0.1 0.3 -0.14 0 -0.14C-0.2 -0.14 -0.3 -0.1 -0.34 -0.06L-0.34 0.06C-0.3 0.1 -0.2 0.14 0 0.14C0.3 0.14 0.48 0.1 0.5 0Z") + E(-0.42, 0, 0.1, 0.18, "f-body") + IN("M-0.46 -0.1L-0.52 -0.16M-0.46 0.1L-0.52 0.16M-0.36 -0.12L-0.36 0.12") + E(0.38, 0, 0.05, 0.04),
  diplo: `<g transform="rotate(30)">${BO("M0.5 0C0.48 -0.08 0.3 -0.1 0 -0.1C-0.3 -0.1 -0.44 -0.08 -0.5 0C-0.44 0.08 -0.3 0.1 0 0.1C0.3 0.1 0.48 0.08 0.5 0Z")}${E(-0.44, 0, 0.06, 0.1, "f-in")}</g><g transform="rotate(-30)">${BO("M0.5 0C0.48 -0.08 0.3 -0.1 0 -0.1C-0.3 -0.1 -0.44 -0.08 -0.5 0C-0.44 0.08 -0.3 0.1 0 0.1C0.3 0.1 0.48 0.08 0.5 0Z")}${E(-0.44, 0, 0.06, 0.1, "f-in")}</g>`,
  polystoma: BO("M0.5 0C0.48 -0.14 0.3 -0.2 0 -0.2C-0.2 -0.2 -0.3 -0.16 -0.32 -0.1L-0.32 0.1C-0.3 0.16 -0.2 0.2 0 0.2C0.3 0.2 0.48 0.14 0.5 0Z") + E(-0.4, 0, 0.12, 0.22, "f-body") + E(-0.36, -0.14, 0.035, 0.035) + E(-0.44, -0.07, 0.035, 0.035) + E(-0.46, 0.02, 0.035, 0.035) + E(-0.44, 0.1, 0.035, 0.035) + E(-0.36, 0.16, 0.035, 0.035) + E(-0.3, 0, 0.035, 0.035) + E(0.4, 0, 0.05, 0.05),
  eggstring: '<path class="f-thread" data-wave="string" style="stroke-width:.1"/><path class="f-core f-beads" data-wave="string" style="stroke-width:.06"/>',
  acanthor: SH("M-0.5 0C-0.3 -0.22 0.3 -0.22 0.5 0C0.3 0.22 -0.3 0.22 -0.5 0Z") + E(0, 0, 0.3, 0.1) + IN("M0.3 0L0.36 -0.06M0.3 0L0.38 0M0.3 0L0.36 0.06"),
  acanth: '<path class="f-thread" data-wave="worm" style="stroke-width:.075"/><path class="f-core" data-wave="worm" style="stroke-width:.035"/>' + E(0.53, 0, 0.05, 0.035, "f-body") + '<path class="f-op" d="M0.5 -0.035L0.49 -0.07M0.54 -0.035L0.54 -0.07M0.5 0.035L0.49 0.07M0.54 0.035L0.54 0.07M0.58 0L0.62 0"/>',
  coil: '<circle class="f-shell" r="0.5"/><path class="f-worm" d="M-0.3 0C-0.3 -0.3 0.3 -0.3 0.3 0C0.3 0.25 -0.2 0.25 -0.2 0C-0.2 -0.15 0.15 -0.15 0.15 0"/><path class="f-worm" d="M-0.34 0.18C-0.1 0.38 0.25 0.3 0.36 0.1"/>',
};
export const WAVES = {
  tail: (t) => W(8, 0.06, 1, t * 14).replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, x, y) => (+x * 0.6 - 0.24).toFixed(3) + " " + y),
  fork: (t) => { const y = 0.06 * Math.sin(-t * 14); return `M-0.54 ${(y).toFixed(3)}L-0.66 ${(y - 0.08).toFixed(3)}M-0.54 ${(y).toFixed(3)}L-0.66 ${(y + 0.08).toFixed(3)}`; },
  worm: (t) => W(16, 0.045, 1.5, t * 5, 1),
  larva: (t) => W(12, 0.08, 1.2, t * 9),
  male: (t) => W(12, 0.03, 0.8, t * 3),
  female: (t) => W(14, 0.05, 1.6, t * 3).replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, x, y) => (+x * 1.08).toFixed(3) + " " + (+y + 0.015).toFixed(3)),
  mf: (t) => W(12, 0.07, 1.3, t * 8),
  mf2: (t) => W(12, 0.07, 1.3, t * 8).replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, x, y) => (+x * 0.86).toFixed(3) + " " + y),
  tape: (t) => W(18, 0.05, 1.4, t * 2.5),
  string: (t) => W(16, 0.12, 1.2, t * 1.5),
};
