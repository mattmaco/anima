// Reports adults and stage drawings larger than the size caps.
import { pathToFileURL } from "node:url";
const here = new URL(".", import.meta.url).pathname;
const { CYCLES } = await import(pathToFileURL(process.env.ROUTES_DATA || here + "../../local/routes/data/index.mjs").href);
const big = ["worm","tape","fluke","pair","acanth","hydatid","diplo","mono","polystoma","coil","larva","mf"];
for (const cy of CYCLES) {
  const out = [];
  cy.stages.forEach((st, i) => { for (const m of st.moves) { const f = m.form2 && m.at < 1 ? m.form2 : m.form; if (big.includes(f) && Math.max(...m.size) * 1.45 > 34) out.push(`${i+1}:${f} ${Math.round(Math.max(...m.size)*1.45)}px`); }
    const g = st.glyph; if (g && g.s > 70) out.push(`glyph ${g.form} ${g.s}px`); });
  console.log(cy.file.padEnd(28), out.join(" · "));
}
