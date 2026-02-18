import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import type { ServerMessage } from './types.js';

const DEFAULT_CMD = process.env.COPILOT_CMD || 'copilot';

// File extensions that should be opened with system default app
const OPENABLE_EXTENSIONS = new Set([
  '.xlsx', '.xls', '.xlsm', '.csv', '.tsv',
  '.pdf', '.docx', '.doc', '.pptx', '.ppt',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
  '.html', '.htm', '.mp4', '.mp3', '.mov', '.zip',
]);

// Patterns that indicate an "open file" intent
const OPEN_INTENT_PATTERN = /(?:\b(?:open|launch|start|view|show|display)\b|開いて|開けて|開く|開け|見せて|表示して|表示する|見て)/i;

// Extract absolute file paths from text (handles spaces via quoting or common patterns)
function extractFilePaths(text: string): string[] {
  const paths: string[] = [];

  // Quoted paths: "..." or '...'
  for (const m of text.matchAll(/['"](\/.+?)['"]/g)) {
    paths.push(m[1]);
  }

  // Unquoted absolute paths — greedy match until whitespace or end-of-line,
  // but allow spaces if the path is clearly a long path segment
  for (const m of text.matchAll(/(?:^|\s)(\/(?:[\w.@-]+\/)*[\w.@-]+(?:\.\w+)?)/gm)) {
    if (!paths.includes(m[1])) paths.push(m[1]);
  }

  // Home dir paths: ~/...
  const home = process.env.HOME || '';
  for (const m of text.matchAll(/(?:^|\s)(~\/[\w./_@-]+(?:\.\w+)?)/gm)) {
    const expanded = m[1].replace('~', home);
    if (!paths.includes(expanded)) paths.push(expanded);
  }

  return paths;
}

// Check if a file path looks like something that should be opened with system app
function isOpenableFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return OPENABLE_EXTENSIONS.has(ext);
}

export class CopilotBridge extends EventEmitter {
  private cmd: string;
  private activeProcess: ChildProcess | null = null;
  private _ready = true;
  // Track open intent per message so we can auto-open files found in Copilot output
  private openIntentMessages = new Set<string>();
  private openedPaths = new Set<string>();

  constructor(cmd?: string) {
    super();
    this.cmd = cmd || DEFAULT_CMD;
  }

  start() {
    console.log(`[bridge] Ready to relay prompts via: ${this.cmd} -p`);
    this._ready = true;
    this.emit('ready');
  }

  /** Check if prompt has open intent, extract paths, open files found */
  private handleOpenSkill(content: string, msgId: string): boolean {
    const hasOpenIntent = OPEN_INTENT_PATTERN.test(content);
    const filePaths = extractFilePaths(content);
    const existingPaths = filePaths.filter(p => fs.existsSync(p));

    if (!hasOpenIntent || existingPaths.length === 0) {
      // Track intent even if no paths found yet — Copilot output may contain them
      if (hasOpenIntent) {
        this.openIntentMessages.add(msgId);
        console.log(`[bridge] Open intent detected, will watch output for file paths`);
      }
      return false;
    }

    // Open all detected files
    for (const p of existingPaths) {
      console.log(`[bridge] Open skill: opening ${p}`);
      this.openFile(p, msgId);
      this.openedPaths.add(p);
    }

    return true;
  }

  /** Scan Copilot CLI output for file paths when we have a pending open intent */
  private scanOutputForFiles(text: string, msgId: string) {
    if (!this.openIntentMessages.has(msgId)) return;

    const filePaths = extractFilePaths(text);
    for (const p of filePaths) {
      if (this.openedPaths.has(p)) continue;
      if (fs.existsSync(p) && isOpenableFile(p)) {
        console.log(`[bridge] Open skill (from output): opening ${p}`);
        this.openFile(p, msgId);
        this.openedPaths.add(p);
      }
    }
  }

  sendPrompt(content: string, msgId: string) {
    if (this.activeProcess) {
      this.emit('message', {
        type: 'error',
        message: 'Another prompt is still being processed',
        id: msgId,
      } satisfies ServerMessage);
      return;
    }

    // Reset tracking for this message
    this.openedPaths.clear();

    // Check for open intent and open files if paths are in the prompt
    const opened = this.handleOpenSkill(content, msgId);

    // If we opened file(s) from the prompt, skip Copilot CLI — the file is already open
    if (opened) {
      this.emit('message', {
        type: 'done',
        id: msgId,
      } satisfies ServerMessage);
      return;
    }

    this._ready = false;
    console.log(`[bridge] Executing: ${this.cmd} -p "${content.slice(0, 50)}..."`);

    const proc = spawn(this.cmd, ['-p', content, '--allow-all'], {
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    this.activeProcess = proc;

    let stderr = '';

    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      console.log(`[bridge] stdout chunk (${text.length}b)`);
      this.emit('message', {
        type: 'stream',
        content: text,
        id: msgId,
      } satisfies ServerMessage);

      // Scan output for file paths if we have open intent
      this.scanOutputForFiles(text, msgId);
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      console.log(`[bridge] Process exited with code ${code}`);
      this.activeProcess = null;
      this._ready = true;
      this.openIntentMessages.delete(msgId);

      if (code !== 0 && stderr) {
        const errorLines = stderr.split('\n').filter(l =>
          !l.includes('Total usage') &&
          !l.includes('API time') &&
          !l.includes('Total session') &&
          !l.includes('Breakdown') &&
          !l.includes('Premium requests') &&
          !l.trim().startsWith('claude-') &&
          !l.trim().startsWith('gpt-') &&
          l.trim()
        ).join('\n').trim();

        if (errorLines) {
          this.emit('message', {
            type: 'error',
            message: errorLines,
            id: msgId,
          } satisfies ServerMessage);
        }
      }

      this.emit('message', {
        type: 'done',
        id: msgId,
      } satisfies ServerMessage);
    });

    proc.on('error', (err) => {
      console.error(`[bridge] Process error:`, err.message);
      this.activeProcess = null;
      this._ready = true;
      this.openIntentMessages.delete(msgId);
      this.emit('message', {
        type: 'error',
        message: `Failed to start Copilot CLI: ${err.message}`,
        id: msgId,
      } satisfies ServerMessage);
    });
  }

  interrupt() {
    if (this.activeProcess) {
      console.log('[bridge] Killing active process');
      const proc = this.activeProcess;
      this.activeProcess = null;
      this._ready = true;

      // Destroy pipes first to unblock the event loop
      proc.stdout?.destroy();
      proc.stderr?.destroy();

      // Kill the entire process group (negative PID) to catch child processes
      try {
        if (proc.pid) process.kill(-proc.pid, 'SIGTERM');
      } catch {
        // process group kill may fail if process already exited
      }
      proc.kill('SIGTERM');

      // Force kill after 1s
      const killTimer = setTimeout(() => {
        try {
          if (proc.pid) process.kill(-proc.pid, 'SIGKILL');
        } catch { /* already dead */ }
        proc.kill('SIGKILL');
      }, 1000);
      killTimer.unref(); // Don't let this timer block process exit
    }
  }

  resize(_cols: number, _rows: number) {}

  stop() {
    this.interrupt();
  }

  get isRunning(): boolean {
    return true;
  }

  get ready(): boolean {
    return this._ready;
  }

  openFile(filePath: string, msgId: string) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`[bridge] File not found: ${filePath}`);
        this.emit('message', {
          type: 'file_opened',
          path: filePath,
          success: false,
          message: `File not found: ${filePath}`,
          id: msgId,
        });
        return;
      }

      const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
      console.log(`[bridge] Opening file: ${cmd} ${filePath}`);
      const proc = spawn(cmd, [filePath], { detached: true, stdio: 'ignore' });
      proc.unref();

      this.emit('message', {
        type: 'file_opened',
        path: filePath,
        success: true,
        message: `Opened ${filePath}`,
        id: msgId,
      });
    } catch (err: any) {
      console.error(`[bridge] Error opening file: ${err.message}`);
      this.emit('message', {
        type: 'file_opened',
        path: filePath,
        success: false,
        message: `Failed to open file: ${err.message}`,
        id: msgId,
      });
    }
  }
}
