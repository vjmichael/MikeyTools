/**
 * Docker Operations Helper
 * 
 * Provides utilities for interacting with Docker from the LM Studio plugin.
 */

import { execFile } from 'child_process';
import { isCommandAvailable } from './utils';
import os from 'os';
import path from 'path';
import * as fs from 'fs';


import { createModuleLogger } from './logger';

// Module logger for docker_ops
const logger_docker_ops = createModuleLogger('docker_ops');
export interface DockerImageConfig {
  name: string;
  tag: string;
  description: string;
}

export const DEFAULT_IMAGES: Record<string, DockerImageConfig> = {
  python: { name: 'python', tag: '3.11-slim', description: 'Python 3.11 runtime' },
  node: { name: 'node', tag: '20-alpine', description: 'Node.js 20 runtime' },
  bash: { name: 'alpine', tag: '3.19', description: 'Alpine Linux (bash)' },
  // BUG-22 FIX: Use specific version tag instead of 'latest'
  default: { name: 'alpine', tag: '3.19', description: 'Alpine Linux (default)' }
};

/**
 * Checks if Docker is available on the system.
 */
/**
 * Checks if Docker is available on the system.
 * IMPROVE-01 FIX: Use shared isCommandAvailable utility.
 */
export async function checkDocker(): Promise<boolean> {
  return isCommandAvailable('docker');
}

/**
 * Pulls a specific Docker image.
 */
export async function pullImage(imageName: string): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile('docker', ['pull', imageName], {}, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || (error ? error.message : '')
      });
    });
  });
}

/**
 * Lists available Docker images.
 */
export async function listImages(): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile('docker', ['images'], {}, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || (error ? error.message : '')
      });
    });
  });
}

/**
 * Gets the default image for a given language.
 */
/**
 * Gets the default image for a given language.
 * 
 * @param {string} language - Programming language
 * @returns {DockerImageConfig} Default image configuration
 */

export function getDefaultImage(language: string): DockerImageConfig {
  return DEFAULT_IMAGES[language] || DEFAULT_IMAGES['default'];
}

/**
 * Constructs the Docker run command for sandbox execution.
 * BUG-05 FIX: Use temporary directory instead of host CWD for volume mount
 */

/**
 * Recursively copies a directory. Used to populate sandbox temp dirs.
 */
/**
 * Recursively copies a directory with optional exclude patterns.
 * IMPROVE-12 FIX: Added exclude support to reduce copy size and time.
 */
function copyDirSyncWithExcludes(src: string, dest: string, excludePatterns: string[]): void {
  try {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      // Check if entry matches any exclude pattern
      const shouldExclude = excludePatterns.some(pattern => {
        if (pattern.endsWith('/')) {
          // Directory pattern
          return entry.name === pattern.slice(0, -1);
        }
        return entry.name === pattern;
      });
      
      if (shouldExclude) {
        continue; // Skip excluded entries
      }
      
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirSyncWithExcludes(srcPath, destPath, excludePatterns);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (e) {
    logger_docker_ops.warn(`[Toolkit] Failed to copy directory ${src} to ${dest}: ${String(e)}`);
  }
}

function copyDirSync(src: string, dest: string): void {
  try {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (e) {
    logger_docker_ops.warn(`[Toolkit] Failed to copy directory ${src} to ${dest}: ${String(e)}`);
  }
}

// BUG-FIX: Track temp directories for cleanup
const sandboxTempDirs: Set<string> = new Set();

/**
 * Cleans up all sandbox temp directories. Call this during plugin shutdown.
 */
export function cleanupSandboxDirs(): void {
  for (const dir of sandboxTempDirs) {
    try {
      // Recursively remove temp directory
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      }
      fs.rmdirSync(dir);
      sandboxTempDirs.delete(dir);
    } catch (e) {
      logger_docker_ops.warn(`[Toolkit] Failed to cleanup temp dir ${dir}: ${String(e)}`);
    }
  }
  sandboxTempDirs.clear();
}

/**
 * Default patterns to exclude when copying directory for sandbox.
 * IMPROVE-12 FIX: Added default exclude patterns to reduce copy time and size.
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '*.pyc',
  '*.o',
  '*.class',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.tmp',
  '.toolkit'
];

export function buildDockerRunCommand(
  image: string,
  command: string,
  cwd: string,
  networkEnabled: boolean,
  excludePatterns?: string[]
): { cmd: string; args: string[] } {
  const volumeMounts: string[] = [];
  
  // Mount /tmp for temporary files
  volumeMounts.push(`/tmp:/tmp`);
  
  // BUG-05 FIX: Use a temporary directory instead of host CWD for security
  // This prevents the container from accessing the host filesystem
  // BUG-05b FIX: Copy CWD contents to temp dir so sandbox has access to files
  // IMPROVE-12 FIX: Added excludePatterns parameter for selective copying
  let tempDir: string | null = null;
  try {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-'));
    sandboxTempDirs.add(tempDir); // Track for cleanup
    
    // IMPROVE-12 FIX: Use exclude patterns when copying
    const patterns = excludePatterns || DEFAULT_EXCLUDE_PATTERNS;
    copyDirSyncWithExcludes(cwd, tempDir, patterns);
    
    volumeMounts.push(`${tempDir}:/work`);
  } catch (e) {
    // Fallback to /tmp/sandbox-work if temp dir creation fails
    logger_docker_ops.warn('[Toolkit] Failed to create temp dir for sandbox, using /tmp/sandbox-work');
    volumeMounts.push(`/tmp/sandbox-work:/work`);
  }
  
  const args: string[] = [
    'run',
    '--rm',
    '--network=none', // Default to no network access for security
    '-w', '/work',    // Set working directory to mounted CWD
    ...volumeMounts.flatMap(m => ['-v', m]),
    image,
    'sh',
    '-c',
    command
  ];
  
  // If network is enabled, remove --network=none and add --network=host
  if (networkEnabled) {
    const networkIdx = args.indexOf('--network=none');
    if (networkIdx !== -1) {
      args.splice(networkIdx, 1);
    }
    args.push('--network=host');
  }
  
  return { cmd: 'docker', args };
}
