# mac-shortcut-map

A tool for keeping track of the keyboard shortcuts on a Mac. It renders a shortcut map, kept as a YAML file outside this repository, into an overview page, a lookup of what uses a key combination, and a printable one-page cheat sheet. The repository holds the tool only, no shortcut data.

## Getting started

Requires macOS or Linux, git, and Node.js 22 or later. On a Mac, install Node.js with Homebrew and check its version:

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

The page is one HTML file that opens in any browser, light or dark. Its findings sit at the top, then five tabs:

- **By source:** one table per source.
- **All in one table:** sortable by column, with a text filter and toggles for switched-on, system-wide and to-review entries.
- **Key map:** every grip of one to three modifiers, except ⇧ alone, with every easy key of the rules that has a key cap of its own, and what uses each cell.
- **Unused combinations** and **Special characters.**

`shortcut-overview.html` is ignored by git, because it holds the personal map.

## Input

`shortcuts.yaml` is kept in a private configuration repository. Its header explains the fields: entries with their keys, status, verdict and place on the cheat sheet; the special characters; the combinations no entry uses; and the rules for choosing keys. `examples/shortcuts.yaml` uses every form of key string the format allows.

## Files

| Path                      | Contains                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `src/`                    | The tool; its README names the layers of its modules and shows their imports       |
| `src/cli.js`              | The command line: `check` and `overview`; the only part that reads or writes files |
| `scripts/`                | `module-diagram.js`, which writes the import diagram into `src/README.md`          |
| `tests/`                  | The tests, run by `npm run check`                                                  |
| `examples/`               | An invented shortcut map                                                           |
| `package.json`            | The scripts (`check`, `test`, `format`, `diagram`) and the pinned dependencies     |
| `.github/`                | The CI workflow that runs `npm run check` on every push and pull request           |
| `eslint.config.js`        | The linter configuration                                                           |
| `.prettierrc.json`        | The formatter configuration                                                        |
| `.nvmrc`                  | The Node.js version CI uses                                                        |
| `project-instructions.md` | The rules Claude follows in this repository; `CLAUDE.md` imports it                |

## Known limits

It renders the overview page, but no key-combination lookup or cheat sheet yet.

## License

MIT. See [LICENSE](LICENSE).
