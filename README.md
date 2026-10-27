# mac-shortcut-map

A tool for keeping track of the keyboard shortcuts on a Mac. It renders a shortcut map, kept as a YAML file outside this repository, into an overview page, a lookup of what uses a key combination, and a printable one-page cheat sheet. The repository holds the tool only, no shortcut data.

## Getting started

Requires Node.js 22 or later and git.

```sh
git clone https://github.com/tiavelum/mac-shortcut-map.git ~/vc/mac-shortcut-map
cd ~/vc/mac-shortcut-map
npm ci
npm run check
```

The last command runs the formatter and linter checks and ends with:

```
Checking formatting...
All matched files use Prettier code style!
```

## Input

The tool reads `shortcuts.yaml` from a private configuration repository, for example `~/vc/mac-config/shortcuts.yaml`. The file's header explains its fields: entries with their keys, status, verdict and place on the cheat sheet; the special characters; the combinations no entry uses; and the rules for choosing keys.

## Files

| Path                      | Contains                                                                 |
| ------------------------- | ------------------------------------------------------------------------ |
| `package.json`            | The scripts (`check`, `format`) and the pinned development tools         |
| `.github/`                | The CI workflow that runs `npm run check` on every push and pull request |
| `eslint.config.js`        | The linter configuration                                                 |
| `.prettierrc.json`        | The formatter configuration                                              |
| `.nvmrc`                  | The Node.js version CI uses                                              |
| `project-instructions.md` | The rules Claude follows in this repository; `CLAUDE.md` imports it      |

## Known limits

It does not read the shortcut map or produce any output yet; only the code checks run.

## License

MIT. See [LICENSE](LICENSE).
