const path = require('path');
const OUT = process.env.ROUTES_OUT || path.join(__dirname, '../../local/routes/out') + '/';
const SHOTS = process.env.ROUTES_SHOTS || path.join(__dirname, '../../local/routes/shots');
require('fs').mkdirSync(SHOTS, { recursive: true });
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const tag = process.argv[2];
 for (const f of ['04-schistosoma-route','04-schistosoma-route-light','22-hookworms-route','11-taenia-route-light','09b-polystoma-route']) {
  const p = await b.newPage({ viewport: { width: 900, height: 900 } }); await p.goto('file://' + OUT + '' + f + '.html');
  await p.evaluate(() => { __rt.setPlaying(false); __rt.show(3, 0.5); }); await p.waitForTimeout(100);
  fs.writeFileSync(SHOTS + `/pix-${tag}-${f}.png`, await p.locator('main').screenshot()); await p.close(); }
 await b.close(); })();
