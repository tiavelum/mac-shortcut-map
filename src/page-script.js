// The behaviour of the overview page in the browser: tabs, sorting, the
// filter and the toggles. overview.js embeds the function's source in the
// page, so it must not use anything from outside its own body.

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
}
