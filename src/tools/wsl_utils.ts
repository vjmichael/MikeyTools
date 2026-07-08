/**
 * WSL Detection and Encoding Utilities
 * 
 * Provides utilities for detecting WSL availability and handling
 * encoding issues when running commands through different shells.
 * 
 * KEY ISSUES ADDRESSED:
 * 1. WSL availability detection
 * 2. UTF-16LE vs UTF-8 encoding mismatches (null bytes between characters)
 * 3. Cross-platform compatibility
 */

// ==================== WSL DETECTION ====================

/**
 * Result of WSL detection check.
 */
export interface WslDetectionResult {
  available: boolean;
  version?: string;
  distributions?: string[];
  error?: string;
}

/**
 * Build a PowerShell command to detect WSL availability.
 * Returns a string that can be executed via execute_code with shell='powershell'.
 */
export function buildWslDetectionCommand(): string {
  return `
    if (Get-Command wsl -ErrorAction SilentlyContinue) {
        $version = (wsl --version 2>&1 | Select-String "WSL version" | Out-String).Trim()
        $dists = (wsl --list --quiet 2>&1 | Where-Object { $_ -and $_.Trim() }) -join ";"
        "WSL_AVAILABLE;$version;$dists"
    } else {
        "WSL_NOT_AVAILABLE"
    }
  `.trim();
}

/**
 * Parse WSL detection output.
 */
export function parseWslDetection(output: string): WslDetectionResult {
  if (!output || output.trim() === '') {
    return { available: false, error: 'Empty output' };
  }
  
  const trimmed = output.trim();
  
  if (trimmed === 'WSL_NOT_AVAILABLE') {
    return { available: false };
  }
  
  if (trimmed.startsWith('WSL_AVAILABLE;')) {
    const parts = trimmed.split(';');
    return {
      available: true,
      version: parts[1] || undefined,
      distributions: parts[2] ? parts[2].split(';') : [],
    };
  }
  
  return { available: false, error: 'Unrecognized output format' };
}

// ==================== ENCODING UTILITIES ====================

/**
 * Detect if output appears to be garbled UTF-16LE.
 * UTF-16LE output has null bytes between every character.
 * 
 * This is the PRIMARY issue when bash output appears garbled on Windows.
 * The execute_code tool returns output as UTF-16LE, but it's being
 * interpreted as UTF-8, causing null bytes (\u0000) between characters.
 */
export function isGarbledUtf16(output: string): boolean {
  // Check for null bytes between characters (typical of UTF-16LE misinterpretation)
  const hasNullBytes = /[\u0000]/.test(output);
  
  // Check for Windows WSL stub messages (when WSL is not installed)
  const isWsStubMessage = output.includes('Windows Subsystem for Linux') || 
                           output.includes('has no installed distributions');
  
  return hasNullBytes || isWsStubMessage;
}

/**
 * Clean garbled UTF-16 output by removing null bytes.
 * This is a workaround for the encoding issue in the execute_code tool.
 */
export function cleanGarbledOutput(output: string): string {
  if (!isGarbledUtf16(output)) {
    return output;
  }
  
  // Remove null bytes and normalize line endings
  return output
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/**
 * Build a PowerShell command that properly handles UTF-8 output.
 * Use this when you need reliable output from WSL commands.
 */
export function buildUtf8SafeCommand(wslCommand: string): string {
  // Force UTF-8 encoding in PowerShell before running WSL command
  return [
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '$env:PYTHONIOENCODING = "utf-8"',
    `wsl.exe -e bash -c "${wslCommand.replace(/"/g, '\\"')}"`
  ].join('; ');
}

// ==================== SHELL SELECTION ====================

/**
 * Determine the best shell to use based on system capabilities.
 * Returns a recommendation for shell selection.
 */
export function recommendShell(operation: 'file_ops' | 'text_search' | 'code_exec' | 'build'): {
  shell: 'powershell' | 'cmd' | 'bash';
  reason: string;
  fallback: string;
} {
  switch (operation) {
    case 'file_ops':
      return {
        shell: 'powershell',
        reason: 'PowerShell has native file system cmdlets (Get-ChildItem, Copy-Item, etc.)',
        fallback: 'cmd',
      };
    case 'text_search':
      return {
        shell: 'powershell',
        reason: 'Select-String is PowerShell-native and avoids regex escaping issues with -SimpleMatch',
        fallback: 'grep tool (if available)',
      };
    case 'code_exec':
      return {
        shell: 'cmd',
        reason: 'cmd avoids $LASTEXITCODE issues in npm.ps1 wrappers',
        fallback: 'powershell',
      };
    case 'build':
      return {
        shell: 'cmd',
        reason: 'Direct execution of .cmd files avoids npm/npx PowerShell shim issues',
        fallback: 'powershell',
      };
    default:
      return {
        shell: 'powershell',
        reason: 'PowerShell is the most capable shell on Windows',
        fallback: 'cmd',
      };
  }
}

// ==================== CROSS-PLATFORM COMMANDS ====================

/**
 * Build a command that works regardless of WSL availability.
 * Uses PowerShell-native commands for file operations.
 */
export function buildCrossPlatformFileCommand(
  operation: 'copy' | 'move' | 'delete' | 'list' | 'read' | 'write',
  path: string,
  dest?: string
): string {
  switch (operation) {
    case 'copy':
      return `Copy-Item -Path "${path}" -Destination "${dest}" -Force`;
    case 'move':
      return `Move-Item -Path "${path}" -Destination "${dest}" -Force`;
    case 'delete':
      return `Remove-Item -Path "${path}" -Force`;
    case 'list':
      return `Get-ChildItem -Path "${path}"`;
    case 'read':
      return `Get-Content -Path "${path}" -Raw`;
    case 'write':
      return `Set-Content -Path "${path}" -Value "" -Encoding UTF8`;
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

// ==================== WSL-SPECIFIC UTILITIES ====================

/**
 * Build a WSL command with proper encoding handling.
 * Use this when you specifically need to run Linux commands via WSL.
 */
export function buildWslCommand(linuxCommand: string, workingDir?: string): string {
  const parts: string[] = [];
  
  // Set encoding to UTF-8
  parts.push('[Console]::OutputEncoding = [System.Text.Encoding]::UTF8');
  parts.push('$OutputEncoding = [System.Text.Encoding]::UTF8');
  parts.push('[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8');
  
  // Set WSL working directory if provided
  if (workingDir) {
    // Convert Windows path to WSL path
    const wslPath = workingDir.replace(/\\/g, '/').replace(/^([A-Z]):/, '/$1');
    parts.push(`wsl.exe cd "${wslPath}"`);
  }
  
  // Execute the Linux command
  parts.push(`wsl.exe bash -c "${linuxCommand.replace(/"/g, '\\"')}"`);
  
  return parts.join('; ');
}

/**
 * Check if a specific WSL distribution is installed.
 */
export function buildCheckDistributionCommand(distribution: string): string {
  return [
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    `if (wsl --list --quiet 2>&1 | Where-Object { $_ -eq "${distribution}" }) { "INSTALLED" } else { "NOT_INSTALLED" }`
  ].join('; ');
}

// ==================== EXAMPLES ====================

/**
 * Example usage patterns for WSL detection and encoding handling.
 */
export const EXAMPLES = {
  detectWsl: {
    description: 'Detect WSL availability',
    command: buildWslDetectionCommand(),
    parse: (output: string) => parseWslDetection(output),
  },
  checkEncoding: {
    description: 'Check if output is garbled UTF-16',
    test: (output: string) => isGarbledUtf16(output),
    fix: (output: string) => cleanGarbledOutput(output),
  },
  recommendShell: {
    description: 'Get shell recommendation for an operation',
    test: (op: 'file_ops' | 'text_search' | 'code_exec' | 'build') => recommendShell(op),
  },
  crossPlatformFileOp: {
    description: 'Cross-platform file operation',
    test: (op: 'copy' | 'move' | 'delete' | 'list' | 'read' | 'write', path: string, dest?: string) => 
      buildCrossPlatformFileCommand(op, path, dest),
  },
  wslWithEncoding: {
    description: 'WSL command with proper UTF-8 encoding',
    test: (linuxCmd: string, workingDir?: string) => buildWslCommand(linuxCmd, workingDir),
  },
  checkDistribution: {
    description: 'Check if a WSL distribution is installed',
    test: (dist: string) => buildCheckDistributionCommand(dist),
  },
};
