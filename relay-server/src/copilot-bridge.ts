import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { ServerMessage } from './types.js';

const DEFAULT_CMD = process.env.COPILOT_CMD || 'copilot';

export class CopilotBridge extends EventEmitter {
  private cmd: string;
  private activeProcess: ChildProcess | null = null;
  private _ready = true;

  constructor(cmd?: string) {
    super();
    this.cmd = cmd || DEFAULT_CMD;
  }

  start() {
    // No persistent process needed - each prompt spawns a new one
    console.log(`[bridge] Ready to relay prompts via: ${this.cmd} -p`);
    this._ready = true;
    this.emit('ready');
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

    this._ready = false;
    console.log(`[bridge] Executing: ${this.cmd} -p "${content.slice(0, 50)}..."`);

    const proc = spawn(this.cmd, ['-p', content, '--allow-all'], {
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.activeProcess = proc;

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      console.log(`[bridge] stdout chunk (${text.length}b)`);
      this.emit('message', {
        type: 'stream',
        content: text,
        id: msgId,
      } satisfies ServerMessage);
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      console.log(`[bridge] Process exited with code ${code}`);
      this.activeProcess = null;
      this._ready = true;

      if (code !== 0 && stderr) {
        // Filter out the usage stats from stderr, only send actual errors
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
      this.activeProcess.kill('SIGINT');
      this.activeProcess = null;
      this._ready = true;
    }
  }

  resize(_cols: number, _rows: number) {
    // Not needed for non-interactive mode
  }

  stop() {
    this.interrupt();
  }

  get isRunning(): boolean {
    return true; // Always ready to accept prompts
  }

  get ready(): boolean {
    return this._ready;
  }
}
