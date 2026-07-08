/**
 * Git Operations Tool for LM Studio Plugin
 * 
 * Provides Git repository inspection capabilities (status, diff, log, blame).
 * Returns structured JSON for model parsing.
 */

import { execFile } from 'child_process';
import { isCommandAvailable } from './utils';
import path from 'path';
import os from 'os';

export interface GitStatusResult {
  success: boolean;
  output: string;
  error?: string;
  branch?: string;
  modified_files?: string[];
  untracked_files?: string[];
}

export interface GitLogResult {
  success: boolean;
  output: string;
  error?: string;
  commits?: Array<{
    hash: string;
    author: string;
    date: string;
    message: string;
  }>;
}

export interface GitBlameResult {
  success: boolean;
  output: string;
  error?: string;
  lines?: Array<{
    line_number: number;
    commit_hash: string;
    author: string;
    date: string;
    content: string;
  }>;
}

/**
 * Checks if Git is available.
 */
/**
 * Checks if Git is available.
 * IMPROVE-01 FIX: Use shared isCommandAvailable utility.
 */
async function checkGit(): Promise<boolean> {
  return isCommandAvailable('git');
}

/**
 * Gets the current branch.
 */
async function getCurrentBranch(dir: string): Promise<string> {
  return new Promise((resolve) => {
    execFile('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir }, (error, stdout) => {
      resolve(error ? 'unknown' : stdout.trim());
    });
  });
}

/**
 * Runs a Git command safely using execFile.
 */
async function runGitCommand(
  command: string[],
  directory: string
): Promise<{ stdout: string; stderr: string; error: Error | null }> {
  return new Promise((resolve) => {
    execFile(command[0], command.slice(1), { cwd: directory, timeout: 30000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        error: error
      });
    });
  });
}

export async function gitStatus(directory: string): Promise<GitStatusResult> {
  const isGitAvailable = await checkGit();
  if (!isGitAvailable) {
    return { success: false, output: 'Git is not installed or not in PATH.', error: 'Git missing' };
  }

  const resolvedDir = path.resolve(directory);
  const branch = await getCurrentBranch(resolvedDir);
  
  const { stdout, stderr, error } = await runGitCommand(
    ['git', 'status', '--porcelain'],
    resolvedDir
  );
  
  const modifiedFiles: string[] = [];
  const untrackedFiles: string[] = [];

  if (stdout) {
    stdout.split('\n').forEach(line => {
      if (line.trim()) {
        // Git porcelain format: " XY filename"
        const status = line.substring(0, 2).trim();
        const filename = line.substring(2).trim();
        if (status === '??') {
          untrackedFiles.push(filename);
        } else {
          modifiedFiles.push(filename);
        }
      }
    });
  }

  return {
    success: !error,
    output: stdout || '(Clean working directory)',
    error: error?.message,
    branch,
    modified_files: modifiedFiles,
    untracked_files: untrackedFiles
  };
}

export async function gitDiff(directory: string, file?: string): Promise<GitStatusResult> {
  const isGitAvailable = await checkGit();
  if (!isGitAvailable) {
    return { success: false, output: 'Git is not installed or not in PATH.', error: 'Git missing' };
  }

  const resolvedDir = path.resolve(directory);
  
  if (file) {
    const { stdout, stderr, error } = await runGitCommand(
      ['git', 'diff', '--', file],
      resolvedDir
    );
    return {
      success: !error,
      output: stdout || '(No changes)',
      error: error?.message
    };
  }
  
  const { stdout, stderr, error } = await runGitCommand(
    ['git', 'diff'],
    resolvedDir
  );
  
  return {
    success: !error,
    output: stdout || '(No changes)',
    error: error?.message
  };
}

export async function gitLog(directory: string, n: number = 10): Promise<GitLogResult> {
  const isGitAvailable = await checkGit();
  if (!isGitAvailable) {
    return { success: false, output: 'Git is not installed or not in PATH.', error: 'Git missing' };
  }

  const resolvedDir = path.resolve(directory);
  
  const { stdout, stderr, error } = await runGitCommand(
    ['git', 'log', '-n', String(n), '--pretty=format:%H|%an|%ad|%s', '--date=short'],
    resolvedDir
  );
  
  const commits: GitLogResult['commits'] = [];
  if (stdout) {
    stdout.split('\n').forEach(line => {
      if (line.trim()) {
        const parts = line.split('|');
        if (parts.length >= 4) {
          commits.push({
            hash: parts[0],
            author: parts[1],
            date: parts[2],
            message: parts.slice(3).join('|') // Handle messages with pipes
          });
        }
      }
    });
  }

  return {
    success: !error,
    output: stdout || '(No commits)',
    error: error?.message,
    commits
  };
}

export async function gitBlame(directory: string, file: string): Promise<GitBlameResult> {
  const isGitAvailable = await checkGit();
  if (!isGitAvailable) {
    return { success: false, output: 'Git is not installed or not in PATH.', error: 'Git missing' };
  }

  const resolvedDir = path.resolve(directory);
  const resolvedFile = path.resolve(resolvedDir, file);
  
  // Check if file exists
  const fs = await import('fs');
  if (!fs.existsSync(resolvedFile)) {
    return { success: false, output: '', error: `File not found: ${file}` };
  }

  // Use short format for easier parsing
  const { stdout, stderr, error } = await runGitCommand(
    ['git', 'blame', '--line-porcelain', resolvedFile],
    resolvedDir
  );
  
  const lines: GitBlameResult['lines'] = [];
  if (stdout) {
    // BUG-FIX: Use more robust parsing for git blame --line-porcelain output
    // The porcelain format has:
    // <hash> <orig_line> <final_line> <line_count> [additional fields...]
    // author <name>
    // author-mail <email>
    // author-time <timestamp>
    // author-tz <timezone>
    // <content>
    // (empty line between entries)
    
    const lineArray = stdout.split('\n');
    let currentLine: any = {};
    let inContent = false;
    let pendingContent = '';
    
    for (let i = 0; i < lineArray.length; i++) {
      const l = lineArray[i];
      
      // Check for new line header (more robust - handles various hash lengths)
      if (/^\w+ \d+ \d+ \d+/.test(l)) {
        // Save previous line if it had content
        if (currentLine.final_line) {
          if (currentLine.content || pendingContent) {
            lines.push({
              line_number: currentLine.final_line,
              commit_hash: currentLine.commit_hash || 'unknown',
              author: currentLine.author || 'Unknown',
              date: currentLine.author_time ? new Date(currentLine.author_time * 1000).toISOString() : '',
              content: pendingContent || currentLine.content || ''
            });
          }
        }
        
        // Parse new header (BUG-43 FIX: More robust parsing)
        const parts = l.trim().split(/\s+/);
        if (parts.length >= 4) {
          currentLine = {
            commit_hash: parts[0],
            orig_line: parseInt(parts[1]) || 0,
            final_line: parseInt(parts[2]) || 0,
            line_count: parseInt(parts[3]) || 0,
            author: '',
            author_time: 0,
            content: ''
          };
        } else {
          // Malformed header - skip this entry
          currentLine = {};
        }
        inContent = false;
        pendingContent = '';
      } else if (l.startsWith('author ')) {
        currentLine.author = l.substring(7);
      } else if (l.startsWith('author-time ')) {
        const timeStr = l.substring(14).trim();
        currentLine.author_time = parseInt(timeStr) || 0;
      } else if (l.trim() === '' && currentLine.commit_hash) {
        // Empty line - content follows
        inContent = true;
      } else if (inContent && l !== '') {
        // Content line - accumulate if multiple lines
        if (pendingContent) {
          pendingContent += '\n' + l;
        } else {
          pendingContent = l;
        }
      }
    }
    
    // Don't forget the last line (BUG-43 FIX: Handle pending content)
    if (currentLine.final_line) {
      lines.push({
        line_number: currentLine.final_line,
        commit_hash: currentLine.commit_hash || 'unknown',
        author: currentLine.author || 'Unknown',
        date: currentLine.author_time ? new Date(currentLine.author_time * 1000).toISOString() : '',
        content: pendingContent || currentLine.content || ''
      });
    }
  }

  return {
    success: !error,
    output: stdout || '(No blame info)',
    error: error?.message,
    lines
  };
}
