const path = require('path');
const OUT = process.env.ROUTES_OUT || path.join(__dirname, '../../local/routes/out') + '/';
const SHOTS = process.env.ROUTES_SHOTS || path.join(__dirname, '../../local/routes/shots');
require('fs').mkdirSync(SHOTS, { recursive: true });
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const files = process.argv.slice(2);
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
    await p.goto('file://' + OUT + '' + f + '.html'); await p.waitForTimeout(200);
    const res = await p.evaluate(() => {
      const svg = document.querySelector('.rt-fig'); const m = svg.getScreenCTM().inverse();
      const bb = (el) => { const r = el.getBoundingClientRect(); const a = new DOMPoint(r.left, r.top).matrixTransform(m), c = new DOMPoint(r.right, r.bottom).matrixTransform(m); return { x0: a.x, y0: a.y, x1: c.x, y1: c.y }; };
      const texts = [...svg.querySelectorAll('.cap text.ct, .lab, .box .gl, .bdgn')].map((el) => ({ el, n: (el.textContent || '').slice(0, 28), b: bb(el) }));
      const glyphs = [...svg.querySelectorAll('.glyph, .ic-inf, .ic-dx')].map((el) => ({ n: 'glyph:' + el.getAttribute('class'), b: bb(el) }));
      const lines = [...svg.querySelectorAll('.arw, .trk, .leader')].map((el) => { const L = el.getTotalLength(); const pts = []; for (let i = 0; i <= L; i += 3) { const q = el.getPointAtLength(i); pts.push([q.x, q.y]); } return { n: el.getAttribute('class'), pts }; });
      const insets = [...svg.querySelectorAll('.inset-rim')].map((c) => [+c.getAttribute('cx'), +c.getAttribute('cy'), +c.getAttribute('r')]);
      const ov = (a, c, pad = 2) => a.x0 - pad < c.x1 && c.x0 - pad < a.x1 && a.y0 - pad < c.y1 && c.y0 - pad < a.y1;
      const out = [];
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        if (t.el.classList.contains('bdgn')) continue;
        for (let j = i + 1; j < texts.length; j++) if (!texts[j].el.classList.contains('bdgn') && ov(t.b, texts[j].b)) out.push(`TEXT×TEXT "${t.n}" / "${texts[j].n}"`);
        for (const g of glyphs) if (ov(t.b, g.b, 0)) out.push(`TEXT×${g.n} "${t.n}"`);
        for (const l of lines) { if (l.n === 'leader') continue; const hit = l.pts.filter(([x, y]) => x > t.b.x0 - 2 && x < t.b.x1 + 2 && y > t.b.y0 - 2 && y < t.b.y1 + 2).length; if (hit > 1) out.push(`TEXT×${l.n.split(' ')[0]}${l.n.includes('trk') ? '' : ''} "${t.n}" (${hit})`); }
        for (const [cx, cy, r] of insets) { const nx = Math.max(t.b.x0, Math.min(cx, t.b.x1)), ny = Math.max(t.b.y0, Math.min(cy, t.b.y1)); if (Math.hypot(nx - cx, ny - cy) < r) out.push(`TEXT×inset "${t.n}"`); }
        if (t.n && (t.b.x0 < 0 || t.b.x1 > 1000 || t.b.y1 > 700)) out.push(`TEXT off-plate "${t.n}"`);
      }
      return [...new Set(out)];
    });
    console.log('== ' + f + '\n' + (res.join('\n') || 'clean')); await p.close();
  } await b.close(); })();
