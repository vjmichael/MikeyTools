/**
 * Shared utilities for LM Studio Plugin
 * 
 * Common functions used across multiple tool files to reduce duplication
 * and improve code consistency.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

// ===================== COMMAND AVAILABILITY =====================

/**
 * Checks if a command is available on the system PATH.
 * Used by docker_ops.ts, git_ops.ts, github_ops.ts, audio.ts, and sandbox.ts.
 */
/**
 * Checks if a command is available on the system PATH.
 * Used by docker_ops.ts, git_ops.ts, github_ops.ts, audio.ts, and sandbox.ts.
 */
export async function isCommandAvailable(cmd: string): Promise<boolean> {
  // Check system PATH first
  try {
    await execFileAsync(cmd, ['--version']);
    return true;
  } catch {
    // Fall through to node_modules check
  }
  
  // Check exact bundled binary paths
  const bundledPaths = [
    path.join(__dirname, '..', 'node_modules', 'ffmpeg', 'ffmpeg.exe'),
    path.join(__dirname, '..', 'node_modules', 'whisper-bin', 'whisper-cli.exe'),
    path.join(__dirname, '..', 'node_modules', '.ffmpeg-*', 'ffmpeg.exe')
  ];
  
  for (const p of bundledPaths) {
    if (fs.existsSync(p)) {
      try {
        await execFileAsync(p, ['--version']);
        return true;
      } catch {
        continue;
      }
    }
  }
  
  return false;
}
  /** Maximum directory depth to search (default: unlimited) */
  maxDepth?: number;
  /** Current recursion depth (internal use) */
  _currentDepth?: number;
}

/**
 * Finds files recursively matching a pattern or comma-separated patterns.
 * Used by index.ts and code_intel.ts to avoid diverging implementations.
 * 
 * Supports patterns like:
 * - '*.py' - single extension
 * - '*.py,*.js,*.ts' - comma-separated extensions
 * - '*' - all files
 */
export async function findFiles(
  dir: string,
  pattern: string,
  maxDepth?: number
): Promise<string[]> {
  const results: string[] = [];
  
  // Parse patterns - handle both '*.ext' and 'ext' formats, plus comma-separated lists
  const patterns = pattern.split(',').map(p => p.trim());
  
  async function walk(currentDir: string, depth: number = 0) {
    // Respect max depth limit
    if (maxDepth !== undefined && depth > maxDepth) {
      return;
    }
    
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return; // Skip directories we can't read
    }
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        // Check against all patterns
        for (const pat of patterns) {
          if (matchesPattern(entry.name, pat)) {
            results.push(fullPath);
            break; // No need to check other patterns
          }
        }
      }
    }
  }
  
  await walk(dir);
  return results;
}

/**
 * Checks if a filename matches a glob pattern.
 * Supports: '*' (any), '*.ext' (extension), 'exact-name' (exact match)
 */
function matchesPattern(filename: string, pattern: string): boolean {
  // Exact match
  if (filename === pattern) {
    return true;
  }
  
  // All files wildcard
  if (pattern === '*') {
    return true;
  }
  
  // Extension wildcard (*.ext)
  if (pattern.startsWith('*.')) {
    const ext = pattern.substring(2);
    return filename.endsWith(`.${ext}`);
  }
  
  // Simple wildcard (*.name)
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    return regex.test(filename);
  }
  
  return false;
}

// M-04 FIX: Centralized timeout configuration
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const MAX_TIMEOUT = 120000; // 2 minutes
export const TASK_TTL_MS = 3600000; // 1 hour
export const CLEANUP_INTERVAL_MS = 300000; // 5 minutes
export const MAX_OUTPUT_LENGTH = 50000;
export const MAX_BUFFER_SIZE = 1024 * 1024 * 50; // 50MB

// ===================== STRUCTURED ERROR MESSAGES (#4 from IMPROVEMENTS doc) =====================

export interface ErrorContext {
  path?: string;
  suggestedPaths?: string[];
  availableItems?: string[];
  hint?: string;
}

/**
 * Format a structured, corrective error message that helps weaker models self-correct.
 * Provides specific suggestions and context rather than bare error codes.
 */
export function formatStructuredError(
  operation: string,
  error: Error,
  context?: ErrorContext
): string {
  const code = (error as any).code;
  let message = `${operation} failed: ${error.message}`;

  if (code === 'ENOENT') {
    // File/directory not found
    const path = context?.path || 'the specified path';
    if (context?.suggestedPaths && context.suggestedPaths.length > 0) {
      message += `\nDid you mean: ${context.suggestedPaths.slice(0, 3).join(', ')}?`;
    }
    if (context?.availableItems && context.availableItems.length > 0) {
      message += `\nFiles available: [${context.availableItems.join(', ')}]`;
    }
    if (context?.hint) {
      message += `\nHint: ${context.hint}`;
    }
  } else if (code === 'EACCES' || code === 'EPERM') {
    // Permission denied
    const path = context?.path || 'the specified path';
    message += `\nHint: Try writing to a different location or check permissions.`;
  } else if (code === 'EISDIR') {
    // Is a directory
    message += `\nHint: '${context?.path}' is a directory, not a file.`;
  } else if (code === 'EINVAL' || code === 'ERR_INVALID_ARG_TYPE') {
    // Invalid argument
    if (context?.hint) {
      message += `\nHint: ${context.hint}`;
    }
  } else if (error.message.includes('JSON')) {
    // JSON parse error
    message += `\nHint: Check your JSON syntax. Common issues: trailing commas, unquoted keys, missing commas between values.`;
  }

  return message;
}
