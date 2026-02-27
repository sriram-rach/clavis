# clavis

Install a color-coded context usage statusline for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```
npx clavis
```

Run in any repo to add a statusline that shows:

- **Model** — which Claude model is active
- **Current task** — the in-progress task from your todo list
- **Directory** — current working directory
- **Context usage** — a 10-segment progress bar with color coding

## Context bar colors

| Usage | Color |
|-------|-------|
| < 50% | Green |
| 50–65% | Yellow |
| 65–80% | Orange |
| > 80% | Red (blinking) |

## What it does

Running `npx clavis` in your repo root will:

1. Create `.claude/hooks/statusline.js` — the statusline script
2. Add a `statusLine` entry to `.claude/settings.json` — tells Claude Code to use it

It's idempotent — running it again skips the settings update if already configured.

## Uninstall

Delete the two files it created:

```
rm .claude/hooks/statusline.js
```

Then remove the `"statusLine"` key from `.claude/settings.json`.

## License

MIT
