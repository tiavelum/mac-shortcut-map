// Reads and checks a shortcut map (shortcuts.yaml) and parses the key
// strings in it. Takes the file's text, never the file itself, so every
// output can share it and the tests need no files on disk.

import { LineCounter, parseDocument } from "yaml";

/** Modifier glyphs in the order a combination is written. */
export const MODIFIERS = "⌃⌥⇧⌘🌐";

const SOURCE_PREFIX = {
  macOS: "M",
  "macOS Services": "S",
  "macOS App Shortcuts": "A",
  Rectangle: "R",
  Claude: "C",
  "Logi Options+": "L",
};
const ENUMS = {
  scope: ["system", "apps", "mouse"],
  status: ["on", "off", "check"],
  known_from: ["read", "shot", "told", "default"],
  verdict: ["keep", "review", "none"],
};
const COMBINATION_STATUS = [
  "free",
  "apps",
  "typing",
  "unchecked",
  "unrecordable",
];
const KEYBOARDS = ["mx-keys"];
const NAMED_KEYS = {
  space: "Space",
  return: "Return",
  enter: "Enter",
  tab: "Tab",
  esc: "Esc",
  "⌫": "⌫",
  "←": "←",
  "→": "→",
  "↑": "↑",
  "↓": "↓",
};
// Words in a key string that only describe how the keys are pressed.
const IGNORED_WORDS = new Set(["pressed", "again", "key"]);

/** The canonical text of one combination: "⌃⌥ Space", "⌘ keypad -". */
export function formatCombination({ modifiers, key, keypad }) {
  const k = keypad ? `keypad ${key}` : key;
  return modifiers ? `${modifiers} ${k}` : k;
}

function keyName(token) {
  const named = NAMED_KEYS[token.toLowerCase()];
  if (named) return named;
  if (/^F\d{1,2}$/.test(token)) return token;
  if ([...token].length === 1) return token.toUpperCase();
  return null;
}

/**
 * Parses a key string into its triggers. Each trigger is either a
 * combination, `{ modifiers, key, keypad }`, or a trigger in words,
 * `{ modifiers, words }`, such as "Green button" or "Left ⌘ pressed twice".
 * Alternatives are separated by " · ", several keys for one action by
 * spaces or " / "; "arrows" stands for the four arrow keys; "–" means no
 * keys at all.
 */
export function parseKeys(text) {
  const triggers = [];
  for (const alternative of String(text).split(" · ")) {
    const trimmed = alternative.trim();
    if (trimmed === "" || trimmed === "–") continue;
    const [, glyphs, rest] = trimmed.match(/^([⌃⌥⇧⌘🌐]*)\s*(.*)$/u);
    const modifiers = [...MODIFIERS].filter((m) => glyphs.includes(m)).join("");
    // "/" separates keys ("⌃⌥ ← / →") unless it is the only key ("⇧⌘ /",
    // "⌃ keypad /").
    const split = rest
      .replace(/\barrows\b/, "← → ↑ ↓")
      .replace(/−/g, "-")
      .split(/\s+/)
      .filter((t) => t !== "");
    const keyTokens = split.filter((t) => t !== "keypad");
    const tokens =
      keyTokens.length > 1 ? split.filter((t) => t !== "/") : split;
    const keypad = tokens.includes("keypad");
    const keys = [];
    let words = false;
    for (const token of tokens) {
      if (token === "keypad" || IGNORED_WORDS.has(token.toLowerCase()))
        continue;
      const key = keypad && token === "Enter" ? "Enter" : keyName(token);
      if (key) keys.push(key);
      else words = true;
    }
    if (words || keys.length === 0) {
      triggers.push({ modifiers, words: rest || trimmed });
    } else {
      for (const key of keys) triggers.push({ modifiers, key, keypad });
    }
  }
  return triggers;
}

/** Thrown when a shortcut map cannot be read; lists every problem found. */
export class ShortcutsError extends Error {
  constructor(problems) {
    super(problems.join("\n"));
    this.name = "ShortcutsError";
    this.problems = problems;
  }
}

/**
 * Parses and checks the text of a shortcut map. Returns the data; throws a
 * ShortcutsError naming the line of each problem.
 */
export function parseShortcuts(text, fileName = "shortcuts.yaml") {
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter, uniqueKeys: true });
  const lineOf = (path) => {
    const node = doc.getIn(path, true);
    const offset = node && node.range ? node.range[0] : 0;
    return lineCounter.linePos(offset).line;
  };
  const problems = [];
  const report = (path, message) =>
    problems.push(`${fileName}:${lineOf(path)}: ${message}`);

  if (doc.errors.length > 0) {
    throw new ShortcutsError(
      doc.errors.map(
        (e) =>
          `${fileName}:${e.linePos?.[0]?.line ?? 1}: ${e.message.split("\n")[0]}`,
      ),
    );
  }
  const data = doc.toJS() ?? {};
  for (const section of [
    "rules",
    "sheet_chapters",
    "entries",
    "characters",
    "combinations",
  ]) {
    if (data[section] === undefined) report([], `missing section "${section}"`);
  }
  for (const section of [
    "sheet_chapters",
    "entries",
    "characters",
    "combinations",
  ]) {
    if (data[section] !== undefined && !Array.isArray(data[section])) {
      report([section], `"${section}" must be a list`);
      data[section] = [];
    }
  }
  if (problems.length > 0) throw new ShortcutsError(problems);

  const chapters = new Set(data.sheet_chapters);
  const ids = new Map();
  const positions = new Map();
  const used = new Map();
  data.entries.forEach((entry, i) => {
    const at = ["entries", i];
    for (const field of [
      "id",
      "source",
      "where",
      "action",
      "keys",
      "scope",
      "status",
      "known_from",
      "verdict",
    ]) {
      if (entry[field] === undefined || entry[field] === null)
        report(at, `entry is missing "${field}"`);
    }
    if (ids.has(entry.id))
      report(
        [...at, "id"],
        `duplicate id ${entry.id} (first at line ${ids.get(entry.id)})`,
      );
    else ids.set(entry.id, lineOf([...at, "id"]));
    const prefix = SOURCE_PREFIX[entry.source];
    if (entry.source !== undefined && !prefix)
      report([...at, "source"], `unknown source "${entry.source}"`);
    else if (prefix && !new RegExp(`^${prefix}\\d+$`).test(entry.id ?? "")) {
      report(
        [...at, "id"],
        `id ${entry.id} does not match source ${entry.source} (${prefix} and a number)`,
      );
    }
    for (const [field, allowed] of Object.entries(ENUMS)) {
      if (entry[field] !== undefined && !allowed.includes(entry[field])) {
        report(
          [...at, field],
          `unknown ${field} "${entry[field]}" (allowed: ${allowed.join(", ")})`,
        );
      }
    }
    if (
      entry.keys !== undefined &&
      parseKeys(entry.keys).length === 0 &&
      entry.status !== "off"
    ) {
      report([...at, "keys"], `entry ${entry.id} has no keys but is not off`);
    }
    if (entry.status === "on") {
      for (const t of parseKeys(entry.keys ?? "")) {
        if (t.key) used.set(formatCombination(t), entry.id);
      }
    }
    (entry.sheet ?? []).forEach((place, j) => {
      const placeAt = [...at, "sheet", j];
      if (!chapters.has(place.chapter))
        report(
          [...placeAt, "chapter"],
          `unknown cheat-sheet chapter "${place.chapter}"`,
        );
      if (!place.label)
        report(placeAt, `cheat-sheet place of ${entry.id} has no label`);
      const key = `${place.chapter}#${place.position}`;
      if (positions.has(key))
        report(
          [...placeAt, "position"],
          `position ${place.position} in "${place.chapter}" is taken by ${positions.get(key)}`,
        );
      else positions.set(key, entry.id);
    });
  });
  data.sheet_chapters.forEach((chapter, i) => {
    if (![...positions.keys()].some((k) => k.startsWith(`${chapter}#`))) {
      report(
        ["sheet_chapters", i],
        `cheat-sheet chapter "${chapter}" names no entry`,
      );
    }
  });

  const charIds = new Set();
  data.characters.forEach((c, i) => {
    const at = ["characters", i];
    for (const field of ["id", "char", "name", "keys", "tested"]) {
      if (c[field] === undefined) report(at, `character is missing "${field}"`);
    }
    if (charIds.has(c.id)) report([...at, "id"], `duplicate id ${c.id}`);
    charIds.add(c.id);
    if (c.id !== undefined && !/^T\d+$/.test(c.id))
      report([...at, "id"], `character id ${c.id} is not T and a number`);
  });

  const listed = new Set();
  data.combinations.forEach((c, i) => {
    const at = ["combinations", i];
    const triggers = parseKeys(c.keys ?? "");
    if (triggers.length !== 1 || !triggers[0].key) {
      report(
        [...at, "keys"],
        `combination "${c.keys}" is not exactly one combination`,
      );
      return;
    }
    const name = formatCombination(triggers[0]);
    if (listed.has(name))
      report([...at, "keys"], `combination ${name} is listed twice`);
    listed.add(name);
    if (used.has(name))
      report(
        [...at, "keys"],
        `combination ${name} is listed as unused, but entry ${used.get(name)} uses it`,
      );
    if (!COMBINATION_STATUS.includes(c.status)) {
      report(
        [...at, "status"],
        `unknown status "${c.status}" (allowed: ${COMBINATION_STATUS.join(", ")})`,
      );
    }
    if (c.keyboards !== undefined && !KEYBOARDS.includes(c.keyboards)) {
      report([...at, "keyboards"], `unknown keyboards "${c.keyboards}"`);
    }
  });

  if (problems.length > 0) throw new ShortcutsError(problems);
  return data;
}
