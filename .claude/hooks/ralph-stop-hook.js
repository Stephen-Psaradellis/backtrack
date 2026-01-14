#!/usr/bin/env node
/**
 * Ralph Wiggum Stop Hook - Windows Compatible (Node.js)
 *
 * Prevents session exit when a ralph-loop is active.
 * Feeds Claude's output back as input to continue the loop.
 *
 * This is a cross-platform alternative to the bash-based stop-hook.sh
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// State file location - use CLAUDE_PROJECT_DIR if available, otherwise cwd
// Note: The file has a leading dot (.ralph-loop.local.md) to keep it hidden
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const RALPH_STATE_FILE = path.join(PROJECT_DIR, '.claude', '.ralph-loop.local.md');

console.error('[ralph-hook] PROJECT_DIR:', PROJECT_DIR);
console.error('[ralph-hook] RALPH_STATE_FILE:', RALPH_STATE_FILE);

async function main() {
  try {
    // Read hook input from stdin
    const hookInput = await readStdin();
    console.error('[ralph-hook] Raw input length:', hookInput.length);

    let input;
    try {
      input = JSON.parse(hookInput);
      console.error('[ralph-hook] Parsed input keys:', Object.keys(input));
    } catch (e) {
      // No valid JSON input - allow exit
      console.error('[ralph-hook] Failed to parse JSON input:', e.message);
      console.error('[ralph-hook] First 200 chars:', hookInput.substring(0, 200));
      process.exit(0);
    }

    // Log stop_hook_active for debugging (but don't exit - ralph loop is designed to continue)
    console.error('[ralph-hook] stop_hook_active:', input.stop_hook_active);

    // Check if ralph-loop is active
    if (!fs.existsSync(RALPH_STATE_FILE)) {
      // No active loop - allow exit
      console.error('[ralph-hook] No state file found, allowing exit');
      process.exit(0);
    }

    console.error('[ralph-hook] State file exists, continuing...');

    // Read and parse state file
    const stateContent = fs.readFileSync(RALPH_STATE_FILE, 'utf-8');
    const { frontmatter, prompt } = parseStateFile(stateContent);

    if (!frontmatter || !prompt) {
      console.error('Warning: Ralph loop state file corrupted or incomplete');
      console.error('Ralph loop is stopping. Run /ralph-loop again to start fresh.');
      fs.unlinkSync(RALPH_STATE_FILE);
      process.exit(0);
    }

    const iteration = parseInt(frontmatter.iteration, 10);
    const maxIterations = parseInt(frontmatter.max_iterations, 10);
    const completionPromise = frontmatter.completion_promise?.replace(/^"|"$/g, '');

    // Validate numeric fields
    if (isNaN(iteration) || isNaN(maxIterations)) {
      console.error('Warning: Ralph loop state file has invalid iteration values');
      console.error('Ralph loop is stopping. Run /ralph-loop again to start fresh.');
      fs.unlinkSync(RALPH_STATE_FILE);
      process.exit(0);
    }

    // Check if max iterations reached
    if (maxIterations > 0 && iteration >= maxIterations) {
      console.error(`Ralph loop: Max iterations (${maxIterations}) reached.`);
      fs.unlinkSync(RALPH_STATE_FILE);
      process.exit(0);
    }

    // Get transcript path from hook input
    const transcriptPath = input.transcript_path;
    console.error('[ralph-hook] transcript_path:', transcriptPath);
    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      console.error('[ralph-hook] STOPPING: Transcript file not found at:', transcriptPath);
      console.error('[ralph-hook] File exists check:', transcriptPath ? fs.existsSync(transcriptPath) : 'N/A');
      fs.unlinkSync(RALPH_STATE_FILE);
      process.exit(0);
    }

    // Read last assistant message from transcript (JSONL format)
    console.error('[ralph-hook] Reading transcript file...');
    const lastOutput = await getLastAssistantMessage(transcriptPath);
    console.error('[ralph-hook] lastOutput length:', lastOutput?.length || 0);

    if (!lastOutput) {
      console.error('[ralph-hook] STOPPING: No assistant message found in transcript');
      fs.unlinkSync(RALPH_STATE_FILE);
      process.exit(0);
    }

    // Check for completion promise
    console.error('[ralph-hook] Checking for completion promise:', completionPromise);
    if (completionPromise && completionPromise !== 'null') {
      const promiseMatch = lastOutput.match(/<promise>([\s\S]*?)<\/promise>/);
      console.error('[ralph-hook] Promise match found:', !!promiseMatch);
      if (promiseMatch) {
        const promiseText = promiseMatch[1].trim().replace(/\s+/g, ' ');
        console.error('[ralph-hook] Promise text:', promiseText);
        if (promiseText === completionPromise) {
          console.error(`[ralph-hook] COMPLETE: Detected <promise>${completionPromise}</promise>`);
          fs.unlinkSync(RALPH_STATE_FILE);
          process.exit(0);
        }
      }
    }

    // Not complete - continue loop
    console.error('[ralph-hook] Not complete, continuing to next iteration...');
    const nextIteration = iteration + 1;

    // Update iteration in state file
    const updatedContent = stateContent.replace(
      /^iteration:\s*\d+/m,
      `iteration: ${nextIteration}`
    );
    fs.writeFileSync(RALPH_STATE_FILE, updatedContent, 'utf-8');

    // Build system message
    let systemMsg;
    if (completionPromise && completionPromise !== 'null') {
      systemMsg = `Ralph iteration ${nextIteration} | To stop: output <promise>${completionPromise}</promise> (ONLY when statement is TRUE - do not lie to exit!)`;
    } else {
      systemMsg = `Ralph iteration ${nextIteration} | No completion promise set - loop runs infinitely`;
    }

    // Output JSON to block the stop and feed prompt back
    const output = {
      decision: 'block',
      reason: prompt,
      systemMessage: systemMsg
    };

    console.error('[ralph-hook] OUTPUT - Blocking exit with decision:', output.decision);
    console.error('[ralph-hook] OUTPUT - System message:', systemMsg);
    console.log(JSON.stringify(output));
    process.exit(0);

  } catch (error) {
    console.error('[ralph-hook] FATAL ERROR:', error.message);
    console.error('[ralph-hook] Stack:', error.stack);
    // On error, allow exit rather than blocking indefinitely
    process.exit(0);
  }
}

/**
 * Read all stdin as a string - Windows-compatible synchronous approach
 */
function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    let resolved = false;

    const finish = () => {
      if (!resolved) {
        resolved = true;
        const result = chunks.join('');
        console.error('[ralph-hook] stdin read complete, length:', result.length);
        resolve(result);
      }
    };

    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (chunk) => {
      console.error('[ralph-hook] stdin data chunk received, length:', chunk.length);
      chunks.push(chunk);
    });

    process.stdin.on('end', () => {
      console.error('[ralph-hook] stdin end event');
      finish();
    });

    process.stdin.on('close', () => {
      console.error('[ralph-hook] stdin close event');
      finish();
    });

    process.stdin.on('error', (err) => {
      console.error('[ralph-hook] stdin error:', err.message);
      finish();
    });

    // Timeout safety - if no data received in 5 seconds, resolve with what we have
    setTimeout(() => {
      if (!resolved) {
        console.error('[ralph-hook] stdin timeout - resolving with current data');
        finish();
      }
    }, 5000);

    // Handle case where stdin is already closed or empty
    if (process.stdin.readableEnded) {
      console.error('[ralph-hook] stdin already ended');
      finish();
    }
  });
}

/**
 * Parse the ralph state file (markdown with YAML frontmatter)
 */
function parseStateFile(content) {
  const lines = content.split('\n');

  // Find frontmatter boundaries
  let frontmatterStart = -1;
  let frontmatterEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (frontmatterStart === -1) {
        frontmatterStart = i;
      } else {
        frontmatterEnd = i;
        break;
      }
    }
  }

  if (frontmatterStart === -1 || frontmatterEnd === -1) {
    return { frontmatter: null, prompt: null };
  }

  // Parse frontmatter (simple YAML parsing)
  const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
  const frontmatter = {};

  for (const line of frontmatterLines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      frontmatter[match[1]] = match[2];
    }
  }

  // Get prompt (everything after frontmatter)
  const prompt = lines.slice(frontmatterEnd + 1).join('\n').trim();

  return { frontmatter, prompt };
}

/**
 * Get the last assistant message from a JSONL transcript file
 */
async function getLastAssistantMessage(transcriptPath) {
  const content = fs.readFileSync(transcriptPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Find last assistant message
  let lastAssistantLine = null;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.role === 'assistant' || parsed.message?.role === 'assistant') {
        lastAssistantLine = parsed;
      }
    } catch (e) {
      // Skip invalid JSON lines
    }
  }

  if (!lastAssistantLine) {
    return null;
  }

  // Extract text content
  const message = lastAssistantLine.message || lastAssistantLine;
  const content_blocks = message.content || [];

  if (typeof content_blocks === 'string') {
    return content_blocks;
  }

  const textBlocks = content_blocks
    .filter(block => block.type === 'text')
    .map(block => block.text);

  return textBlocks.join('\n');
}

// Run the hook
main();
