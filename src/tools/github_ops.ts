/**
 * @DEPRECATED 2025-07-09: GitHub operations have been deprecated.
 * 
 * These tools require system-level pathing (Docker/WSL/Git API) which is blocked
 * by LM Studio's sandbox security model.
 * 
 * Alternative: Use LM Studio's native interface for GitHub operations.
 * 
 * To restore these tools in the future:
 * 1. Restore from backup/system-path-tools/github_ops.ts
 * 2. Update sandbox permissions to allow system pathing
 * 3. Re-enable all GitHub tools
 */

/**
 * @DEPRECATED Use LM Studio's native GitHub interface instead.
 */
function createStub(name: string) {
  return async function(...args: any[]): Promise<string> {
    return JSON.stringify({
      success: false,
      tool: name,
      status: 'DEPRECATED',
      error: 'GitHub operations have been deprecated due to sandbox security constraints.',
      hint: 'Use LM Studio interface for GitHub operations.',
      restored_from: 'backup/system-path-tools/github_ops.ts'
    }, null, 2);
  };
}

// All GitHub tools are now deprecated
export const github_push = createStub('github_push');
export const github_create_pr = createStub('github_create_pr');
export const github_create_issue = createStub('github_create_issue');
export const github_list_prs = createStub('github_list_prs');
export const github_get_pr = createStub('github_get_pr');
export const github_merge_pr = createStub('github_merge_pr');
export const github_list_issues = createStub('github_list_issues');
export const github_get_issue = createStub('github_get_issue');
export const github_comment = createStub('github_comment');
export const github_api = createStub('github_api');
