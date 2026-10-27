import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { printPage } from "../src/print.js";
import { parseShortcuts } from "../src/shortcuts.js";
import { renderSheet } from "../src/sheet.js";

const data = parseShortcuts(
  readFileSync(new URL("../examples/shortcuts.yaml", import.meta.url), "utf8"),
);

describe("printPage", () => {
  it("prints the example sheet to one page without problems", async () => {
    const printed = await printPage(renderSheet(data));
    assert.equal(printed.pages, 1);
    assert.deepEqual(printed.problems, []);
    assert.equal(printed.pdf.subarray(0, 5).toString(), "%PDF-");
  });
  it("names a row that wraps and a key cap that is cut off", async () => {
    const html = `<!doctype html><style>[data-row]{display:grid;grid-template-columns:40px 80px}kbd{white-space:nowrap}</style>
<div data-row="narrow"><span><kbd>⌃⌥⌘ Return Return</kbd></span><span>a description far too long for its column</span></div>`;
    const printed = await printPage(html);
    assert.deepEqual(printed.problems, [
      "narrow: key cap ⌃⌥⌘ Return Return is cut off",
      "narrow: wraps onto a second line",
    ]);
  });
});
