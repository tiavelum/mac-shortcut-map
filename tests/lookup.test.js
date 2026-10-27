import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildKeyMap } from "../src/key-map.js";
import {
  buildIndex,
  findCombination,
  formatAnswer,
  parseQuery,
} from "../src/lookup.js";
import { parseShortcuts } from "../src/shortcuts.js";

const data = parseShortcuts(
  readFileSync(new URL("../examples/shortcuts.yaml", import.meta.url), "utf8"),
);
const index = buildIndex(data, buildKeyMap(data));
const find = (text) => findCombination(index, parseQuery(text));
const ids = (records) => records.map((r) => r.id);

describe("parseQuery", () => {
  it("reads words, aliases and symbols", () => {
    const want = { modifiers: "⌃⌥", key: "Space" };
    assert.deepEqual(parseQuery("ctrl opt space"), want);
    assert.deepEqual(parseQuery("Control+Option+Space"), want);
    assert.deepEqual(parseQuery("alt ctrl space"), want);
    assert.deepEqual(parseQuery("⌃⌥ Space"), want);
    assert.deepEqual(parseQuery("⌃⌥⌘↓"), { modifiers: "⌃⌥⌘", key: "↓" });
  });
  it("reads keys by name and the keypad", () => {
    assert.equal(parseQuery("cmd shift minus").key, "-");
    assert.equal(parseQuery("cmd shift -").key, "-");
    assert.equal(parseQuery("cmd +").key, "+");
    assert.equal(parseQuery("ctrl delete").key, "⌫");
    assert.equal(parseQuery("ctrl enter").key, "Return");
    assert.equal(parseQuery("ctrl keypad enter").key, "keypad Enter");
    assert.equal(parseQuery("ctrl keypad /").key, "keypad /");
    assert.equal(parseQuery("opt c").key, "C");
    assert.equal(parseQuery("f11").key, "F11");
  });
  it("reads Option + Space typed as a non-breaking space", () => {
    assert.deepEqual(parseQuery("⌥ "), { modifiers: "⌥", key: "Space" });
  });
  it("returns modifiers alone, or null for nothing usable", () => {
    assert.deepEqual(parseQuery("ctrl cmd shift"), {
      modifiers: "⌃⇧⌘",
      key: null,
    });
    assert.equal(parseQuery("   "), null);
  });
});

describe("findCombination", () => {
  it("names every entry and cell with exactly that combination", () => {
    const answer = find("ctrl opt left");
    assert.equal(answer.kind, "exact");
    assert.deepEqual(
      answer.hits.map((r) => `${r.kind} ${r.id.replace(/^K\d+$/, "K")}`),
      ["entry R1", "entry R2", "cell K"],
    );
    assert.deepEqual(answer.near, []);
  });
  it("finds entries that are off and characters", () => {
    assert.deepEqual(ids(find("opt cmd 8").hits), ["M2"]);
    assert.deepEqual(ids(find("opt 5").hits), ["T1"]);
  });
  it("lists the same key with other modifiers when no entry uses it", () => {
    const answer = find("ctrl backspace");
    assert.ok(answer.hits.every((r) => r.kind !== "entry"));
    assert.equal(answer.hits[0].state, "free");
    const none = find("shift cmd left");
    assert.deepEqual(ids(none.near).sort(), ["R1", "R2", "S1"]);
  });
  it("keeps unused combinations the key map does not cover", () => {
    const answer = find("ctrl keypad /");
    assert.equal(answer.hits.length, 1);
    assert.equal(answer.hits[0].kind, "combination");
  });
  it("lists everything on a grip, sorted by key", () => {
    const answer = find("ctrl opt");
    assert.equal(answer.kind, "grip");
    assert.equal(answer.hits[0].key, "Space");
    assert.ok(answer.hits.every((r) => r.modifiers === "⌃⌥"));
  });
});

describe("formatAnswer", () => {
  it("says how many entries use a combination", () => {
    const query = parseQuery("ctrl opt left");
    const lines = formatAnswer(query, findCombination(index, query));
    assert.equal(lines[0], "⌃⌥ ← is used by 2 entries:");
  });
  it("says when no entry uses it", () => {
    const query = parseQuery("ctrl backspace");
    const lines = formatAnswer(query, findCombination(index, query));
    assert.equal(lines[0], "⌃ ⌫ is not used by any entry.");
  });
});
