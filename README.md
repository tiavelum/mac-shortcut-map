# mac-shortcut-map

A tool for keeping track of the keyboard shortcuts on a Mac. It renders a shortcut map, kept as a YAML file outside this repository, into an overview page, a lookup of what uses a key combination, and a printable one-page cheat sheet. The repository holds the tool only, no shortcut data.

## Getting started

Requires Node.js 22 or later and git.

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

## Input

`shortcuts.yaml` is kept in a private configuration repository. Its header explains the fields: entries with their keys, status, verdict and place on the cheat sheet; the special characters; the combinations no entry uses; and the rules for choosing keys. `examples/shortcuts.yaml` uses every form of key string the format allows.

## Files

| Path                      | Contains                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/shortcuts.js`        | Reads and checks a shortcut map and parses its key strings; takes the file's text, not the file |
| `src/cli.js`              | The command line; the only part that reads files                                                |
| `tests/`                  | The tests, run by `npm run check`                                                               |
| `examples/`               | An invented shortcut map                                                                        |
| `package.json`            | The scripts (`check`, `test`, `format`) and the pinned dependencies                             |
| `.github/`                | The CI workflow that runs `npm run check` on every push and pull request                        |
| `eslint.config.js`        | The linter configuration                                                                        |
| `.prettierrc.json`        | The formatter configuration                                                                     |
| `.nvmrc`                  | The Node.js version CI uses                                                                     |
| `project-instructions.md` | The rules Claude follows in this repository; `CLAUDE.md` imports it                             |

## Known limits

It reads and checks a shortcut map but renders no overview, lookup or cheat sheet yet.

## License

MIT. See [LICENSE](LICENSE).
