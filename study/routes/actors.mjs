// Host and environment drawings. Each actor returns local-coordinate SVG plus named
// points (pts) and named centrelines (lines) that routes can follow.
import { smooth, organ, tube, hot, line, ellipsePts, pl, f, esc } from "./lib.mjs";

const pick = (o, k, d) => (o.info && o.info[k]) || d;
const tn = (o, k) => (o.hot && o.hot.includes(k) ? "lit" : "hi");

// ---------- Human, front view, schematic. Host's right is on the viewer's left. ----------
export function human(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "human-" + k });
  const sil = [[174,112],[200,124],[236,134],[252,150],[258,190],[262,250],[268,320],[274,390],[280,420],[284,440],[276,452],[266,448],[260,425],[252,380],[244,320],[236,262],[230,218],[228,280],[226,330],[232,390],[236,440],[232,500],[224,560],[218,604],[228,624],[210,632],[186,630],[182,604],[178,560],[172,500],[166,474],[160,470],[154,474],[148,500],[142,560],[138,604],[134,630],[110,632],[92,624],[102,604],[96,560],[88,500],[84,440],[88,390],[94,330],[92,280],[90,218],[84,262],[76,320],[68,380],[60,425],[54,448],[44,452],[36,440],[40,420],[46,390],[52,320],[58,250],[62,190],[68,150],[84,134],[120,124],[146,112]];
  const P = {
    mouth: [160, 86], throat: [160, 104], esoTop: [161, 120], eso2: [164, 200], eso3: [172, 256], cardia: [186, 272],
    stomach: [200, 292], pylorus: [164, 318], duo1: [146, 322], duo2: [136, 334], duo3: [142, 348], duo4: [162, 352], djf: [184, 354],
    si1: [200, 364], si2: [194, 376], si3: [130, 372], si4: [122, 386], si5: [196, 390], si6: [200, 404], si7: [128, 404], si8: [120, 418], si9: [188, 420], si10: [184, 432], si11: [134, 436], ileoc: [114, 440],
    cecum: [106, 450], asc1: [100, 410], asc2: [100, 362], hflex: [104, 344], trans: [160, 346], sflex: [218, 342], desc1: [222, 384], desc2: [218, 428], sig: [200, 454], rect: [168, 458], rect2: [160, 470], anus: [160, 482], perianal: [160, 492],
    liver: [128, 278], bileDuct: [142, 300], gb: [140, 310], brain: [160, 46], eyeR: [146, 62], eyeL: [174, 62],
    trach: [157, 150], carina: [157, 168], bronR: [130, 186], bronL: [186, 186], lungR: [118, 205], lungL: [204, 210], alvR: [108, 228], alvL: [212, 230],
    heart: [174, 224], rheart: [162, 226], pa: [168, 204],
    kidneyR: [104, 320], kidneyL: [216, 320], bladder: [160, 458], urethra: [160, 480],
    ivcLow: [164, 468], ivcMid: [165, 380], ivcHigh: [164, 262], mesV: [170, 400], portal: [150, 326], vesical: [160, 446],
    footR: [114, 626], ankleR: [118, 600], legVR: [120, 560], thighVR: [124, 500], iliacR: [140, 470],
    footL: [206, 626], ankleL: [202, 600], thighL: [196, 520],
    nodeR: [126, 480], nodeL: [194, 480], lymL1: [200, 580], lymL2: [198, 540], lymL3: [194, 500], cist: [160, 334], thor: [158, 200],
    armSkin: [252, 300], armV: [244, 300], axL: [228, 176], handR: [44, 444],
    nodule: [228, 432], flank: [222, 330], chest: [214, 140], forearm: [262, 400], cheek: [186, 70], cavR: [104, 350], liverSurf: [100, 300], cavL: [214, 352], diaL: [212, 254], scalp: [160, 20],
  };
  const L = {
    gut: ["mouth","throat","esoTop","eso2","eso3","cardia","stomach","pylorus","duo1","duo2","duo3","duo4","djf","si1","si2","si3","si4","si5","si6","si7","si8","si9","si10","si11","ileoc","cecum","asc1","asc2","hflex","trans","sflex","desc1","desc2","sig","rect","rect2","anus"],
    airUp: ["alvR","lungR","bronR","carina","trach","throat"],
  };
  const p = (k) => P[k];
  const seq = (ks) => ks.map(p);
  let s = "";
  s += `<ellipse class="halo" cx="160" cy="636" rx="110" ry="9"/>`;
  s += `<g class="hot" id="${id}-body" tabindex="0" aria-label="Body wall and skin" data-info="${esc(pick(o, "skin", "Skin and body wall."))}"><path class="body" d="${smooth(sil, true, 0.35)}"/><ellipse class="body" cx="160" cy="58" rx="34" ry="42"/><path class="body" d="M146 96L146 118L174 118L174 96Z"/><path class="ln body-edge" data-tone="mid" d="${smooth(sil, true, 0.35)}"/><path class="ln body-edge" data-tone="mid" d="M160 16C182 16 194 36 194 58C194 82 180 100 160 100C140 100 126 82 126 58C126 36 138 16 160 16Z"/></g>`;
  // back layer: kidneys, ureters, veins, lymph
  s += organ([[96,300],[110,298],[116,312],[112,326],[114,336],[100,342],[92,326]], I("kidneyR", "Right kidney"));
  s += organ([[224,300],[210,298],[204,312],[208,326],[206,336],[220,342],[228,326]], I("kidneyL", "Left kidney"));
  s += line(smooth([[110,336],[128,400],[150,450]]), "lo") + line(smooth([[210,336],[192,400],[170,450]]), "lo");
  const vein = (pts, k, lab) => tube(pts, 3.2, { ...I(k, lab), body: "vein" });
  s += vein(seq(["footR","ankleR","legVR","thighVR","iliacR","ivcLow","ivcMid","ivcHigh","rheart"]), "veins", "Veins: leg veins, inferior vena cava to the right heart");
  s += vein([[252,300],[240,240],[226,184],[200,170],[170,180],[163,214]], "armVeins", "Arm vein to the superior vena cava");
  s += vein(seq(["mesV","portal","liver"]), "portalV", "Mesenteric and hepatic portal veins");
  s += tube(seq(["lymL1","lymL2","lymL3","nodeL"]), 2, { ...I("lymph", "Lymphatic channels"), body: "lymph" }) + tube([[126,480],[146,420],[158,340],[158,200]], 2, { ...I("lymph2", "Lymph trunks and thoracic duct"), body: "lymph" });
  s += organ(ellipsePts(126, 480, 6, 4.5, 10), I("nodeR", "Inguinal lymph node")) + organ(ellipsePts(194, 480, 6, 4.5, 10), I("nodeL", "Inguinal lymph node")) + organ(ellipsePts(228, 176, 5, 4, 10), I("nodeAx", "Axillary lymph node"));
  // thorax
  s += organ([[140,150],[150,180],[148,240],[132,254],[100,252],[90,222],[96,176],[116,152]], I("lungR", "Right lung"));
  s += organ([[180,150],[204,155],[224,182],[228,240],[214,254],[196,250],[200,226],[186,212],[178,180]], I("lungL", "Left lung"));
  s += tube(seq(["throat","esoTop","trach","carina"]), 5, I("trachea", "Trachea"));
  s += tube(seq(["carina","bronR","lungR","alvR"]), 3, I("bronR", "Bronchial tree")) + tube(seq(["carina","bronL","lungL","alvL"]), 3, I("bronL", "Bronchial tree"));
  s += organ([[156,202],[180,198],[196,212],[196,236],[178,252],[158,244],[150,224]], I("heart", "Heart (right side on the viewer's left)"));
  s += line("M168 204C172 214 168 236 172 248", "mid");
  s += tube([[166,218],[168,204],[170,194]], 3.4, I("pa", "Pulmonary artery"));
  s += line(smooth([[92,258],[126,248],[160,244],[194,248],[228,258]]), "mid");
  s += tube(seq(["esoTop","eso2","eso3","cardia"]), 4.5, I("eso", "Oesophagus"));
  // abdomen
  s += tube(seq(["djf","si1","si2","si3","si4","si5","si6","si7","si8","si9","si10","si11","ileoc"]), 8, I("si", "Small intestine (jejunum and ileum)"));
  s += tube(seq(["ileoc","cecum","asc1","asc2","hflex","trans","sflex","desc1","desc2","sig","rect","rect2","anus"]), 11, I("colon", "Large intestine: cecum, colon, rectum"));
  s += organ(ellipsePts(106, 452, 10, 9, 10), I("cecum", "Cecum"));
  s += organ([[148,448],[172,448],[178,462],[166,474],[154,474],[142,462]], I("bladder", "Urinary bladder"));
  s += tube(seq(["pylorus","duo1","duo2","duo3","duo4","djf"]), 7.5, I("duo", "Duodenum"));
  s += organ([[184,268],[206,262],[224,280],[222,308],[206,324],[182,328],[164,322],[166,308],[188,304],[196,292],[184,282]], I("stomach", "Stomach"));
  s += organ([[92,262],[130,256],[176,262],[196,272],[180,292],[142,304],[104,312],[90,292]], I("liver", "Liver"));
  s += organ(ellipsePts(140, 310, 6, 4.5, 10), I("gb", "Gallbladder"));
  s += tube([[122,284],[134,292],[142,300],[146,316],[146,322]], 1.6, I("bile", "Bile ducts"));
  // muscle panel on the viewer's right thigh
  s += hot(`${id}-muscle`, pick(o, "muscle", "Striated (skeletal) muscle of the thigh"), "Striated muscle", `<path class="og-base" d="M184 508L208 508L206 548L182 548Z"/>${line("M187 512L186 544M192 512L191 544M197 512L196 544M202 512L201 544", "lo")}<path class="og-edge" data-tone="${tn(o, "muscle")}" d="M184 508L208 508L206 548L182 548Z"/>`);
  // head
  s += organ([[136,40],[150,24],[172,24],[186,40],[184,60],[160,66],[138,60]], I("brain", "Brain"));
  s += organ(ellipsePts(146, 64, 6, 3.4, 10), I("eyeR", "Eye")) + organ(ellipsePts(174, 64, 6, 3.4, 10), I("eyeL", "Eye"));
  s += `<path class="ln" data-tone="mid" d="M152 86C156 89 164 89 168 86"/>`;
  return { svg: s, pts: P, lines: L, w: 320, h: 640 };
}

// ---------- Freshwater snail ----------
export function snail(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "snail-" + k });
  let s = `<ellipse class="halo" cx="80" cy="118" rx="64" ry="6"/>`;
  s += organ([[16,108],[40,96],[96,92],[140,98],[156,110],[140,118],[30,118]], I("foot", "Snail foot and head"));
  s += line("M146 100L160 84M140 98L150 80", "hi") + `<circle class="dot" cx="160" cy="84" r="1.6"/><circle class="dot" cx="150" cy="80" r="1.6"/>`;
  s += organ([[18,92],[20,52],[48,22],[84,16],[114,30],[124,60],[112,90],[70,100]], I("shell", "Shell"));
  s += line(smooth([[70,60],[84,50],[96,60],[88,76],[68,76],[56,58],[66,40],[92,34],[110,52]]), "mid");
  s += organ([[54,48],[76,40],[94,52],[90,72],[66,76],[52,64]], I("gland", "Digestive gland, where the asexual stages develop"), );
  return { svg: s, pts: { enter: [140, 100], gland: [72, 58], exit: [118, 86], mantle: [110, 80] }, lines: {}, w: 160, h: 125 };
}

// ---------- Water body and soil ----------
export function water(id, o = {}) {
  const w = o.w || 400, h = o.h || 180;
  let waves = "";
  for (let y = 26, r = 0; y < h - 8; y += 22, r++) {
    let d = "";
    for (let x = (r % 2) * 22 + 10; x < w - 40; x += 88) d += `M${x} ${y}q11 -6 22 0t22 0t22 0`;
    waves += d;
  }
  const s = hot(`${id}-water`, pick(o, "water", "Fresh water"), "Fresh water", `<path class="water" style="opacity:${o.alpha ?? 1}" d="M0 14Q${w * .25} 6 ${w / 2} 14T${w} 14L${w} ${h - 10}Q${w} ${h} ${w - 10} ${h}L10 ${h}Q0 ${h} 0 ${h - 10}Z"/><path class="wave" d="${waves}"/><path class="wave top" d="M0 14Q${w * .25} 6 ${w / 2} 14T${w} 14"/>`);
  return { svg: s, pts: { surface: [w / 2, 14], mid: [w / 2, h / 2] }, lines: {}, w, h };
}
export function soil(id, o = {}) {
  const w = o.w || 300, h = o.h || 50;
  const grains = Array.from({ length: Math.round(w / 9) }, (_, i) => `<circle cx="${f((i * 37) % w)}" cy="${f(10 + ((i * 53) % (h - 16)))}" r="${f(1 + (i % 3) * 0.5)}"/>`).join("");
  return { svg: hot(`${id}-soil`, pick(o, "soil", "Soil"), "Soil", `<rect class="soil" x="0" y="0" width="${w}" height="${h}" rx="6"/><g class="grains">${grains}</g><path class="ln" data-tone="mid" d="M0 0L${w} 0"/>`), pts: {}, lines: {}, w, h };
}

// ---------- Copepod (Cyclops), schematic, magnified ----------
export function copepod(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "copepod-" + k });
  let s = organ([[40,30],[80,22],[110,40],[110,62],[84,78],[50,76],[34,56]], I("body", "Cyclops body (cephalothorax); the larva lives in the body cavity"));
  s += tube([[52,72],[46,90],[42,108],[40,124]], 7, I("abd", "Abdomen"));
  s += line("M40 124L32 138M40 124L48 138", "hi");
  s += line(smooth([[100,36],[120,20],[140,14]]), "hi") + line(smooth([[104,44],[126,34],[146,32]]), "hi");
  s += `<circle class="eye" cx="102" cy="48" r="3.4"/>`;
  s += organ(ellipsePts(30, 92, 9, 16, 10, 0.3), I("eggsac", "Egg sac")) + organ(ellipsePts(62, 98, 8, 15, 10, -0.3), I("eggsac2", "Egg sac"));
  s += line("M78 70L72 84M88 68L86 84M68 74L60 86", "mid");
  return { svg: s, pts: { mouth: [108, 56], gut: [80, 52], cavity: [62, 50] }, lines: {}, w: 150, h: 140 };
}

// ---------- Freshwater fish, side view facing right ----------
export function fish(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "fish-" + k });
  const body = [[30,70],[70,42],[140,30],[220,34],[280,52],[312,74],[284,96],[220,110],[140,112],[70,100]];
  let s = `<ellipse class="halo" cx="170" cy="132" rx="130" ry="7"/>`;
  s += organ([[30,70],[4,40],[12,70],[4,100]], I("tail", "Tail fin"));
  s += organ(body, I("body", "Fish body"));
  s += hot(`${id}-flesh`, pick(o, "flesh", "Flesh (body muscle)"), "Flesh", `<path class="og-base" d="${smooth([[80,58],[150,46],[220,50],[226,80],[150,86],[84,84]], true)}"/>${line("M100 54Q110 70 100 84M130 48Q140 66 130 86M160 47Q170 66 160 86M190 48Q200 66 190 84", "lo")}<path class="og-edge" data-tone="${tn(o, "flesh")}" d="${smooth([[80,58],[150,46],[220,50],[226,80],[150,86],[84,84]], true)}"/>`);
  s += tube([[260,92],[220,98],[160,100],[100,100],[70,96]], 4, I("gut", "Gut"));
  s += organ([[236,56],[250,70],[248,92],[236,100],[230,80]], I("gills", "Gills, under the operculum"));
  s += line("M240 62L246 70M238 70L246 78M238 78L246 86M238 86L244 94", "mid");
  s += line(smooth([[254,48],[262,74],[254,102]]), "hi");
  s += `<circle class="eye" cx="286" cy="64" r="4"/>`;
  s += line("M304 80L312 76", "hi");
  return { svg: s, pts: { mouth: [312, 78], gut: [200, 98], gut2: [140, 100], flesh: [150, 64], flesh2: [190, 70], gills: [240, 78] }, lines: {}, w: 320, h: 140 };
}

// ---------- Blood-feeding fly / mosquito, side view facing right ----------
export function fly(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "fly-" + k });
  const mosq = o.kind === "mosquito";
  let s = "";
  s += organ(mosq ? [[134,50],[96,30],[44,22],[34,28],[70,40],[110,52]] : [[134,50],[110,22],[60,14],[52,22],[92,40]], I("wing", "Wing"));
  s += organ(mosq ? [[14,62],[60,58],[112,62],[114,78],[60,80],[16,72]] : [[40,66],[80,54],[112,62],[112,82],[80,92],[44,86]], I("abd", "Abdomen; the midgut runs through it"));
  s += line(mosq ? "M30 60L30 76M46 59L46 78M62 58L62 80M78 59L78 80M94 60L94 79" : "M60 58L60 90M80 55L80 92M98 58L98 88", "lo");
  s += organ([[108,54],[132,40],[156,48],[160,72],[136,86],[110,80]], I("thorax", "Thorax and flight muscles"));
  s += organ(ellipsePts(172, 68, 12, 11, 12), I("head", "Head"));
  s += tube(mosq ? [[182,74],[206,86],[232,98]] : [[182,74],[192,84]], mosq ? 2.2 : 4, I("mouth", "Mouthparts (proboscis)"));
  s += tube([[172,70],[150,66],[112,70],[70,70],[24,68]], 2.6, { ...I("midgut", "Midgut"), body: "gutline" });
  s += line(mosq ? "M124 82L96 112L70 136M138 84L132 116L118 140M150 80L176 112L200 136" : "M120 84L104 120L96 136M136 86L134 124L126 140M150 80L164 118L176 136", "hi");
  s += line(mosq ? "M180 60L206 40L222 34M178 58L196 38L206 26" : "M184 58L204 40M182 56L196 36", "hi");
  return { svg: s, pts: mosq ? { tip: [232, 98], head: [174, 68], thorax: [136, 64], midgut: [90, 71] } : { tip: [192, 86], head: [174, 68], thorax: [136, 64], midgut: [90, 74] }, lines: {}, w: 240, h: 140 };
}


// ---------- Generic mammal, side view facing right (cattle, pig, sheep, dog, rat: schematic) ----------
export function quad(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "quad-" + k });
  const sil = [[40,96],[70,80],[140,72],[230,74],[300,70],[332,58],[354,38],[376,22],[402,20],[426,34],[442,58],[438,76],[416,86],[392,84],[372,96],[358,116],[350,150],[334,178],[306,186],[306,262],[282,264],[280,192],[160,194],[118,190],[112,262],[88,264],[80,186],[56,170],[40,140]];
  let s = `<ellipse class="halo" cx="200" cy="268" rx="150" ry="7"/>`;
  s += `<path class="body" d="M292 186L296 258L310 258L314 186Z"/><path class="body" d="M94 186L98 258L112 258L116 186Z"/>` + line("M292 186L296 258L310 258L314 186M94 186L98 258L112 258L116 186", "lo");
  s += hot(`${id}-body`, pick(o, "skin", o.kindLabel || "Mammal"), o.kindLabel || "Mammal", `<path class="body" d="${smooth(sil, true, 0.35)}"/><path class="ln body-edge" d="${smooth(sil, true, 0.35)}"/>`);
  s += line("M44 98C30 120 24 140 22 160", "mid") + line("M384 24L392 6L398 22", "mid");
  s += `<circle class="eye" cx="406" cy="40" r="3"/>`;
  s += line("M300 74L304 182", "lo");
  s += organ([[318,84],[346,80],[356,104],[350,132],[330,138],[316,120]], I("lung", "Lungs"));
  s += organ([[318,140],[336,136],[346,150],[340,168],[326,172],[316,158]], I("heart", "Heart"));
  s += tube([[326,140],[330,124],[334,108]], 3, I("pa", "Pulmonary artery"));
  s += organ([[278,112],[298,104],[300,150],[292,170],[276,160],[270,132]], I("liver", "Liver"));
  s += organ([[196,88],[216,86],[224,98],[214,108],[198,106]], I("kidney", "Kidney"));
  s += tube([[428,74],[400,80],[364,100],[330,124],[300,132],[276,140]], 4, I("eso", "Oesophagus"));
  s += organ([[214,118],[262,112],[280,140],[268,168],[226,172],[206,148]], I("stomach", "Stomach"));
  s += tube([[214,160],[219,152],[215,157],[210,161],[202,164],[194,164],[187,162],[180,158],[176,153],[175,148],[175,144],[178,141],[181,140],[184,142],[186,145],[185,150],[183,155],[178,160],[171,163],[163,164],[155,163],[148,160],[143,155],[141,150],[140,145],[142,142],[145,140],[148,141],[151,144],[151,148],[150,153],[146,158],[139,162],[132,164],[124,164],[116,161],[111,157],[107,152],[104,138],[90,124],[70,112],[46,104]], 6, I("gut", "Intestine"));
  s += hot(`${id}-muscle`, pick(o, "muscle", "Skeletal muscle (hind limb)"), "Skeletal muscle", `<path class="og-base" d="M80 150L118 150L117 196L82 196Z"/>${line("M87 154L88 192M95 154L95 192M103 154L103 192M111 154L110 192", "lo")}<path class="og-edge" data-tone="${tn(o, "muscle")}" d="M80 150L118 150L117 196L82 196Z"/>`);
  s += organ(ellipsePts(400, 34, 10, 8, 10), I("brain", "Brain"));
  return { svg: s, pts: { mouth: [436, 72], eso: [364, 100], stomach: [244, 140], si: [180, 150], si2: [140, 156], anus: [44, 104], out: [30, 112], liver: [286, 136], lung: [334, 104], heart: [330, 156], rheart: [322, 156], pa: [332, 116], kidney: [210, 98], muscle: [99, 172], brain: [400, 34], skin: [200, 76], skin2: [340, 120], vessel: [250, 186] },
    lines: { gut: [] }, w: 450, h: 270 };
}

// ---------- Freshwater crab, top view ----------
export function crab(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "crab-" + k });
  let s = `<ellipse class="halo" cx="100" cy="128" rx="80" ry="6"/>`;
  s += line("M52 76L18 62L8 80M50 90L14 92L6 110M56 102L26 118L22 136M148 76L182 62L192 80M150 90L186 92L194 110M144 102L174 118L178 136", "hi");
  s += organ([[60,40],[40,30],[30,14],[50,6],[66,22],[70,36]], I("claw", "Claw")) + organ([[140,40],[160,30],[170,14],[150,6],[134,22],[130,36]], I("claw2", "Claw"));
  s += organ([[40,70],[60,40],[100,30],[140,40],[160,70],[146,104],[100,114],[54,104]], I("carapace", "Carapace"));
  s += organ([[54,64],[70,56],[76,88],[60,96],[50,82]], I("gills", "Gills")) + organ([[146,64],[130,56],[124,88],[140,96],[150,82]], I("gills2", "Gills"));
  s += organ([[88,60],[112,60],[118,84],[100,96],[82,84]], I("muscle", "Muscle and viscera"));
  s += line("M90 34L86 20M110 34L114 20", "hi") + `<circle class="eye" cx="86" cy="20" r="2.4"/><circle class="eye" cx="114" cy="20" r="2.4"/>`;
  return { svg: s, pts: { gills: [62, 76], gills2: [138, 76], muscle: [100, 76], mouth: [100, 34] }, lines: {}, w: 200, h: 140 };
}

// ---------- Plants: watercress-like vegetation, or water chestnut ----------
export function plant(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "plant-" + k });
  let s = "";
  if (o.kind === "chestnut") {
    s += line("M70 60L70 120M70 60L40 30M70 60L100 30", "mid");
    s += organ([[20,52],[50,40],[70,56],[44,66]], I("leaf", "Floating leaves")) + organ([[120,52],[90,40],[70,56],[96,66]], I("leaf2", "Floating leaves")) + organ([[46,28],[70,14],[94,28],[70,40]], I("leaf3", "Floating leaves"));
    s += organ([[50,122],[70,110],[90,122],[100,116],[90,140],[70,148],[50,140],[40,116]], I("nut", "Water chestnut (the nut)"));
    return { svg: s, pts: { leaf: [44, 54], nut: [70, 128], stem: [70, 90] }, lines: {}, w: 140, h: 150 };
  }
  s += line("M60 150L60 60M60 110L30 70M60 100L92 56M60 130L94 100", "mid");
  s += organ([[16,64],[30,48],[46,60],[30,78]], I("leaf", "Leaves")) + organ([[80,48],[96,36],[112,52],[94,66]], I("leaf2", "Leaves")) + organ([[46,44],[60,26],[76,44],[60,58]], I("leaf3", "Leaves")) + organ([[84,96],[100,86],[114,100],[96,112]], I("leaf4", "Leaves"));
  return { svg: s, pts: { leaf: [30, 62], leaf2: [96, 50], leaf3: [60, 42], stem: [60, 140] }, lines: {}, w: 120, h: 150 };
}

// ---------- Tadpole and frog ----------
export function tadpole(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "tad-" + k });
  let s = organ([[10,46],[40,30],[90,40],[100,46],[90,52],[40,62]], I("tail", "Tail"));
  s += organ([[88,44],[110,22],[150,18],[176,36],[176,58],[150,74],[110,70]], I("body", "Tadpole body"));
  s += organ([[124,32],[136,24],[142,40],[130,46]], I("gills", "Gills"));
  s += line("M126 30L120 22M132 28L130 18M138 30L142 22", "hi") + `<circle class="eye" cx="160" cy="36" r="3.4"/>`;
  return { svg: s, pts: { gills: [132, 36], body: [140, 52], tail: [50, 46] }, lines: {}, w: 180, h: 80 };
}
export function frog(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "frog-" + k });
  let s = `<ellipse class="halo" cx="110" cy="166" rx="90" ry="6"/>`;
  s += organ([[56,146],[110,138],[156,148],[158,160],[100,162],[50,160]], I("foot", "Hind foot"));
  s += organ([[30,116],[66,94],[108,110],[100,142],[60,150],[28,140]], I("leg", "Hind leg"));
  s += organ([[40,120],[50,86],[90,62],[140,50],[180,52],[204,68],[210,86],[196,100],[170,108],[140,124],[100,136],[60,138]], I("body", "Frog body"));
  s += organ(ellipsePts(172, 50, 11, 9, 10), I("eye", "Eye"));
  s += `<circle class="eye" cx="174" cy="49" r="4"/>`;
  s += line("M208 86C192 94 176 94 160 88", "hi") + line("M168 104L176 146L190 158M176 146L166 160", "hi");
  s += tube([[196,90],[160,96],[120,100],[90,106],[62,110],[36,114]], 4, { ...I("gut", "Gut"), body: "gutline" });
  s += organ([[52,96],[68,92],[74,104],[64,114],[50,110]], I("bladder", "Urinary bladder"));
  s += organ(ellipsePts(34, 116, 5, 5, 8), I("cloaca", "Cloaca"));
  return { svg: s, pts: { mouth: [206, 88], gut: [130, 98], cloaca: [34, 116], bladder: [62, 104], skin: [120, 60] }, lines: {}, w: 215, h: 170 };
}

// ---------- Insect (cricket or beetle), side view facing right ----------
export function insect(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "insect-" + k });
  const beetle = o.kind === "beetle";
  let s = `<ellipse class="halo" cx="120" cy="114" rx="96" ry="6"/>`;
  s += line(beetle ? "M90 80L80 104L70 112M120 84L120 106L110 114M150 80L164 104L174 112" : "M60 78L30 50L20 108M110 84L104 108L94 114M150 80L164 104L174 112", "hi");
  s += organ(beetle ? [[30,62],[60,34],[120,28],[160,40],[166,70],[150,86],[60,88],[34,80]] : [[16,64],[40,48],[120,44],[150,52],[152,76],[120,86],[40,84],[20,76]], I("abd", beetle ? "Abdomen under the wing cases; the haemocoel" : "Abdomen; the haemocoel"));
  if (beetle) s += line("M40 60C80 40 130 38 160 52M100 32L104 86", "mid");
  s += organ([[150,48],[180,42],[194,58],[186,80],[156,82]], I("thorax", "Thorax"));
  s += organ(ellipsePts(204, 62, 14, 13, 12), I("head", "Head"));
  s += tube([[214,68],[180,64],[140,66],[90,68],[40,68],[22,68]], 3, { ...I("gut", "Gut"), body: "gutline" });
  s += line(beetle ? "M212 54L228 40L236 42" : "M212 52L240 20L250 8M210 50L232 30L246 26", "hi") + `<circle class="eye" cx="208" cy="58" r="2.6"/>`;
  return { svg: s, pts: { mouth: [218, 72], gut: [140, 66], haemo: [90, 56], haemo2: [60, 70], anus: [20, 68] }, lines: {}, w: 250, h: 120 };
}

// ---------- Aquatic annelid ----------
export function annelid(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "ann-" + k });
  const pts = [[10, 30], [40, 18], [80, 30], [120, 42], [160, 30], [200, 22], [216, 24]];
  let s = tube(pts, 14, I("body", o.label || "Aquatic annelid"));
  s += line("M30 14L32 30M50 16L50 34M70 24L68 40M90 30L88 46M110 36L110 52M130 36L132 52M150 28L152 44M170 20L172 38M190 18L190 34", "lo");
  return { svg: s, pts: { mouth: [214, 24], body: [120, 40], vessel: [100, 36] }, lines: {}, w: 225, h: 60 };
}

// ---------- Gill arch close-up ----------
export function gill(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "gill-" + k });
  let s = tube([[20, 150], [60, 90], [120, 60], [180, 70]], 10, I("arch", "Gill arch"));
  let f = "";
  for (let i = 0; i < 9; i++) { const t = i / 8; const x = 30 + t * 150, y = 140 - Math.sin(t * Math.PI * 0.9) * 70 - t * 10; f += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x - 18).toFixed(1)} ${(y - 52).toFixed(1)}`; }
  s += hot(`${id}-fil`, pick(o, "fil", "Gill filaments"), "Gill filaments", `<path class="tb-out" data-tone="hi" d="${f}" stroke-width="9"/><path class="tb-in" d="${f}" stroke-width="7.4"/>`);
  return { svg: s, pts: { f1: [52, 56], f2: [90, 34], f3: [130, 22], arch: [100, 72] }, lines: {}, w: 200, h: 160 };
}

// ---------- Rodent (rat; rabbit variant), side view facing right ----------
export function rodent(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "rodent-" + k });
  const rab = o.kind === "rabbit";
  const sil = rab
    ? [[130,124],[146,92],[196,70],[270,62],[340,66],[392,80],[428,96],[460,104],[492,114],[506,128],[494,138],[466,142],[438,150],[410,164],[380,172],[300,176],[220,174],[166,166],[136,150]]
    : [[130,128],[150,98],[200,78],[270,70],[340,72],[390,82],[430,96],[462,110],[496,122],[512,130],[500,138],[470,142],[440,148],[410,160],[380,168],[300,172],[220,170],[170,162],[138,148]];
  let s = `<ellipse class="halo" cx="320" cy="200" rx="170" ry="6"/>`;
  const legs = rab ? "M396 162L392 194L412 196L414 164M176 160L150 192L204 196L212 164" : "M400 160L398 192L414 194L414 162M190 160L182 194L200 196L206 162";
  s += `<path class="body" d="${legs}"/>` + line(legs, "lo");
  s += hot(`${id}-tail`, pick(o, "tail", "Tail"), "Tail", rab ? `<circle class="body" cx="128" cy="128" r="14"/>${line("M128 114A14 14 0 1 0 128.1 114", "lo")}` : `<path class="tb-out" data-tone="lo" d="${smooth([[134,134],[96,152],[56,154],[24,140],[8,118]])}" stroke-width="6.4"/><path class="tb-in" d="${smooth([[134,134],[96,152],[56,154],[24,140],[8,118]])}" stroke-width="5"/>`);
  s += hot(`${id}-body`, pick(o, "skin", o.kindLabel || "Rat"), o.kindLabel || "Rat", `<path class="body" d="${smooth(sil, true, 0.35)}"/><path class="ln body-edge" d="${smooth(sil, true, 0.35)}"/>`);
  const ear = rab ? [[418,96],[400,30],[414,22],[436,92]] : [[430,94],[434,66],[452,66],[456,96]];
  s += `<path class="body" d="${smooth(ear, true)}"/>` + line(smooth(ear, true), "mid");
  if (rab) s += `<path class="body" d="${smooth([[432,98],[430,34],[446,30],[448,98]], true)}"/>` + line(smooth([[432,98],[430,34],[446,30],[448,98]], true), "mid");
  s += `<circle class="eye" cx="${rab ? 470 : 478}" cy="${rab ? 110 : 112}" r="3"/>` + line(rab ? "M498 128L520 122M498 130L520 134" : "M504 128L528 120M504 130L528 132M502 132L524 142", "lo");
  s += organ([[418,106],[442,102],[452,120],[440,134],[420,130]], I("lung", "Lungs"));
  s += organ(ellipsePts(432, 142, 9, 8, 10), I("heart", "Heart"));
  s += tube([[432,136],[410,104],[360,90],[290,86],[220,90],[160,112]], 3.2, { ...I("blood", "Blood vessels"), body: "vein" });
  s += organ([[384,118],[408,116],[414,146],[396,160],[378,144]], I("liver", "Liver"));
  s += organ([[338,116],[372,114],[378,138],[362,154],[336,146]], I("stomach", "Stomach"));
  s += hot(`${id}-visc`, pick(o, "visc", "Capillaries of the viscera"), "Visceral capillaries", `${organ([[286,98],[312,96],[318,108],[306,118],[288,114]], { ...I("kidney", "Kidney") }).replace(/ class="hot[^"]*"/, ' class=""')}${line("M290 104L280 112M300 100L298 90M312 108L326 112M304 116L308 126M286 112L276 120", "lo")}`);
  s += tube([[338,150],[312,154],[300,140],[280,152],[260,140],[240,154],[220,142],[200,154],[180,140],[152,136],[134,132]], 5, I("gut", "Intestine"));
  s += organ(ellipsePts(472, 102, 10, 7, 10), I("brain", "Brain"));
  return { svg: s, pts: { mouth: [510, 130], eso: [470, 128], stomach: [358, 134], gut: [260, 146], anus: [134, 132], heart: [432, 142], vessel: [360, 90], vessel2: [250, 87], visc: [302, 106], liver: [396, 140], skin: [300, 72], skin2: [420, 98], fur: [230, 74] }, lines: {}, w: 530, h: 205 };
}

// ---------- Flea, side view facing right, magnified: tall, flattened side to side, big hind legs ----------
export function flea(id, o = {}) {
  const I = (k, d) => ({ id: `${id}-${k}`, label: d, info: pick(o, k, d), tone: tn(o, k), c: "flea-" + k });
  const leg = (pts, w) => `<path class="tb-out" data-tone="hi" d="${smooth(pts)}" stroke-width="${w + 1.6}"/><path class="tb-in" d="${smooth(pts)}" stroke-width="${w}"/>`;
  let s = `<ellipse class="halo" cx="112" cy="176" rx="90" ry="5"/>`;
  s += leg([[176,112],[186,144],[208,156]], 3) + leg([[134,128],[138,158],[160,170]], 3.4) + leg([[86,122],[58,146],[102,154],[70,176]], 5);
  s += organ([[36,100],[40,64],[70,36],[118,26],[160,34],[186,56],[194,84],[186,110],[160,128],[110,136],[60,130]], I("abd", "Body: thorax and abdomen, flattened side to side"));
  s += line("M68 40Q56 86 66 128M98 30Q88 84 98 136M128 28Q120 82 130 134M158 34Q150 82 160 126", "lo");
  s += organ([[184,56],[206,62],[216,86],[204,104],[188,100]], I("head", "Head"));
  s += line("M200 64L216 50", "hi") + `<circle class="eye" cx="198" cy="72" r="2.6"/>`;
  s += tube([[206,98],[212,118],[214,138]], 2.4, I("mouth", "Mouthparts"));
  s += tube([[204,88],[182,84],[150,84]], 3, { ...I("eso", "Oesophagus"), body: "gutline" });
  s += organ([[92,72],[134,64],[156,84],[140,104],[98,102]], I("midgut", "Midgut (stomach)"));
  s += tube([[94,90],[66,94],[46,100],[36,104]], 4, { ...I("hindgut", "Hindgut (rectum)"), body: "gutline" });
  return { svg: s, pts: { tip: [214, 138], head: [196, 84], eso: [170, 84], midgut: [124, 86], cells: [112, 74], hindgut: [60, 95], anus: [34, 104], out: [10, 118] }, lines: {}, w: 225, h: 182 };
}

export const ACTORS = { rodent, flea, human, snail, water, soil, copepod, fish, fly, quad, crab, plant, tadpole, frog, insect, annelid, gill };
