/**
 * Patch Application Tool for LM Studio Plugin
 * 
 * Applies unified diff format patches to files with safety features.
 * Returns structured JSON for model parsing.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface PatchResult {
  applied: boolean;
  dry_run: boolean;
  hunks_applied: number;
  hunks_failed: number;
  conflicts: Array<{
    hunk: number;
    error: string;
    expected_context: string;
    actual_context: string;
  }>;
  preview?: string;
}

interface Hunk {
  number: number;
  start_line: number;
  context: string[];
  replacement: string[];
  deletions: number[]; // indices in context that are deletions
}

export async function applyPatch(
  file_path: string,
  diff: string,
  dry_run: boolean = false,
  all_or_nothing: boolean = false
): Promise<PatchResult> {
  const result: PatchResult = {
    applied: false,
    dry_run: dry_run,
    hunks_applied: 0,
    hunks_failed: 0,
    conflicts: [],
    preview: undefined
  };
  
  // Validate file exists
  if (!fs.existsSync(file_path)) {
    result.hunks_failed = 1;
    result.conflicts.push({
      hunk: 0,
      error: `File not found: ${file_path}`,
      expected_context: '',
      actual_context: ''
    });
    return result;
  }
  
  // BUG-14 FIX: Check for binary files before reading
  try {
    const stat = fs.statSync(file_path);
    if (stat.size > 10 * 1024 * 1024) { // Skip files > 10MB
      result.hunks_failed = 1;
      result.conflicts.push({
        hunk: 0,
        error: 'File too large for patching (>10MB)',
        expected_context: '',
        actual_context: ''
      });
      return result;
    }
    
    // H-05 FIX: Check for binary content (null bytes) in the entire file for files < 10MB
    let fd: number | null = null;
    try {
      fd = fs.openSync(file_path, 'r');
      const checkSize = Math.min(stat.size, 10 * 1024 * 1024); // Check up to 10MB
      const buffer = Buffer.alloc(checkSize);
      const bytesRead = fs.readSync(fd, buffer, 0, checkSize, 0);
      
      // Check entire buffer for null bytes
      let isBinary = false;
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) {
          isBinary = true;
          break;
        }
      }
      
      if (isBinary) {
        result.hunks_failed = 1;
        result.conflicts.push({
          hunk: 0,
          error: 'Binary file detected - cannot patch text files as binary',
          expected_context: '',
          actual_context: ''
        });
        return result;
      }
    } catch (readErr) {
      // Ignore read errors
    }
  } catch (e) {
    // If we can't stat the file, try to read it anyway
  }
  
  // Read original file
  let originalContent: string;
  try {
    originalContent = fs.readFileSync(file_path, 'utf8');
  } catch (e) {
    result.hunks_failed = 1;
    result.conflicts.push({
      hunk: 0,
      error: `Failed to read file: ${String(e)}`,
      expected_context: '',
      actual_context: ''
    });
    return result;
  }
  
  // Normalize line endings for comparison
  const originalLines = originalContent.replace(/\r\n/g, '\n').split('\n');
  
  // Parse diff hunks
  const hunks = parseDiff(diff);
  
  if (hunks.length === 0) {
    result.hunks_failed = 1;
    result.conflicts.push({
      hunk: 0,
      error: 'No valid hunks found in diff',
      expected_context: '',
      actual_context: ''
    });
    return result;
  }
  
  // Process each hunk
  let newLines = [...originalLines];
  let appliedCount = 0;
  let failedCount = 0;
  
  for (const hunk of hunks) {
    const { found, startIndex } = findContext(newLines, hunk.context, hunk.start_line);
    
    if (found) {
      // Apply the hunk
      const endIndex = startIndex + hunk.context.length;
      newLines.splice(startIndex, hunk.context.length, ...hunk.replacement);
      appliedCount++;
    } else {
      failedCount++;
      result.conflicts.push({
        hunk: hunk.number,
        error: 'Context mismatch',
        expected_context: hunk.context.slice(0, 5).join('\n') + (hunk.context.length > 5 ? '...' : ''),
        actual_context: newLines.slice(Math.max(0, hunk.start_line - 3), hunk.start_line + 5).join('\n')
      });
      
      if (all_or_nothing) {
        break;
      }
    }
  }
  
  result.hunks_applied = appliedCount;
  result.hunks_failed = failedCount;
  
  if (failedCount > 0 && all_or_nothing) {
    result.applied = false;
    return result;
  }
  
  // Generate preview
  const previewContent = newLines.join('\n');
  result.preview = previewContent;
  
  // DRY-RUN MODE: Return structured preview without writing
  if (dry_run) {
    result.applied = false;
    return result;
  }
  
  // BUG-21 FIX: Use path.join for cross-platform compatibility
  const bakPath = path.join(path.dirname(file_path), path.basename(file_path) + '.bak');
  try {
    fs.copyFileSync(file_path, bakPath);
  } catch (e) {
    result.conflicts.push({
      hunk: -1,
      error: `Failed to create backup: ${String(e)}`,
      expected_context: '',
      actual_context: ''
    });
  }
  
  // Write patched file
  try {
    // BUG-08 FIX: Simplified line ending preservation logic
    const newContent = originalContent.includes('\r\n')
      ? newLines.join('\r\n')
      : newLines.join('\n');
    
    fs.writeFileSync(file_path, newContent, 'utf8');
    result.applied = true;
  } catch (e) {
    result.conflicts.push({
      hunk: -1,
      error: `Failed to write file: ${String(e)}`,
      expected_context: '',
      actual_context: ''
    });
  }
  
  return result;
}

function parseDiff(diff: string): Hunk[] {
  const hunks: Hunk[] = [];
  let hunkNumber = 0;
  const lines = diff.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Look for hunk header
    if (line.startsWith('@@')) {
      hunkNumber++;
      
      // Parse hunk header: @@ -start,count +start,count @@
      const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (!match) {
        i++;
        continue;
      }
      
      const oldStart = parseInt(match[1]);
      const oldCount = match[2] ? parseInt(match[2]) : 1;
      const newStart = parseInt(match[3]);
      const newCount = match[4] ? parseInt(match[4]) : 1;
      
      const context: string[] = [];
      const replacement: string[] = [];
      const deletions: number[] = [];
      
      i++;
      while (i < lines.length) {
        const line = lines[i];
        
        if (line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff ')) {
          break;
        }
        
        if (line.startsWith('+')) {
          replacement.push(line.substring(1));
        } else if (line.startsWith('-')) {
          // Deleted line - add placeholder to context
          context.push('');
          deletions.push(context.length - 1);
        } else if (line.startsWith(' ')) {
          context.push(line.substring(1));
          replacement.push(line.substring(1));
        } else if (line.startsWith('\\')) {
          // "\\ No newline at end of file"
        } else {
          // Empty line or unknown
        }
        
        i++;
      }
      
      hunks.push({
        number: hunkNumber,
        start_line: oldStart,
        context: context,
        replacement: replacement,
        deletions: deletions
      });
    } else {
      i++;
    }
  }
  
  return hunks;
}

function findContext(lines: string[], context: string[], startHint: number): { found: boolean; startIndex: number } {
  if (context.length === 0) {
    return { found: true, startIndex: startHint };
  }
  
  // Search around hint
  const searchStart = Math.max(0, startHint - 5);
  const searchEnd = Math.min(lines.length, startHint + context.length + 5);
  
  for (let i = searchStart; i < searchEnd - context.length + 1; i++) {
    let match = true;
    for (let j = 0; j < context.length; j++) {
      // Skip empty context lines (deletions) when matching
      if (context[j] !== '' && lines[i + j] !== context[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return { found: true, startIndex: i };
    }
  }
  
  // If not found near hint, search entire file
  for (let i = 0; i < lines.length - context.length + 1; i++) {
    let match = true;
    for (let j = 0; j < context.length; j++) {
      // Skip empty context lines (deletions) when matching
      if (context[j] !== '' && lines[i + j] !== context[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return { found: true, startIndex: i };
    }
  }
  
  return { found: false, startIndex: -1 };
}
