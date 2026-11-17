// Life-cycle route tour runtime. Reads window.CYCLE = { stages, routes }.
const C = window.CYCLE;
const NS = "http://www.w3.org/2000/svg";
const $ = (s) => document.querySelector(s);
const svg = $(".rt-fig"), layer = $("#sprites");
const readout = $("[data-readout]"), pauseBtn = $("#pause"), bar = $("#bar"), info = $("#info");
const btns = [...document.querySelectorAll(".rt-seg button")];
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (u) => u * u * (3 - 2 * u);

// ----- route geometry -----
const R = C.routes.map((p) => { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); return { p, c, L: c[c.length - 1] || 1 }; });
function along(ri, u) {
  const { p, c, L } = R[ri]; if (p.length === 1) return [p[0][0], p[0][1], 0];
  const want = clamp(u) * L; let i = 1; while (i < c.length - 1 && c[i] < want) i++;
  const k = (want - c[i - 1]) / ((c[i] - c[i - 1]) || 1);
  return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k, Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0]) * 180 / Math.PI];
}

/*FORMS*/
const POOL = 10;
const pool = Array.from({ length: POOL }, () => {
  const g = document.createElementNS(NS, "g"); g.setAttribute("class", "sp"); g.style.display = "none";
  const forms = {};
  for (const [k, html] of Object.entries(FORMS)) { const h = document.createElementNS(NS, "g"); h.setAttribute("class", "f f-" + k); h.innerHTML = html; h.style.display = "none"; g.appendChild(h); forms[k] = h; }
  layer.appendChild(g);
  return { g, forms, waves: [...g.querySelectorAll("[data-wave]")], cur: null, ang: 0 };
});
function setForm(s, k) { if (s.cur === k) return; if (s.cur) s.forms[s.cur].style.display = "none"; s.forms[k].style.display = ""; s.cur = k; }
const STILL = { ring: 1, schiz: 1, gamet: 1, oocyst: 1, mero: 1, pcell: 1, ama: 1, cysticercus: 1, hydatid: 1, tcyst: 1, acanthor: 1, coil: 1, oncosphere: 1, eggplug: 1, eggplugl: 1, eggflat: 1, eggs: 1, eggl: 1, egg: 1, eggop: 1, eggspine: 1, eggmam: 1, cyst: 1, coracidium: 0, sac: 0 };

// ----- long worms drawn as a strand along their route -----
const strands = [];
C.stages.forEach((st, si) => st.moves.forEach((m) => {
  if (!m.strand) return;
  const g = document.createElementNS(NS, "g"); g.style.display = "none";
  g.innerHTML = `<path class="strand strand-out"/><path class="strand strand-in ${m.strand.kind}"/>`;
  layer.parentNode.insertBefore(g, layer);
  strands.push({ si, m, g, paths: [...g.querySelectorAll("path")] });
}));
function strandD(ri, a, b) {
  const { p, c, L } = R[ri];
  const pt = (s) => { const [x, y] = along(ri, s / (L || 1)); return x.toFixed(1) + " " + y.toFixed(1); };
  let d = "M" + pt(a);
  for (let i = 0; i < p.length; i++) if (c[i] > a && c[i] < b) d += "L" + p[i][0] + " " + p[i][1];
  return d + "L" + pt(b);
}
function drawStrands(p) {
  for (const s of strands) {
    const [a, b] = s.m.t || [0, 1];
    if (s.si !== stage || p < a) { s.g.style.display = "none"; continue; }
    const pos = Math.max(2, ease(clamp((p - a) / (b - a))) * R[s.m.r].L);
    const d = strandD(s.m.r, s.m.strand.grow ? 0 : Math.max(0, pos - s.m.strand.len), pos);
    s.paths.forEach((el) => el.setAttribute("d", d)); s.g.style.display = "";
  }
}
// ----- tour state -----
const tracks = [...svg.querySelectorAll(".trk")].map((el) => ({ el, st: +el.dataset.stage, len: el.getTotalLength() }));
for (const t of tracks) t.el.style.strokeDasharray = t.len.toFixed(1) + " " + (t.len + 10).toFixed(1);
let stage = 0, t = 0, playing = !reduce.matches, visible = true, frame = 0, last = 0, clock = 0;
const hots = new Map(); for (const n of svg.querySelectorAll(".hot")) hots.set(n.id, n);

function draw(p, dt) {
  const S = C.stages[stage];
  // tracks: earlier stages full and dim, this stage drawing on
  for (const tr of tracks) {
    const done = tr.st < stage, now = tr.st === stage;
    const u = done ? 1 : now ? clamp(p / 0.9) : 0;
    tr.el.style.strokeDashoffset = (tr.len * (1 - ease(u))).toFixed(1);
    tr.el.classList.toggle("now", now); tr.el.style.visibility = u > 0.002 ? "visible" : "hidden";
  }
  drawStrands(p);
  let used = 0;
  for (const m of S.moves) {
    const [a, b] = m.t || [0, 1];
    if (p < a && !(m.pre)) continue;
    if (m.hide && p > b) continue;
    const u0 = clamp((p - a) / (b - a));
    const n = m.n || 1;
    for (let i = 0; i < n && used < POOL; i++) {
      const sp = pool[used++];
      const ui = clamp(u0 * (1 + (m.spread || 0)) - i * (m.spread || 0) / Math.max(1, n - 1));
      if (n > 1 && u0 * (1 + (m.spread || 0)) - i * (m.spread || 0) / Math.max(1, n - 1) < 0) { sp.g.style.display = "none"; continue; }
      if (m.hideSprite) { sp.g.style.display = "none"; continue; }
      // a growing tapeworm keeps its scolex at the attachment point
      let [x, y, ang] = along(m.r, m.strand?.grow ? 0 : ease(ui));
      if (m.strand?.grow) ang = along(m.r, 0.02)[2] + 180;
      if (n > 1) { const j = (i - (n - 1) / 2) * (m.jit ?? 4); x += j * Math.sin(ang * Math.PI / 180) * -1; y += j * Math.cos(ang * Math.PI / 180); }
      const sz = (C.k || 1.45) * m.size[0] + (C.k || 1.45) * (m.size[1] - m.size[0]) * ease(ui);
      let form = m.form; if (m.form2 && ui >= (m.at ?? 1)) form = m.form2;
      setForm(sp, form);
      const still = STILL[form] === 1;
      if (still) ang = m.ang ?? 0;
      if (m.flip) ang += 180;
      const k = dt >= 1000 ? 1 : 1 - Math.exp(-dt / 120);
      let d = ((ang - sp.ang + 540) % 360) - 180; sp.ang = still ? ang : sp.ang + d * k;
      const fade = m.fadeOut && ui > 0.85 ? (1 - ui) / 0.15 : 1;
      sp.g.style.display = ""; sp.g.style.opacity = (m.fadeIn && ui < 0.1 ? ui / 0.1 : fade).toFixed(2);
      sp.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${sp.ang.toFixed(1)}) scale(${sz.toFixed(2)})`);
      for (const w of sp.waves) if (w.parentNode.style.display !== "none") w.setAttribute("d", WAVES[w.dataset.wave](clock / 1000 + i * 0.7));
    }
  }
  for (let i = used; i < POOL; i++) pool[i].g.style.display = "none";
  bar.style.transform = "scaleX(" + ((stage + clamp(p)) / C.stages.length).toFixed(4) + ")";
}
function setHot() { for (const [id, n] of hots) n.classList.toggle("is-stage", (C.stages[stage].hot || []).includes(id)); }
function setText() {
  const st = C.stages[stage];
  readout.textContent = st.readout;
  $("#st-title").textContent = (stage + 1) + " · " + st.title;
  $("#st-when").textContent = st.when; $("#st-when").hidden = !st.when;
  $("#st-text").textContent = st.text;
  btns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === stage)));
  setHot();
  document.querySelectorAll('.cap').forEach((g) => g.classList.toggle('on', +g.dataset.stage === stage));
}
function go(i) { stage = (i + C.stages.length) % C.stages.length; t = 0; setText(); if (!playing || reduce.matches) still(); }
function still() { draw(C.stages[stage].still ?? 1, 1000); }
function tick(now) {
  frame = 0; if (!playing || !visible) return;
  const dt = Math.min(64, now - (last || now)); last = now; clock += dt; t += dt;
  const d = C.stages[stage].dur;
  if (t >= d) { stage = (stage + 1) % C.stages.length; t = 0; setText(); }
  draw(t / d, dt); frame = requestAnimationFrame(tick);
}
function start() { if (playing && visible && !frame) { last = 0; frame = requestAnimationFrame(tick); } }
function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; }
function setPlaying(v) { playing = v; pauseBtn.textContent = v ? "Pause tour" : "Play tour"; pauseBtn.setAttribute("aria-pressed", String(!v)); if (v) start(); else { stop(); still(); } }
btns.forEach((b, i) => b.addEventListener("click", () => go(i)));
pauseBtn.addEventListener("click", () => setPlaying(!playing));
document.addEventListener("keydown", (e) => {
  if (e.target.closest("button, a, input, textarea, select")) return;
  if (e.code === "Space") { e.preventDefault(); setPlaying(!playing); }
  else if (/^[1-9]$/.test(e.key) && +e.key <= C.stages.length) go(+e.key - 1);
  else if (e.key === "ArrowRight") go(stage + 1); else if (e.key === "ArrowLeft") go(stage - 1);
});
reduce.addEventListener("change", () => setPlaying(!reduce.matches));
const idle = info.textContent;
for (const n of hots.values()) {
  const on = () => { info.textContent = n.dataset.info; n.classList.add("is-hot"); };
  const off = () => { info.textContent = idle; n.classList.remove("is-hot"); };
  n.addEventListener("pointerenter", on); n.addEventListener("pointerleave", off);
  n.addEventListener("focus", on); n.addEventListener("blur", off); n.addEventListener("click", on);
}
new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); }).observe(svg);
window.__rt = { go, setPlaying, show: (i, p) => { stage = i; setText(); clock = 1200; draw(p, 1000); } };
// colour theme: in-place toggle, remembered across the bank's pages
const tbtn = $("#theme"), cyc = $("#cyc");
function applyTheme(t, save) {
  document.body.dataset.theme = t;
  tbtn.textContent = t === "dark" ? "☀ Light" : "☾ Dark";
  for (const a of document.querySelectorAll("a[data-dark][data-light]")) a.href = a.dataset[t];
  if (save) try { localStorage.setItem("anima-theme", t); } catch {}
}
try { const t = localStorage.getItem("anima-theme"); if (t === "dark" || t === "light") applyTheme(t); else applyTheme(document.body.dataset.theme); } catch { applyTheme(document.body.dataset.theme); }
tbtn.addEventListener("click", () => applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark", true));
setText();
if (reduce.matches) { playing = false; pauseBtn.textContent = "Play tour"; pauseBtn.setAttribute("aria-pressed", "true"); }
still(); start();
