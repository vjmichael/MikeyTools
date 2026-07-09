/**
 * @DEPRECATED 2025-07-09: Git read operations have been deprecated.
 * 
 * This tool requires system-level pathing (Docker/WSL/Git API) which is blocked
 * by LM Studio's sandbox security model.
 * 
 * Alternative: Use LM Studio's native interface for Git operations.
 * 
 * To restore this tool in the future:
 * 1. Restore from backup/system-path-tools/git_read.ts
 * 2. Update sandbox permissions to allow system pathing
 * 3. Re-enable the git_list_files and git_read_file tools
 */

/**
 * @DEPRECATED Use LM Studio's native Git interface instead.
 */
export async function stubTool(...args: any[]): Promise<string> {
  return JSON.stringify({
    success: false,
    tool: 'git_read_stub',
    status: 'DEPRECATED',
    error: 'Git read operations have been deprecated due to sandbox security constraints.',
    hint: 'Use LM Studio interface for Git operations.',
    restored_from: 'backup/system-path-tools/git_read.ts'
  }, null, 2);
}
