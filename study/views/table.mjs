// Rows of computed values, for checks that are read rather than plotted (expected vs observed, two ratios).
// Spec: table: { columns: [{ key, label, short? }], rows: [{ key, label, short? }] }; `short` labels are used in the narrow layout.
// Model returns { cells: { <row key>: { <column key>: string | { text, flag: true } } } }; a flagged cell is drawn in red ink after a ✗.
import { esc } from "../esc.mjs";

const HEAD = 34, ROW = 26, PAD = 14;

export const tableHeight = (spec) => HEAD + ROW * spec.table.rows.length + PAD;

export const table = {
  name: "table",
  frame(spec, box) {
    const t = spec.table;
    const narrow = box.w < 500;
    const name = (item) => (narrow && item.short) || item.label;
    const x0 = box.x + 8, x1 = box.x + box.w - 8;
    const split = x0 + (x1 - x0) * (narrow ? 0.28 : 0.42);
    const colW = (x1 - split) / t.columns.length;
    const right = (i) => split + colW * (i + 1) - 6;
    const head = box.y + 20;
    const note = (key, text) => `tabindex="0" data-note="${esc(spec.notes?.[key] ?? text)}"`;
    const cols = t.columns.map((c, i) => `<text id="col-${c.key}" class="study-axis-label" x="${right(i)}" y="${head}" text-anchor="end" ${note(c.key, name(c))}>${esc(name(c))}</text>`).join("");
    const rows = t.rows.map((r, j) => {
      const y = box.y + HEAD + ROW * j + 17;
      const cells = t.columns.map((c, i) => `<text id="cell-${r.key}-${c.key}" class="study-cell" x="${right(i)}" y="${y}" text-anchor="end"></text>`).join("");
      return `<line class="study-grid" x1="${x0}" x2="${x1}" y1="${y + 9}" y2="${y + 9}"/><text id="row-${r.key}" class="study-label study-row" x="${x0}" y="${y}" ${note(r.key, name(r))}>${esc(name(r))}</text>${cells}`;
    }).join("");
    return `<g class="study-table">${cols}<line class="study-axis" x1="${x0}" x2="${x1}" y1="${head + 9}" y2="${head + 9}"/>${rows}</g>`;
  },
  render: (svg, data, params, box, ctx) => {
    const t = ctx.spec.table;
    for (const r of t.rows) for (const c of t.columns) {
      const cell = data.cells?.[r.key]?.[c.key];
      const flag = !!(cell && typeof cell === "object" && cell.flag);
      const text = cell && typeof cell === "object" ? cell.text : cell;
      const el = svg.getElementById(`cell-${r.key}-${c.key}`);
      el.textContent = `${flag ? "✗ " : ""}${text ?? ""}`;
      el.classList.toggle("study-flag", flag);
    }
  },
};
