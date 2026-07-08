/**
 * Git File Reading Tool for LM Studio Plugin
 * 
 * Allows viewing and reading files from specific Git revisions.
 */

import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface GitFileListResult {
  success: boolean;
  files?: string[];
  error?: string;
  commit?: string;
}

export interface GitFileReadResult {
  success: boolean;
  content?: string;
  error?: string;
  commit?: string;
  file_path?: string;
  size?: number;
}

/**
 * Lists files in a specific Git tree (commit/branch).
 */
export async function listFilesInCommit(
  directory: string,
  commit: string = 'HEAD',
  pathInTree?: string
): Promise<GitFileListResult> {
  const resolvedDir = path.resolve(directory);
  
  // Check if directory is a git repo
  const statusCheck = await new Promise<boolean>((resolve) => {
    execFile('git', ['rev-parse', '--is-inside-work-tree'], { cwd: resolvedDir }, (error) => {
      resolve(!error);
    });
  });

  if (!statusCheck) {
    return { success: false, error: `Directory is not a Git repository: ${directory}` };
  }

  // Construct command safely
  const cmd = ['git', 'ls-tree', '-r', commit, '--name-only'];
  if (pathInTree) {
    cmd.push('--', pathInTree);
  }

  return new Promise((resolve) => {
    execFile(cmd[0], cmd.slice(1), { cwd: resolvedDir, timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr || error.message, commit });
      } else {
        const files = stdout.split('\n').filter(f => f.trim() !== '');
        resolve({ success: true, files, commit });
      }
    });
  });
}

/**
 * Reads the content of a file from a specific Git revision.
 */
export async function readFileFromCommit(
  directory: string,
  commit: string = 'HEAD',
  filePath: string
): Promise<GitFileReadResult> {
  const resolvedDir = path.resolve(directory);
  
  // Check if directory is a git repo
  const statusCheck = await new Promise<boolean>((resolve) => {
    execFile('git', ['rev-parse', '--is-inside-work-tree'], { cwd: resolvedDir }, (error) => {
      resolve(!error);
    });
  });

  if (!statusCheck) {
    return { success: false, error: `Directory is not a Git repository: ${directory}` };
  }

  // Construct command safely using cat-file to handle special characters
  const cmd = ['git', 'cat-file', '-p', `${commit}:${filePath}`];

  return new Promise((resolve) => {
    execFile(cmd[0], cmd.slice(1), { cwd: resolvedDir, timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr || error.message, commit, file_path: filePath });
      } else {
        resolve({ 
          success: true, 
          content: stdout, 
          commit, 
          file_path: filePath,
          size: stdout.length 
        });
      }
    });
  });
}
