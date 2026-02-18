import type {
  ServerMessage,
  ToolStartMessage,
  ToolEndMessage,
  StreamMessage,
} from './types.js';

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

// Usage stats lines appended by copilot -p (filter these out)
const STATS_PATTERNS = [
  /^Total usage est:/,
  /^API time spent:/,
  /^Total session time:/,
  /^Total code changes:/,
  /^Breakdown by AI model:/,
  /^\s*(claude|gpt|gemini)-/,
  /^\s*\d+[\.\d]*k?\s+in,/,
];

export class OutputParser {
  private currentMsgId = '';

  setMessageId(id: string) {
    this.currentMsgId = id;
  }

  hasActiveMessage(): boolean {
    return this.currentMsgId !== '';
  }

  getMessageId(): string {
    return this.currentMsgId;
  }

  clearMessage() {
    this.currentMsgId = '';
  }

  /** Strip usage stats from copilot -p output */
  static stripStats(text: string): string {
    return text.split('\n').filter(line =>
      !STATS_PATTERNS.some(p => p.test(line.trim()))
    ).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  reset() {
    this.currentMsgId = '';
  }
}
