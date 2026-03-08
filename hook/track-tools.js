#!/usr/bin/env node
// Clavis — PostToolUse hook: tracks tool call count and last tool used per session

const fs = require('fs');
const path = require('path');
const os = require('os');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const session = data.session_id || '';
    const toolName = data.tool_name || '';

    if (!session || !toolName) return;

    const tmpDir = path.join(os.tmpdir(), 'clavis');
    const stateFile = path.join(tmpDir, `tools-${session}.json`);

    fs.mkdirSync(tmpDir, { recursive: true });

    let state = { tool_count: 0, last_tool: '' };
    if (fs.existsSync(stateFile)) {
      try { state = { ...state, ...JSON.parse(fs.readFileSync(stateFile, 'utf8')) }; } catch (e) {}
    }

    state.tool_count = (state.tool_count || 0) + 1;
    state.last_tool = toolName;

    // PostToolUse payload has no `usage` field — read token usage from the transcript instead.
    // The transcript is a JSONL file; sum all completed assistant messages for session totals.
    const transcriptPath = data.transcript_path || '';
    if (transcriptPath && fs.existsSync(transcriptPath)) {
      try {
        const lines = fs.readFileSync(transcriptPath, 'utf8').trimEnd().split('\n');
        let totalInput = 0, totalCacheCreate = 0, totalCacheRead = 0, totalOutput = 0;
        // Sum all completed assistant messages (stop_reason set, output_tokens > 0).
        // Track each token category separately so the statusline can apply the correct rate.
        for (const line of lines) {
          const entry = JSON.parse(line);
          const msg = entry?.message;
          if (entry?.type === 'assistant' && msg?.stop_reason && msg?.usage && (msg.usage.output_tokens || 0) > 0) {
            const usage = msg.usage;
            totalInput       += (usage.input_tokens || 0);
            totalCacheCreate += (usage.cache_creation_input_tokens || 0);
            totalCacheRead   += (usage.cache_read_input_tokens || 0);
            totalOutput      += (usage.output_tokens || 0);
          }
        }
        if (totalInput > 0 || totalCacheCreate > 0 || totalCacheRead > 0 || totalOutput > 0) {
          state.input_tokens         = totalInput;
          state.cache_creation_tokens = totalCacheCreate;
          state.cache_read_tokens    = totalCacheRead;
          state.output_tokens        = totalOutput;
        }
      } catch (e) {}
    }

    fs.writeFileSync(stateFile, JSON.stringify(state));
  } catch (e) {
    // Silent fail
  }
});
