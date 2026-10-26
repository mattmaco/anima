// Inlined after SPEC, lib, model, readout and VIEWS. Binds controls, runs the model, talks to a host page.
const svg = document.querySelector(".study-figure");
const readoutEl = document.querySelector("[data-readout]");
const noteEl = document.querySelector(".study-note");
const embedded = window.parent !== window;
const params = {};
for (const [name, param] of Object.entries(SPEC.params)) params[name] = param.value;
Object.assign(params, Object.values(SPEC.states)[0] ?? {});
const ctx = { spec: SPEC, model, lib, cache: {}, gen: Infinity, generations: 0 };
let data = null;
let playing = false;

function coerce(name, value) {
  const param = SPEC.params[name];
  if (!param) return undefined;
  if (param.options) return param.options.find((option) => String(option) === String(value));
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(param.max, Math.max(param.min, number)) : undefined;
}

function apply(partial) {
  let changed = false;
  for (const [name, value] of Object.entries(partial ?? {})) {
    const next = coerce(name, value);
    if (next !== undefined) { params[name] = next; changed = true; }
  }
  return changed;
}

function syncControls() {
  for (const [name, param] of Object.entries(SPEC.params)) {
    const input = document.getElementById(`param-${name}`);
    if (input && document.activeElement !== input) input.value = String(params[name]);
    const output = document.querySelector(`output[for="param-${name}"]`);
    if (output) output.textContent = param.options ? "" : String(+Number(params[name]).toFixed(3));
    const label = input?.closest("label");
    if (label && param.when) label.hidden = !Object.entries(param.when).every(([k, v]) => params[k] === v);
  }
}

function draw() {
  for (const view of VIEWS) view.render(svg, data, params, view.box, ctx);
  readoutEl.textContent = readout(data, params, ctx.gen);
}

function update(animate = true) {
  data = model({ ...params }, lib.mulberry32(SPEC.seed ?? 1), lib);
  restart(animate);
  syncControls();
}

// Stepped figures reveal one generation every STEP_MS; static figures just draw.
const STEP_MS = 50;
const stepped = Boolean(SPEC.replicates);
const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
let visible = true;
let rafId = 0;
let lastStep = 0;

function tick(time) {
  rafId = 0;
  if (!playing || !visible) return;
  if (time - lastStep >= STEP_MS) {
    lastStep = time;
    ctx.gen = Math.min(ctx.gen + 1, ctx.generations);
    draw();
  }
  if (ctx.gen >= ctx.generations) { playing = false; return; }
  rafId = window.requestAnimationFrame(tick);
}

function restart(animate) {
  if (!stepped) { draw(); return; }
  ctx.generations = data.runs[0].length - 1;
  const run = animate && !reduced;
  ctx.gen = run ? 0 : ctx.generations;
  playing = false;
  draw();
  if (run) play();
}

function set(target, animate = true) {
  const partial = typeof target === "string" ? SPEC.states[target] : target;
  if (!partial || typeof partial !== "object" || !apply(partial)) return false;
  update(animate);
  return true;
}

function changed() {
  if (embedded) window.parent.postMessage({ type: "anima:changed", params: { ...params } }, "*");
}

for (const name of Object.keys(SPEC.params)) {
  const input = document.getElementById(`param-${name}`);
  input?.addEventListener("input", () => { if (apply({ [name]: input.value })) { update(); changed(); } });
}
for (const button of document.querySelectorAll("[data-state]")) {
  button.addEventListener("click", () => { if (set(button.dataset.state)) changed(); });
}
window.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg && msg.type === "anima:set") set(msg.state ?? msg.params);
});
const showNote = (event) => {
  const part = event.target.closest?.("[data-note]");
  if (part && noteEl) noteEl.textContent = part.dataset.note;
};
document.addEventListener("pointerover", showNote);
document.addEventListener("focusin", showNote);

function play() {
  if (!stepped || reduced) return;
  if (ctx.gen >= ctx.generations) { ctx.gen = 0; draw(); }
  playing = true;
  if (!rafId) rafId = window.requestAnimationFrame(tick);
}
function pause() { playing = false; }
if (stepped && "IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && playing && !rafId) rafId = window.requestAnimationFrame(tick);
  }).observe(svg);
}
document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || /INPUT|SELECT|BUTTON|TEXTAREA/.test(document.activeElement?.tagName ?? "")) return;
  event.preventDefault();
  playing ? pause() : play();
});

const fromHash = location.hash.match(/^#state=(.*)$/);
if (!(fromHash && set(decodeURIComponent(fromHash[1]), !embedded))) update(!embedded);
window.anima = { set, params, play, pause, get gen() { return ctx.gen; } };
if (embedded) window.parent.postMessage({ type: "anima:ready", chunk: SPEC.chunk, states: Object.keys(SPEC.states) }, "*");
