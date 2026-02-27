#!/usr/bin/env node
// Clavis — SessionStart hook for auto-updating the statusline hook
// Spawns a detached background process that checks npm for newer versions

const { spawn } = require('child_process');
const path = require('path');

// Spawn detached child that does the actual update check
const child = spawn(process.execPath, [path.join(__dirname, 'check-update-worker.js')], {
  detached: true,
  stdio: 'ignore',
  env: { ...process.env, CLAVIS_CWD: process.cwd() }
});
child.unref();
