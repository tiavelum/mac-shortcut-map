import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const src = new URL("../src/", import.meta.url);
const readme = readFileSync(new URL("README.md", src), "utf8");

// The layer table of src/README.md, lowest layer first: module -> index.
const layerOf = new Map();
readme
  .slice(readme.indexOf("## Layers"))
  .split("\n")
  .filter((line) => /^\| [A-Z]/.test(line) && !line.startsWith("| Layer"))
  .forEach((line, layer) => {
    for (const [, name] of line.split("|")[2].matchAll(/`([\w-]+)`/g)) {
      assert.ok(!layerOf.has(name), `${name} is in two layers`);
      layerOf.set(name, layer);
    }
  });

const modules = readdirSync(src)
  .filter((f) => f.endsWith(".js"))
  .map((f) => f.replace(/\.js$/, ""));

describe("module layers", () => {
  it("puts every module of src/ in exactly one layer", () => {
    for (const name of modules) {
      assert.ok(layerOf.has(name), `${name} is in no layer of src/README.md`);
    }
    for (const name of layerOf.keys()) {
      assert.ok(modules.includes(name), `${name} is no module of src/`);
    }
  });
  it("imports only from layers below", () => {
    for (const name of modules) {
      const text = readFileSync(new URL(`${name}.js`, src), "utf8");
      for (const [, imported] of text.matchAll(/from\s+"\.\/([\w-]+)\.js"/g)) {
        assert.ok(
          layerOf.get(imported) < layerOf.get(name),
          `${name} imports ${imported}, which is not in a layer below`,
        );
      }
    }
  });
});
