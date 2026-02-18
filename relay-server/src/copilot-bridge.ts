import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import type { ServerMessage } from './types.js';
import { OutputParser } from './output-parser.js';

const DEFAULT_CMD = process.env.COPILOT_CMD || 'copilot';
const RESTART_DELAY = 2000;

export class CopilotBridge extends EventEmitter {
  private ptyProcess: pty.IPty | null = null;
  private parser = new OutputParser();
  private cmd: string;
  private restarting = false;

  constructor(cmd?: string) {
    super();
    this.cmd = cmd || DEFAULT_CMD;
  }

  /** Spawn the Copilot CLI process */
  start() {
    if (this.ptyProcess) return;

    console.log(`[bridge] Spawning: ${this.cmd}`);
    this.ptyProcess = pty.spawn(this.cmd, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      env: { ...process.env } as Record<string, string>,
    });

    this.ptyProcess.onData((data) => {
      const events = this.parser.parse(data);
      for (const event of events) {
        this.emit('message', event);
      }
    });

    this.ptyProcess.onExit(({ exitCode }) => {
      console.log(`[bridge] Copilot CLI exited with code ${exitCode}`);
      this.ptyProcess = null;
      this.parser.reset();
      this.emit('exit', exitCode);

      // Auto-restart
      if (!this.restarting) {
        this.restarting = true;
        setTimeout(() => {
          this.restarting = false;
          console.log('[bridge] Auto-restarting Copilot CLI...');
          this.start();
        }, RESTART_DELAY);
      }
    });
  }

  /** Send a prompt to the Copilot CLI */
  sendPrompt(content: string, msgId: string) {
    if (!this.ptyProcess) {
      this.emit('message', {
        type: 'error',
        message: 'Copilot CLI is not running',
        id: msgId,
      } satisfies ServerMessage);
      return;
    }

    this.parser.setMessageId(msgId);
    this.ptyProcess.write(content + '\n');
  }

  /** Send interrupt (Ctrl+C) to the CLI */
  interrupt() {
    if (this.ptyProcess) {
      this.ptyProcess.write('\x03');
    }
  }

  /** Resize the PTY */
  resize(cols: number, rows: number) {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  /** Kill the CLI process */
  stop() {
    this.restarting = true; // prevent auto-restart
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
    this.parser.reset();
  }

  get isRunning(): boolean {
    return this.ptyProcess !== null;
  }
}
