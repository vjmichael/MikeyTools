/**
 * Background Task Manager for LM Studio Plugin
 * 
 * Allows agents to launch long-running processes (e.g., dependency downloads)
 * without blocking the main thread.
 */

import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

interface TaskInfo {
  id: string;
  command: string;
  pid: number;
  startTime: number;
  stdout: string;
  stderr: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  exitCode: number | null;
}

// In-memory task store
const taskStore: Map<string, TaskInfo> = new Map();

// BUG-14 FIX: Add TTL-based cleanup to prevent memory leak
const TASK_TTL_MS = 3600000; // 1 hour

// BUG-FIX: Track running task PIDs for cleanup
const runningTaskPids: Set<number> = new Set();

// H-06 FIX: Track cleanup interval for automatic cleanup
let cleanupInterval: NodeJS.Timeout | null = null;
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes

/**
 * Starts automatic cleanup of background tasks.
 * H-06 FIX: Added automatic cleanup to prevent unbounded memory growth.
 */
/**
 * Starts automatic cleanup of background tasks.
 * 
 * @param {number} [intervalMs=300000] - Cleanup interval in milliseconds
 * @returns {void}
 */

export function startBackgroundCleanup(intervalMs: number = CLEANUP_INTERVAL_MS): void {
  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(() => {
    cleanupTasks();
  }, intervalMs);
}

/**
 * Stops automatic cleanup of background tasks.
 */
export function stopBackgroundCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Cleans up all resources including tasks and temp files.
 * Call this during plugin shutdown.
 */
export function cleanupBackgroundResources(): void {
  // H-06 FIX: Stop automatic cleanup
  stopBackgroundCleanup();
  // Stop all running tasks
  for (const pid of runningTaskPids) {
    try {
      if (os.platform() === 'win32') {
        spawn('taskkill', ['/F', '/PID', pid.toString()]);
      } else {
        process.kill(pid);
      }
    } catch {
      // Process already exited
    }
  }
  runningTaskPids.clear();
  
  // Clean up old tasks
  cleanupTasks();
}

/**
 * Cleans up completed tasks older than TASK_TTL_MS.
 * Should be called periodically (e.g., every 5 minutes).
 */
export function cleanupTasks(): number {
  let cleaned = 0;
  const now = Date.now();
  for (const [id, task] of taskStore.entries()) {
    if (task.status !== 'running' && (now - task.startTime) > TASK_TTL_MS) {
      taskStore.delete(id);
      cleaned++;
    }
  }
  return cleaned;
}

export interface RunBackgroundResult {
  success: boolean;
  task_id: string;
  message: string;
}

export interface CheckTaskResult {
  success: boolean;
  task_id: string;
  status: string;
  stdout?: string;
  stderr?: string;
  exit_code?: number | null;
  message?: string;
}

export interface StopTaskResult {
  success: boolean;
  task_id: string;
  message: string;
}

/**
 * Generates a unique task ID.
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Runs a command in the background.
 */
export async function runBackgroundTask(
  command: string,
  shell: string = 'auto',
  cwd?: string,
  timeout?: number
): Promise<RunBackgroundResult> {
  // Determine shell
  let shellCmd = 'sh';
  let shellArg = '-c';
  
  if (os.platform() === 'win32') {
    shellCmd = 'cmd';
    shellArg = '/c';
    if (shell === 'powershell') {
      shellCmd = 'powershell';
      shellArg = '-Command';
    }
  } else {
    if (shell === 'bash') {
      shellCmd = 'bash';
      shellArg = '-c';
    } else if (shell === 'sh') {
      shellCmd = 'sh';
      shellArg = '-c';
    }
  }

  // Spawn the process
  const child = spawn(shellCmd, [shellArg, command], {
    cwd: cwd || process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const taskId = generateTaskId();
  runningTaskPids.add(child.pid || 0);
  let stdout = '';
  let stderr = '';

  // BUG-09 FIX: Limit stdout/stderr to prevent unbounded memory growth
  const MAX_OUTPUT = 1024 * 1024 * 5; // 5MB per stream
  let stdoutLen = 0;
  let stderrLen = 0;
  
  child.stdout?.on('data', (data) => {
    const str = data.toString();
    if (stdoutLen < MAX_OUTPUT) {
      const remaining = MAX_OUTPUT - stdoutLen;
      stdout += str.substring(0, remaining);
      stdoutLen += Math.min(str.length, remaining);
    }
  });

  child.stderr?.on('data', (data) => {
    const str = data.toString();
    if (stderrLen < MAX_OUTPUT) {
      const remaining = MAX_OUTPUT - stderrLen;
      stderr += str.substring(0, remaining);
      stderrLen += Math.min(str.length, remaining);
    }
  });

  child.on('close', (code) => {
    // Remove PID from tracking
    if (child.pid) {
      runningTaskPids.delete(child.pid);
    }
    const task = taskStore.get(taskId);
    if (task) {
      task.status = code === 0 ? 'completed' : 'failed';
      task.exitCode = code;
      task.stdout = stdout;
      task.stderr = stderr;
    }
  });

  child.on('error', (err: Error) => {
    // Remove PID from tracking
    if (child.pid) {
      runningTaskPids.delete(child.pid);
    }
    const task = taskStore.get(taskId);
    if (task) {
      task.status = 'failed';
      task.stderr += err.message;
    }
  });

  taskStore.set(taskId, {
    id: taskId,
    command: command,
    pid: child.pid || 0,
    startTime: Date.now(),
    stdout: '',
    stderr: '',
    status: 'running',
    exitCode: null
  });

  return {
    success: true,
    task_id: taskId,
    message: `Background task started: ${taskId}`
  };
}

/**
 * Checks the status of a background task.
 */
export async function checkTaskStatus(taskId: string): Promise<CheckTaskResult> {
  const task = taskStore.get(taskId);
  
  if (!task) {
    return {
      success: false,
      task_id: taskId,
      status: 'not_found',
      message: `Task ${taskId} not found.`
    };
  }

  // BUG-40 FIX: Do NOT delete tasks in checkTaskStatus - only delete via explicit deleteTask()
  // Polling a completed task twice should return data, not 'not_found' on second call.
  // Cleanup is handled by cleanupTasks() which uses TTL-based removal.
  
  return {
    success: true,
    task_id: taskId,
    status: task.status,
    stdout: task.stdout,
    stderr: task.stderr,
    exit_code: task.exitCode,
    message: task.status === 'running' ? 'Task is currently running.' : `Task completed with exit code: ${task.exitCode}`
  };
}

/**
 * Explicitly deletes a task from the store.
 * BUG-40 FIX: Only delete tasks via this explicit function, not during status checks.
 */
/**
 * Explicitly deletes a task from the store.
 * @param taskId - The ID of the task to delete
 * @returns true if the task was found and deleted, false otherwise
 */
export function deleteTask(taskId: string): boolean {
  return taskStore.delete(taskId);
}

/**
 * Stops a running background task.
 */
export async function stopTask(taskId: string): Promise<StopTaskResult> {
  const task = taskStore.get(taskId);
  
  if (!task) {
    return {
      success: false,
      task_id: taskId,
      message: `Task ${taskId} not found.`
    };
  }

  if (task.status !== 'running') {
    return {
      success: false,
      task_id: taskId,
      message: `Task is not running (status: ${task.status}).`
    };
  }

  // Kill the process
  try {
    // On Windows, we might need to use taskkill
    if (os.platform() === 'win32' && task.pid) {
      spawn('taskkill', ['/F', '/PID', task.pid.toString()]);
    } else if (task.pid) {
      process.kill(task.pid);
    }
    
    task.status = 'stopped';
    return {
      success: true,
      task_id: taskId,
      message: `Task ${taskId} stopped.`
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      task_id: taskId,
      message: `Failed to stop task: ${errMsg}`
    };
  }
}
