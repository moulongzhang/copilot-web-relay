import path from 'path';

/**
 * Extract all file paths (absolute, relative, home-dir, quoted) from text.
 */
export function extractFilePaths(text: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  const add = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p);
      results.push(p);
    }
  };

  for (const p of extractQuotedPaths(text)) add(p);
  for (const p of extractAbsolutePaths(text)) add(p);
  for (const p of extractHomePaths(text)) add(p);
  for (const p of extractRelativePaths(text)) add(p);

  return results;
}

/**
 * Extract only absolute paths (starting with /) from text.
 */
export function extractAbsolutePaths(text: string): string[] {
  const paths: string[] = [];

  // Unquoted absolute paths
  for (const m of text.matchAll(/(?:^|[\s,(])(\/([\w.@+-]+\/)*[\w.@+-]+(?:\.\w+)?)/gm)) {
    if (!paths.includes(m[1])) paths.push(m[1]);
  }

  return paths;
}

/**
 * Extract relative paths (starting with ./ or ../) from text.
 * Optionally resolve them against a cwd.
 */
export function extractRelativePaths(text: string, cwd?: string): string[] {
  const paths: string[] = [];

  for (const m of text.matchAll(/(?:^|[\s,(])(\.\.?\/[\w./@+-]*[\w.@+-])/gm)) {
    const p = cwd ? path.resolve(cwd, m[1]) : m[1];
    if (!paths.includes(p)) paths.push(p);
  }

  return paths;
}

/**
 * Extract home-directory paths (~/...) from text.
 */
export function extractHomePaths(text: string): string[] {
  const paths: string[] = [];

  for (const m of text.matchAll(/(?:^|[\s,(])(~\/[\w./_@+-]+)/gm)) {
    if (!paths.includes(m[1])) paths.push(m[1]);
  }

  return paths;
}

/**
 * Extract paths enclosed in single or double quotes.
 */
export function extractQuotedPaths(text: string): string[] {
  const paths: string[] = [];

  for (const m of text.matchAll(/['"]((?:\/|\.\.?\/|~\/)[\w./@+~ -]+?)['"]/g)) {
    if (!paths.includes(m[1])) paths.push(m[1]);
  }

  return paths;
}

/**
 * Check if a path string is absolute.
 */
export function isAbsolutePath(p: string): boolean {
  return p.startsWith('/');
}

/**
 * Check if a path string is relative (starts with ./ or ../).
 */
export function isRelativePath(p: string): boolean {
  return p.startsWith('./') || p.startsWith('../');
}

/**
 * Normalize a path: resolve . and .. segments, collapse duplicate separators.
 */
export function normalizePath(p: string): string {
  // Replace backslashes with forward slashes
  let normalized = p.replace(/\\/g, '/');
  // Collapse duplicate slashes (preserve leading slash)
  normalized = normalized.replace(/\/{2,}/g, '/');
  // Use path.normalize for . and .. resolution
  normalized = path.normalize(normalized);
  // Ensure forward slashes on all platforms
  normalized = normalized.replace(/\\/g, '/');
  // Remove trailing slash (but preserve root "/")
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * Get the file extension (including the dot), or empty string if none.
 */
export function getExtension(p: string): string {
  return path.extname(p);
}

/**
 * Check if a path has one of the given extensions (case-insensitive).
 */
export function hasExtension(p: string, exts: string[]): boolean {
  const ext = path.extname(p).toLowerCase();
  return exts.some((e) => {
    const normalized = e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`;
    return ext === normalized;
  });
}
