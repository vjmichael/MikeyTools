/**
 * @DEPRECATED 2025-07-09: Git operations tools have been deprecated.
 * 
 * These tools required system-level pathing (Docker/WSL/Git API) which is blocked
 * by LM Studio's sandbox security model.
 * 
 * Alternative: Use LM Studio's native interface for Git operations.
 * 
 * To restore these tools in the future:
 * 1. Restore from backup/system-path-tools/git_ops.ts
 * 2. Update sandbox permissions to allow system pathing
 * 3. Re-enable the git_status, git_diff, git_log, and git_blame tools
 */

// ===================== DEPRECATED STUBS =====================

/**
 * @DEPRECATED Use LM Studio's native Git interface instead.
 */
export async function gitStatus(directory: string): Promise<string> {
  return JSON.stringify({
    success: false,
    tool: 'git_status',
    status: 'DEPRECATED',
    error: 'Git operations tools have been deprecated due to sandbox security constraints.',
    hint: 'Use LM Studio interface for Git operations.',
    restored_from: 'backup/system-path-tools/git_ops.ts'
  }, null, 2);
}

/**
 * @DEPRECATED Use LM Studio's native Git interface instead.
 */
export async function gitDiff(directory: string, file?: string): Promise<string> {
  return JSON.stringify({
    success: false,
    tool: 'git_diff',
    status: 'DEPRECATED',
    error: 'Git operations tools have been deprecated due to sandbox security constraints.',
    hint: 'Use LM Studio interface for Git operations.',
    restored_from: 'backup/system-path-tools/git_ops.ts'
  }, null, 2);
}

/**
 * @DEPRECATED Use LM Studio's native Git interface instead.
 */
export async function gitLog(directory: string, n: number = 10): Promise<string> {
  return JSON.stringify({
    success: false,
    tool: 'git_log',
    status: 'DEPRECATED',
    error: 'Git operations tools have been deprecated due to sandbox security constraints.',
    hint: 'Use LM Studio interface for Git operations.',
    restored_from: 'backup/system-path-tools/git_ops.ts'
  }, null, 2);
}

/**
 * @DEPRECATED Use LM Studio's native Git interface instead.
 */
export async function gitBlame(directory: string, file: string): Promise<string> {
  return JSON.stringify({
    success: false,
    tool: 'git_blame',
    status: 'DEPRECATED',
    error: 'Git operations tools have been deprecated due to sandbox security constraints.',
    hint: 'Use LM Studio interface for Git operations.',
    restored_from: 'backup/system-path-tools/git_ops.ts'
  }, null, 2);
}
