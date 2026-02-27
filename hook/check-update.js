#!/usr/bin/env node
// Clavis — SessionStart hook for auto-updating
// Spawns a detached background process that checks npm for newer versions

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const homeDir = os.homedir();
const cwd = process.cwd();
const cacheDir = path.join(homeDir, '.claude', 'cache');
const cacheFile = path.join(cacheDir, 'clavis-update-check.json');
const versionFile = path.join(cwd, '.claude', 'hooks', 'clavis-version.txt');

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Spawn detached background worker via inline script
const child = spawn(process.execPath, ['-e', `
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { execSync } = require('child_process');

  const PKG = '@sriram-rach/clavis';
  const cacheFile = ${JSON.stringify(cacheFile)};
  const versionFile = ${JSON.stringify(versionFile)};
  const cwd = ${JSON.stringify(cwd)};

  function writeCache(obj) {
    fs.writeFileSync(cacheFile, JSON.stringify({ ...obj, checked: Math.floor(Date.now() / 1000) }));
  }

  try {
    // Read installed version
    let installed = '0.0.0';
    if (fs.existsSync(versionFile)) {
      installed = fs.readFileSync(versionFile, 'utf8').trim();
    }

    // Query npm for latest version
    let latest = null;
    try {
      latest = execSync('npm view ' + PKG + ' version', {
        encoding: 'utf8', timeout: 10000, windowsHide: true
      }).trim();
    } catch (e) {}

    if (!latest) {
      writeCache({ update_available: false, installed, latest: 'unknown' });
      process.exit(0);
    }

    // Compare semver to avoid downgrades
    const pa = installed.split('.').map(Number);
    const pb = latest.split('.').map(Number);
    let newer = false;
    for (let i = 0; i < 3; i++) {
      if ((pb[i] || 0) > (pa[i] || 0)) { newer = true; break; }
      if ((pb[i] || 0) < (pa[i] || 0)) break;
    }

    if (!newer) {
      writeCache({ update_available: false, installed, latest });
      process.exit(0);
    }

    // Download and extract newer version
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clavis-update-'));
    try {
      execSync('npm pack ' + PKG + '@' + latest, { cwd: tmpDir, timeout: 30000, stdio: 'ignore', windowsHide: true });
      const tarball = fs.readdirSync(tmpDir).find(f => f.endsWith('.tgz'));
      if (!tarball) throw new Error('no tarball');
      execSync('tar -xzf "' + tarball + '"', { cwd: tmpDir, timeout: 10000, stdio: 'ignore', windowsHide: true });

      const pkgDir = path.join(tmpDir, 'package', 'hook');
      const hooksDir = path.join(cwd, '.claude', 'hooks');
      const files = [['statusline.js', 'statusline.js'], ['check-update.js', 'clavis-check-update.js']];
      for (const [src, dest] of files) {
        const s = path.join(pkgDir, src);
        if (fs.existsSync(s)) fs.copyFileSync(s, path.join(hooksDir, dest));
      }
      fs.writeFileSync(versionFile, latest + '\\n');
      writeCache({ update_available: false, installed, latest, updated: true });
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    }
  } catch (e) {
    // Silent fail
  }
`], {
  stdio: 'ignore',
  windowsHide: true,
  detached: true
});

child.unref();
