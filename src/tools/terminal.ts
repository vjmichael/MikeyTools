import { execFile } from 'child_process';
import os from 'os';

// BUG-FIX: Cache PowerShell availability to avoid repeated checks
let cachedPwshStatus: { available: boolean; version: string } | null = null;

export interface TerminalOptions {
  command: string;
  shell?: 'auto' | 'powershell' | 'cmd' | 'bash' | 'sh';
  timeout?: number;
}

/**
 * Checks if PowerShell 7+ (pwsh) is available.
 */
export async function checkPowershell(): Promise<{ available: boolean; version: string }> {
  return new Promise((resolve) => {
    execFile('pwsh', ['-Version'], {}, (error, stdout) => {
      if (!error && stdout) {
        const match = stdout.match(/(\d+\.\d+\.\d+)/);
        resolve({ available: true, version: match ? match[1] : 'unknown' });
      } else {
        resolve({ available: false, version: 'N/A' });
      }
    });
  });
}

export async function runCommand(options: TerminalOptions): Promise<string> {
  const { command, shell = 'auto', timeout = 30000 } = options;

  let finalShell: string;
  let shellArgs: string[] = [];
  let shellWarning: string = '';

  // Check for PowerShell 7+ if we are on Windows or explicitly requested
  // BUG-FIX: Use cached status to avoid repeated checks
  let pwshStatus = cachedPwshStatus;
  if (os.platform() === 'win32' && (shell === 'auto' || shell === 'powershell')) {
    if (!pwshStatus) {
      pwshStatus = await checkPowershell();
      cachedPwshStatus = pwshStatus;
    }
    if (pwshStatus.available) {
      finalShell = 'pwsh';
      shellArgs = ['-Command', command];
    } else {
      finalShell = 'powershell';
      shellArgs = ['-Command', command];
      shellWarning = '[Toolkit Warning]: Legacy PowerShell (v5.1) detected. JSON parsing may be unreliable. Consider installing PowerShell 7+ (pwsh).';
    }
  } else if (shell === 'cmd') {
    finalShell = 'cmd';
    shellArgs = ['/c', command];
  } else if (shell === 'bash') {
    finalShell = 'bash';
    shellArgs = ['-c', command];
  } else if (shell === 'sh') {
    finalShell = 'sh';
    shellArgs = ['-c', command];
  } else {
    // Default for Linux/Mac
    finalShell = 'bash';
    shellArgs = ['-c', command];
  }

  return new Promise((resolve, reject) => {
    execFile(finalShell, shellArgs, { timeout }, (error, stdout, stderr) => {
      if (error) {
        const output = JSON.stringify({
          exitCode: error.code || -1,
          stdout: stdout || '',
          stderr: stderr || `Command execution error: ${error.message}`
        });
        
        // Append warning if applicable
        if (shellWarning) {
          const parsed = JSON.parse(output);
          parsed.warning = shellWarning;
          resolve(JSON.stringify(parsed));
        } else {
          resolve(output);
        }
      } else {
        const output = JSON.stringify({
          exitCode: 0,
          stdout: stdout || '',
          stderr: ''
        });
        
        // Append warning if applicable
        if (shellWarning) {
          const parsed = JSON.parse(output);
          parsed.warning = shellWarning;
          resolve(JSON.stringify(parsed));
        } else {
          resolve(output);
        }
      }
    });
  });
}
