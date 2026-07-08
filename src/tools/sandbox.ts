/**
 * Sandbox Execution Tool for LM Studio Plugin
 * 
 * Provides secure code execution using Docker (primary) or WSL2 (fallback).
 * Ensures code runs in an isolated environment with no host access by default.
 */

import { execFile } from 'child_process';
import os from 'os';
import path from 'path';
import * as fs from 'fs';
import { checkDocker, getDefaultImage, buildDockerRunCommand, pullImage, listImages } from './docker_ops';

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  sandbox_type: 'docker' | 'wsl2' | 'none';
  image?: string;
}

export interface ManageSandboxResult {
  success: boolean;
  action: string;
  stdout: string;
  stderr: string;
  message?: string;
}

/**
 * Track temp files for cleanup
 */
const sandboxTempFiles: Set<string> = new Set();


/**
 * Periodic cleanup of sandbox temp files based on TTL.
 * Call this periodically (e.g., every 5 minutes) to prevent disk space leaks.
 * BUG-47 FIX: Add TTL-based cleanup to prevent unbounded disk usage.
 */
/**
 * Periodic cleanup of sandbox temp files based on TTL.
 * @param maxAgeMs - Maximum age in milliseconds before files are cleaned up (default: 1 hour)
 * @returns Number of files cleaned up
 */
export function cleanupSandboxFilesTTL(maxAgeMs: number = 3600000): number {
  let cleaned = 0;
  const now = Date.now();
  for (const file of sandboxTempFiles) {
    try {
      const stats = fs.statSync(file);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.rmSync(file, { force: true });
        sandboxTempFiles.delete(file);
        cleaned++;
      }
    } catch {
      // File may have been deleted already
      sandboxTempFiles.delete(file);
    }
  }
  return cleaned;
}

/**
 * Schedule periodic cleanup of sandbox temp files.
 * Returns an interval ID that can be cleared with clearInterval().
 * BUG-47 FIX: Automatic cleanup to prevent disk space leaks.
 */
/**
 * Schedule periodic cleanup of sandbox temp files.
 * @param intervalMs - Cleanup interval in milliseconds (default: 5 minutes)
 * @returns Interval ID that can be cleared with clearInterval()
 */
export function scheduleSandboxCleanup(intervalMs: number = 300000): NodeJS.Timeout {
  return setInterval(() => {
    cleanupSandboxFilesTTL();
  }, intervalMs);
}

/**
 * Cleans up all sandbox temp files. Call this during plugin shutdown.
 */
/**
 * Cleans up all sandbox temp files. Call this during plugin shutdown.
 * 
 * @returns {void}
 */

export function cleanupSandboxFiles(): void {
  for (const file of sandboxTempFiles) {
    try {
      fs.rmSync(file, { force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
  sandboxTempFiles.clear();
}

/**
 * Writes code to a temporary file and returns the path.
 * BUG-31 FIX: Use temp files instead of shell-escaped strings to prevent injection.
 */
async function writeCodeToFile(code: string, language: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const extMap: Record<string, string> = {
    'python': '.py',
    'node': '.js',
    'bash': '.sh'
  };
  const ext = extMap[language] || '.txt';
  const tmpFile = path.join(tmpDir, `sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`);
  
  await fs.promises.writeFile(tmpFile, code, 'utf8');
  sandboxTempFiles.add(tmpFile); // Track for cleanup
  return tmpFile;
}

/**
 * Result of environment check for sandbox availability.
 * BUG-15 FIX: Defined specific interface for type safety.
 */
export interface SandboxEnvResult {
  docker_available: boolean;
  wsl2_available: boolean;
  pwsh_available: boolean;
  pwsh_version: string;
  os_platform: string;
  os_release: string;
  default_sandbox: 'docker' | 'wsl2' | 'none';
}

/**
 * Checks the environment for Docker and WSL2 availability.
 */
export async function checkEnv(): Promise<SandboxEnvResult> {
  const dockerAvailable = await checkDocker();
  
  // Check for WSL2
  let wsl2Available = false;
  try {
    await new Promise<void>((resolve, reject) => {
      execFile('wsl', ['--status'], {}, (error) => {
        if (!error) resolve();
        else reject(error);
      });
    });
    wsl2Available = true;
  } catch {
    wsl2Available = false;
  }

  // Check for PowerShell 7+ (pwsh)
  let pwshAvailable = false;
  let pwshVersion = 'N/A';
  try {
    const result = await new Promise<string>((resolve, reject) => {
      execFile('pwsh', ['-Version'], {}, (error, stdout) => {
        resolve(stdout || '');
      });
    });
    if (result) {
      pwshAvailable = true;
      // Extract version number (e.g., "7.4.0")
      const match = result.match(/(\d+\.\d+\.\d+)/);
      if (match) pwshVersion = match[1];
    }
  } catch {
    pwshAvailable = false;
  }

  return {
    docker_available: dockerAvailable,
    wsl2_available: wsl2Available,
    pwsh_available: pwshAvailable,
    pwsh_version: pwshVersion,
    os_platform: os.platform(),
    os_release: os.release(),
    default_sandbox: dockerAvailable ? 'docker' : (wsl2Available ? 'wsl2' : 'none')
  };
}

/**
 * Runs code in a sandboxed environment (Docker or WSL2).
 */
export async function runInSandbox(
  language: 'python' | 'node' | 'bash',
  code: string,
  file_path?: string,
  timeout_seconds: number = 30,
  cwd?: string,
  args?: string[],
  network_enabled: boolean = false
): Promise<SandboxResult> {
  const startTime = Date.now();
  let sandboxType: 'docker' | 'wsl2' | 'none' = 'none';
  let image = '';

  // 1. Try Docker
  if (await checkDocker()) {
    const config = getDefaultImage(language);
    image = `${config.name}:${config.tag}`;
    sandboxType = 'docker';

    // BUG-31 FIX: Write code to temp file instead of shell-escaping
    const tmpFile = await writeCodeToFile(code, language);
    
    // Determine command to run (now using temp file)
    // BUG-30 FIX: Normalize Windows paths to forward slashes for shell compatibility
    const safePath = file_path ? file_path.replace(/\\/g, '/') : undefined;
    let runCommand = '';
    if (language === 'python') {
      runCommand = `python ${safePath || tmpFile} ${args ? args.join(' ') : ''}`;
    } else if (language === 'node') {
      runCommand = `node ${safePath || tmpFile} ${args ? args.join(' ') : ''}`;
    } else {
      runCommand = `bash ${safePath || tmpFile} ${args ? args.join(' ') : ''}`;
    }

    const { cmd, args: dockerArgs } = buildDockerRunCommand(image, runCommand, cwd || process.cwd(), network_enabled);

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      // BUG-14 FIX: Use execFile to avoid shell injection via $(...)
      const child = execFile(cmd, dockerArgs, {
        timeout: timeout_seconds * 1000,
        env: process.env,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      child.stdout?.on('data', (data) => stdout += data.toString());
      child.stderr?.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exit_code: code ?? -1,
          duration_ms: Date.now() - startTime,
          sandbox_type: sandboxType,
          image: image
        });
      });

      child.on('error', () => {
        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: 'Execution timed out or failed',
          exit_code: -1,
          duration_ms: Date.now() - startTime,
          sandbox_type: sandboxType,
          image: image
        });
      });
    });
  }

  // 2. Fallback to WSL2 (Windows only)
  if (os.platform() === 'win32') {
    // Check if WSL is available
    const wslStatus = await new Promise<boolean>((resolve) => {
      execFile('wsl', ['--status'], {}, (error) => resolve(!error));
    });

    if (wslStatus) {
      sandboxType = 'wsl2';
      
      if (language === 'python') {
        return new Promise((resolve) => {
          // BUG-31 FIX: Write code to temp file for WSL2 execution
          // BUG-37 FIX: Use temp script file to prevent command injection
          writeCodeToFile(code, language).then(async (tmpFile) => {
            // BUG-37 FIX: Write command to temp script file instead of shell-escaping args
            const tmpDir = os.tmpdir();
            const scriptFile = path.join(tmpDir, `wsl_script_${Date.now()}.sh`);
            const safePath = file_path ? file_path.replace(/\\/g, '/') : undefined;
            const scriptContent = `#!/bin/bash
python3 "${safePath || tmpFile}" "$@"
`;
            await fs.promises.writeFile(scriptFile, scriptContent, 'utf8');
            sandboxTempFiles.add(scriptFile);
            
            // BUG-37 FIX: Use execFile with script file (not bash -c with shell string)
            const child = execFile('wsl', ['bash', scriptFile, ...(args || [])], { 
              timeout: timeout_seconds * 1000 
            }, (error, stdout, stderr) => {
              resolve({
                success: !error,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exit_code: typeof error?.code === 'number' ? error.code : -1,
                duration_ms: Date.now() - startTime,
                sandbox_type: 'wsl2'
              });
            });
          });
        });
      } else if (language === 'bash') {
        return new Promise((resolve) => {
          // BUG-37 FIX: Write bash code to temp file instead of shell-escaping
          writeCodeToFile(code, 'bash').then(async (scriptFile) => {
            sandboxTempFiles.add(scriptFile);
            const child = execFile('wsl', ['bash', scriptFile], { 
              timeout: timeout_seconds * 1000 
            }, (error, stdout, stderr) => {
              resolve({
                success: !error,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exit_code: typeof error?.code === 'number' ? error.code : -1,
                duration_ms: Date.now() - startTime,
                sandbox_type: 'wsl2'
              });
            });
          });
        });
      } else {
        // Node in WSL2 is tricky, fallback to host or warn
        return {
          success: false,
          stdout: '',
          stderr: 'Node.js execution in WSL2 is not fully supported in this sandbox implementation. Use Docker or host execution.',
          exit_code: 1,
          duration_ms: Date.now() - startTime,
          sandbox_type: 'none'
        };
      }
    }
  }

  // 3. No Sandbox Available
  return {
    success: false,
    stdout: '',
    stderr: 'No sandbox available (Docker or WSL2). Please install Docker or ensure WSL2 is enabled.',
    exit_code: 1,
    duration_ms: Date.now() - startTime,
    sandbox_type: 'none'
  };
}

/**
 * Manages sandbox resources (e.g., pulling images).
 */
export async function manageSandbox(action: 'pull' | 'list', image?: string): Promise<ManageSandboxResult> {
  if (action === 'pull') {
    if (!image) {
      return { success: false, action: 'pull', stdout: '', stderr: 'Image name is required for pull action.' };
    }
    const result = await pullImage(image);
    return {
      success: result.success,
      action: 'pull',
      stdout: result.stdout,
      stderr: result.stderr,
      message: result.success ? `Successfully pulled ${image}` : `Failed to pull ${image}`
    };
  } else if (action === 'list') {
    const result = await listImages();
    return {
      success: result.success,
      action: 'list',
      stdout: result.stdout,
      stderr: result.stderr
    };
  }
  
  return { success: false, action, stdout: '', stderr: 'Unknown action.' };
}
