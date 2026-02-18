import type {
  ServerMessage,
  ToolStartMessage,
  ToolEndMessage,
  StreamMessage,
  DoneMessage,
} from './types.js';

// Patterns to detect tool usage in Copilot CLI output
const TOOL_START_PATTERNS: Array<{ pattern: RegExp; tool: string }> = [
  { pattern: /\bEditing\s+(.+)/i, tool: 'edit_file' },
  { pattern: /\bCreating\s+(?:file\s+)?(.+)/i, tool: 'create_file' },
  { pattern: /\bRunning\s+`(.+?)`/i, tool: 'run_command' },
  { pattern: /\bSearching\s+(.+)/i, tool: 'search' },
  { pattern: /\bReading\s+(.+)/i, tool: 'read_file' },
];

const TOOL_END_PATTERNS: Array<{ pattern: RegExp; tool: string }> = [
  { pattern: /\bEdited\s+(.+)/i, tool: 'edit_file' },
  { pattern: /\bCreated\s+(.+)/i, tool: 'create_file' },
  { pattern: /\bRan\s+`(.+?)`/i, tool: 'run_command' },
  { pattern: /\bFinished searching/i, tool: 'search' },
  { pattern: /\bRead\s+(.+)/i, tool: 'read_file' },
];

// Detect when Copilot CLI is ready for next input
const PROMPT_READY_PATTERN = /(?:^|\n)\s*>\s*$/;

// ANSI control sequences to strip for pattern matching (keep raw for streaming)
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07/g;

export class OutputParser {
  private buffer = '';
  private currentMsgId = '';

  setMessageId(id: string) {
    this.currentMsgId = id;
    this.buffer = '';
  }

  /**
   * Parse a chunk of raw terminal output into structured events.
   * Returns an array of ServerMessages to send to the client.
   */
  parse(rawChunk: string): ServerMessage[] {
    const events: ServerMessage[] = [];
    this.buffer += rawChunk;

    const cleanChunk = rawChunk.replace(ANSI_REGEX, '');
    const lines = cleanChunk.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for tool start
      let matched = false;
      for (const { pattern, tool } of TOOL_START_PATTERNS) {
        const m = trimmed.match(pattern);
        if (m) {
          events.push({
            type: 'tool_start',
            tool,
            detail: m[1] ?? '',
            id: this.currentMsgId,
          } satisfies ToolStartMessage);
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // Check for tool end
      for (const { pattern, tool } of TOOL_END_PATTERNS) {
        const m = trimmed.match(pattern);
        if (m) {
          events.push({
            type: 'tool_end',
            tool,
            status: 'success',
            id: this.currentMsgId,
          } satisfies ToolEndMessage);
          matched = true;
          break;
        }
      }
      if (matched) continue;
    }

    // Stream the raw text (with ANSI codes stripped for clean display)
    const streamContent = cleanChunk;
    if (streamContent) {
      events.push({
        type: 'stream',
        content: streamContent,
        id: this.currentMsgId,
      } satisfies StreamMessage);
    }

    // Check if prompt is ready (Copilot is waiting for input)
    const cleanBuffer = this.buffer.replace(ANSI_REGEX, '');
    if (PROMPT_READY_PATTERN.test(cleanBuffer)) {
      events.push({
        type: 'done',
        id: this.currentMsgId,
      } satisfies DoneMessage);
      this.buffer = '';
    }

    return events;
  }

  reset() {
    this.buffer = '';
    this.currentMsgId = '';
  }
}
