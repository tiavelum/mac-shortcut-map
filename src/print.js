// Prints a page in a headless browser and measures what came out: the
// number of pages, the rows whose text wraps onto a second line and the
// key caps that stick out of their column. Takes HTML, returns data and
// the PDF; writes no file.

// A4 landscape minus the 9 mm margins of the sheet, at the 96 pixels per
// inch a browser lays out with.
const CONTENT_WIDTH = Math.round(((297 - 18) / 25.4) * 96);
const CONTENT_HEIGHT = Math.round(((210 - 18) / 25.4) * 96);

/**
 * Renders the HTML as print and returns { pages, problems, pdf }, where
 * problems names each row (by its data-row attribute) that wraps or whose
 * key cap is cut off. Throws when Playwright or its browser is missing.
 */
export async function printPage(html) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    throw new Error("Playwright is missing: run npm ci", { cause: error });
  }
  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    throw new Error(
      `no browser for Playwright: run npx playwright install chromium (${error.message.split("\n")[0]})`,
      { cause: error },
    );
  }
  try {
    const page = await browser.newPage({
      viewport: { width: CONTENT_WIDTH, height: CONTENT_HEIGHT },
    });
    await page.emulateMedia({ media: "print" });
    await page.setContent(html, { waitUntil: "load" });
    const problems = await page.evaluate(() => {
      // The line boxes of an element: the tops of its text fragments,
      // where a key cap sits a few pixels off the text beside it, so tops
      // closer than half a line belong to the same line.
      const lines = (element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const tops = [...range.getClientRects()]
          .filter((r) => r.width > 0)
          .map((r) => r.top)
          .sort((a, b) => a - b);
        const half = parseFloat(getComputedStyle(element).fontSize) * 0.6;
        return tops.filter((top, i) => i === 0 || top - tops[i - 1] > half)
          .length;
      };
      const found = [];
      for (const row of document.querySelectorAll("[data-row]")) {
        const name = row.dataset.row;
        for (const cell of row.children) {
          if (lines(cell) > 1) found.push(`${name}: wraps onto a second line`);
          const right = cell.getBoundingClientRect().right;
          for (const cap of cell.querySelectorAll("kbd")) {
            if (cap.getBoundingClientRect().right > right + 0.5) {
              found.push(`${name}: key cap ${cap.textContent} is cut off`);
            }
          }
        }
      }
      return found;
    });
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
    });
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? [])
      .length;
    return { pages, problems, pdf };
  } finally {
    await browser.close();
  }
}
