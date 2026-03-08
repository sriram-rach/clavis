#!/usr/bin/env node
// Clavis — Claude Code context usage statusline
// Shows: model | current task | directory | session time | tool calls | cost | context usage bar

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Fallback pricing: [inputRate, cacheCreateRate, cacheReadRate, outputRate] per 1M tokens (USD)
const FALLBACK_PRICING = {
  opus:   [15,   18.75, 1.5,   75],
  sonnet: [3,    3.75,  0.3,   15],
  haiku:  [0.25, 0.3,   0.025, 1.25],
};
const PRICING_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
const PRICING_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function loadPricingCache(cacheDir) {
  try {
    const f = path.join(cacheDir, 'clavis-pricing.json');
    if (fs.existsSync(f)) {
      const c = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (Date.now() - (c.fetched || 0) < PRICING_CACHE_TTL) return c.models || null;
    }
  } catch (e) {}
  return null;
}

function getPricing(modelId, cachedModels) {
  // Returns [inputRate, cacheCreateRate, cacheReadRate, outputRate] per 1M tokens
  const id = (modelId || '').toLowerCase();
  if (cachedModels) {
    // 1. Exact match
    if (cachedModels[id] && cachedModels[id].length === 4) return cachedModels[id];
    // 2. Longest cache key that is a prefix of the model ID (e.g. "claude-sonnet-4-6" matches "claude-sonnet-4-6-20251101")
    let best = null, bestLen = 0;
    for (const [key, rates] of Object.entries(cachedModels)) {
      if ((id.startsWith(key) || key.startsWith(id)) && key.length > bestLen && rates.length === 4) {
        best = rates; bestLen = key.length;
      }
    }
    if (best) return best;
  }
  // Hardcoded fallback
  if (id.includes('opus'))  return FALLBACK_PRICING.opus;
  if (id.includes('haiku')) return FALLBACK_PRICING.haiku;
  return FALLBACK_PRICING.sonnet;
}

function formatToolName(name) {
  if (!name) return '';
  // Strip mcp__ prefix and use the last segment (the function name)
  if (name.startsWith('mcp__')) {
    const parts = name.split('__');
    name = parts[parts.length - 1];
  }
  return name.length > 14 ? name.slice(0, 13) + '\u2026' : name;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const modelId = data.model?.id || '';
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || '';
    const remaining = data.context_window?.remaining_percentage;
    const homeDir = os.homedir();
    const cacheDir = path.join(homeDir, '.claude', 'cache');
    const cachedModels = loadPricingCache(cacheDir);

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

    // Tool call counter, last tool, and cost — read from session temp file written by track-tools.js
    let toolInfo = '';
    let costInfo = '';
    if (session) {
      try {
        const toolStateFile = path.join(os.tmpdir(), 'clavis', `tools-${session}.json`);
        if (fs.existsSync(toolStateFile)) {
          const toolState = JSON.parse(fs.readFileSync(toolStateFile, 'utf8'));

          const count = toolState.tool_count || 0;
          const lastTool = toolState.last_tool || '';
          if (count > 0) {
            const name = formatToolName(lastTool);
            const label = name ? `${count} \x1b[2m${name}\x1b[0m` : `${count}`;
            toolInfo = ` \u2502 \u2699 ${label}`;
          }

          const inputTokens       = toolState.input_tokens          || 0;
          const cacheCreateTokens = toolState.cache_creation_tokens  || 0;
          const cacheReadTokens   = toolState.cache_read_tokens       || 0;
          const outputTokens      = toolState.output_tokens           || 0;
          if (inputTokens > 0 || cacheCreateTokens > 0 || cacheReadTokens > 0 || outputTokens > 0) {
            const [inputRate, cacheCreateRate, cacheReadRate, outputRate] = getPricing(modelId, cachedModels);
            const cost = (
              inputTokens       * inputRate       +
              cacheCreateTokens * cacheCreateRate +
              cacheReadTokens   * cacheReadRate   +
              outputTokens      * outputRate
            ) / 1_000_000;
            if (cost > 0) {
              costInfo = ` \u2502 \x1b[2m~\$${cost.toFixed(4)}\x1b[0m`;
            }
          }
        }
      } catch (e) {}
    }

    // Update indicator — check cached update-check result
    let updateTag = '';
    try {
      const cacheFile = path.join(homeDir, '.claude', 'cache', 'clavis-update-check.json');
      if (fs.existsSync(cacheFile)) {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (cache.update_available) {
          updateTag = `\x1b[33m\u2B06 update available\x1b[0m \u2502 `;
        }
      }
    } catch (e) {}

    // Refresh pricing cache in background if stale or missing
    try {
      const pricingCacheFile = path.join(cacheDir, 'clavis-pricing.json');
      let needsRefresh = true;
      if (fs.existsSync(pricingCacheFile)) {
        const c = JSON.parse(fs.readFileSync(pricingCacheFile, 'utf8'));
        if (Date.now() - (c.fetched || 0) < PRICING_CACHE_TTL) needsRefresh = false;
      }
      if (needsRefresh) {
        const child = spawn(process.execPath, ['-e', `
          const https = require('https');
          const fs = require('fs');
          const cacheFile = ${JSON.stringify(pricingCacheFile)};
          const cacheDir = ${JSON.stringify(cacheDir)};
          const req = https.get(${JSON.stringify(PRICING_URL)}, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
              try {
                const all = JSON.parse(body);
                const models = {};
                for (const [k, v] of Object.entries(all)) {
                  if (!v.input_cost_per_token || !v.output_cost_per_token) continue;
                  // Match keys like "claude-*" or "anthropic.claude-*" (strip provider prefix)
                  const modelKey = k.includes('claude-') ? k.replace(/^[^.]+\./, '') : null;
                  if (modelKey && modelKey.startsWith('claude-')) {
                    models[modelKey] = [
                      +(v.input_cost_per_token * 1e6).toFixed(6),
                      +((v.cache_creation_input_token_cost || v.input_cost_per_token * 1.25) * 1e6).toFixed(6),
                      +((v.cache_read_input_token_cost    || v.input_cost_per_token * 0.10) * 1e6).toFixed(6),
                      +(v.output_cost_per_token * 1e6).toFixed(6)
                    ];
                  }
                }
                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
                fs.writeFileSync(cacheFile, JSON.stringify({ fetched: Date.now(), models }));
              } catch (e) {}
            });
          });
          req.on('error', () => {});
          req.setTimeout(10000, () => req.destroy());
        `], { stdio: 'ignore', detached: true, windowsHide: true });
        child.unref();
      }
    } catch (e) {}

    // Output
    const dirname = path.basename(dir);
    if (task) {
      process.stdout.write(`${updateTag}\x1b[2m${model}\x1b[0m \u2502 \x1b[1m${task}\x1b[0m \u2502 \x1b[2m${dirname}\x1b[0m${elapsed}${toolInfo}${costInfo}${ctx}`);
    } else {
      process.stdout.write(`${updateTag}\x1b[2m${model}\x1b[0m \u2502 \x1b[2m${dirname}\x1b[0m${elapsed}${toolInfo}${costInfo}${ctx}`);
    }
  } catch (e) {
    // Silent fail — don't break statusline on parse errors
  }
});
