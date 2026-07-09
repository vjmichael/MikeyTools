/**
 * Grep Tool for LM Studio Plugin
 * 
 * Provides fast, recursive file searching using ripgrep (rg).
 * Returns structured JSON or raw text output for model parsing.
 */

import { execFile } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export interface GrepResult {
  success: boolean;
  matches?: Array<{
    file: string;
    line: number;
    column?: number;
    text: string;
  }>;
  raw_output?: string;
  error?: string;
}

export interface GrepOptions {
  pattern: string;
  path?: string;
  recursive?: boolean;
  ignore_case?: boolean;
  glob?: string;
  max_count?: number;
  include_line_numbers?: boolean;
  use_json?: boolean;
  timeout_seconds?: number;
}

const DEFAULT_TIMEOUT = 30;
// MAX_OUTPUT_LENGTH is now exported from truncator.ts as DEFAULT_MAX_CHARS

// IMPROVE-06 FIX: Import isCommandAvailable from utils to reduce duplication
import { isCommandAvailable } from './utils';
import { DEFAULT_MAX_CHARS } from './truncator';

/**
 * Checks if ripgrep (rg) is available on the system.
 * IMPROVE-06 FIX: Use shared isCommandAvailable utility.
 */
async function checkRipgrep(): Promise<boolean> {
  return isCommandAvailable('rg');
}

/**
 * Searches files for a pattern using ripgrep (rg).
 * 
 * @param options - Grep options
 * @returns GrepResult with matches or error
 */
export async function grep(options: GrepOptions): Promise<GrepResult> {
  const {
    pattern,
    path: searchPath = '.',
    recursive = true,
    ignore_case = false,
    glob,
    max_count,
    include_line_numbers = true,
    use_json = false,
    timeout_seconds = DEFAULT_TIMEOUT
  } = options;

  // Validate pattern - empty pattern will cause rg to fail
  if (!pattern || pattern.trim() === '') {
    return {
      success: false,
      error: 'Pattern cannot be empty'
    };
  }

  // Validate path exists
  if (!fs.existsSync(searchPath)) {
    return {
      success: false,
      error: `Path does not exist: ${searchPath}`
    };
  }

  // Check if rg is available
  const rgAvailable = await checkRipgrep();
  if (!rgAvailable) {
    return {
      success: false,
      error: 'Ripgrep (rg) is not installed or not in PATH. Please install it to use the grep tool.'
    };
  }

  // Build arguments safely
  // NOTE: 'rg' expects pattern and path as the first two arguments, not 'grep'
  const args: string[] = [];

  // Line numbers - rg shows line numbers by default, so we only need --no-line-number to disable
  if (!include_line_numbers) {
    args.push('--no-line-number');
  }

  // Recursive - ONLY valid for directories, not files
  if (recursive && fs.statSync(searchPath).isDirectory()) {
    args.push('-r');
  }

  // Ignore case
  if (ignore_case) {
    args.push('--ignore-case');
  }

  // Glob filter
  if (glob) {
    args.push('--glob', glob);
  }

  // Max count
  if (max_count !== undefined) {
    args.push('-m', String(max_count));
  }

  // JSON output
  if (use_json) {
    args.push('--json');
  }

  // Disable color to avoid ANSI codes in output
  args.push('--color=never');

  // Add pattern and path as final arguments
  args.push(pattern);
  args.push(searchPath);

  // Execute ripgrep
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timed_out = false;

    const child = execFile('rg', args, {
      timeout: timeout_seconds * 1000,
      maxBuffer: 1024 * 1024 * 50, // 50MB buffer
      env: process.env
    }, (error, stdoutBuf, stderrBuf) => {
      stdout += stdoutBuf?.toString() || '';
      stderr += stderrBuf?.toString() || '';

      if (error) {
        if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
          timed_out = true;
        }

        // rg returns exit code 1 if no matches found (not an error)
        if (error.code === 1) {
          resolve({
            success: true,
            matches: [],
            raw_output: truncateOutput(stdout),
            error: timed_out ? `Search timed out after ${timeout_seconds} seconds` : undefined
          });
          return;
        }

        resolve({
          success: false,
          raw_output: truncateOutput(stdout),
          error: timed_out
            ? `Search timed out after ${timeout_seconds} seconds`
            : `rg error: ${error.message || stderr}`
        });
        return;
      }

      // Success
      if (use_json) {
        // Parse JSON output
        try {
          // Split on actual newlines, not literal \n
          const lines = stdout.split('\n').filter(l => l.trim());
          const matches: GrepResult['matches'] = [];

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'match') {
                // rg JSON format for matches
                const text = data.data || '';
                const submatches = data.submatches || [];
                const column = submatches.length > 0 ? submatches[0].start + 1 : undefined;
                
                matches.push({
                  file: data.path.text,
                  line: data.lineno,
                  column,
                  text
                });
              }
            } catch (parseErr) {
              // Skip unparseable lines
              continue;
            }
          }

          resolve({
            success: true,
            matches,
            raw_output: truncateOutput(stdout)
          });
        } catch (parseErr) {
          resolve({
            success: true,
            raw_output: truncateOutput(stdout),
            error: 'Failed to parse JSON output from rg'
          });
        }
      } else {
        resolve({
          success: true,
          raw_output: truncateOutput(stdout)
        });
      }
    });

    child.on('error', (error: Error) => {
      resolve({
        success: false,
        raw_output: truncateOutput(stdout),
        error: `Failed to execute rg: ${error.message}`
      });
    });
  });
}

/**
 * Truncates output to prevent excessive length.
 */
function truncateOutput(output: string, maxLength: number = DEFAULT_MAX_CHARS): string {
  if (output.length <= maxLength) {
    return output;
  }
  return output.substring(0, maxLength) + `\n...[truncated, ${output.length - maxLength} bytes omitted]`;
}
