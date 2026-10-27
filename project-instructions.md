Repository tiavelum/mac-shortcut-map.

A public tool that renders a keyboard shortcut map, kept as a data file in a separate private repository, into an overview page, a key-combination lookup and a printable cheat sheet.

- The repository holds no personal data: never commit the shortcut map, any other file from the user's private config, or output generated from it. Tests and examples use invented data.
- A change is done when `npm run check` passes. Run it; if you cannot, wait for the CI run of your commit and report its result.
