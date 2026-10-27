#!/usr/bin/env node
// Command line: `check` reads a shortcut map and reports its size or every
// problem in it; `overview` also writes the overview page; `lookup` names
// what uses a key combination; `sheet` writes the cheat sheet and checks
// that it prints to one page. The only module that reads or writes files.

import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { buildKeyMap } from "./key-map.js";
import {
  buildIndex,
  findCombination,
  formatAnswer,
  parseQuery,
} from "./lookup.js";
import { renderOverview } from "./overview.js";
import { printPage } from "./print.js";
import { parseKeys, parseShortcuts, ShortcutsError } from "./shortcuts.js";
import { renderSheet } from "./sheet.js";

const DEFAULT_FILE = join(homedir(), "vc", "mac-config", "shortcuts.yaml");
const DEFAULT_OUTPUT = "shortcut-overview.html";
const DEFAULT_SHEET = "shortcut-sheet.html";
const USAGE = `usage: node src/cli.js check [file]
       node src/cli.js overview [file] [output]
       node src/cli.js lookup <combination> [file]
       node src/cli.js sheet [file] [output] [--pdf]
  file         the shortcut map (default: ${DEFAULT_FILE})
  output       the page to write (default: ${DEFAULT_OUTPUT};
               for sheet ${DEFAULT_SHEET})
  --pdf        also write the sheet as a PDF next to it
  combination  keys in words or symbols, such as "ctrl opt space" or ⌃⌥⌘↓`;

// Reads and checks a shortcut map; returns the data, or an exit code.
function load(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    console.error(
      `${file}: ${error.code === "ENOENT" ? "no such file" : error.message}`,
    );
    return 2;
  }
  let data;
  try {
    data = parseShortcuts(text, file);
  } catch (error) {
    if (!(error instanceof ShortcutsError)) throw error;
    console.error(error.message);
    console.error(`${error.problems.length} problem(s)`);
    return 1;
  }
  return data;
}

function check(file) {
  const data = load(file);
  if (typeof data === "number") return data;
  const keyStrings = [
    ...data.entries.map((e) => e.keys),
    ...data.characters.map((c) => c.keys),
    ...data.combinations.map((c) => c.keys),
  ];
  const triggers = keyStrings.flatMap(parseKeys);
  const inWords = triggers.filter((t) => t.words).length;
  const onSheet = data.entries.filter((e) => e.sheet).length;
  console.log(
    `${file}: ${data.entries.length} entries (${onSheet} on the cheat sheet), ` +
      `${data.characters.length} characters, ${data.combinations.length} combinations`,
  );
  console.log(
    `${keyStrings.length} key strings parsed into ${triggers.length - inWords} combinations ` +
      `and ${inWords} triggers in words`,
  );
  return 0;
}

function overview(file, output) {
  const data = load(file);
  if (typeof data === "number") return data;
  try {
    writeFileSync(output, renderOverview(data));
  } catch (error) {
    console.error(`${output}: ${error.message}`);
    return 2;
  }
  const cells = buildKeyMap(data);
  const free = cells.filter((c) => c.status === "free").length;
  console.log(
    `${output}: ${data.entries.length} entries, ${data.characters.length} characters, ` +
      `${cells.length} key map cells (${free} free)`,
  );
  return 0;
}

function lookup(words) {
  // The map file, if given, is the last argument and ends in .yaml or .yml;
  // everything before it is the combination, quoted or not.
  const file = /\.ya?ml$/.test(words.at(-1) ?? "") ? words.pop() : DEFAULT_FILE;
  const query = parseQuery(words.join(" "));
  if (!query) {
    console.error(USAGE);
    return 2;
  }
  const data = load(file);
  if (typeof data === "number") return data;
  const index = buildIndex(data, buildKeyMap(data));
  console.log(formatAnswer(query, findCombination(index, query)).join("\n"));
  return 0;
}

async function sheet(file, output, pdf) {
  const data = load(file);
  if (typeof data === "number") return data;
  const html = renderSheet(data);
  let printed;
  try {
    printed = await printPage(html);
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  try {
    writeFileSync(output, html);
    if (pdf)
      writeFileSync(output.replace(/\.html?$/, "") + ".pdf", printed.pdf);
  } catch (error) {
    console.error(`${output}: ${error.message}`);
    return 2;
  }
  const rows = data.entries.flatMap((e) => e.sheet ?? []).length;
  console.log(
    `${output}: ${rows} rows, ${data.characters.length} characters, ` +
      `${printed.pages} page${printed.pages === 1 ? "" : "s"}, printed with ${printed.browser}`,
  );
  const problems = [...printed.problems];
  if (printed.pages !== 1)
    problems.unshift(`prints to ${printed.pages} pages, not 1`);
  for (const p of problems) console.error(p);
  return problems.length ? 1 : 0;
}

const [command, ...args] = process.argv.slice(2);
const pdf = args.includes("--pdf");
const positional = args.filter((a) => a !== "--pdf");
const [
  file = DEFAULT_FILE,
  output = command === "sheet" ? DEFAULT_SHEET : DEFAULT_OUTPUT,
] = positional;
if (command === "check") {
  process.exitCode = check(file);
} else if (command === "overview") {
  process.exitCode = overview(file, output);
} else if (command === "lookup") {
  process.exitCode = lookup(args);
} else if (command === "sheet") {
  process.exitCode = await sheet(file, output, pdf);
} else {
  console.error(USAGE);
  process.exitCode = 2;
}
