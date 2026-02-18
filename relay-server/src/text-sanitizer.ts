// eslint-disable-next-line no-control-regex
const ANSI_RE = /[\u001b\u009b][\[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g;

// Control chars except \t (0x09), \n (0x0A), \r (0x0D)
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

const STATS_PATTERNS = [
  /^Total usage est:/,
  /^API time spent:/,
  /^Total session time:/,
  /^Total code changes:/,
  /^Breakdown by AI model:/,
  /^\s*(claude|gpt|gemini)-/,
  /^\s*\d+[\.\d]*k?\s+in,/,
];

/** Remove all ANSI escape codes (colors, cursor, etc.) */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

/** Remove control characters except \n, \r, \t */
export function stripControlChars(text: string): string {
  return text.replace(CONTROL_RE, '');
}

/** Collapse multiple spaces/tabs to single space, normalize line endings */
export function normalizeWhitespace(text: string): string {
  return normalizeLineEndings(text)
    .split('\n')
    .map(line => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n');
}

/** Convert \r\n and \r to \n */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Truncate with suffix (default '...') */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= suffix.length) return suffix.slice(0, maxLength);
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/** Keep only first N lines */
export function truncateLines(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join('\n');
}

/** Remove Copilot CLI usage statistics lines */
export function filterUsageStats(text: string): string {
  return text
    .split('\n')
    .filter(line => !STATS_PATTERNS.some(p => p.test(line.trim())))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Apply stripAnsi + stripControlChars + normalizeWhitespace */
export function sanitize(text: string): string {
  return normalizeWhitespace(stripControlChars(stripAnsi(text)));
}

/** Check if text is empty or whitespace only */
export function isEmpty(text: string): boolean {
  return text.trim().length === 0;
}

/** Count number of lines */
export function countLines(text: string): number {
  if (text === '') return 0;
  return text.split('\n').length;
}

/** Remove consecutive blank lines (keep max 1) */
export function removeBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n');
}

/** Trim trailing whitespace from each line */
export function trimLines(text: string): string {
  return text
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n');
}
