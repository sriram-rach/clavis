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

A real-time statusline that shows you the active model, current task, working directory, session time, and context usage at a glance — with a color-coded progress bar that shifts from green to red as context fills up.

### Tool Call Tracking

Tracks the number of tool calls made during a session and the last tool used, displayed live in the statusline (e.g. `⚙ 12 Edit`).

### Session Cost

Shows the approximate running cost of the current session in the statusline (e.g. `~$0.0142`), calculated from token usage across all turns. Rates are sourced from the LiteLLM pricing registry and cached locally for 24 hours — they may not always reflect Anthropic's latest published prices.

### Auto-Update

Clavis automatically checks for updates at the start of each Claude Code session and silently updates hooks in the background — no manual intervention needed.

## How It Works

Running `npx @sriram-rach/clavis` in your repo root will:

1. Create `.claude/hooks/statusline.js` — the statusline hook
2. Add a `statusLine` entry to `.claude/settings.json` — tells Claude Code to use it
3. Optionally create `.claude/hooks/clavis-track-tools.js` — the tool tracking hook
4. Optionally add a `PostToolUse` entry to `.claude/settings.json` — enables tool tracking

It's idempotent — running it again skips any settings already configured.

## Uninstall

Delete the hooks and remove the settings entries:

```bash
rm .claude/hooks/statusline.js
rm .claude/hooks/clavis-track-tools.js  # if tool tracking was enabled
```

Then remove the `"statusLine"` key and the `PostToolUse` hook entry from `.claude/settings.json`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[MIT](LICENSE) — see the [LICENSE](LICENSE) file for details.
