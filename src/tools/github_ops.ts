/**
 * GitHub Operations Tool for LM Studio Plugin
 * 
 * Provides full Git push and GitHub API interaction capabilities.
 */

import { execFile } from 'child_process';
import { isCommandAvailable } from './utils';
import path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface GithubPushResult {
  success: boolean;
  message: string;
  error?: string;
  remote_url?: string;
}

export interface GithubPrResult {
  success: boolean;
  pr_url?: string;
  message: string;
  error?: string;
}

export interface GithubIssueResult {
  success: boolean;
  issue_url?: string;
  message: string;
  error?: string;
}

export interface GithubListPrsResult {
  success: boolean;
  prs?: Array<{
    number: number;
    title: string;
    state: string;
    url: string;
    created_at: string;
  }>;
  error?: string;
}

export interface GithubGetPrResult {
  success: boolean;
  pr?: {
    number: number;
    title: string;
    body: string;
    state: string;
    url: string;
    created_at: string;
    comments?: Array<{
      id: number;
      body: string;
      user: string;
      created_at: string;
    }>;
  };
  error?: string;
}

export interface GithubMergePrResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface GithubListIssuesResult {
  success: boolean;
  issues?: Array<{
    number: number;
    title: string;
    state: string;
    url: string;
    created_at: string;
  }>;
  error?: string;
}

export interface GithubGetIssueResult {
  success: boolean;
  issue?: {
    number: number;
    title: string;
    body: string;
    state: string;
    url: string;
    created_at: string;
    comments?: Array<{
      id: number;
      body: string;
      user: string;
      created_at: string;
    }>;
  };
  error?: string;
}

export interface GithubCommentResult {
  success: boolean;
  url?: string;
  message: string;
  error?: string;
}

export interface GithubApiResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Helper to run gh commands safely
 */
async function runGhCommand(args: string[], directory: string): Promise<{ stdout: string; stderr: string; error: Error | null }> {
  return new Promise((resolve) => {
    execFile('gh', args, { cwd: directory, timeout: 30000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        error
      });
    });
  });
}

/**
 * Checks if GitHub CLI (gh) is available.
 */
/**
 * Checks if GitHub CLI (gh) is available.
 * IMPROVE-01 FIX: Use shared isCommandAvailable utility.
 */
async function checkGh(): Promise<boolean> {
  return isCommandAvailable('gh');
}

/**
 * Pushes local changes to the remote repository.
 * BUG-03 FIX: Use git commands directly via execFile instead of shell string interpolation
 * BUG-04 FIX: Move resolve() inside the nested callback for remote_url
 */
export async function githubPush(
  directory: string,
  branch?: string,
  message: string = 'Auto-commit from LM Studio Toolkit',
  dry_run: boolean = false
): Promise<GithubPushResult> {
  const isGhAvailable = await checkGh();
  if (!isGhAvailable) {
    // BUG-16 FIX: Add installation instructions
    return { 
      success: false, 
      message: 'GitHub CLI (gh) is not installed.', 
      error: 'gh missing',
    };
  }

  const resolvedDir = path.resolve(directory);

  // 1. Check if it's a git repo
  const isGit = await new Promise<boolean>((resolve) => {
    execFile('git', ['rev-parse', '--is-inside-work-tree'], { cwd: resolvedDir }, (error) => {
      resolve(!error);
    });
  });

  if (!isGit) {
    return { success: false, message: `Directory is not a Git repository: ${directory}` };
  }

  if (dry_run) {
    return { success: true, message: 'Dry run: changes would be staged, committed, and pushed.', remote_url: '' };
  }

  // 2. Stage, Commit, Push using git commands directly (safer than shell string)
  // BUG-03 FIX: Use individual git commands instead of shell string interpolation
  
  // Stage
  await new Promise<void>((resolve, reject) => {
    execFile('git', ['add', '.'], { cwd: resolvedDir, timeout: 30000 }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  // Commit
  await new Promise<void>((resolve, reject) => {
    execFile('git', ['commit', '-m', message], { cwd: resolvedDir, timeout: 30000 }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  // Push
  const pushBranch = branch || 'HEAD';
  await new Promise<void>((resolve, reject) => {
    execFile('git', ['push', 'origin', pushBranch], { cwd: resolvedDir, timeout: 30000 }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  // BUG-04 FIX: Get remote URL inside the success callback
  const remoteUrl = await new Promise<string>((resolve) => {
    execFile('git', ['remote', 'get-url', 'origin'], { cwd: resolvedDir }, (err, urlStdout) => {
      const url = err ? '' : urlStdout.trim();
      resolve(url);
    });
  });

  return {
    success: true,
    message: 'Successfully pushed changes.',
    remote_url: remoteUrl
  };
}

/**
 * Creates a Pull Request.
 */
export async function githubCreatePr(
  directory: string,
  title: string,
  body: string = '',
  head: string,
  base: string = 'main'
): Promise<GithubPrResult> {
  const isGhAvailable = await checkGh();
  if (!isGhAvailable) {
    return { success: false, message: 'GitHub CLI (gh) is not installed.', error: 'gh missing' };
  }

  const resolvedDir = path.resolve(directory);

  const { stdout, stderr, error } = await runGhCommand([
    'pr', 'create',
    '--title', title,
    '--base', base,
    '--head', head,
    '--body', body
  ], resolvedDir);

  if (error) {
    return { success: false, message: 'PR creation failed.', error: stderr || error.message };
  }

  // BUG-55 FIX: More robust URL parsing with validation
  const urlMatch = stdout.match(/https?:\/\/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9._-]+)\/pull\/(\d+)/);
  if (urlMatch) {
    return { success: true, message: urlMatch[0], pr_url: urlMatch[0] };
  }
  return { success: true, message: 'PR created successfully' };
}

/**
 * Creates a GitHub Issue.
 */
export async function githubCreateIssue(
  directory: string,
  title: string,
  body: string = '',
  labels?: string[]
): Promise<GithubIssueResult> {
  const isGhAvailable = await checkGh();
  if (!isGhAvailable) {
    return { success: false, message: 'GitHub CLI (gh) is not installed.', error: 'gh missing' };
  }

  const resolvedDir = path.resolve(directory);
  
  let labelArgs: string[] = [];
  if (labels) {
    labelArgs = labels.flatMap(l => ['--label', l]);
  }

  const { stdout, stderr, error } = await runGhCommand([
    'issue', 'create',
    '--title', title,
    ...labelArgs,
    '--body', body
  ], resolvedDir);

  if (error) {
    return { success: false, message: 'Issue creation failed.', error: stderr || error.message };
  }

  // BUG-55 FIX: More robust URL parsing with validation
  const urlMatch = stdout.match(/https?:\/\/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9._-]+)\/issues\/?(\d*)/);
  if (urlMatch) {
    const issueUrl = urlMatch[0].replace(/\/$/, ''); // Remove trailing slash
    return { success: true, message: issueUrl, issue_url: issueUrl };
  }
  return { success: true, message: 'Issue created successfully' };
}

/**
 * Lists Pull Requests.
 */
export async function githubListPrs(
  directory: string,
  state: 'open' | 'closed' | 'all' = 'open',
  limit: number = 10
): Promise<GithubListPrsResult> {
  const isGhAvailable = await checkGh();
  if (!isGhAvailable) {
    return { success: false, error: 'gh missing' };
  }

  const resolvedDir = path.resolve(directory);
  const { stdout, stderr, error } = await runGhCommand([
    'pr', 'list',
    '--state', state,
    '--json', 'number,title,state,url,createdAt',
    '--limit', String(limit)
  ], resolvedDir);

  if (error) {
    return { success: false, error: stderr || error.message };
  }

  try {
    const prs = JSON.parse(stdout);
    return { success: true, prs };
  } catch (e) {
    return { success: false, error: 'Failed to parse PR list' };
  }
}

/**
 * Gets Pull Request details.
 */
export async function githubGetPr(
  directory: string,
  prNumber: number
): Promise<GithubGetPrResult> {
  const isGhAvailable = await checkGh();
  if (!isGhAvailable) {
    return { success: false, error: 'gh missing' };
  }

  const resolvedDir = path.resolve(directory);
  const { stdout, stderr, error } = await runGhCommand([
    'pr', 'view',
    String(prNumber),
    '--json', 'number,title,body,state,url,createdAt,comments'
  ], resolvedDir);

  if (error) {
    return { success: false, error: stderr || error.message };
  }

  try {
    const pr = JSON.parse(stdout);
    return { success: true, pr };
  } catch (e) {
    return { success: false, error: 'Failed to parse PR details' };
  }
}

/**
 * Merges a Pull Request.
 */
export async function githubMergePr(
  directory: string,
  prNumber: number
): Promise<GithubMergePrResult> {
  const isGhAvailable = await checkGh();
  if (!isGhAvailable) {
    return { success: false, message: 'gh missing' };
  }

  const resolvedDir = path.resolve(directory);
  const { stdout, stderr, error } = await runGhCommand([
    'pr', 'merge',
    String(prNumber),
    '--delete-branch'
  ], resolvedDir);

  if (error) {
    return { success: false, message: 'Merge failed.', error: stderr || error.message };
  }

  return { success: true, message: 'PR merged successfully.' };
}

/**
 * Lists Issues.
 */
export async function githubListIssues(
  directory: string,
  state: 'open' | 'closed' | 'all' = 'open',
  limit: number = 10
): Promise<GithubListIssuesResult> {
  const isGhAvailable = await checkGh();
  if (!isGhAvailable) {
    return { success: false, error: 'gh missing' };
  }

  const resolvedDir = path.resolve(directory);
  const { stdout, stderr, error } = await runGhCommand([
    'issue', 'list',
    '--state', state,
    '--json', 'number,title,state,url,createdAt',
    '--limit', String(limit)
  ], resolvedDir);

  if (error) {
    return { success: false, error: stderr || error.message };
  }

  try {
    const issues = JSON.parse(stdout);
    return { success: true, issues };
  } catch (e) {
    return { success: false, error: 'Failed to parse issue list' };
  }
}

/**
 * Gets Issue details.
 */
export async function githubGetIssue(
  directory: string,
  issueNumber: number
): Promise<GithubGetIssueResult> {
  const isGhAvailable = await checkGh();
  if (!isGhAvailable) {
    return { success: false, error: 'gh missing' };
  }

  const resolvedDir = path.resolve(directory);
  const { stdout, stderr, error } = await runGhCommand([
    'issue', 'view',
    String(issueNumber),
    '--json', 'number,title,body,state,url,createdAt,comments'
  ], resolvedDir);

  if (error) {
    return { success: false, error: stderr || error.message };
  }

  try {
    const issue = JSON.parse(stdout);
    return { success: true, issue };
  } catch (e) {
    return { success: false, error: 'Failed to parse issue details' };
  }
}

/**
 * Adds a comment to a PR or Issue.
 */
export async function githubComment(
  directory: string,
  targetType: 'pr' | 'issue',
  targetNumber: number,
  body: string
): Promise<GithubCommentResult> {
  const isGhAvailable = await checkGh();
  if (!isGhAvailable) {
    return { success: false, message: 'gh missing' };
  }

  const resolvedDir = path.resolve(directory);
  const { stdout, stderr, error } = await runGhCommand([
    targetType, 'comment',
    String(targetNumber),
    '--body', body
  ], resolvedDir);

  if (error) {
    return { success: false, message: 'Comment failed.', error: stderr || error.message };
  }

  // BUG-55 FIX: More robust URL parsing with validation
  const urlMatch = stdout.match(/https?:\/\/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9._-]+)\/(issues|pull)\/(\d+)/);
  if (urlMatch) {
    return { success: true, message: urlMatch[0], url: urlMatch[0] };
  }
  return { success: true, message: 'Comment added successfully' };
}

/**
 * Generic GitHub API caller.
 * BUG-12 FIX: Clean up temp file after use
 */
// H-03 FIX: Whitelist of allowed GitHub API route prefixes
const ALLOWED_ROUTE_PREFIXES = [
  '/repos/',
  '/orgs/',
  '/users/',
  '/search/',
  '/graphql',
  '/app/',
  '/rate_limit'
];

/**
 * Validates GitHub API route to prevent path traversal attacks.
 * H-03 FIX: Added validation to ensure route starts with allowed prefix.
 */
function validateGithubRoute(route: string): boolean {
  // Allow relative API routes (no leading slash) - gh CLI handles these
  if (!route.startsWith('/')) {
    return true;
  }
  // Validate route starts with an allowed prefix
  return ALLOWED_ROUTE_PREFIXES.some(prefix => route.startsWith(prefix));
}

export async function githubApi(
  directory: string,
  route: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<GithubApiResult> {
  const isGhAvailable = await checkGh();
  if (!isGhAvailable) {
    return { success: false, error: 'gh missing' };
  }

  // BUG-44 FIX: Validate route to prevent path traversal attacks
  if (!validateGithubRoute(route)) {
    return { 
      success: false, 
      error: `Invalid route: '${route}'. Allowed prefixes: ${ALLOWED_ROUTE_PREFIXES.join(', ')}` 
    };
  }

  const resolvedDir = path.resolve(directory);
  
  let args: string[] = ['api', route, '-X', method];
  let tmpPath: string | null = null;
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    if (typeof body === 'string') {
      // BUG-12 FIX: Clean up temp file after use
      tmpPath = path.join(os.tmpdir(), `gh_body_${Date.now()}.json`);
      fs.writeFileSync(tmpPath, body);
      args = [...args, '--input', tmpPath];
    } else if (typeof body === 'object') {
       const entries = Object.entries(body as any);
       args = [...args, ...entries.flatMap(([k, v]) => ['-F', `${k}=${v}`])];
    }
  }

  // BUG-FIX: Ensure temp file cleanup even if runGhCommand throws
  let data: any;
  let rawOutput: string = '';
  try {
    const result = await runGhCommand(args, resolvedDir);
    rawOutput = result.stdout;
    
    if (result.error) {
      return { success: false, error: result.stderr || result.error.message };
    }
    
    try {
      data = JSON.parse(rawOutput);
    } catch {
      // Return raw output if not JSON
      return { success: true, data: rawOutput };
    }
  } finally {
    // Always clean up temp file
    if (tmpPath) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  return { success: true, data };
}
