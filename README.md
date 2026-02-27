```
      ___           ___           ___           ___                       ___
     /\  \         /\__\         /\  \         /\__\          ___        /\  \
    /::\  \       /:/  /        /::\  \       /:/  /         /\  \      /::\  \
   /:/\:\  \     /:/  /        /:/\:\  \     /:/  /          \:\  \    /:/\ \  \
  /:/  \:\  \   /:/  /        /::\~\:\  \   /:/__/  ___      /::\__\  _\:\~\ \  \
 /:/__/ \:\__\ /:/__/        /:/\:\ \:\__\  |:|  | /\__\  __/:/\/__/ /\ \:\ \ \__\
 \:\  \  \/__/ \:\  \        \/__\:\/:/  /  |:|  |/:/  / /\/:/  /    \:\ \:\ \/__/
  \:\  \        \:\  \            \::/  /   |:|__/:/  /  \::/__/      \:\ \:\__\
   \:\  \        \:\  \           /:/  /     \::::/__/    \:\__\       \:\/:/  /
    \:\__\        \:\__\         /:/  /       ~~~~         \/__/        \::/  /
     \/__/         \/__/         \/__/                                   \/__/
```

# clavis

> Powerful enhancements for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — unlock the full potential of your AI coding assistant.

[![npm version](https://img.shields.io/npm/v/@sriram-rach/clavis.svg)](https://www.npmjs.com/package/@sriram-rach/clavis)
[![license](https://img.shields.io/npm/l/@sriram-rach/clavis.svg)](https://github.com/sriram-rach/clavis/blob/main/LICENSE)

## Installation

### One-time use (no install needed)

```bash
npx @sriram-rach/clavis
```

### Global install

```bash
npm install -g @sriram-rach/clavis
```

Then run `clavis` in any repo.

### Local install (per-project)

```bash
npm install --save-dev @sriram-rach/clavis
```

Then run via npx or add it to your npm scripts:

```json
{
  "scripts": {
    "setup-claude": "clavis"
  }
}
```

## Features

### Context Usage Statusline

A real-time statusline that keeps you informed while Claude works:

- **Model** — which Claude model is active
- **Current task** — the in-progress task from your todo list
- **Directory** — current working directory
- **Context usage** — a 10-segment progress bar with color coding

#### Context bar colors

| Usage   | Color            |
|---------|------------------|
| < 50%   | Green            |
| 50–65%  | Yellow           |
| 65–80%  | Orange           |
| > 80%   | Red (blinking)   |

*More features coming soon.*

## How It Works

Running `npx @sriram-rach/clavis` in your repo root will:

1. Create `.claude/hooks/statusline.js` — the statusline hook
2. Add a `statusLine` entry to `.claude/settings.json` — tells Claude Code to use it

It's idempotent — running it again skips the settings update if already configured.

## Uninstall

Delete the hook and remove the settings entry:

```bash
rm .claude/hooks/statusline.js
```

Then remove the `"statusLine"` key from `.claude/settings.json`.

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** — breaking changes to CLI behavior or hook API
- **MINOR** — new features (backwards-compatible)
- **PATCH** — bug fixes and minor improvements

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[MIT](LICENSE) — see the [LICENSE](LICENSE) file for details.
