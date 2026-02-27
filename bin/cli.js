#!/usr/bin/env node
// Clavis installer — sets up Claude Code context statusline in the current repo

const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const claudeDir = path.join(cwd, '.claude');
const hooksDir = path.join(claudeDir, 'hooks');
const hookDest = path.join(hooksDir, 'statusline.js');
const settingsPath = path.join(claudeDir, 'settings.json');

const hookSrc = path.join(__dirname, '..', 'hook', 'statusline.js');

const statusLineConfig = {
  type: 'command',
  command: 'node .claude/hooks/statusline.js'
};

// 1. Ensure .claude/hooks/ exists
fs.mkdirSync(hooksDir, { recursive: true });

// 2. Copy statusline hook
fs.copyFileSync(hookSrc, hookDest);
console.log('  Copied statusline hook to .claude/hooks/statusline.js');

// 3. Merge statusLine into settings.json
let settings = {};
if (fs.existsSync(settingsPath)) {
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    console.log('  Warning: could not parse existing settings.json, creating fresh');
    settings = {};
  }
}

if (settings.statusLine) {
  console.log('  statusLine already configured in settings.json — skipped');
} else {
  settings.statusLine = statusLineConfig;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  console.log('  Added statusLine config to .claude/settings.json');
}

// 4. Success message
console.log();
console.log('  \x1b[32m✓\x1b[0m Clavis installed!');
console.log();
console.log('  Preview:');
console.log(`  \x1b[2mClaude Opus 4.6\x1b[0m │ \x1b[2myour-repo\x1b[0m \x1b[32m██░░░░░░░░ 20%\x1b[0m`);
console.log();
console.log('  The statusline will appear at the bottom of Claude Code.');
