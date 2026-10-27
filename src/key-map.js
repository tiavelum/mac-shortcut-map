// Builds the key map: every grip of modifiers with every easy key, and for
// each cell what uses it. Takes the parsed shortcut map, returns data.

import { formatCombination, MODIFIERS, parseKeys } from "./shortcuts.js";

// Every grip of one to three modifiers except ⇧ alone, which types
// capitals and selects text rather than forming a shortcut. Four modifiers
// are left out: they are one grip, too many keys to count as easy.
export const GRIPS = (() => {
  const mods = [...MODIFIERS].filter((m) => m !== "🌐");
  const grips = [];
  for (let mask = 1; mask < 1 << mods.length; mask++) {
    const grip = mods.filter((_, i) => mask & (1 << i)).join("");
    if (grip.length <= 3 && grip !== "⇧") grips.push(grip);
  }
  return grips.sort(
    (a, b) => a.length - b.length || order(a).localeCompare(order(b)),
  );
})();

function order(grip) {
  return [...grip].map((m) => MODIFIERS.indexOf(m)).join("");
}

// The easy keys of the rules that have a key cap of their own on the main
// block. * and + are left out: on common layouts they are typed with ⇧, so
// ⌃ + would really be ⌃⇧ and some other key.
const SHIFTED = new Set(["*", "+"]);

/** The keys of the key map, in the order the rules list them. */
export function keyMapKeys(rules) {
  return (rules?.easy_keys ?? [])
    .filter((k) => !MODIFIERS.includes(k) && !SHIFTED.has(String(k)))
    .flatMap((k) => parseKeys(`⌃ ${k}`))
    .filter((t) => t.key && !t.keypad)
    .map((t) => t.key);
}

/**
 * Returns one cell per grip and key, numbered K1, K2, … in order of the
 * number of keys pressed, then grip, then key. A cell is "used" when an
 * entry that is on or still to check has that combination; otherwise it
 * takes the status and note the data lists for the combination, or
 * "unchecked" when the data does not list it.
 */
export function buildKeyMap(data) {
  const usedBy = new Map();
  for (const entry of data.entries) {
    if (entry.status === "off") continue;
    for (const t of parseKeys(entry.keys)) {
      if (!t.key || t.keypad) continue;
      const name = formatCombination(t);
      if (!usedBy.has(name)) usedBy.set(name, []);
      usedBy.get(name).push(entry);
    }
  }
  const listed = new Map(
    data.combinations.map((c) => [formatCombination(parseKeys(c.keys)[0]), c]),
  );
  const keys = keyMapKeys(data.rules);
  const cells = [];
  for (const grip of GRIPS) {
    for (const key of keys) {
      const keysText = formatCombination({ modifiers: grip, key });
      const entries = usedBy.get(keysText) ?? [];
      const combination = listed.get(keysText);
      cells.push({
        id: `K${cells.length + 1}`,
        keys: keysText,
        pressed: [...grip].length + 1,
        status: entries.length ? "used" : (combination?.status ?? "unchecked"),
        entries: entries.map((e) => ({ id: e.id, action: e.action })),
        note: entries.length ? "" : (combination?.note ?? ""),
      });
    }
  }
  return cells;
}
