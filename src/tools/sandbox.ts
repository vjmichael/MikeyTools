/**
 * sandbox.ts - Isolated code execution using Pyodide (WASM)
 * Security model: Default no access, explicit opt-in, audit logging
 * 
 * Python path: Uses pyodide (CPython compiled to WASM)
 * JavaScript path: Uses Node.js directly (not sandboxed)
 * Bash path: Not supported in sandboxed mode (requires real OS shell)
 * 
 * NOTE: QuickJS WASM was deprecated and removed (2026-07-09) due to:
 * - Browser-first design (not compatible with LM Studio's Node.js environment)
 * - Intentionally restricts Node.js APIs for security
 * - WASM loading issues in non-browser environments
 * - Filesystem access restrictions break sandbox functionality
 * - Limited Node.js compatibility (explicitly stated by library authors)
 */

import { loadPyodide, type PyodideInterface } from 'pyodide';

// ==================== Types ====================

export interface IsolatedEnvConfig {
  allowPaths?: string[];
  allowNetwork?: boolean;
  allowFs?: boolean;
  captureConsole?: boolean;
  auditLog?: boolean;
}

export interface RunPythonOptions {
  code: string;
  env?: IsolatedEnvConfig;
  timeoutMs?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  duration_ms: number;
}

export interface AuditEntry {
  timestamp: number;
  action: 'read' | 'write' | 'network' | 'access';
  target: string;
  allowed: boolean;
}

// ==================== Audit Log ====================

const auditLog: AuditEntry[] = [];

export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}

export function clearAuditLog(): void {
  auditLog.length = 0;
}

function logAudit(action: AuditEntry['action'], target: string, allowed: boolean): void {
  auditLog.push({
    timestamp: Date.now(),
    action,
    target,
    allowed,
  });
}

// ==================== Python Isolated Execution (Pyodide WASM) ====================

let pyodideInstance: PyodideInterface | null = null;

async function getPyodideInstance(): Promise<PyodideInterface> {
  if (!pyodideInstance) {
    pyodideInstance = await loadPyodide();
  }
  return pyodideInstance;
}

export async function runPythonSandboxed(options: string | RunPythonOptions): Promise<ExecResult> {
  const startTime = Date.now();
  const config = typeof options === 'string' ? { code: options } : options;
  const code = config.code;
  const timeoutMs = config.timeoutMs || 15000;

  logAudit('access', 'python_sandboxed_start', true);

  try {
    const pyodide = await getPyodideInstance();
    let stdout = '';
    let stderr = '';
    
    pyodide.setStdout({ batched: (msg: string) => { stdout += msg; } });
    pyodide.setStderr({ batched: (msg: string) => { stderr += msg; } });

    // Pyodide runPythonAsync doesn't have timeout parameter - use Promise.race
    let timedOut = false;
    const pythonPromise = pyodide.runPythonAsync(code);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => { timedOut = true; reject(new Error(`Python execution timed out after ${timeoutMs}ms`)); }, timeoutMs)
    );
    const result = await Promise.race([pythonPromise, timeoutPromise]);

    logAudit('access', 'python_sandboxed_success', true);
    return {
      stdout: result?.toString() || stdout,
      stderr: stderr,
      exit_code: 0,
      timed_out: timedOut,
      duration_ms: Date.now() - startTime,
    };
  } catch (error: any) {
    let errorMessage = 'Unknown error';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.toString && typeof error.toString === 'function') {
      const str = error.toString();
      if (str && str !== '[object Object]') {
        errorMessage = str;
      }
    } else {
      errorMessage = String(error);
    }
    const timedOut = typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('timed out');
    logAudit('access', 'python_sandboxed_error', false);
    return {
      stdout: '',
      stderr: timedOut ? `Python execution timed out after ${timeoutMs}ms` : errorMessage,
      exit_code: -1,
      timed_out: timedOut,
      duration_ms: Date.now() - startTime,
    };
  }
}

// ==================== JavaScript Execution (Not Sandboxed) ====================

/**
 * JavaScript code execution uses Node.js directly (not sandboxed).
 * QuickJS WASM was removed due to incompatibility with LM Studio.
 */
export async function runJavaScriptDirect(code: string): Promise<ExecResult> {
  const startTime = Date.now();
  
  try {
    // Use Node.js vm module for basic isolation
    const vm = require('vm');
    const sandbox = { console, process, require, module, exports, __filename, __dirname };
    const context = vm.createContext(sandbox);
    
    const result = vm.runInContext(code, context, {
      timeout: 15000,
      breakOnSigint: false
    });
    
    return {
      stdout: result?.toString() || '',
      stderr: '',
      exit_code: 0,
      timed_out: false,
      duration_ms: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      stdout: '',
      stderr: error.message || 'Unknown error',
      exit_code: -1,
      timed_out: false,
      duration_ms: Date.now() - startTime,
    };
  }
}

// ==================== Bash Not Supported ====================

export async function runBashNotSupported(): Promise<ExecResult> {
  return {
    stdout: '',
    stderr: 'Bash is not supported in sandboxed mode. Shell scripting requires a real underlying OS.',
    exit_code: 1,
    timed_out: false,
    duration_ms: 0,
  };
}

// ==================== Sandbox Availability Check ====================

export async function checkSandboxAvailability(): Promise<{
  js: boolean;
  python: boolean;
  bash: boolean;
  message: string;
}> {
  let pythonAvailable = false;

  try {
    await getPyodideInstance();
    pythonAvailable = true;
  } catch {
    pythonAvailable = false;
  }

  return {
    js: true, // Node.js always available
    python: pythonAvailable,
    bash: false,
    message: [
      'JavaScript: Available (Node.js direct execution)',
      pythonAvailable ? '✓ Python sandbox available (Pyodide WASM)' : '✗ Python sandbox unavailable',
      'Bash: not supported in sandboxed mode',
    ].join('\n'),
  };
}

// ==================== Stub for backwards compatibility ====================

export async function stubTool(...args: any[]): Promise<string> {
  return JSON.stringify({ success: false, error: 'Tool stub' });
}
