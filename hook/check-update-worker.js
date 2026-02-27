#!/usr/bin/env node
// Clavis — background worker for auto-update check (spawned by check-update.js)
// Checks npm for newer version, downloads and extracts if available

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PKG = '@sriram-rach/clavis';
const resultDir = path.join(os.tmpdir(), 'clavis');
const resultFile = path.join(resultDir, 'update-result.json');

function writeResult(obj) {
  fs.mkdirSync(resultDir, { recursive: true });
  fs.writeFileSync(resultFile, JSON.stringify({ ...obj, checked: new Date().toISOString() }) + '\n');
}

try {
  // Read installed version
  const cwd = process.env.CLAVIS_CWD || process.cwd();
  const versionFile = path.join(cwd, '.claude', 'hooks', 'clavis-version.txt');
  if (!fs.existsSync(versionFile)) {
    writeResult({ updated: false, reason: 'no version file' });
    process.exit(0);
  }
  const installed = fs.readFileSync(versionFile, 'utf8').trim();

  // Check latest version on npm (10s timeout)
  let latest;
  try {
    latest = execSync(`npm view ${PKG} version`, { timeout: 10000, encoding: 'utf8' }).trim();
  } catch (e) {
    writeResult({ updated: false, from: installed, reason: 'npm check failed' });
    process.exit(0);
  }

  if (installed === latest) {
    writeResult({ updated: false, from: installed, to: latest });
    process.exit(0);
  }

  // Newer version available — download and extract
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clavis-update-'));
  try {
    execSync(`npm pack ${PKG}@${latest}`, { cwd: tmpDir, timeout: 30000, stdio: 'ignore' });

    // Find the tarball
    const tarball = fs.readdirSync(tmpDir).find(f => f.endsWith('.tgz'));
    if (!tarball) throw new Error('no tarball found');

    // Extract
    execSync(`tar -xzf "${tarball}"`, { cwd: tmpDir, timeout: 10000, stdio: 'ignore' });

    // Copy new statusline hook
    const newStatusline = path.join(tmpDir, 'package', 'hook', 'statusline.js');
    const destStatusline = path.join(cwd, '.claude', 'hooks', 'statusline.js');
    if (fs.existsSync(newStatusline)) {
      fs.copyFileSync(newStatusline, destStatusline);
    }

    // Copy new check-update hook + worker
    const newCheckUpdate = path.join(tmpDir, 'package', 'hook', 'check-update.js');
    const destCheckUpdate = path.join(cwd, '.claude', 'hooks', 'clavis-check-update.js');
    if (fs.existsSync(newCheckUpdate)) {
      fs.copyFileSync(newCheckUpdate, destCheckUpdate);
    }
    const newWorker = path.join(tmpDir, 'package', 'hook', 'check-update-worker.js');
    const destWorker = path.join(cwd, '.claude', 'hooks', 'clavis-check-update-worker.js');
    if (fs.existsSync(newWorker)) {
      fs.copyFileSync(newWorker, destWorker);
    }

    // Update version file
    fs.writeFileSync(versionFile, latest + '\n');

    writeResult({ updated: true, from: installed, to: latest });
  } finally {
    // Clean up temp dir
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
  }
} catch (e) {
  writeResult({ updated: false, reason: String(e.message || e) });
}
