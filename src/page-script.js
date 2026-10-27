// The behaviour of the overview page in the browser: tabs, sorting, the
// filter, the toggles and the key lookup. overview.js embeds the
// function's source in the page, so it must not use anything from outside
// its own body except parseQuery and findCombination, which the page
// defines from lookup.js.

/* global parseQuery, findCombination -- defined on the page, see above */

/** Runs in the page; wires up the controls the overview renders. */
export function pageScript() {
  const tabs = [...document.querySelectorAll("[role=tab]")];
  const show = (tab) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    }
  };
  for (const t of tabs) t.addEventListener("click", () => show(t));

  // Each table that can be filtered names its controls in data attributes:
  // data-filter (a text field), data-toggles (buttons with data-field and
  // data-value). Rows carry the fields as data attributes.
  for (const table of document.querySelectorAll("table[data-filterable]")) {
    const body = table.tBodies[0];
    const rows = [...body.rows];
    const count = document.getElementById(table.dataset.count);
    const filter = document.getElementById(table.dataset.filter ?? "");
    const toggles = [
      ...document.querySelectorAll(`[data-toggles="${table.id}"]`),
    ];
    const apply = () => {
      const query = (filter?.value ?? "").trim().toLowerCase();
      let shown = 0;
      for (const row of rows) {
        const visible =
          (!query || row.textContent.toLowerCase().includes(query)) &&
          toggles.every(
            (b) =>
              b.getAttribute("aria-pressed") !== "true" ||
              row.dataset[b.dataset.field] === b.dataset.value,
          );
        row.hidden = !visible;
        if (visible) shown++;
      }
      if (count) count.textContent = `${shown} of ${rows.length}`;
    };
    filter?.addEventListener("input", apply);
    for (const b of toggles) {
      b.addEventListener("click", () => {
        b.setAttribute(
          "aria-pressed",
          String(b.getAttribute("aria-pressed") !== "true"),
        );
        apply();
      });
    }
    for (const th of table.tHead.querySelectorAll("th[data-sort]")) {
      th.querySelector("button")?.addEventListener("click", () => {
        const column = th.cellIndex;
        const up = th.getAttribute("aria-sort") !== "ascending";
        for (const other of table.tHead.querySelectorAll("th")) {
          other.removeAttribute("aria-sort");
        }
        th.setAttribute("aria-sort", up ? "ascending" : "descending");
        const sorted = [...body.rows].sort(
          (a, b) =>
            a.cells[column].dataset.key.localeCompare(
              b.cells[column].dataset.key,
              "en",
              { numeric: true },
            ) * (up ? 1 : -1),
        );
        body.append(...sorted);
      });
    }
    apply();
  }

  const input = document.getElementById("lookup");
  const out = document.getElementById("lookup-out");
  if (!input || !out) return;
  const index = JSON.parse(document.getElementById("lookup-index").textContent);
  const esc = (t) =>
    String(t).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const item = (r, withKeys) =>
    `<li>${withKeys ? `<kbd>${esc(r.keys)}</kbd> ` : ""}<b>${esc(r.id || "–")}</b> ${esc(r.from)}: ${esc(r.what || "–")} <span class="muted">(${esc(r.state)})</span></li>`;
  const render = (query) => {
    if (!query) {
      out.innerHTML = "";
      return;
    }
    const shown = esc(`${query.modifiers} ${query.key ?? ""}`.trim());
    const answer = findCombination(index, query);
    if (answer.kind === "grip") {
      out.innerHTML = answer.hits.length
        ? `<p><kbd>${shown}</kbd> with any key:</p><ul>${answer.hits.map((r) => item(r, true)).join("")}</ul>`
        : `<p><kbd>${shown}</kbd> with any key: nothing uses it.</p>`;
      return;
    }
    const entries = answer.hits.filter((r) => r.kind === "entry").length;
    out.innerHTML =
      `<p><kbd>${shown}</kbd> ${entries ? `is used by ${entries === 1 ? "1 entry" : `${entries} entries`}:` : "is not used by any entry."}</p>` +
      `<ul>${answer.hits.map((r) => item(r, false)).join("")}</ul>` +
      (answer.near.length
        ? `<p class="muted">Same key with other modifiers:</p><ul>${answer.near.map((r) => item(r, true)).join("")}</ul>`
        : "");
  };
  input.addEventListener("input", () => render(parseQuery(input.value)));
  // A pressed combination is read by physical key: with Option held, the
  // character typed differs (Option + Space gives a non-breaking space).
  const named = {
    Space: "space",
    Enter: "return",
    Backspace: "backspace",
    Tab: "tab",
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    Minus: "-",
    Escape: "esc",
  };
  input.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.altKey || e.metaKey)) return;
    let key = named[e.code];
    if (!key && /^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
    if (!key && /^Digit\d$/.test(e.code)) key = e.code.slice(5);
    if (!key && /^F\d{1,2}$/.test(e.code)) key = e.code;
    if (!key) return;
    e.preventDefault();
    const words = [
      e.ctrlKey && "ctrl",
      e.altKey && "opt",
      e.shiftKey && "shift",
      e.metaKey && "cmd",
      key,
    ].filter(Boolean);
    const query = parseQuery(words.join(" "));
    input.value = `${query.modifiers} ${query.key}`;
    render(query);
  });
}
