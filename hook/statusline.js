#!/usr/bin/env node
// Clavis — Claude Code context usage statusline
// Shows: model | current task | directory | session time | context usage bar

const fs = require('fs');
const path = require('path');
const os = require('os');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || '';
    const remaining = data.context_window?.remaining_percentage;

    // Context window bar (shows USED percentage)
    let ctx = '';
    if (remaining != null) {
      const used = Math.max(0, Math.min(100, 100 - Math.round(remaining)));
      const filled = Math.floor(used / 10);
      const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);

      if (used < 50) {
        ctx = ` \x1b[32m${bar} ${used}%\x1b[0m`;
      } else if (used < 65) {
        ctx = ` \x1b[33m${bar} ${used}%\x1b[0m`;
      } else if (used < 80) {
        ctx = ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
      } else {
        ctx = ` \x1b[5;31m\uD83D\uDC80 ${bar} ${used}%\x1b[0m`;
      }
    }

    // Current task from todos
    let task = '';
    const homeDir = os.homedir();
    const todosDir = path.join(homeDir, '.claude', 'todos');
    if (session && fs.existsSync(todosDir)) {
      const files = fs.readdirSync(todosDir)
        .filter(f => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > 0) {
        try {
          const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
          const inProgress = todos.find(t => t.status === 'in_progress');
          if (inProgress) task = inProgress.activeForm || '';
        } catch (e) {}
      }
    }

    // Session timer — persist start time in a temp file keyed by session ID
    let elapsed = '';
    if (session) {
      const tmpDir = path.join(os.tmpdir(), 'clavis');
      const timerFile = path.join(tmpDir, `session-${session}.txt`);
      try {
        let startTime;
        if (fs.existsSync(timerFile)) {
          startTime = parseInt(fs.readFileSync(timerFile, 'utf8'), 10);
        } else {
          startTime = Date.now();
          fs.mkdirSync(tmpDir, { recursive: true });
          fs.writeFileSync(timerFile, String(startTime));
        }
        const secs = Math.floor((Date.now() - startTime) / 1000);
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        const time = h > 0
          ? `${h}h${String(m).padStart(2, '0')}m`
          : `${m}m${String(s).padStart(2, '0')}s`;
        elapsed = ` \u2502 \x1b[2m\u23f1 ${time}\x1b[0m`;
      } catch (e) {}
    }

    // Update indicator — check if auto-update applied this session
    let updateTag = '';
    try {
      const updateFile = path.join(os.tmpdir(), 'clavis', 'update-result.json');
      if (fs.existsSync(updateFile)) {
        const result = JSON.parse(fs.readFileSync(updateFile, 'utf8'));
        if (result.updated) {
          updateTag = `\x1b[33m\u2B06 updated\x1b[0m \u2502 `;
        }
      }
    } catch (e) {}

    // Output
    const dirname = path.basename(dir);
    if (task) {
      process.stdout.write(`${updateTag}\x1b[2m${model}\x1b[0m \u2502 \x1b[1m${task}\x1b[0m \u2502 \x1b[2m${dirname}\x1b[0m${elapsed}${ctx}`);
    } else {
      process.stdout.write(`${updateTag}\x1b[2m${model}\x1b[0m \u2502 \x1b[2m${dirname}\x1b[0m${elapsed}${ctx}`);
    }
  } catch (e) {
    // Silent fail — don't break statusline on parse errors
  }
});
