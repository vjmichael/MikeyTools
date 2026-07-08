/**
 * PowerShell Utilities Module
 * 
 * Provides helper functions that work around PowerShell escaping issues
 * when executing code through the execute_code tool.
 * 
 * KEY ISSUES ADDRESSED:
 * 1. Single quotes inside single-quoted strings
 * 2. Regex character classes containing brackets
 * 3. Here-string multi-line syntax
 * 4. Special characters ($, @, backticks)
 * 5. Array literals and complex data structures
 */

// ==================== FILE OPERATIONS ====================

/**
 * Safely copy a file, creating the destination directory if needed.
 * Avoids PowerShell path escaping issues by using simple commands.
 */
export function buildCopyCommand(src: string, dest: string): string {
  // Use cmd-style copy for simplicity and reliability
  return `cmd /c "copy /Y "${src}" "${dest}""`;
}

/**
 * Safely remove a file.
 */
export function buildRemoveCommand(path: string): string {
  return `Remove-Item -Force "${path}"`;
}

/**
 * Safely create a directory recursively.
 */
export function buildMkdirCommand(dir: string): string {
  return `New-Item -ItemType Directory -Force -Path "${dir}"`;
}

// ==================== TEXT PROCESSING ====================

/**
 * Escape a string for safe inclusion in PowerShell single-quoted strings.
 * In PowerShell, single quotes are literal - no escaping needed inside them.
 * But if the string itself contains single quotes, we need to handle them.
 */
export function escapeForSingleQuote(str: string): string {
  // In PowerShell single-quoted strings, '' represents a literal single quote
  return str.replace(/'/g, "''");
}

/**
 * Escape a string for safe inclusion in PowerShell double-quoted strings.
 * Double-quoted strings interpret $, `, @, and other special characters.
 */
export function escapeForDoubleQuote(str: string): string {
  // Escape $ as $$, backtick as ``
  return str
    .replace(/\$/g, '$$')
    .replace(/`/g, '``');
}

/**
 * Escape a string for safe inclusion in regex patterns.
 * This handles the issue where Select-String regex patterns
 * get corrupted when passed through JSON → shell.
 */
export function escapeForRegex(str: string): string {
  // Escape regex special characters
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==================== SEARCH PATTERNS ====================

/**
 * Build a safe search pattern that avoids PowerShell escaping issues.
 * Instead of using complex regex, use simple string matching.
 */
export function buildSearchPattern(pattern: string, caseSensitive: boolean = false): string {
  if (caseSensitive) {
    // Use Select-String with -SimpleMatch to avoid regex escaping
    return `-Pattern "${escapeForDoubleQuote(pattern)}" -SimpleMatch`;
  } else {
    // For case-insensitive, use -CaseSensitive:$false
    return `-Pattern "${escapeForDoubleQuote(pattern)}" -CaseSensitive:$false`;
  }
}

/**
 * Build a grep-like command that avoids regex escaping issues.
 * Uses simple string matching instead of complex regex.
 */
export function buildGrepCommand(pattern: string, path: string, recursive: boolean = false): string {
  const recursiveFlag = recursive ? ' -Recurse' : '';
  return `Select-String -Path "C:${path}"${recursiveFlag} -Pattern "${escapeForDoubleQuote(pattern)}" -SimpleMatch`;
}

// ==================== ARRAY/LIST HANDLING ====================

/**
 * Convert a JavaScript array to a PowerShell array literal.
 * Avoids the escaping issues with inline PowerShell arrays.
 */
export function arrayToPowerShell(arr: string[]): string {
  // Use @() syntax with escaped items
  const items = arr.map(item => `"${escapeForDoubleQuote(item)}"`).join(', ');
  return `@(${items})`;
}

/**
 * Convert a JavaScript object to a PowerShell hashtable.
 */
export function objectToPowerShellHashtable(obj: Record<string, any>): string {
  const entries = Object.entries(obj)
    .map(([key, value]) => `"${key}" = "${escapeForDoubleQuote(String(value))}"`)
    .join(', ');
  return `@{${entries}}`;
}

// ==================== FILE CONTENT OPERATIONS ====================

/**
 * Build a command to read file content without escaping issues.
 * Uses Get-Content which handles paths reliably.
 */
export function buildReadFileCommand(path: string): string {
  return `Get-Content "${path}" -Raw`;
}

/**
 * Build a command to write file content safely.
 * Uses Set-Content with proper escaping.
 */
export function buildWriteFileCommand(path: string, content: string): string {
  // For content with special characters, use here-string approach
  // But since we can't use multi-line here-strings in execute_code,
  // we use -Encoding UTF8 to avoid encoding issues
  return `Set-Content -Path "${path}" -Value ${escapeForDoubleQuote(content)} -Encoding UTF8`;
}

// ==================== CROSS-PLATFORM UTILITIES ====================

/**
 * Detect if WSL is available on the system.
 * Returns a PowerShell command that checks WSL availability.
 */
export function buildWslCheckCommand(): string {
  return `if (Get-Command wsl -ErrorAction SilentlyContinue) { "WSL_AVAILABLE" } else { "WSL_NOT_AVAILABLE" }`;
}

/**
 * Build a command that works regardless of WSL availability.
 * Uses PowerShell-native commands instead of bash/WSL.
 */
export function buildCrossPlatformCommand(operation: 'ls' | 'cat' | 'grep', path: string, args?: string): string {
  switch (operation) {
    case 'ls':
      return `Get-ChildItem "${path}"${args ? ' ' + args : ''}`;
    case 'cat':
      return `Get-Content "${path}"`;
    case 'grep':
      return `Select-String -Path "${path}" -Pattern "${escapeForDoubleQuote(args || '')}"`;
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

// ==================== EXAMPLES ====================

/**
 * Example: How to safely search for files matching a pattern.
 * 
 * WRONG (breaks with regex escaping):
 * Select-String -Path "..." -Pattern "from ['\"]\./types['\"]"
 * 
 * RIGHT (uses simple match):
 * Select-String -Path "..." -Pattern "from './types'" -SimpleMatch
 */
export const EXAMPLES = {
  safeSearch: {
    description: 'Safe file search avoiding regex escaping',
    code: (pattern: string, path: string) => 
      `Select-String -Path "${path}" -Pattern "${escapeForDoubleQuote(pattern)}" -SimpleMatch`,
  },
  safeCopy: {
    description: 'Safe file copy operation',
    code: (src: string, dest: string) => 
      `cmd /c "copy /Y "${src}" "${dest}""`,
  },
  wslCheck: {
    description: 'Check if WSL is available',
    code: buildWslCheckCommand(),
  },
};
