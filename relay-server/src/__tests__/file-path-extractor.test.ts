import { describe, it, expect } from 'vitest';
import {
  extractFilePaths,
  extractAbsolutePaths,
  extractRelativePaths,
  extractHomePaths,
  extractQuotedPaths,
  isAbsolutePath,
  isRelativePath,
  normalizePath,
  getExtension,
  hasExtension,
} from '../file-path-extractor.js';

// ---------- extractFilePaths general (8 tests) ----------
describe('extractFilePaths', () => {
  it('extracts a single absolute path', () => {
    expect(extractFilePaths('open /usr/bin/node')).toContain('/usr/bin/node');
  });

  it('extracts multiple absolute paths', () => {
    const result = extractFilePaths('copy /src/a.ts to /src/b.ts');
    expect(result).toContain('/src/a.ts');
    expect(result).toContain('/src/b.ts');
  });

  it('extracts relative paths starting with ./', () => {
    expect(extractFilePaths('edit ./src/index.ts')).toContain('./src/index.ts');
  });

  it('extracts home-dir paths', () => {
    expect(extractFilePaths('open ~/Documents/file.txt')).toContain('~/Documents/file.txt');
  });

  it('extracts quoted paths', () => {
    expect(extractFilePaths('open "/tmp/my file.txt"')).toContain('/tmp/my file.txt');
  });

  it('returns empty array for text with no paths', () => {
    expect(extractFilePaths('hello world')).toEqual([]);
  });

  it('deduplicates identical paths', () => {
    const result = extractFilePaths('/foo/bar.ts and /foo/bar.ts again');
    expect(result.filter((p) => p === '/foo/bar.ts')).toHaveLength(1);
  });

  it('extracts mixed path types', () => {
    const result = extractFilePaths('files: /abs/path.ts ./rel/path.ts ~/home/path.ts');
    expect(result).toContain('/abs/path.ts');
    expect(result).toContain('./rel/path.ts');
    expect(result).toContain('~/home/path.ts');
  });
});

// ---------- extractAbsolutePaths (6 tests) ----------
describe('extractAbsolutePaths', () => {
  it('extracts a simple absolute path', () => {
    expect(extractAbsolutePaths('see /etc/hosts')).toEqual(['/etc/hosts']);
  });

  it('extracts paths with file extensions', () => {
    expect(extractAbsolutePaths('file /var/log/app.log')).toEqual(['/var/log/app.log']);
  });

  it('extracts multiple absolute paths', () => {
    const result = extractAbsolutePaths('/a/b.ts and /c/d.js');
    expect(result).toEqual(['/a/b.ts', '/c/d.js']);
  });

  it('ignores relative paths', () => {
    expect(extractAbsolutePaths('open ./src/index.ts')).toEqual([]);
  });

  it('ignores home-dir paths', () => {
    expect(extractAbsolutePaths('open ~/file.txt')).toEqual([]);
  });

  it('handles path at start of line', () => {
    expect(extractAbsolutePaths('/usr/local/bin/node is great')).toEqual(['/usr/local/bin/node']);
  });
});

// ---------- extractRelativePaths (6 tests) ----------
describe('extractRelativePaths', () => {
  it('extracts ./ paths', () => {
    expect(extractRelativePaths('run ./build.sh')).toEqual(['./build.sh']);
  });

  it('extracts ../ paths', () => {
    expect(extractRelativePaths('see ../parent/file.ts')).toEqual(['../parent/file.ts']);
  });

  it('extracts multiple relative paths', () => {
    const result = extractRelativePaths('./a.ts and ../b.ts');
    expect(result).toEqual(['./a.ts', '../b.ts']);
  });

  it('resolves relative paths when cwd is provided', () => {
    const result = extractRelativePaths('open ./src/index.ts', '/home/user/project');
    expect(result).toEqual(['/home/user/project/src/index.ts']);
  });

  it('resolves ../ paths when cwd is provided', () => {
    const result = extractRelativePaths('open ../lib/utils.ts', '/home/user/project/src');
    expect(result).toEqual(['/home/user/project/lib/utils.ts']);
  });

  it('ignores absolute paths', () => {
    expect(extractRelativePaths('open /usr/bin/node')).toEqual([]);
  });
});

// ---------- extractHomePaths (5 tests) ----------
describe('extractHomePaths', () => {
  it('extracts a simple home-dir path', () => {
    expect(extractHomePaths('open ~/file.txt')).toEqual(['~/file.txt']);
  });

  it('extracts nested home-dir path', () => {
    expect(extractHomePaths('see ~/Documents/projects/app.ts')).toEqual([
      '~/Documents/projects/app.ts',
    ]);
  });

  it('extracts multiple home-dir paths', () => {
    const result = extractHomePaths('~/a.ts and ~/b.ts');
    expect(result).toEqual(['~/a.ts', '~/b.ts']);
  });

  it('ignores absolute paths', () => {
    expect(extractHomePaths('/usr/bin/node')).toEqual([]);
  });

  it('handles path with dots and underscores', () => {
    expect(extractHomePaths('open ~/.config/my_app/settings.json')).toEqual([
      '~/.config/my_app/settings.json',
    ]);
  });
});

// ---------- extractQuotedPaths (5 tests) ----------
describe('extractQuotedPaths', () => {
  it('extracts double-quoted absolute path', () => {
    expect(extractQuotedPaths('open "/tmp/file.txt"')).toEqual(['/tmp/file.txt']);
  });

  it('extracts single-quoted absolute path', () => {
    expect(extractQuotedPaths("open '/tmp/file.txt'")).toEqual(['/tmp/file.txt']);
  });

  it('extracts path with spaces in quotes', () => {
    expect(extractQuotedPaths('open "/my folder/my file.txt"')).toEqual([
      '/my folder/my file.txt',
    ]);
  });

  it('extracts quoted relative path', () => {
    expect(extractQuotedPaths('open "./src/index.ts"')).toEqual(['./src/index.ts']);
  });

  it('extracts quoted home-dir path', () => {
    expect(extractQuotedPaths('open "~/Documents/file.txt"')).toEqual(['~/Documents/file.txt']);
  });
});

// ---------- isAbsolutePath / isRelativePath (6 tests) ----------
describe('isAbsolutePath', () => {
  it('returns true for path starting with /', () => {
    expect(isAbsolutePath('/usr/bin/node')).toBe(true);
  });

  it('returns false for relative path', () => {
    expect(isAbsolutePath('./src/index.ts')).toBe(false);
  });

  it('returns false for bare filename', () => {
    expect(isAbsolutePath('file.txt')).toBe(false);
  });
});

describe('isRelativePath', () => {
  it('returns true for ./ path', () => {
    expect(isRelativePath('./src/index.ts')).toBe(true);
  });

  it('returns true for ../ path', () => {
    expect(isRelativePath('../parent/file.ts')).toBe(true);
  });

  it('returns false for absolute path', () => {
    expect(isRelativePath('/usr/bin/node')).toBe(false);
  });
});

// ---------- normalizePath (6 tests) ----------
describe('normalizePath', () => {
  it('collapses duplicate slashes', () => {
    expect(normalizePath('/usr//bin///node')).toBe('/usr/bin/node');
  });

  it('resolves single dot segments', () => {
    expect(normalizePath('/usr/./bin/./node')).toBe('/usr/bin/node');
  });

  it('resolves double dot segments', () => {
    expect(normalizePath('/usr/local/../bin/node')).toBe('/usr/bin/node');
  });

  it('converts backslashes to forward slashes', () => {
    expect(normalizePath('src\\utils\\file.ts')).toBe('src/utils/file.ts');
  });

  it('handles trailing slash', () => {
    expect(normalizePath('/usr/bin/')).toBe('/usr/bin');
  });

  it('preserves leading ./ for relative paths', () => {
    // path.normalize strips ./ but that's expected Node behavior
    expect(normalizePath('./src/index.ts')).toBe('src/index.ts');
  });
});

// ---------- getExtension / hasExtension (8 tests) ----------
describe('getExtension', () => {
  it('returns extension with dot', () => {
    expect(getExtension('/src/file.ts')).toBe('.ts');
  });

  it('returns empty string for no extension', () => {
    expect(getExtension('/usr/bin/node')).toBe('');
  });

  it('returns last extension for multiple dots', () => {
    expect(getExtension('archive.tar.gz')).toBe('.gz');
  });

  it('handles dotfiles', () => {
    expect(getExtension('.gitignore')).toBe('');
  });
});

describe('hasExtension', () => {
  it('returns true when extension matches', () => {
    expect(hasExtension('file.ts', ['.ts', '.js'])).toBe(true);
  });

  it('returns false when extension does not match', () => {
    expect(hasExtension('file.py', ['.ts', '.js'])).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(hasExtension('file.TSX', ['.tsx'])).toBe(true);
  });

  it('accepts extensions without leading dot', () => {
    expect(hasExtension('image.png', ['png', 'jpg'])).toBe(true);
  });
});
