import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildKeyMap, GRIPS, keyMapKeys } from "../src/key-map.js";
import { parseShortcuts } from "../src/shortcuts.js";

const data = parseShortcuts(
  readFileSync(new URL("../examples/shortcuts.yaml", import.meta.url), "utf8"),
);
const cells = buildKeyMap(data);
const cell = (keys) => cells.find((c) => c.keys === keys);

describe("key map", () => {
  it("has thirteen grips, without ⇧ alone or four modifiers", () => {
    assert.equal(GRIPS.length, 13);
    assert.ok(!GRIPS.includes("⇧"));
    assert.deepEqual(GRIPS.slice(0, 3), ["⌃", "⌥", "⌘"]);
  });
  it("takes the easy keys that have a key cap of their own", () => {
    assert.deepEqual(
      keyMapKeys({ easy_keys: ["⌘", "Space", "-", "+", "*", "←", "Tab"] }),
      ["Space", "-", "←", "Tab"],
    );
  });
  it("has one numbered cell per grip and key", () => {
    assert.equal(cells.length, 13 * keyMapKeys(data.rules).length);
    assert.equal(cells[0].id, "K1");
    assert.equal(cells.at(-1).id, `K${cells.length}`);
  });
  it("names the entries that use a cell", () => {
    assert.equal(cell("⌃⌥ ←").status, "used");
    assert.deepEqual(
      cell("⌃⌥ ←").entries.map((e) => e.id),
      ["R1", "R2"],
    );
    assert.equal(cell("⌘ Space").entries[0].id, "M1");
  });
  it("takes status and note of unused cells from the combinations", () => {
    assert.equal(cell("⌃ ⌫").status, "free");
    assert.equal(cell("⌃⌥ Tab").status, "unrecordable");
    assert.equal(cell("⌥ ←").note, "Jump by word.");
    assert.equal(cell("⌃⇧ Space").status, "unchecked");
  });
  it("ignores entries that are off", () => {
    assert.notEqual(cell("⌥⌘ -").status, "used");
  });
});
