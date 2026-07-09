/**
 * sandbox.ts - Isolated code execution using QuickJS (WASM) and pyodide
 * Security model: Default no access, explicit opt-in, audit logging
 * 
 * JS path: Uses @sebastianwessel/quickjs (QuickJS compiled to WASM)
 * Python path: Uses pyodide (CPython compiled to WASM)
 * Bash path: Not supported in sandboxed mode (requires real OS shell)
 */

import { loadQuickJs, type SandboxOptions } from '@sebastianwessel/quickjs';
import variant from '@jitl/quickjs-wasmfile-release-sync';
import { loadPyodide, type PyodideInterface } from 'pyodide';

// ==================== Types ====================

export interface IsolatedEnvConfig {
  allowPaths?: string[];
  allowNetwork?: boolean;
  allowFs?: boolean;
  captureConsole?: boolean;
  auditLog?: boolean;
}

export interface RunJsOptions {
  code: string;
  file?: string;
  env?: IsolatedEnvConfig;
  timeoutMs?: number;
  memoryLimitMb?: number;
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

// ==================== Simple Glob Matcher ====================

function globMatch(text: string, pattern: string): boolean {
  let regexPattern = pattern;
  regexPattern = regexPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  regexPattern = regexPattern.replace(/\*\*/g, '{{DOUBLE_STAR}}');
  regexPattern = regexPattern.replace(/\*/g, '[^/]*');
  regexPattern = regexPattern.replace(/{{DOUBLE_STAR}}/g, '.*');
  regexPattern = regexPattern.replace(/\?/g, '[^/]');
  const regex = new RegExp('^' + regexPattern + '$', 'i');
  return regex.test(text);
}

// ==================== Path Permission Check ====================

function checkPathAccess(filePath: string, allowedPatterns: string[]): boolean {
  if (!allowedPatterns || allowedPatterns.length === 0) {
    return false;
  }
  // Note: In sandboxed mode, paths are virtualized - this is a metadata check
  for (const pattern of allowedPatterns) {
    if (globMatch(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

// ==================== JS Isolated Execution (QuickJS WASM) ====================

// Singleton to avoid re-loading WASM on every call
let quickJsInstance: Awaited<ReturnType<typeof loadQuickJs>> | null = null;

async function getQuickJsInstance(): Promise<Awaited<ReturnType<typeof loadQuickJs>>> {
  if (!quickJsInstance) {
    quickJsInstance = await loadQuickJs(variant);
  }
  return quickJsInstance;
}

export async function runJsSandboxed(options: string | RunJsOptions): Promise<ExecResult> {
  const startTime = Date.now();
  const config = typeof options === 'string' ? { code: options } : options;
  const code = config.code;
  const env = config.env || {};
  const timeoutMs = config.timeoutMs || 15000;
  const memoryLimitMb = config.memoryLimitMb || 100;

  logAudit('access', 'js_sandboxed_start', true);

  try {
    const { runSandboxed } = await getQuickJsInstance();

    // Default-deny security configuration
    const sandboxOptions: SandboxOptions = {
      allowFetch: env.allowNetwork || false,  // default deny
      allowFs: env.allowFs || false,          // default deny
      env: env.allowFs ? Object.fromEntries(Object.entries(process.env).filter(([k, v]) => v !== undefined)) : {},
    };

    // Use QuickJS's built-in timeout
    const result = await runSandboxed(
      async ({ evalCode }: { evalCode: (code: string) => Promise<any> }) => {
        return evalCode(code);
      },
      {
        ...sandboxOptions,
        executionTimeout: timeoutMs,
      }
    );

    logAudit('access', 'js_sandboxed_success', true);
    const stdout = result?.ok ? (result.data !== undefined ? String(result.data) : '') : '';
    const timedOut = (result?.error && typeof result.error === 'string' && (result.error.toLowerCase().includes('timeout') || result.error.toLowerCase().includes('timed'))) || false;
    return {
      stdout,
      stderr: result?.ok ? '' : String(result?.error || 'Unknown error'),
      exit_code: result?.ok ? 0 : -1,
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
    const timedOut = typeof errorMessage === 'string' && (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('timed'));
    logAudit('access', 'js_sandboxed_error', false);
    return {
      stdout: '',
      stderr: errorMessage,
      exit_code: -1,
      timed_out: timedOut,
      duration_ms: Date.now() - startTime,
    };
  }
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
  let jsAvailable = false;
  let pythonAvailable = false;

  try {
    await getQuickJsInstance();
    jsAvailable = true;
  } catch {
    jsAvailable = false;
  }

  try {
    await getPyodideInstance();
    pythonAvailable = true;
  } catch {
    pythonAvailable = false;
  }

  return {
    js: jsAvailable,
    python: pythonAvailable,
    bash: false,
    message: [
      jsAvailable ? '✓ JS sandbox available (QuickJS WASM)' : '✗ JS sandbox unavailable',
      pythonAvailable ? '✓ Python sandbox available (Pyodide WASM)' : '✗ Python sandbox unavailable',
      'Bash: not supported in sandboxed mode',
    ].join('\n'),
  };
}

// ==================== Stub for backwards compatibility ====================

export async function stubTool(...args: any[]): Promise<string> {
  return JSON.stringify({ success: false, error: 'Tool stub' });
}
