// Renders the overview page: one self-contained HTML document with the
// shortcuts by source, all in one table, the key map, the combinations no
// entry uses and the special characters. Takes the parsed shortcut map,
// returns the page as a string.

import { buildKeyMap } from "./key-map.js";
import { buildIndex, findCombination, parseQuery } from "./lookup.js";
import { escapeHtml, keyCaps } from "./markup.js";
import { pageScript } from "./page-script.js";

const SOURCES = [
  "macOS",
  "macOS Services",
  "macOS App Shortcuts",
  "Rectangle",
  "Claude",
  "Logi Options+",
];
const LABELS = {
  scope: { system: "System-wide", apps: "Inside apps", mouse: "Mouse" },
  status: { on: "On", off: "Off", check: "Check" },
  known_from: {
    read: "Read from the Mac",
    shot: "Screenshot",
    told: "Told",
    default: "macOS default",
  },
  verdict: { keep: "Keep", review: "Review", none: "–" },
  cell: {
    used: "Used",
    free: "Free",
    apps: "Used inside apps",
    typing: "Typing or text editing",
    unchecked: "Not checked",
    unrecordable: "Cannot be recorded",
  },
};

const pill = (kind, value, label) =>
  `<span class="pill ${kind}-${escapeHtml(value)}">${escapeHtml(label ?? value)}</span>`;

function entryCells(e, withSource) {
  const cells = [
    ["id", e.id, `<td class="id">${escapeHtml(e.id)}</td>`],
    ...(withSource
      ? [["source", e.source, `<td>${escapeHtml(e.source)}</td>`]]
      : []),
    ["where", e.where, `<td>${escapeHtml(e.where)}</td>`],
    ["action", e.action, `<td>${escapeHtml(e.action)}</td>`],
    ["keys", e.keys, `<td class="keys">${keyCaps(e.keys)}</td>`],
    [
      "verdict",
      e.verdict,
      `<td>${pill("verdict", e.verdict, LABELS.verdict[e.verdict])}${e.reason ? `<div class="why">${escapeHtml(e.reason)}</div>` : ""}</td>`,
    ],
    [
      "scope",
      e.scope,
      `<td>${escapeHtml(LABELS.scope[e.scope] ?? e.scope)}</td>`,
    ],
    [
      "status",
      e.status,
      `<td>${pill("status", e.status, LABELS.status[e.status])}</td>`,
    ],
    [
      "known_from",
      e.known_from,
      `<td>${escapeHtml(LABELS.known_from[e.known_from] ?? e.known_from)}</td>`,
    ],
    ["note", e.note, `<td class="note">${escapeHtml(e.note)}</td>`],
  ];
  return cells
    .map(([, key, html]) =>
      html.replace(/^<td/, `<td data-key="${escapeHtml(key ?? "")}"`),
    )
    .join("");
}

const entryHead = (withSource, sortable) =>
  [
    "Label",
    ...(withSource ? ["Source"] : []),
    "Where",
    "Action",
    "Keys",
    "Verdict",
    "Works in",
    "Status",
    "Known from",
    "Note",
  ]
    .map((h) =>
      sortable && h !== "Note"
        ? `<th data-sort><button type="button">${h}</button></th>`
        : `<th>${h}</th>`,
    )
    .join("");

const entryRow = (e, withSource) =>
  `<tr data-status="${escapeHtml(e.status)}" data-scope="${escapeHtml(e.scope)}" data-verdict="${escapeHtml(e.verdict)}">${entryCells(e, withSource)}</tr>`;

function bySource(entries) {
  const sources = [
    ...SOURCES.filter((s) => entries.some((e) => e.source === s)),
  ];
  return sources
    .map((source) => {
      const rows = entries.filter((e) => e.source === source);
      return `<section class="source"><h2>${escapeHtml(source)} <span class="muted">${rows.length} entries</span></h2>
<div class="box"><table><thead><tr>${entryHead(false, false)}</tr></thead><tbody>${rows.map((e) => entryRow(e, false)).join("")}</tbody></table></div></section>`;
    })
    .join("\n");
}

function allInOne(entries) {
  return `<div class="controls">
<input id="filter-all" type="search" placeholder="Filter by action, keys or note" aria-label="Filter the table">
<button type="button" class="chip" aria-pressed="false" data-toggles="all" data-field="status" data-value="on">Switched on only</button>
<button type="button" class="chip" aria-pressed="false" data-toggles="all" data-field="scope" data-value="system">System-wide only</button>
<button type="button" class="chip" aria-pressed="false" data-toggles="all" data-field="verdict" data-value="review">To review only</button>
<span class="muted" id="count-all"></span>
</div>
<div class="box"><table id="all" data-filterable data-filter="filter-all" data-count="count-all"><thead><tr>${entryHead(true, true)}</tr></thead><tbody>${entries.map((e) => entryRow(e, true)).join("")}</tbody></table></div>`;
}

function keyMap(cells) {
  const rows = cells
    .map((c) => {
      const usedFor = c.entries.length
        ? c.entries
            .map((e) => `${escapeHtml(e.id)} ${escapeHtml(e.action)}`)
            .join("; ")
        : escapeHtml(c.note);
      return `<tr data-cell="${c.status}"><td class="id">${c.id}</td><td class="keys"><kbd>${escapeHtml(c.keys)}</kbd></td><td>${c.pressed}</td><td>${pill("cell", c.status, LABELS.cell[c.status] ?? c.status)}</td><td class="note">${usedFor}</td></tr>`;
    })
    .join("");
  return `<p class="muted">Every grip of one to three modifiers, except ⇧ alone, with every easy key of the rules that has a key cap of its own.</p>
<div class="controls"><button type="button" class="chip" aria-pressed="false" data-toggles="keymap" data-field="cell" data-value="free">Free only</button><span class="muted" id="count-keymap"></span></div>
<div class="box"><table id="keymap" data-filterable data-count="count-keymap"><thead><tr><th>Label</th><th>Keys</th><th>Keys pressed</th><th>Status</th><th>Used for or note</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function combinations(list) {
  const rows = list
    .map(
      (c) =>
        `<tr><td class="keys"><kbd>${escapeHtml(c.keys)}</kbd></td><td>${pill("cell", c.status, LABELS.cell[c.status] ?? c.status)}</td><td>${c.keyboards === "mx-keys" ? "MX Keys only" : "Both"}</td><td class="note">${escapeHtml(c.note)}</td></tr>`,
    )
    .join("");
  return `<p class="muted">Combinations no entry uses, and what is known about them.</p>
<div class="box"><table><thead><tr><th>Keys</th><th>Status</th><th>Keyboard</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function characters(list) {
  const rows = list
    .map(
      (c) =>
        `<tr><td class="id">${escapeHtml(c.id)}</td><td class="char">${escapeHtml(c.char)}</td><td>${escapeHtml(c.name)}</td><td class="keys">${keyCaps(c.keys)}</td><td>${c.tested ? "Tested" : "Not yet tested"}</td></tr>`,
    )
    .join("");
  return `<div class="box"><table><thead><tr><th>Label</th><th>Character</th><th>Name</th><th>Keys</th><th>Tested</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

const CSS = `:root{--bg:#f5f6f8;--surface:#fff;--fg:#1b2230;--muted:#5d6779;--line:#dde1e8;--accent:#2f5d9e;--ok:#2e7d4f;--ok-soft:#e2f2e8;--warn:#9a6400;--warn-soft:#fbf0d9;--key:#eef0f4;--key-edge:#c8cdd6;--sans:-apple-system,"Helvetica Neue",Arial,sans-serif;--mono:ui-monospace,Menlo,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#12161d;--surface:#1a2029;--fg:#e4e8ef;--muted:#9aa4b5;--line:#2c3440;--accent:#7ea6e0;--ok:#6fcf97;--ok-soft:#173025;--warn:#e8b45a;--warn-soft:#33281a;--key:#252c37;--key-edge:#3a4350;color-scheme:dark}}
[hidden]{display:none!important}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 var(--sans)}
main{max-width:1500px;margin:0 auto;padding:24px 16px 64px;display:flex;flex-direction:column;gap:20px}
h1{margin:0;font-size:1.6rem}h2{margin:0 0 8px;font-size:1.1rem}
.muted{color:var(--muted)}
.findings{margin:0;padding-left:1.2em}
[role=tablist]{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--line)}
[role=tab]{font:inherit;background:none;border:0;border-bottom:2px solid transparent;color:var(--muted);padding:8px 14px;cursor:pointer}
[role=tab][aria-selected=true]{color:var(--fg);border-bottom-color:var(--accent)}
section[role=tabpanel]{display:flex;flex-direction:column;gap:16px}
.box{overflow-x:auto;background:var(--surface);border:1px solid var(--line);border-radius:6px}
table{border-collapse:collapse;width:100%;font-size:.88rem}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:500;white-space:nowrap}
th button{all:unset;cursor:pointer}th[aria-sort=ascending] button::after{content:" ↑"}th[aria-sort=descending] button::after{content:" ↓"}
td.id{font:600 .85rem var(--mono);color:var(--accent);white-space:nowrap}
td.keys{max-width:200px}td.note{color:var(--muted);min-width:200px}td.char{font:600 1.1rem var(--mono)}
kbd{font:500 .82rem var(--mono);background:var(--key);border:1px solid var(--key-edge);border-bottom-width:2px;border-radius:4px;padding:1px 6px;white-space:nowrap;display:inline-block;margin:0 2px 2px 0}
.words{font-weight:600}
.why{font-size:.78rem;color:var(--muted)}
.pill{display:inline-block;font-size:.74rem;padding:1px 8px;border-radius:999px;background:var(--key);white-space:nowrap}
.status-on,.verdict-keep,.cell-free{background:var(--ok-soft);color:var(--ok)}
.verdict-review,.status-check,.cell-unchecked{background:var(--warn-soft);color:var(--warn)}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.controls input{font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--fg);flex:1 1 220px;max-width:340px}
.chip{font:inherit;font-size:.82rem;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:999px;padding:4px 12px;cursor:pointer}
.lookup{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:14px 16px}
.lookup input{font:500 1rem var(--mono);padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg);width:100%;max-width:420px;box-sizing:border-box}
.lookup ul{margin:8px 0 0;padding:0;list-style:none}.lookup li{padding:3px 0}
.chip[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--surface)}`;

/** Renders the overview page of a parsed shortcut map as HTML. */
export function renderOverview(data, title = "Mac shortcut overview") {
  const cells = buildKeyMap(data);
  const panels = [
    ["source", "By source", bySource(data.entries)],
    ["all", "All in one table", allInOne(data.entries)],
    ["keymap", "Key map", keyMap(cells)],
    ["combinations", "Unused combinations", combinations(data.combinations)],
    ["characters", "Special characters", characters(data.characters)],
  ];
  const findings = (data.findings ?? []).length
    ? `<section aria-label="Findings"><h2>Findings</h2><ul class="findings">${data.findings.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul></section>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
<header><h1>${escapeHtml(title)}</h1><p class="muted">${data.entries.length} entries, ${data.characters.length} special characters, ${cells.length} key map cells. Key symbols: ⌃ Control · ⌥ Option · ⇧ Shift · ⌘ Command · 🌐 Globe.</p></header>
${findings}
<section class="lookup" aria-label="Look up keys"><h2>Look up keys</h2>
<p class="muted">Type a combination, such as <code>ctrl opt space</code>, <code>cmd shift -</code> or <code>⌃⌥⌘↓</code>, or click into the field and press it. Modifiers alone, such as <code>ctrl cmd shift</code>, list everything on that grip. A combination in use system-wide is caught before it reaches the page: type those.</p>
<input id="lookup" type="text" autocomplete="off" spellcheck="false" placeholder="ctrl opt space" aria-label="Key combination to look up">
<div id="lookup-out" aria-live="polite"></div></section>
<div role="tablist">${panels.map(([id, label], i) => `<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}">${label}</button>`).join("")}</div>
${panels.map(([id, , html], i) => `<section role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}"${i ? " hidden" : ""}>\n${html}\n</section>`).join("\n")}
</main>
<script type="application/json" id="lookup-index">${JSON.stringify(buildIndex(data, cells)).replace(/</g, "\\u003c")}</script>
<script>
${parseQuery.toString()}
${findCombination.toString()}
(${pageScript.toString()})();
</script>
</body>
</html>
`;
}
