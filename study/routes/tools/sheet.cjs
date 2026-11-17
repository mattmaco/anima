const path = require('path');
const OUT = process.env.ROUTES_OUT || path.join(__dirname, '../../local/routes/out') + '/';
const SHOTS = process.env.ROUTES_SHOTS || path.join(__dirname, '../../local/routes/shots');
require('fs').mkdirSync(SHOTS, { recursive: true });
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const files = process.argv.slice(3); const out = process.argv[2];
 const imgs = [];
 for (const f of files) { const p = await b.newPage({ viewport: { width: 900, height: 900 } }); const errs=[]; p.on('pageerror', e => errs.push(e.message));
   await p.goto('file://' + OUT + '' + f + '.html'); await p.waitForTimeout(150);
   await p.evaluate(() => { __rt.setPlaying(false); __rt.show(2, 0.55); });
   const buf = await p.locator('.iso-plate').screenshot(); imgs.push([f, buf.toString('base64')]); if (errs.length) console.log(f, errs); await p.close(); }
 const html = `<body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(3,1fr);gap:4px">${imgs.map(([f,d])=>`<div style="position:relative"><img style="width:100%;display:block" src="data:image/png;base64,${d}"><span style="position:absolute;top:0;left:0;background:#ff0;font:bold 20px sans-serif">${f}</span></div>`).join('')}</body>`;
 const p = await b.newPage({ viewport: { width: 2100, height: 800 } }); await p.setContent(html); await p.screenshot({ path: out, fullPage: true }); await b.close(); })();
