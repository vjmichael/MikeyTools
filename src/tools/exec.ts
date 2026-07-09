/**
 * Code Execution Tool for LM Studio Plugin
 * 
 * Executes code in Python, Bash, or Node.js with timeout, output capture, and truncation.
 * Returns structured JSON for model parsing.
 */

import { execFile } from 'child_process';
import * as os from 'os';
// ==================== Language Detection ====================

/**
 * Detect language from code content (no file extension needed)
 * Returns the detected language or null if unrecognized
 */
function detectLanguageFromContent(code: string): string | null {
  const trimmed = code.trim();
  
  // Check for common language signatures
  if (trimmed.startsWith('#!/usr/bin/env python') || trimmed.startsWith('#!/usr/bin/python') || trimmed.match(/^import\s+(os|sys|json|re|math|collections|itertools|functools|pathlib|subprocess|threading|multiprocessing|asyncio|datetime|time|random|string|struct|hashlib|hmac|secrets|base64|codecs|textwrap|unicodedata|locale|gettext|enum|dataclasses|typing|abc|contextlib|weakref|types|copy|pprint|reprlib|collections\.abc|operator|decimal|fractions|statistics|array|bisect|heapq|queue|contextlib|io|tempfile|glob|fnmatch|shutil|pickle|shelve|dbm|sqlite3|csv|configparser|argparse|logging|warnings|traceback|inspect|dis|symtable|ast|token|tokenize|symbol|parser|compileall|py_compile|compile|exec|eval|open|print|input|exit|quit|dir|help|type|id|repr|len|str|bytes|bytearray|memoryview|range|slice|map|filter|zip|enumerate|sorted|reversed|sum|min|max|any|all|next|iter|callable|getattr|setattr|hasattr|delattr|property|staticmethod|classmethod|isinstance|issubclass|callable|compile|eval|exec|open|print|input|exit|quit|dir|help|type|id|repr|len|str|bytes|bytearray|memoryview|range|slice|map|filter|zip|enumerate|sorted|reversed|sum|min|max|any|all|next|iter)/)) {
    return 'python';
  }
  if (trimmed.startsWith('#!') && trimmed.includes('ruby')) {
    return 'ruby';
  }
  if (trimmed.startsWith('#!') && trimmed.includes('perl')) {
    return 'perl';
  }
  if (trimmed.startsWith('#!') && trimmed.includes('lua')) {
    return 'lua';
  }
  if (trimmed.startsWith('#!') && trimmed.includes('php')) {
    return 'php';
  }
  if (trimmed.startsWith('#!') && trimmed.includes('bash') || trimmed.startsWith('#!') && trimmed.includes('sh')) {
    return 'bash';
  }
  if (trimmed.startsWith('#!/bin/sh')) {
    return 'sh';
  }
  
  // Check for language-specific patterns
  if (trimmed.includes('#include <iostream>') || trimmed.includes('#include <stdio.h>') || trimmed.includes('#include <stdlib.h>')) {
    return 'c';
  }
  if (trimmed.includes('#include <iostream>') && trimmed.includes('std::')) {
    return 'cpp';
  }
  if (trimmed.includes('package main') && trimmed.includes('func main()')) {
    return 'go';
  }
  if (trimmed.includes('fn main()') && trimmed.includes('#[tokio::main]')) {
    return 'rust';
  }
  if (trimmed.includes('public class') || trimmed.includes('class ') && trimmed.includes('public static void main')) {
    return 'java';
  }
  
  return null;
}

/**
 * Detect language from file extension
 */
function detectLanguageFromExtension(file_path: string): string | null {
  const ext = path.extname(file_path).toLowerCase();
  const extensionMap: Record<string, string> = {
    '.py': 'python',
    '.js': 'node',
    '.ts': 'node',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.rb': 'ruby',
    '.pl': 'perl',
    '.lua': 'lua',
    '.php': 'php',
    '.sh': 'sh',
    '.bash': 'bash',
    '.ps1': 'powershell',
  };
  return extensionMap[ext] || null;
}
import * as path from 'path';
import * as fs from 'fs';
import { truncateOutput } from './truncator';
import { runJavaScriptDirect, runPythonSandboxed, runBashNotSupported } from './sandbox';

interface ExecuteResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  duration_ms: number;
}

const DEFAULT_TIMEOUT = 15;
const MAX_TIMEOUT = 120;
// MAX_OUTPUT_LENGTH is now exported from truncator.ts as DEFAULT_MAX_CHARS

// BUG-07 FIX: Detect Python interpreter for cross-platform compatibility
function getPythonCommand(): string {
  return os.platform() === 'win32' ? 'python' : 'python3';
}

export async function executeCode(
  language: 'python' | 'bash' | 'powershell' | 'node' | 'c' | 'cpp' | 'rust' | 'go' | 'java' | 'ruby' | 'perl' | 'lua' | 'php' | 'shell' | 'sh',
  code?: string,
  file_path?: string,
  timeout_seconds: number = DEFAULT_TIMEOUT,
  cwd?: string,
  args?: string[]
): Promise<ExecuteResult> {
  const startTime = Date.now();
  
  // Auto-detect language if not specified
  let detectedLanguage: 'python' | 'bash' | 'powershell' | 'node' | 'c' | 'cpp' | 'rust' | 'go' | 'java' | 'ruby' | 'perl' | 'lua' | 'php' | 'shell' | 'sh' = language as 'python' | 'bash' | 'powershell' | 'node' | 'c' | 'cpp' | 'rust' | 'go' | 'java' | 'ruby' | 'perl' | 'lua' | 'php' | 'shell' | 'sh';
  if (!language) {
    if (file_path) {
      detectedLanguage = (detectLanguageFromExtension(file_path) || 'python') as 'python' | 'bash' | 'powershell' | 'node' | 'c' | 'cpp' | 'rust' | 'go' | 'java' | 'ruby' | 'perl' | 'lua' | 'php' | 'shell' | 'sh';
    } else if (code) {
      detectedLanguage = (detectLanguageFromContent(code) || 'python') as 'python' | 'bash' | 'powershell' | 'node' | 'c' | 'cpp' | 'rust' | 'go' | 'java' | 'ruby' | 'perl' | 'lua' | 'php' | 'shell' | 'sh';
    }
  }
  
  // Validate language
  const supportedLanguages = ['python', 'bash', 'powershell', 'node', 'c', 'cpp', 'rust', 'go', 'java', 'ruby', 'perl', 'lua', 'php', 'shell', 'sh'];
  if (!supportedLanguages.includes(detectedLanguage)) {
    return {
      stdout: '',
      stderr: `Error: Unsupported language "${detectedLanguage}". Supported: ${supportedLanguages.join(', ')}`,
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
    if (detectedLanguage === 'python') {
      cmd = getPythonCommand();
      cmdArgs = [file_path, ...(args || [])];
    } else if (detectedLanguage === 'node') {
      cmd = 'node';
      cmdArgs = [file_path, ...(args || [])];
    } else if (detectedLanguage === 'c') {
      cmd = 'gcc';
      cmdArgs = ['-x', 'c', file_path, '-o', '/tmp/exec_' + Date.now(), ...(args || [])];
    } else if (detectedLanguage === 'cpp') {
      cmd = 'g++';
      cmdArgs = ['-x', 'c++', file_path, '-o', '/tmp/exec_' + Date.now(), ...(args || [])];
    } else if (detectedLanguage === 'rust') {
      cmd = 'rustc';
      cmdArgs = [file_path, '-o', '/tmp/exec_' + Date.now(), ...(args || [])];
    } else if (detectedLanguage === 'go') {
      cmd = 'go';
      cmdArgs = ['run', file_path, ...(args || [])];
    } else if (detectedLanguage === 'java') {
      cmd = 'java';
      cmdArgs = ['-cp', path.dirname(file_path), path.basename(file_path, '.java'), ...(args || [])];
    } else if (detectedLanguage === 'ruby') {
      cmd = 'ruby';
      cmdArgs = [file_path, ...(args || [])];
    } else if (detectedLanguage === 'perl') {
      cmd = 'perl';
      cmdArgs = [file_path, ...(args || [])];
    } else if (detectedLanguage === 'lua') {
      cmd = 'lua';
      cmdArgs = [file_path, ...(args || [])];
    } else if (detectedLanguage === 'php') {
      cmd = 'php';
      cmdArgs = [file_path, ...(args || [])];
    } else if (detectedLanguage === 'sh' || detectedLanguage === 'bash') {
      cmd = detectedLanguage === 'sh' ? 'sh' : 'bash';
      cmdArgs = [file_path, ...(args || [])];
    } else if (detectedLanguage === 'powershell') {
      cmd = 'powershell';
      cmdArgs = ['-File', file_path, ...(args || [])];
    }
  } else if (code) {
    if (detectedLanguage === 'python') {
      cmd = getPythonCommand();
      cmdArgs = ['-c', code];
    } else if (detectedLanguage === 'node') {
      cmd = 'node';
      cmdArgs = ['-e', code];
    } else if (detectedLanguage === 'c') {
      // Compile and run C code
      const tempFile = '/tmp/code_' + Date.now() + '.c';
      fs.writeFileSync(tempFile, code);
      cmd = 'gcc';
      cmdArgs = [tempFile, '-o', '/tmp/exec_' + Date.now(), ...(args || [])];
    } else if (detectedLanguage === 'cpp') {
      // Compile and run C++ code
      const tempFile = '/tmp/code_' + Date.now() + '.cpp';
      fs.writeFileSync(tempFile, code);
      cmd = 'g++';
      cmdArgs = [tempFile, '-o', '/tmp/exec_' + Date.now(), ...(args || [])];
    } else if (detectedLanguage === 'rust') {
      // Compile and run Rust code
      const tempFile = '/tmp/code_' + Date.now() + '.rs';
      fs.writeFileSync(tempFile, code);
      cmd = 'rustc';
      cmdArgs = [tempFile, '-o', '/tmp/exec_' + Date.now(), ...(args || [])];
    } else if (detectedLanguage === 'go') {
      // Run Go code
      cmd = 'go';
      cmdArgs = ['run', '-e', code];
    } else if (detectedLanguage === 'java') {
      // Compile and run Java code (simplified)
      const tempFile = '/tmp/Code_' + Date.now() + '.java';
      fs.writeFileSync(tempFile, code);
      cmd = 'javac';
      cmdArgs = [tempFile];
    } else if (detectedLanguage === 'ruby') {
      cmd = 'ruby';
      cmdArgs = ['-e', code];
    } else if (detectedLanguage === 'perl') {
      cmd = 'perl';
      cmdArgs = ['-e', code];
    } else if (detectedLanguage === 'lua') {
      cmd = 'lua';
      cmdArgs = ['-e', code];
    } else if (detectedLanguage === 'php') {
      cmd = 'php';
      cmdArgs = ['-r', code];
    } else if (detectedLanguage === 'sh' || detectedLanguage === 'bash') {
      cmd = detectedLanguage === 'sh' ? 'sh' : 'bash';
      cmdArgs = ['-c', code];
    } else if (detectedLanguage === 'powershell') {
      cmd = 'powershell';
      cmdArgs = ['-Command', code.replace(/'/g, "''")];
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
  
  // ==================== Isolated Execution Routing ====================
  if (detectedLanguage === 'node') {
    let codeToRun = code;
    if (!code && file_path) {
      try {
        codeToRun = fs.readFileSync(file_path, 'utf-8');
      } catch (err: any) {
        return { stdout: '', stderr: `Error reading file: ${err.message}`, exit_code: -1, timed_out: false, duration_ms: Date.now() - startTime };
      }
    }
    const result = await runJavaScriptDirect(codeToRun || '');
    return { stdout: truncateOutput(result.stdout), stderr: truncateOutput(result.stderr), exit_code: result.exit_code, timed_out: result.timed_out, duration_ms: result.duration_ms };
  }
  
  if (detectedLanguage === 'python') {
    let codeToRun = code;
    if (!code && file_path) {
      try {
        codeToRun = fs.readFileSync(file_path, 'utf-8');
      } catch (err: any) {
        return { stdout: '', stderr: `Error reading file: ${err.message}`, exit_code: -1, timed_out: false, duration_ms: Date.now() - startTime };
      }
    }
    const result = await runPythonSandboxed({ code: codeToRun || '', timeoutMs: timeout_seconds * 1000 });
    return { stdout: truncateOutput(result.stdout), stderr: truncateOutput(result.stderr), exit_code: result.exit_code, timed_out: result.timed_out, duration_ms: result.duration_ms };
  }
  
  // Bash/shell: not supported in sandboxed mode
  if (detectedLanguage === 'bash' || detectedLanguage === 'sh') {
    const result = await runBashNotSupported();
    return { stdout: truncateOutput(result.stdout), stderr: truncateOutput(result.stderr), exit_code: result.exit_code, timed_out: false, duration_ms: 0 };
  }
  
  // PowerShell: requires external shell (non-sandboxed)
  // Fall back to original execFile behavior for non-sandboxed languages
  if (detectedLanguage === 'powershell') {
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
  
  // Default fallback for non-PowerShell languages
  return new Promise<ExecuteResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let timed_out = false;
    
    const child = execFile(cmd, cmdArgs, {
      cwd,
      env: process.env,
      timeout: timeout_seconds * 1000,
      maxBuffer: 1024 * 1024 * 50
    }, (error, stdoutBuf, stderrBuf) => {
      stdout += stdoutBuf?.toString() || '';
      stderr += stderrBuf?.toString() || '';
      
      if (error) {
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
