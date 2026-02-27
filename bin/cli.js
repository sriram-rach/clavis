#!/usr/bin/env node
// Clavis installer — sets up Claude Code context statusline in the current repo

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const cwd = process.cwd();
const claudeDir = path.join(cwd, '.claude');
const hooksDir = path.join(claudeDir, 'hooks');
const hookDest = path.join(hooksDir, 'statusline.js');
const settingsPath = path.join(claudeDir, 'settings.json');

const hookSrc = path.join(__dirname, '..', 'hook', 'statusline.js');
const updateHookSrc = path.join(__dirname, '..', 'hook', 'check-update.js');
const updateWorkerSrc = path.join(__dirname, '..', 'hook', 'check-update-worker.js');
const pkgJson = require(path.join(__dirname, '..', 'package.json'));

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

// 4. Ask about auto-update
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('  Enable auto-update? (Y/n) ', (answer) => {
  rl.close();

  const enable = !answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';

  if (enable) {
    installAutoUpdate();
  } else {
    console.log('  Auto-update skipped');
  }

  printSuccess();
});

function installAutoUpdate() {
  // Copy check-update hook + worker
  const destHook = path.join(hooksDir, 'clavis-check-update.js');
  const destWorker = path.join(hooksDir, 'clavis-check-update-worker.js');
  fs.copyFileSync(updateHookSrc, destHook);
  fs.copyFileSync(updateWorkerSrc, destWorker);
  console.log('  Copied auto-update hook to .claude/hooks/');

  // Write version file
  const versionFile = path.join(hooksDir, 'clavis-version.txt');
  fs.writeFileSync(versionFile, pkgJson.version + '\n');
  console.log(`  Wrote version ${pkgJson.version} to .claude/hooks/clavis-version.txt`);

  // Merge SessionStart hook into settings.json
  // Re-read settings in case it was written above
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    settings = {};
  }

  if (!settings.hooks) settings.hooks = {};
  if (!Array.isArray(settings.hooks.SessionStart)) settings.hooks.SessionStart = [];

  const hookCommand = 'node .claude/hooks/clavis-check-update.js';
  const alreadyExists = settings.hooks.SessionStart.some(
    h => h.command === hookCommand
  );

  if (alreadyExists) {
    console.log('  SessionStart hook already configured — skipped');
  } else {
    settings.hooks.SessionStart.push({
      type: 'command',
      command: hookCommand
    });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    console.log('  Added SessionStart hook to .claude/settings.json');
  }
}

function printSuccess() {
  console.log();
  console.log('  \x1b[32m✓\x1b[0m Clavis installed!');
  console.log();
  console.log('  Preview:');
  console.log(`  \x1b[2mClaude Opus 4.6\x1b[0m │ \x1b[2myour-repo\x1b[0m \x1b[32m██░░░░░░░░ 20%\x1b[0m`);
  console.log();
  console.log('  The statusline will appear at the bottom of Claude Code.');
}
