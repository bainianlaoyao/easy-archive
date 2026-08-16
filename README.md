# easy-archive

A DSH (DeepSeek Harness) web plugin that moves session archiving out of the
kebab (⋮) menu and onto the workspace sidebar row itself, as a two-step
inline button:

1. **Hover a session row** — an archive icon appears right next to the ⋮ button.
2. **Click once** — the button switches to a red **「确认归档 / Confirm archive」** pill.
3. **Click again** — the session is archived.

The **archive item is removed from the ⋮ menu** — archiving lives only on the
row, never buried in a submenu.

## Features

- Inline, two-click archive on every session row (one click arms the red
  confirm, the second commits).
- Archive entry automatically hidden from the ⋮ menu whenever it opens
  (rename / fork stay where they are).
- No slot takeover: the stock workspace browser keeps rendering; rename,
  fork, search, drag-reorder and everything else stay intact.
- Archive runs through the same wire call the built-in menu used
  (`ctx.workspaces.archiveSession`), so behavior and permissions are identical.
- Safety nets: the armed confirm auto-disarms after 4s, on mouse-leave, or on
  any click elsewhere; rows with ambiguous identities never get a button
  rather than risk archiving the wrong session.
- Locale-aware (zh / en), no build step, no React dependency.

## Install

From the DSH plugin market (recommended):

```
dsh plugin --profile web add github:bainianlaoyao/easy-archive
```

…or add it manually to the web profile's `package.json`:

```json
{
  "dependencies": { "easy-archive": "github:bainianlaoyao/easy-archive" },
  "dsh": { "profile": { "bundles": [ "...", "easy-archive" ] } }
}
```

then `pnpm install` in the profile directory and restart `dsh web`
(new plugins enter the `window.__DSH_BOOT__` graph at boot; later edits to
`lib/client.js` hot-apply on refresh).

## How it works

The host half (`lib/index.js`) is an inert plugin row that carries the
`dsh.client` declaration into the profile's loader graph; the browser half
(`lib/client.js`) observes the sidebar DOM and, for every rendered session
row:

- resolves the session id exactly from the `ctx.sessions.list` snapshot by
  display title (disambiguated by the rendered relative-time bucket when
  titles repeat),
- stamps the row with the id and inserts a 16px archive button into the row's
  action cell, before the kebab,
- removes the archive item from any ⋮ menu it sees open.

Clicking the button never bubbles to the row's "open session" handler.

## Notes

- Blank "New Session" rows and search-result rows never get the button.
- Sessions whose display title and time bucket collide are skipped
  (conservative: no wrong-session archives).
- Uninstall: remove the dependency and bundles entry, `pnpm install`,
  restart `dsh web`.

## License

MIT
