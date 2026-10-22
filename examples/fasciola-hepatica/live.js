const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const figure = document.querySelector(".fl-figure");
const readout = document.querySelector("[data-readout]");
const toggle = document.querySelector(".motion-toggle");
const range = document.querySelector(".timeline-range");
const stageButtons = [...document.querySelectorAll(".stage-btn")];
const stageNote = document.querySelector(".stage-note");
const stageStatus = document.querySelector(".stage-status");
const insetStages = [...document.querySelectorAll(".inset-stage")];
const insetCaption = document.querySelector(".inset-caption");
const insetEmbryo = document.querySelector('.inset-stage[data-stage="1"] .embryo');
const countOut = document.querySelector(".count-out");
const sporocyst = figure.querySelector("#sporocyst");
const germs = [...figure.querySelectorAll(".germ")];
const guides = [...figure.querySelectorAll("[data-from]")];
const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const movers = DATA.movers.map((config, index) => {
  const cum = [0];
  for (let i = 1; i < config.screen.length; i++) {
    const [x0, y0] = config.screen[i - 1];
    const [x1, y1] = config.screen[i];
    cum.push(cum[i - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  const el = figure.querySelector(`[data-mover="${index}"]`);
  return {
    ...config,
    el,
    a: el.querySelector(".mv-a"),
    b: el.querySelector(".mv-b"),
    embryo: el.querySelector(".embryo"),
    cum,
    total: cum[cum.length - 1] || 1,
  };
});
let clock = 0;
let playing = false;
let frame = 0;
let last = 0;
let visible = true;
let current = -1;
let announcedStage = -1;
let shownCercariae = -1;

const placeOn = (m, u) => {
  const target = u * m.total;
  let i = 1;
  while (i < m.cum.length - 1 && m.cum[i] < target) i++;
  const [x0, y0] = m.screen[i - 1];
  const [x1, y1] = m.screen[i];
  const span = m.cum[i] - m.cum[i - 1] || 1;
  const f = clamp((target - m.cum[i - 1]) / span);
  return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, angle: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI };
};
const stageAt = (t) => {
  let index = 0;
  DATA.stages.forEach((stage, i) => {
    if (t >= stage.at) index = i;
  });
  return index;
};
// Visual updates on stage change. Screen readers hear stage changes only when the reader triggers them.
const announce = (index) => {
  const stage = DATA.stages[index];
  readout.textContent = `Stage ${index + 1} of ${DATA.stages.length} · ${stage.name}`;
  stageNote.textContent = stage.note;
  insetCaption.textContent = `${stage.inset}. Enlarged, not to scale.`;
  insetStages.forEach((group) => {
    group.setAttribute("display", Number(group.dataset.stage) === index ? "inline" : "none");
  });
  range.setAttribute("aria-valuetext", stage.name);
  stageButtons.forEach((button, i) => {
    if (i === index) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
};
const render = (t) => {
  for (const m of movers) {
    const live = t >= m.t0 && (m.hideAt === undefined || t < m.hideAt);
    if (!live) {
      m.el.setAttribute("display", "none");
      continue;
    }
    const u = clamp((t - m.t0) / (m.t1 - m.t0));
    const p = placeOn(m, u);
    let alpha = clamp((t - m.t0) / 0.2);
    if (m.hideAt !== undefined) alpha = Math.min(alpha, clamp((m.hideAt - t) / 0.2));
    m.el.setAttribute("display", "inline");
    m.el.setAttribute("opacity", alpha.toFixed(2));
    m.el.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.angle.toFixed(1)}) scale(${DATA.scale})`);
    if (m.becomes) {
      const after = t >= m.t1;
      m.a.setAttribute("display", after ? "none" : "inline");
      m.b.setAttribute("display", after ? "inline" : "none");
    }
    if (m.embryo) m.embryo.setAttribute("transform", `scale(${(0.3 + 0.7 * clamp((t - 4) / 5)).toFixed(2)})`);
  }
  if (insetEmbryo) insetEmbryo.setAttribute("transform", `scale(${(0.3 + 0.7 * clamp((t - 4) / 5)).toFixed(2)})`);
  sporocyst.setAttribute("opacity", clamp((t - 12) / 0.6).toFixed(2));
  for (const germ of germs) germ.setAttribute("opacity", clamp((t - Number(germ.dataset.at)) / 0.2).toFixed(2));
  for (const guide of guides) {
    const active = t >= Number(guide.dataset.from) && t <= Number(guide.dataset.to);
    guide.setAttribute("opacity", active ? "0.8" : "0");
  }
  const shown = movers.filter((m) => m.kind === "cercaria" && t >= m.t0).length;
  if (shown !== shownCercariae) {
    shownCercariae = shown;
    countOut.textContent = `Drawn: ${shown} cercariae (schematic). One miracidium can yield about 200; see sources.`;
  }
  range.value = t.toFixed(2);
  const stage = stageAt(t);
  if (stage !== current) {
    current = stage;
    announce(stage);
  }
};
const tick = (now) => {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
  last = now;
  clock = (clock + dt) % DATA.loop;
  render(clock);
  frame = playing && visible ? requestAnimationFrame(tick) : 0;
};
const start = () => {
  if (playing && visible && !frame) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
const stop = () => {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
};
const seek = (time) => {
  clock = time;
  render(clock);
};
// A reader's own jump (stage button, arrow key, timeline) is the only thing that reaches the status region.
const userSeek = (time) => {
  seek(time);
  const index = stageAt(time);
  if (index !== announcedStage) {
    announcedStage = index;
    stageStatus.textContent = `Stage ${index + 1} of ${DATA.stages.length}: ${DATA.stages[index].name}`;
  }
};
const setPlaying = (next) => {
  playing = next;
  toggle.textContent = playing ? "Pause" : "Play";
  if (playing) start();
  else stop();
};

toggle.addEventListener("click", () => setPlaying(!playing));
stageButtons.forEach((button, index) => {
  button.addEventListener("click", () => userSeek(DATA.stages[index].at));
});
range.addEventListener("input", () => userSeek(Number(range.value)));
document.addEventListener("keydown", (event) => {
  if (event.target.closest("button, a, input, textarea, select")) return;
  if (event.code === "Space") {
    event.preventDefault();
    if (!toggle.disabled) toggle.click();
  } else if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
    event.preventDefault();
    const next = clamp(stageAt(clock) + (event.code === "ArrowRight" ? 1 : -1), 0, DATA.stages.length - 1);
    userSeek(DATA.stages[next].at);
  }
});
reduceMotion.addEventListener("change", () => {
  if (reduceMotion.matches) {
    stop();
    setPlaying(false);
    toggle.disabled = true;
  } else {
    toggle.disabled = false;
    setPlaying(true);
  }
});
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) start();
  else stop();
}, { rootMargin: "120px 0px" }).observe(figure);

render(clock);
if (reduceMotion.matches) {
  toggle.disabled = true;
  toggle.textContent = "Play";
} else {
  setPlaying(true);
}
