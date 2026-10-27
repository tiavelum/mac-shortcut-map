#!/usr/bin/env node
// Command line: `node src/cli.js check [file]` reads a shortcut map and
// reports its size or every problem in it.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseKeys, parseShortcuts, ShortcutsError } from "./shortcuts.js";

const DEFAULT_FILE = join(homedir(), "vc", "mac-config", "shortcuts.yaml");
const USAGE = `usage: node src/cli.js check [file]
  file  the shortcut map (default: ${DEFAULT_FILE})`;

function check(file) {
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

const [command, file = DEFAULT_FILE] = process.argv.slice(2);
if (command === "check") {
  process.exitCode = check(file);
} else {
  console.error(USAGE);
  process.exitCode = 2;
}
