import { describe, it, expect, beforeEach } from 'vitest';
import { OutputParser } from '../output-parser.js';
import type { ParsedEvent } from '../output-parser.js';

describe('OutputParser', () => {
  let parser: OutputParser;

  beforeEach(() => {
    parser = new OutputParser();
  });

  // ── Tool start pattern detection (10 tests) ──

  describe('tool start pattern detection', () => {
    it('detects edit_file start', () => {
      const event = parser.parseLine('Editing src/index.ts');
      expect(event).toEqual({ type: 'tool_start', tool: 'edit_file', detail: 'src/index.ts' });
    });

    it('detects create_file start with "file" keyword', () => {
      const event = parser.parseLine('Creating file utils.ts');
      expect(event).toEqual({ type: 'tool_start', tool: 'create_file', detail: 'utils.ts' });
    });

    it('detects run_command start', () => {
      const event = parser.parseLine('Running `npm test`');
      expect(event).toEqual({ type: 'tool_start', tool: 'run_command', detail: 'npm test' });
    });

    it('detects search start', () => {
      const event = parser.parseLine('Searching for pattern in files');
      expect(event).toEqual({ type: 'tool_start', tool: 'search', detail: 'for pattern in files' });
    });

    it('detects read_file start', () => {
      const event = parser.parseLine('Reading config.json');
      expect(event).toEqual({ type: 'tool_start', tool: 'read_file', detail: 'config.json' });
    });

    it('detects bash start via "Executing bash"', () => {
      const event = parser.parseLine('Executing bash ls -la');
      expect(event).toEqual({ type: 'tool_start', tool: 'bash', detail: 'ls -la' });
    });

    it('detects grep start', () => {
      const event = parser.parseLine('Grepping for errors in logs');
      expect(event).toEqual({ type: 'tool_start', tool: 'grep', detail: 'for errors in logs' });
    });

    it('detects glob start', () => {
      const event = parser.parseLine('Globbing **/*.ts');
      expect(event).toEqual({ type: 'tool_start', tool: 'glob', detail: '**/*.ts' });
    });

    it('detects list_files start', () => {
      const event = parser.parseLine('Listing files in src/');
      expect(event).toEqual({ type: 'tool_start', tool: 'list_files', detail: 'in src/' });
    });

    it('detects delete_file start', () => {
      const event = parser.parseLine('Deleting file old.txt');
      expect(event).toEqual({ type: 'tool_start', tool: 'delete_file', detail: 'old.txt' });
    });
  });

  // ── Tool end pattern detection (10 tests) ──

  describe('tool end pattern detection', () => {
    it('detects edit_file end with success', () => {
      const event = parser.parseLine('Edited src/index.ts');
      expect(event).toEqual({ type: 'tool_end', tool: 'edit_file', status: 'success' });
    });

    it('detects create_file end with success', () => {
      const event = parser.parseLine('Created utils.ts');
      expect(event).toEqual({ type: 'tool_end', tool: 'create_file', status: 'success' });
    });

    it('detects run_command end with success', () => {
      const event = parser.parseLine('Ran `npm test`');
      expect(event).toEqual({ type: 'tool_end', tool: 'run_command', status: 'success' });
    });

    it('detects search end with success', () => {
      const event = parser.parseLine('Finished searching');
      expect(event).toEqual({ type: 'tool_end', tool: 'search', status: 'success' });
    });

    it('detects read_file end with success', () => {
      const event = parser.parseLine('Read config.json');
      expect(event).toEqual({ type: 'tool_end', tool: 'read_file', status: 'success' });
    });

    it('detects bash end with success', () => {
      const event = parser.parseLine('Bash completed');
      expect(event).toEqual({ type: 'tool_end', tool: 'bash', status: 'success' });
    });

    it('detects grep end with success', () => {
      const event = parser.parseLine('Grep completed');
      expect(event).toEqual({ type: 'tool_end', tool: 'grep', status: 'success' });
    });

    it('detects run_command end with failure when line contains failure keyword', () => {
      const event = parser.parseLine('Ran `npm test` - failed');
      expect(event).toEqual({ type: 'tool_end', tool: 'run_command', status: 'failure' });
    });

    it('detects bash end with failure when line contains error keyword', () => {
      const event = parser.parseLine('Bash completed with error');
      expect(event).toEqual({ type: 'tool_end', tool: 'bash', status: 'failure' });
    });

    it('detects delete_file end with success', () => {
      const event = parser.parseLine('Deleted old.txt');
      expect(event).toEqual({ type: 'tool_end', tool: 'delete_file', status: 'success' });
    });
  });

  // ── Stats line filtering (8 tests) ──

  describe('stats line filtering', () => {
    it('isStatsLine returns true for "Total usage est:"', () => {
      expect(OutputParser.isStatsLine('Total usage est: 500 tokens')).toBe(true);
    });

    it('isStatsLine returns true for "API time spent:"', () => {
      expect(OutputParser.isStatsLine('API time spent: 3.2s')).toBe(true);
    });

    it('isStatsLine returns true for "Total session time:"', () => {
      expect(OutputParser.isStatsLine('Total session time: 45s')).toBe(true);
    });

    it('isStatsLine returns true for "Breakdown by AI model:"', () => {
      expect(OutputParser.isStatsLine('Breakdown by AI model:')).toBe(true);
    });

    it('isStatsLine returns true for claude model line', () => {
      expect(OutputParser.isStatsLine('  claude-3.5-sonnet')).toBe(true);
    });

    it('isStatsLine returns true for gpt model line', () => {
      expect(OutputParser.isStatsLine('  gpt-4-turbo')).toBe(true);
    });

    it('isStatsLine returns false for regular text', () => {
      expect(OutputParser.isStatsLine('Hello, this is normal output')).toBe(false);
    });

    it('stripStats removes stats lines and preserves content', () => {
      const input = [
        'Some output',
        'Total usage est: 500 tokens',
        'API time spent: 3.2s',
        'More output',
      ].join('\n');
      const result = OutputParser.stripStats(input);
      expect(result).toBe('Some output\nMore output');
    });
  });

  // ── parseLine method (8 tests) ──

  describe('parseLine method', () => {
    it('returns null for empty string', () => {
      expect(parser.parseLine('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(parser.parseLine('   ')).toBeNull();
    });

    it('returns tool_start event for matching start line', () => {
      const event = parser.parseLine('Editing README.md');
      expect(event).not.toBeNull();
      expect(event!.type).toBe('tool_start');
    });

    it('returns tool_end event for matching end line', () => {
      const event = parser.parseLine('Edited README.md');
      expect(event).not.toBeNull();
      expect(event!.type).toBe('tool_end');
    });

    it('returns error event for error line', () => {
      const event = parser.parseLine('Error: something went wrong');
      expect(event).toEqual({ type: 'error', message: 'something went wrong' });
    });

    it('returns progress event for step-style progress', () => {
      const event = parser.parseLine('Step 2/5 completed');
      expect(event).toEqual({ type: 'progress', step: 2, total: 5 });
    });

    it('returns null for non-matching regular text', () => {
      expect(parser.parseLine('This is just a comment')).toBeNull();
    });

    it('returns null for a stats line that does not match tool/error/progress', () => {
      expect(parser.parseLine('Total session time: 5 minutes')).toBeNull();
    });
  });

  // ── parseBlock method (6 tests) ──

  describe('parseBlock method', () => {
    it('returns empty array for empty string', () => {
      expect(parser.parseBlock('')).toEqual([]);
    });

    it('returns single event for single matching line', () => {
      const events = parser.parseBlock('Editing src/app.ts');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('tool_start');
    });

    it('returns multiple events from multi-line text', () => {
      const text = 'Editing src/app.ts\nEdited src/app.ts';
      const events = parser.parseBlock(text);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('tool_start');
      expect(events[1].type).toBe('tool_end');
    });

    it('filters out non-matching lines', () => {
      const text = 'Hello world\nEditing src/app.ts\nJust a comment\nEdited src/app.ts';
      const events = parser.parseBlock(text);
      expect(events).toHaveLength(2);
    });

    it('detects mixed tool and progress events', () => {
      const text = 'Running `npm install`\nStep 1/3\n50%\nRan `npm install`';
      const events = parser.parseBlock(text);
      expect(events).toHaveLength(4);
      expect(events[0].type).toBe('tool_start');
      expect(events[1].type).toBe('progress');
      expect(events[2].type).toBe('progress');
      expect(events[3].type).toBe('tool_end');
    });

    it('detects errors in a block', () => {
      const text = 'Some output\nError: build failed\nFatal: cannot continue';
      const events = parser.parseBlock(text);
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: 'error', message: 'build failed' });
      expect(events[1]).toEqual({ type: 'error', message: 'cannot continue' });
    });
  });

  // ── Error detection (4 tests) ──

  describe('error detection', () => {
    it('detects Error: pattern', () => {
      const event = parser.parseLine('Error: something went wrong');
      expect(event).toEqual({ type: 'error', message: 'something went wrong' });
    });

    it('detects Failed: pattern', () => {
      const event = parser.parseLine('Failed: build step');
      expect(event).toEqual({ type: 'error', message: 'build step' });
    });

    it('detects Exception: pattern', () => {
      const event = parser.parseLine('Exception: null pointer');
      expect(event).toEqual({ type: 'error', message: 'null pointer' });
    });

    it('detects Fatal: pattern', () => {
      const event = parser.parseLine('Fatal: cannot continue');
      expect(event).toEqual({ type: 'error', message: 'cannot continue' });
    });
  });

  // ── Progress detection (4 tests) ──

  describe('progress detection', () => {
    it('detects "Step X/Y" pattern', () => {
      const event = parser.parseLine('Step 1/3');
      expect(event).toEqual({ type: 'progress', step: 1, total: 3 });
    });

    it('detects percentage pattern', () => {
      const event = parser.parseLine('Progress: 50%');
      expect(event).toEqual({ type: 'progress', percent: 50 });
    });

    it('detects "[X/Y]" bracket pattern', () => {
      const event = parser.parseLine('[2/5] Building modules');
      expect(event).toEqual({ type: 'progress', step: 2, total: 5 });
    });

    it('detects "(X of Y)" pattern', () => {
      const event = parser.parseLine('Processing (3 of 10) items');
      expect(event).toEqual({ type: 'progress', step: 3, total: 10 });
    });
  });
});
