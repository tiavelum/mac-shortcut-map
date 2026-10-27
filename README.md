# mac-shortcut-map

A tool for keeping track of the keyboard shortcuts on a Mac. It renders a shortcut map, kept as a YAML file outside this repository, into an overview page, a lookup of what uses a key combination, and a printable one-page cheat sheet. The repository holds the tool only, no shortcut data.

## Getting started

Requires macOS or Linux, git, Node.js 22 or later, and for the cheat sheet Google Chrome. On a Mac, install Node.js with Homebrew and check its version:

```sh
brew install node
node --version
```

Then get the tool and run it on the invented example map:

```sh
git clone https://github.com/tiavelum/mac-shortcut-map.git ~/vc/mac-shortcut-map
cd ~/vc/mac-shortcut-map
npm ci
node src/cli.js check examples/shortcuts.yaml
```

The last command reads the invented example map and prints:

```
examples/shortcuts.yaml: 10 entries (3 on the cheat sheet), 3 characters, 4 combinations
17 key strings parsed into 21 combinations and 3 triggers in words
```

## Check a shortcut map

```sh
node src/cli.js check ~/vc/mac-config/shortcuts.yaml
```

Without a file, `check` reads `~/vc/mac-config/shortcuts.yaml`. It prints the map's size as above, or every problem with its line, such as a duplicate id, an unknown status, a cheat-sheet chapter without entries, or a combination listed as unused that an entry uses. Exit code 0 means no problem, 1 problems in the map, 2 a missing file or wrong arguments.

## Render the overview page

```sh
node src/cli.js overview ~/vc/mac-config/shortcuts.yaml
```

It writes `shortcut-overview.html` into the current folder, or to the path given after the map, and prints its size:

```
shortcut-overview.html: 86 entries, 24 characters, 117 key map cells (26 free)
```

The page is one HTML file that opens in any browser, light or dark. Its findings sit at the top, then a field that looks up a key combination as `lookup` below does, then five tabs:

- **By source:** one table per source.
- **All in one table:** sortable by column, with a text filter and toggles for switched-on, system-wide and to-review entries.
- **Key map:** every grip of one to three modifiers, except ⇧ alone, with every easy key of the rules that has a key cap of its own, and what uses each cell.
- **Unused combinations** and **Special characters.**

`shortcut-overview.html` is ignored by git, because it holds the personal map.

## Look up a key combination

```sh
node src/cli.js lookup ctrl opt left examples/shortcuts.yaml
```

```
⌃⌥ ← is used by 2 entries:
  R1    Rectangle: Left half (on, keep)
  R2    Rectangle: Cycle sizes (on, keep)
  K29   Key map: R1 Left half; R2 Cycle sizes (used)
```

It lists every entry, key map cell, unused combination and special character with exactly those keys. Without a file it reads `~/vc/mac-config/shortcuts.yaml`. The combination is typed in words or symbols: `ctrl`/`control`, `opt`/`option`/`alt`, `shift`, `cmd`/`command`, `space`, `return`/`enter`, `backspace`/`delete`, `tab`, `up`/`down`/`left`/`right`, `minus`, `keypad`, or `⌃⌥⌘↓`. Modifiers alone, such as `ctrl cmd shift`, list everything on that grip, sorted by key. When no entry uses the combination, it also lists the entries with the same key and other modifiers.

## Print the cheat sheet

```sh
node src/cli.js sheet ~/vc/mac-config/shortcuts.yaml --pdf
open shortcut-sheet.pdf
```

It writes `shortcut-sheet.html`, or the path given after the map, and with `--pdf` also `shortcut-sheet.pdf` beside it: one A4 page in landscape with the entries the map places on the sheet, chapter by chapter, and every special character. It prints the sheet in Google Chrome, without opening a window, and checks it, then reports:

```
shortcut-sheet.html: 54 rows, 24 characters, 1 page, printed with Google Chrome
```

Without Google Chrome, or with a Chrome too new for the installed Playwright, it prints with Playwright's own Chromium instead, which has to be downloaded once:

```sh
npx playwright install chromium
```

When the sheet prints to more than one page, a row wraps onto a second line or a key cap is cut off, it names each problem and exits with 1; a shorter `label` in the map's `sheet` place fixes a row. Both files are ignored by git.

## Input

`shortcuts.yaml` is kept in a private configuration repository. Its header explains the fields: entries with their keys, status, verdict and place on the cheat sheet; the special characters; the combinations no entry uses; and the rules for choosing keys. `examples/shortcuts.yaml` uses every form of key string the format allows.

## Files

| Path                      | Contains                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/`                    | The tool; its README names the layers of its modules and shows their imports                          |
| `src/cli.js`              | The command line: `check`, `overview`, `lookup` and `sheet`; the only part that reads or writes files |
| `scripts/`                | `module-diagram.js`, which writes the import diagram into `src/README.md`                             |
| `tests/`                  | The tests, run by `npm run check`                                                                     |
| `examples/`               | An invented shortcut map                                                                              |
| `package.json`            | The scripts (`check`, `test`, `format`, `diagram`) and the pinned dependencies                        |
| `.github/`                | The CI workflow that runs `npm run check` on every push and pull request                              |
| `eslint.config.js`        | The linter configuration                                                                              |
| `.prettierrc.json`        | The formatter configuration                                                                           |
| `.nvmrc`                  | The Node.js version CI uses                                                                           |
| `project-instructions.md` | The rules Claude follows in this repository; `CLAUDE.md` imports it                                   |

## Known limits

The cheat sheet's check measures the sheet with the fonts of the machine it runs on, so a sheet that fits on one Mac can wrap on another with other fonts; run `sheet` on the Mac that prints it.

## License

MIT. See [LICENSE](LICENSE).
