/**
 * Code Execution Tool for LM Studio Plugin
 * 
 * Executes code in Python, Bash, or Node.js with timeout, output capture, and truncation.
 * Returns structured JSON for model parsing.
 */

import { execFile } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { truncateOutput } from './truncator';

interface ExecuteResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  duration_ms: number;
}

const DEFAULT_TIMEOUT = 15;
const MAX_TIMEOUT = 120;
const MAX_OUTPUT_LENGTH = 50000;

// BUG-07 FIX: Detect Python interpreter for cross-platform compatibility
function getPythonCommand(): string {
  return os.platform() === 'win32' ? 'python' : 'python3';
}

export async function executeCode(
  language: 'python' | 'bash' | 'powershell' | 'node',
  code?: string,
  file_path?: string,
  timeout_seconds: number = DEFAULT_TIMEOUT,
  cwd?: string,
  args?: string[]
): Promise<ExecuteResult> {
  const startTime = Date.now();
  
  // Validate language
  const supportedLanguages = ['python', 'bash', 'powershell', 'node'];
  if (!supportedLanguages.includes(language)) {
    return {
      stdout: '',
      stderr: `Error: Unsupported language "${language}". Supported: ${supportedLanguages.join(', ')}`,
      exit_code: 1,
      timed_out: false,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Validate timeout
  timeout_seconds = Math.max(1, Math.min(timeout_seconds, MAX_TIMEOUT));
  
  // Build command and args safely using execFile to prevent command injection
  let cmd: string;
  let cmdArgs: string[] = [];
  
  if (file_path) {
    if (language === 'python') {
      // BUG-07 FIX: Use detected Python command
      cmd = getPythonCommand();
      cmdArgs = [file_path, ...(args || [])];
    } else if (language === 'node') {
      cmd = 'node';
      cmdArgs = [file_path, ...(args || [])];
    } else if (language === 'powershell') {
      cmd = 'powershell';
      cmdArgs = ['-File', file_path, ...(args || [])];
    } else {
      // bash - BUG-01 FIX: Use execFile with proper args instead of shell out to bash
      // BUG-01b FIX: Don't pass file_path through shell string - use direct execFile args
      cmd = 'bash';
      cmdArgs = [file_path, ...(args || [])];
    }
  } else if (code) {
    if (language === 'python') {
      // BUG-07 FIX: Use detected Python command
      cmd = getPythonCommand();
      cmdArgs = ['-c', code];
    } else if (language === 'node') {
      cmd = 'node';
      cmdArgs = ['-e', code];
    } else if (language === 'powershell') {
      cmd = 'powershell';
      // BUG-28 FIX: PowerShell uses '' (two single quotes) to escape inside single-quoted strings
      cmdArgs = ['-Command', code.replace(/'/g, "''")];
    } else {
      // bash
      cmd = 'bash';
      cmdArgs = ['-c', code];
    }
  } else {
    return {
      stdout: '',
      stderr: 'Error: Either "code" or "file_path" must be provided.',
      exit_code: 1,
      timed_out: false,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Execute using execFile (safer than exec)
  return new Promise<ExecuteResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let timed_out = false;
    
    // BUG-13 FIX: Increased maxBuffer from 10MB to 50MB for large outputs
    // BUG-20 FIX: Added documentation comment for timeout conversion
    const child = execFile(cmd, cmdArgs, {
      cwd,
      env: process.env,
      // timeout_seconds is converted to ms for execFile
      timeout: timeout_seconds * 1000,
      maxBuffer: 1024 * 1024 * 50 // 50MB buffer
    }, (error, stdoutBuf, stderrBuf) => {
      stdout += stdoutBuf?.toString() || '';
      stderr += stderrBuf?.toString() || '';
      
      if (error) {
        // Check if it's a timeout error
        if (error.message.includes('timeout')) {
          timed_out = true;
        }
        resolve({
          stdout: truncateOutput(stdout),
          stderr: truncateOutput(stderr),
          exit_code: typeof error.code === 'number' ? error.code : -1,
          timed_out: timed_out,
          duration_ms: Date.now() - startTime
        });
      } else {
        resolve({
          stdout: truncateOutput(stdout),
          stderr: truncateOutput(stderr),
          exit_code: 0,
          timed_out: false,
          duration_ms: Date.now() - startTime
        });
      }
    });
    
    // Handle kill errors gracefully
    child.on('error', (error: Error) => {
      if (!timed_out) {
        resolve({
          stdout: truncateOutput(stdout),
          stderr: truncateOutput(stderr),
          exit_code: -1,
          timed_out: false,
          duration_ms: Date.now() - startTime
        });
      }
    });
  });
}
