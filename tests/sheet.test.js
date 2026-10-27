import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseShortcuts } from "../src/shortcuts.js";
import { renderSheet, sheetChapters } from "../src/sheet.js";

const data = parseShortcuts(
  readFileSync(new URL("../examples/shortcuts.yaml", import.meta.url), "utf8"),
);

describe("sheetChapters", () => {
  it("keeps the chapter order of the map and the positions in them", () => {
    const chapters = sheetChapters(data);
    assert.deepEqual(
      chapters.map((c) => c.title),
      ["Windows", "Mouse"],
    );
    assert.deepEqual(
      chapters[0].rows.map((r) => r.label),
      ["Left half", "Again: ½ → ¼"],
    );
  });
  it("shows an entry once per place, with the place's keys if given", () => {
    const mouse = sheetChapters(data)[1].rows;
    assert.deepEqual(
      mouse.map((r) => [r.id, r.keys]),
      [
        ["R4", "Green button"],
        ["R4", "⌥ Green button"],
      ],
    );
    assert.equal(sheetChapters(data)[0].rows[0].keys, "⌃⌥ ←");
  });
});

describe("renderSheet", () => {
  const html = renderSheet(data);
  it("is an A4 landscape page with the title and the modifier legend", () => {
    assert.match(html, /@page\{size:A4 landscape;margin:9mm\}/);
    assert.ok(html.includes("<h1>Mac shortcuts</h1>"));
    assert.ok(html.includes("⌃ Control · ⌥ Option · ⇧ Shift · ⌘ Command"));
  });
  it("shows keys as key caps and triggers in words as text", () => {
    assert.ok(html.includes("<kbd>⌃⌥ ←</kbd>"));
    assert.ok(
      html.includes('<kbd>⌥</kbd> <span class="words">Green button</span>'),
    );
  });
  it("shows every character with its keys as a key cap", () => {
    for (const c of data.characters) {
      assert.ok(html.includes(`data-row="Characters: ${c.char}"`), c.char);
    }
    assert.ok(html.includes("<kbd>^</kbd>"));
    assert.ok(html.includes("<kbd>⇧ -</kbd>"));
  });
});
