const path = require('path');
const OUT = process.env.ROUTES_OUT || path.join(__dirname, '../../local/routes/out') + '/';
const SHOTS = process.env.ROUTES_SHOTS || path.join(__dirname, '../../local/routes/shots');
require('fs').mkdirSync(SHOTS, { recursive: true });
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const files = process.argv.slice(2);
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 900, height: 900 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto('file://' + OUT + '' + f + '.html'); await p.waitForTimeout(300);
    const n = await p.evaluate(() => window.CYCLE.stages.length);
    for (const i of [0, 2, 3, 4]) { if (i >= n) continue;
      await p.evaluate(([i]) => { window.__rt.setPlaying(false); window.__rt.show(i, 0.6); }, [i]);
      await p.locator('.iso-plate').screenshot({ path: SHOTS + `/${f}-${i}.png` }); }
    console.log(f, errs.join(' | ') || 'ok'); await p.close();
  } await b.close(); })();
