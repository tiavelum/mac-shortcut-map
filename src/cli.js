#!/usr/bin/env node
// Command line: `check` reads a shortcut map and reports its size or every
// problem in it; `overview` also writes the overview page; `lookup` names
// what uses a key combination. The only module that reads or writes files.

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
import { parseKeys, parseShortcuts, ShortcutsError } from "./shortcuts.js";

const DEFAULT_FILE = join(homedir(), "vc", "mac-config", "shortcuts.yaml");
const DEFAULT_OUTPUT = "shortcut-overview.html";
const USAGE = `usage: node src/cli.js check [file]
       node src/cli.js overview [file] [output]
       node src/cli.js lookup <combination> [file]
  file         the shortcut map (default: ${DEFAULT_FILE})
  output       the page to write (default: ${DEFAULT_OUTPUT})
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

const [command, ...args] = process.argv.slice(2);
const [file = DEFAULT_FILE, output = DEFAULT_OUTPUT] = args;
if (command === "check") {
  process.exitCode = check(file);
} else if (command === "overview") {
  process.exitCode = overview(file, output);
} else if (command === "lookup") {
  process.exitCode = lookup(args);
} else {
  console.error(USAGE);
  process.exitCode = 2;
}
