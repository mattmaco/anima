// Escape text for HTML or SVG markup written at build time (text content and quoted attributes).
export const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
