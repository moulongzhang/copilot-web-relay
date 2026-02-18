import type {
  ServerMessage,
  ToolStartMessage,
  ToolEndMessage,
  StreamMessage,
} from './types.js';

export type ParsedEvent =
  | { type: 'tool_start'; tool: string; detail: string }
  | { type: 'tool_end'; tool: string; status: 'success' | 'failure' }
  | { type: 'error'; message: string }
  | { type: 'progress'; step?: number; total?: number; percent?: number };

const TOOL_START_PATTERNS: Array<{ pattern: RegExp; tool: string }> = [
  { pattern: /\bEditing\s+(.+)/i, tool: 'edit_file' },
  { pattern: /\bCreating\s+(?:file\s+)?(.+)/i, tool: 'create_file' },
  { pattern: /\bRunning\s+`(.+?)`/i, tool: 'run_command' },
  { pattern: /\bReading\s+(.+)/i, tool: 'read_file' },
  { pattern: /\bExecuting\s+bash\s+(.+)/i, tool: 'bash' },
  { pattern: /\bRunning\s+bash\s+(.+)/i, tool: 'bash' },
  { pattern: /\bGrepping\s+(.+)/i, tool: 'grep' },
  { pattern: /\bSearching\s+with\s+grep\s+(.+)/i, tool: 'grep' },
  { pattern: /\bSearching\s+(.+)/i, tool: 'search' },
  { pattern: /\bGlobbing\s+(.+)/i, tool: 'glob' },
  { pattern: /\bFinding\s+files\s+(.+)/i, tool: 'glob' },
  { pattern: /\bListing\s+files\s+(.+)/i, tool: 'list_files' },
  { pattern: /\bListing\s+directory\s+(.+)/i, tool: 'list_files' },
  { pattern: /\bDeleting\s+(?:file\s+)?(.+)/i, tool: 'delete_file' },
  { pattern: /\bRemoving\s+(?:file\s+)?(.+)/i, tool: 'delete_file' },
];

const TOOL_END_PATTERNS: Array<{ pattern: RegExp; tool: string }> = [
  { pattern: /\bEdited\s+(.+)/i, tool: 'edit_file' },
  { pattern: /\bCreated\s+(.+)/i, tool: 'create_file' },
  { pattern: /\bRan\s+`(.+?)`/i, tool: 'run_command' },
  { pattern: /\bFinished searching/i, tool: 'search' },
  { pattern: /\bRead\s+(.+)/i, tool: 'read_file' },
  { pattern: /\bBash\s+completed/i, tool: 'bash' },
  { pattern: /\bBash\s+finished/i, tool: 'bash' },
  { pattern: /\bGrep\s+completed/i, tool: 'grep' },
  { pattern: /\bGrep\s+finished/i, tool: 'grep' },
  { pattern: /\bGlob\s+completed/i, tool: 'glob' },
  { pattern: /\bGlob\s+finished/i, tool: 'glob' },
  { pattern: /\bListed\s+files/i, tool: 'list_files' },
  { pattern: /\bListed\s+directory/i, tool: 'list_files' },
  { pattern: /\bDeleted\s+(.+)/i, tool: 'delete_file' },
  { pattern: /\bRemoved\s+(.+)/i, tool: 'delete_file' },
];

const FAILURE_KEYWORDS = [
  /\bfail(ed|ure)?\b/i,
  /\berror\b/i,
  /\bexception\b/i,
  /\btimeout\b/i,
  /\babort(ed)?\b/i,
  /\bcrash(ed)?\b/i,
  /\bpanic\b/i,
  /\bexit code [1-9]/i,
  /\bnon-zero exit/i,
];

const ERROR_PATTERNS = [
  /\bError:\s*(.+)/i,
  /\bFailed:\s*(.+)/i,
  /\bException:\s*(.+)/i,
  /\bFatal:\s*(.+)/i,
];

const PROGRESS_PATTERNS: Array<{ pattern: RegExp; kind: 'step' | 'percent' }> = [
  { pattern: /\bStep\s+(\d+)\s*\/\s*(\d+)/i, kind: 'step' },
  { pattern: /\[(\d+)\s*\/\s*(\d+)\]/, kind: 'step' },
  { pattern: /\((\d+)\s+of\s+(\d+)\)/i, kind: 'step' },
  { pattern: /(\d+(?:\.\d+)?)\s*%/, kind: 'percent' },
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

  /** Check if a line is a usage stats line */
  static isStatsLine(line: string): boolean {
    return STATS_PATTERNS.some(p => p.test(line.trim()));
  }

  /** Parse a single line and return a detected event or null */
  parseLine(line: string): ParsedEvent | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Check for tool start
    for (const { pattern, tool } of TOOL_START_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        return { type: 'tool_start', tool, detail: match[1] || '' };
      }
    }

    // Check for tool end
    for (const { pattern, tool } of TOOL_END_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { type: 'tool_end', tool, status: this.detectStatus(trimmed) };
      }
    }

    // Check for error patterns
    for (const pattern of ERROR_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        return { type: 'error', message: match[1] || trimmed };
      }
    }

    // Check for progress indicators
    for (const { pattern, kind } of PROGRESS_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        if (kind === 'percent') {
          return { type: 'progress', percent: parseFloat(match[1]) };
        }
        return { type: 'progress', step: parseInt(match[1], 10), total: parseInt(match[2], 10) };
      }
    }

    return null;
  }

  /** Parse a multi-line block of text and return all detected events */
  parseBlock(text: string): ParsedEvent[] {
    const lines = text.split('\n');
    const events: ParsedEvent[] = [];
    for (const line of lines) {
      const event = this.parseLine(line);
      if (event) {
        events.push(event);
      }
    }
    return events;
  }

  /** Detect success vs failure status from a line */
  private detectStatus(line: string): 'success' | 'failure' {
    for (const pattern of FAILURE_KEYWORDS) {
      if (pattern.test(line)) {
        return 'failure';
      }
    }
    return 'success';
  }

  reset() {
    this.currentMsgId = '';
  }
}
