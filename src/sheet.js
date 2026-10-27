// Renders the printable cheat sheet: one A4 page in landscape with the
// entries the map places on the sheet, chapter by chapter, and every
// special character. Takes the parsed shortcut map, returns HTML.

import { escapeHtml, keyCaps } from "./markup.js";

/** The rows of the sheet, grouped by chapter in the order the map gives. */
export function sheetChapters(data) {
  return data.sheet_chapters.map((title) => ({
    title,
    rows: data.entries
      .flatMap((entry) =>
        (entry.sheet ?? [])
          .filter((place) => place.chapter === title)
          .map((place) => ({
            id: entry.id,
            position: place.position,
            label: place.label,
            keys: place.keys ?? entry.keys,
          })),
      )
      .sort((a, b) => a.position - b.position),
  }));
}

// A character's keys always show as caps, single keys included; the word
// "key" in "^ key" or "⇧ - key" only says that the character is on a key
// of its own.
function characterKeys(keys) {
  return `<kbd>${escapeHtml(String(keys).replace(/\s+key$/, ""))}</kbd>`;
}

const CSS = `@page{size:A4 landscape;margin:9mm}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#111;font:8.8pt/1.25 -apple-system,"Helvetica Neue",Arial,sans-serif}
.sheet{width:279mm}
header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid #111;padding-bottom:3px;margin-bottom:6px}
h1{font-size:15pt;margin:0}
header span{font-size:9pt;color:#444}
.cols{display:grid;grid-template-columns:3fr 1fr;column-gap:16px}
.shortcuts{column-count:3;column-gap:16px}
section{break-inside:avoid;margin:0 0 9px}
h2{font-size:9.4pt;text-transform:uppercase;letter-spacing:.05em;margin:0 0 2px;color:#2f5d9e}
.row{display:grid;grid-template-columns:40% 60%;align-items:center;min-height:15px;padding:1.4px 0;border-bottom:.5px solid #ddd}
.row .label{color:#555}
.char-row{display:grid;grid-template-columns:1.7em 40% 1fr;align-items:center;min-height:15px;padding:1.4px 0;border-bottom:.5px solid #ddd}
.char-row .char{font:600 11.5pt ui-monospace,Menlo,monospace}
.char-row .name{color:#555}
kbd{font:500 8.6pt ui-monospace,Menlo,monospace;white-space:nowrap;border:.6px solid #999;border-bottom-width:1.2px;border-radius:3px;padding:0 3px;background:#f3f3f3}
.words{font-weight:600;color:#111}`;

/** Renders the cheat sheet of a parsed shortcut map as HTML. */
export function renderSheet(data, title = "Mac shortcuts") {
  const chapters = sheetChapters(data)
    .filter((c) => c.rows.length)
    .map(
      (c) =>
        `<section><h2>${escapeHtml(c.title)}</h2>${c.rows
          .map(
            (r) =>
              `<div class="row" data-row="${escapeHtml(`${c.title} ${r.position}: ${r.label}`)}"><span class="keys">${keyCaps(r.keys)}</span><span class="label">${escapeHtml(r.label)}</span></div>`,
          )
          .join("")}</section>`,
    )
    .join("");
  const characters = data.characters
    .map(
      (c) =>
        `<div class="char-row" data-row="${escapeHtml(`Characters: ${c.char}`)}"><span class="char">${escapeHtml(c.char)}</span><span class="keys">${characterKeys(c.keys)}</span><span class="label name">${escapeHtml(c.name)}</span></div>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="sheet">
<header><h1>${escapeHtml(title)}</h1><span>⌃ Control · ⌥ Option · ⇧ Shift · ⌘ Command</span></header>
<div class="cols"><div class="shortcuts">${chapters}</div><div><section><h2>Characters</h2>${characters}</section></div></div>
</div>
</body>
</html>
`;
}
