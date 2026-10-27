import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatCombination,
  parseKeys,
  parseShortcuts,
  ShortcutsError,
} from "../src/shortcuts.js";

const example = readFileSync(
  new URL("../examples/shortcuts.yaml", import.meta.url),
  "utf8",
);
const names = (text) =>
  parseKeys(text).map((t) =>
    t.words !== undefined
      ? `words:${t.modifiers}|${t.words}`
      : formatCombination(t),
  );

describe("parseKeys", () => {
  it("reads one combination", () => {
    assert.deepEqual(names("⌃⌥ Space"), ["⌃⌥ Space"]);
  });
  it("orders the modifiers ⌃⌥⇧⌘", () => {
    assert.deepEqual(names("⌘⇧ -"), ["⇧⌘ -"]);
  });
  it("splits alternatives and several keys", () => {
    assert.deepEqual(names("⌥⌘ 8 · ⌥⌘ ="), ["⌥⌘ 8", "⌥⌘ ="]);
    assert.deepEqual(names("⌃⌥ ← / → pressed again"), ["⌃⌥ ←", "⌃⌥ →"]);
  });
  it("keeps a slash that is the only key", () => {
    assert.deepEqual(names("⇧⌘ /"), ["⇧⌘ /"]);
    assert.deepEqual(names("⌃ keypad /"), ["⌃ keypad /"]);
  });
  it("expands arrows and reads the Globe modifier", () => {
    assert.deepEqual(names("⌃🌐 F / arrows"), [
      "⌃🌐 F",
      "⌃🌐 ←",
      "⌃🌐 →",
      "⌃🌐 ↑",
      "⌃🌐 ↓",
    ]);
  });
  it("keeps triggers in words as words", () => {
    assert.deepEqual(names("Left ⌘ pressed twice"), [
      "words:|Left ⌘ pressed twice",
    ]);
    assert.deepEqual(names("⌥ Green button"), ["words:⌥|Green button"]);
  });
  it("reads single keys named with the word key", () => {
    assert.deepEqual(names("^ key"), ["^"]);
    assert.deepEqual(names("⇧ - key"), ["⇧ -"]);
  });
  it("reads a dash as no keys", () => {
    assert.deepEqual(names("–"), []);
  });
});

describe("parseShortcuts", () => {
  it("reads the example and parses every key string in it", () => {
    const data = parseShortcuts(example);
    assert.equal(data.entries.length, 10);
    const strings = [
      ...data.entries.map((e) => e.keys),
      ...data.characters.map((c) => c.keys),
      ...data.combinations.map((c) => c.keys),
    ];
    for (const keys of strings) {
      const parsed = parseKeys(keys);
      assert.ok(
        parsed.length > 0 || keys === "–",
        `"${keys}" parses to nothing`,
      );
    }
  });

  const fails = (text, pattern) =>
    assert.throws(
      () => parseShortcuts(text, "map.yaml"),
      (error) =>
        error instanceof ShortcutsError &&
        error.problems.some((p) => pattern.test(p)),
    );

  it("names the line of a duplicate id", () => {
    const text = example.replace("id: M2\n", "id: M1\n");
    const line = text
      .split("\n")
      .findIndex(
        (l, i, all) =>
          l.includes("id: M1") &&
          all.slice(0, i).some((x) => x.includes("id: M1")),
      );
    fails(text, new RegExp(`^map\\.yaml:${line + 1}: duplicate id M1`));
  });
  it("rejects an unknown status", () => {
    fails(
      example.replace('status: "check"', "status: unk"),
      /unknown status "unk"/,
    );
  });
  it("rejects a chapter that names no entry", () => {
    fails(
      example.replace("  - Mouse\n", "  - Mouse\n  - Empty\n"),
      /chapter "Empty" names no entry/,
    );
  });
  it("rejects a combination an entry uses", () => {
    fails(
      example.replace("keys: ⌃ ⌫, status: free", "keys: ⌘ Space, status: free"),
      /⌘ Space is listed as unused, but entry M1 uses it/,
    );
  });
  it("names the line of malformed YAML", () => {
    fails("entries:\n  - id: [\n", /^map\.yaml:\d+: /);
  });
});
