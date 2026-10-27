// Answers which entries, key map cells, unused combinations and special
// characters use a key combination. Takes the parsed shortcut map and the
// key map cells, returns data.
//
// parseQuery and findCombination use nothing from outside their own body:
// the overview page embeds their source to answer the same question in the
// browser.

import { formatCombination, parseKeys } from "./shortcuts.js";

/**
 * Reads a combination typed in words or symbols, such as "ctrl opt space",
 * "cmd+shift+-" or "⌃⌥⌘↓". Returns { modifiers, key }, with key null when
 * only modifiers were typed, or null when nothing usable was typed.
 */
export function parseQuery(text) {
  const order = "⌃⌥⇧⌘🌐";
  const modifierWords = {
    ctrl: "⌃",
    control: "⌃",
    ctl: "⌃",
    "⌃": "⌃",
    opt: "⌥",
    option: "⌥",
    alt: "⌥",
    "⌥": "⌥",
    shift: "⇧",
    "⇧": "⇧",
    cmd: "⌘",
    command: "⌘",
    "⌘": "⌘",
    globe: "🌐",
    fn: "🌐",
    "🌐": "🌐",
  };
  const keyWords = {
    space: "Space",
    return: "Return",
    enter: "Return",
    backspace: "⌫",
    delete: "⌫",
    "⌫": "⌫",
    tab: "Tab",
    esc: "Esc",
    escape: "Esc",
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
    minus: "-",
    "−": "-",
    plus: "+",
  };
  let source = String(text).replace(/\u00a0/g, " space ");
  // "+" separates "ctrl+opt+space", unless it is the key itself.
  const plusIsKey = /(^|[\s+])\+\s*$/.test(source);
  if (plusIsKey) source = source.replace(/\+\s*$/, " plus");
  const tokens = source
    .replace(/([⌃⌥⇧⌘↑↓←→⌫]|🌐)/gu, " $1 ")
    .split(/[\s+]+/)
    .filter(Boolean);
  const modifiers = new Set();
  let key = null;
  let keypad = false;
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (modifierWords[lower]) modifiers.add(modifierWords[lower]);
    else if (["keypad", "kp", "numpad"].includes(lower)) keypad = true;
    else if (keyWords[lower]) key = keyWords[lower];
    else if (/^f\d{1,2}$/.test(lower)) key = lower.toUpperCase();
    else if ([...token].length === 1) key = token.toUpperCase();
  }
  if (!key && !modifiers.size) return null;
  if (keypad && key === "Return") key = "Enter";
  if (keypad && key) key = `keypad ${key}`;
  return {
    modifiers: [...order].filter((m) => modifiers.has(m)).join(""),
    key,
  };
}

/**
 * Looks a parsed query up in an index from buildIndex. Returns
 * { kind: "exact", hits, near } for a full combination, where near lists
 * entries with the same key and other modifiers when no entry uses it, or
 * { kind: "grip", hits } for modifiers alone, sorted by key.
 */
export function findCombination(index, query) {
  const keyOrder = ["Space", "Return", "⌫", "-", "Tab", "←", "→", "↑", "↓"];
  const rank = (key) => {
    const i = keyOrder.indexOf(key.replace(/^keypad /, ""));
    return i < 0 ? keyOrder.length : i;
  };
  if (!query.key) {
    const hits = index
      .filter((r) => r.modifiers === query.modifiers)
      .sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
    return { kind: "grip", hits };
  }
  const hits = index.filter(
    (r) => r.modifiers === query.modifiers && r.key === query.key,
  );
  const near = hits.some((r) => r.kind === "entry")
    ? []
    : index.filter(
        (r) =>
          r.kind === "entry" &&
          r.key === query.key &&
          r.modifiers !== query.modifiers,
      );
  return { kind: "exact", hits, near };
}

const STATUS = { on: "on", off: "off", check: "to check" };
const CELL = {
  used: "used",
  free: "free",
  apps: "used inside apps",
  typing: "typing or text editing",
  unchecked: "not checked",
  unrecordable: "cannot be recorded",
};

/**
 * One record per combination in the map: every entry, key map cell,
 * unused combination and special character, each with its modifiers, key,
 * the combination as written, a label, where it comes from, what it does
 * and its state.
 */
export function buildIndex(data, cells) {
  const records = [];
  const add = (kind, keysText, fields) => {
    for (const t of parseKeys(keysText)) {
      if (!t.key) continue;
      const key = t.keypad ? `keypad ${t.key}` : t.key;
      records.push({
        kind,
        modifiers: t.modifiers,
        key,
        keys: formatCombination(t),
        ...fields,
      });
    }
  };
  for (const e of data.entries) {
    add("entry", e.keys, {
      id: e.id,
      from: e.source,
      what: e.action,
      state: [
        STATUS[e.status] ?? e.status,
        e.verdict === "none" ? "" : e.verdict,
      ]
        .filter(Boolean)
        .join(", "),
    });
  }
  for (const c of cells) {
    add("cell", c.keys, {
      id: c.id,
      from: "Key map",
      what: c.entries.length
        ? c.entries.map((e) => `${e.id} ${e.action}`).join("; ")
        : c.note,
      state: CELL[c.status] ?? c.status,
    });
  }
  // A combination the key map covers would only repeat its cell.
  const inKeyMap = new Set(cells.map((c) => c.keys));
  for (const c of data.combinations) {
    if (parseKeys(c.keys).every((t) => inKeyMap.has(formatCombination(t))))
      continue;
    add("combination", c.keys, {
      id: "",
      from: "Unused combinations",
      what: c.note ?? "",
      state: CELL[c.status] ?? c.status,
    });
  }
  for (const c of data.characters) {
    add("character", c.keys, {
      id: c.id,
      from: "Special characters",
      what: `types ${c.char} (${c.name})`,
      state: c.tested ? "tested" : "not yet tested",
    });
  }
  return records;
}

/** The answer to a lookup as lines of text, for the command line. */
export function formatAnswer(query, answer) {
  const shown = `${query.modifiers} ${query.key ?? ""}`.trim();
  const line = (r, withKeys) =>
    `  ${withKeys ? `${r.keys.padEnd(14)} ` : ""}${(r.id || "–").padEnd(5)} ${r.from}: ${r.what || "–"} (${r.state})`;
  if (answer.kind === "grip") {
    if (!answer.hits.length) return [`${shown} with any key: nothing uses it`];
    return [
      `${shown} with any key: ${answer.hits.length} uses`,
      ...answer.hits.map((r) => line(r, true)),
    ];
  }
  const lines = [];
  const entries = answer.hits.filter((r) => r.kind === "entry");
  lines.push(
    entries.length
      ? `${shown} is used by ${entries.length === 1 ? "1 entry" : `${entries.length} entries`}:`
      : `${shown} is not used by any entry.`,
  );
  lines.push(...answer.hits.map((r) => line(r, false)));
  if (answer.near.length) {
    lines.push("Same key with other modifiers:");
    lines.push(...answer.near.map((r) => line(r, true)));
  }
  return lines;
}
