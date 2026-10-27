import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildKeyMap } from "../src/key-map.js";
import { escapeHtml, keyCaps } from "../src/markup.js";
import { renderOverview } from "../src/overview.js";
import { parseShortcuts } from "../src/shortcuts.js";

const data = parseShortcuts(
  readFileSync(new URL("../examples/shortcuts.yaml", import.meta.url), "utf8"),
);
const page = renderOverview(data);

describe("renderOverview", () => {
  it("is one self-contained HTML document", () => {
    assert.match(page, /^<!doctype html>/);
    assert.doesNotMatch(page, /<(script|link)[^>]+(src|href)=/);
  });
  it("has the five views and the findings", () => {
    for (const view of [
      "By source",
      "All in one table",
      "Key map",
      "Unused combinations",
      "Special characters",
    ]) {
      assert.ok(page.includes(`>${view}</button>`), view);
    }
    assert.ok(page.includes(escapeHtml(data.findings[0])));
  });
  it("shows every entry twice, by source and in the one table", () => {
    for (const entry of data.entries) {
      const rows = page.match(
        new RegExp(`<td data-key="${entry.id}" class="id">`, "g"),
      );
      assert.equal(rows?.length, 2, entry.id);
    }
  });
  it("shows every character and every key map cell", () => {
    for (const c of data.characters) {
      assert.ok(page.includes(`<td class="char">${escapeHtml(c.char)}</td>`));
    }
    for (const c of buildKeyMap(data)) {
      assert.ok(page.includes(`<td class="id">${c.id}</td>`), c.id);
    }
  });
  it("has the key lookup with its index", () => {
    assert.ok(page.includes('<input id="lookup"'));
    const json = page.match(
      /<script type="application\/json" id="lookup-index">(.*?)<\/script>/s,
    )[1];
    assert.ok(JSON.parse(json).some((r) => r.id === "R1"));
    assert.ok(page.includes("function parseQuery("));
  });
  it("shows every unused combination", () => {
    for (const c of data.combinations) {
      assert.ok(page.includes(`<kbd>${escapeHtml(c.keys)}</kbd>`), c.keys);
    }
  });
});

describe("keyCaps", () => {
  it("turns combinations into key caps and keeps words as text", () => {
    assert.equal(keyCaps("⌃⌥ ←"), "<kbd>⌃⌥ ←</kbd>");
    assert.equal(keyCaps("⌥⌘ 8 · ⌥⌘ ="), "<kbd>⌥⌘ 8</kbd> <kbd>⌥⌘ =</kbd>");
    assert.equal(
      keyCaps("⌥ Green button"),
      '<kbd>⌥</kbd> <span class="words">Green button</span>',
    );
    assert.equal(keyCaps("–"), "–");
  });
});
