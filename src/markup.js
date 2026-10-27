// HTML building blocks the pages share: escaping, and key strings as key
// caps.

import { parseKeys } from "./shortcuts.js";

/** Escapes text for use in HTML content and attribute values. */
export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

// A key string as key caps: "⌃⌥ ← / →" is one cap per alternative, a
// trigger in words keeps its modifiers as a cap and the words as text
// ("⌥ Green button"), "–" stays a dash.
export function keyCaps(text) {
  return String(text)
    .split(" · ")
    .map((part) => {
      const [, mods, rest] = part.trim().match(/^([⌃⌥⇧⌘🌐]*)\s*(.*)$/u);
      if (part.trim() === "–") return "–";
      const words = parseKeys(part).some((t) => t.words !== undefined);
      if (!words) return `<kbd>${escapeHtml(part.trim())}</kbd>`;
      return `${mods ? `<kbd>${escapeHtml(mods)}</kbd> ` : ""}<span class="words">${escapeHtml(rest)}</span>`;
    })
    .join(" ");
}
