import * as fs from 'fs';
import * as path from 'path';

// ===================== EDIT FILE =====================

export interface EditOperation {
  type: 'replace' | 'insert' | 'delete';
  // For 'replace':
  search?: string;
  replace?: string;
  // For 'insert':
  line?: number;
  text?: string;
  // For 'delete':
  startLine?: number;
  endLine?: number;
}

export interface EditFileOptions {
  dryRun?: boolean; // DRY-RUN: preview without writing
}

/**
 * Compute unified diff between two strings (line-by-line).
 * Simplified implementation that works for most cases.
 */
function computeUnifiedDiff(original: string, modified: string): string {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');

  // Find common prefix length
  let prefixLen = 0;
  while (prefixLen < Math.min(originalLines.length, modifiedLines.length) && 
         originalLines[prefixLen] === modifiedLines[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix length (after the differing section)
  let suffixLen = 0;
  const remainingOrig = originalLines.length - prefixLen;
  const remainingMod = modifiedLines.length - prefixLen;
  
  while (suffixLen < Math.min(remainingOrig, remainingMod) && 
         originalLines[originalLines.length - 1 - suffixLen] === 
         modifiedLines[modifiedLines.length - 1 - suffixLen]) {
    suffixLen++;
  }

  const diff: string[] = [];

  // Header
  if (original !== modified) {
    diff.push(`--- a/file`);
    diff.push(`+++ b/file`);
    
    // Context lines before change
    const contextLinesBefore = Math.min(prefixLen, 3);
    for (let i = prefixLen - contextLinesBefore; i < prefixLen && i >= 0; i++) {
      diff.push(` ${originalLines[i]}`);
    }

    if (contextLinesBefore < prefixLen) {
      diff.push(`@@ ... @@`); // Truncated header for large files
    } else {
      diff.push(`@@ -${prefixLen},${remainingOrig} +${prefixLen},${remainingMod} @@`);
    }

    // Removed lines
    const startLine = Math.max(0, prefixLen - contextLinesBefore);
    const endLine = originalLines.length - suffixLen;
    
    for (let i = startLine; i < endLine; i++) {
      diff.push(`-${originalLines[i]}`);
    }

    // Added lines
    const modStartLine = Math.max(0, prefixLen - contextLinesBefore);
    const modEndLine = modifiedLines.length - suffixLen;
    
    for (let i = modStartLine; i < modEndLine; i++) {
      diff.push(`+${modifiedLines[i]}`);
    }

    // Context lines after change
    const contextLinesAfter = Math.min(suffixLen, 3);
    for (let i = originalLines.length - suffixLen; i < originalLines.length && 
         i >= originalLines.length - suffixLen - contextLinesAfter + 1; i++) {
      if (i >= 0) {
        diff.push(` ${originalLines[i]}`);
      }
    }

    if (suffixLen > 3) {
      diff.push(`@@ ... @@`); // Truncated header for large files
    }

    return diff.join('\n');
  }

  return '(no changes)';
}

/**
 * Count lines added and removed between original and modified content.
 */
function countChanges(original: string, modified: string): { added: number; removed: number } {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  
  let removed = 0;
  let added = 0;

  // Simple diff to count changes
  let i = 0, j = 0;
  while (i < origLines.length && j < modLines.length) {
    if (origLines[i] === modLines[j]) {
      i++;
      j++;
    } else {
      // Check for deletion
      let foundMatch = false;
      for (let k = j + 1; k <= Math.min(j + 5, modLines.length); k++) {
        if (origLines[i] === modLines[k]) {
          removed++;
          i++;
          j = k;
          foundMatch = true;
          break;
        }
      }
      if (!foundMatch) {
        // Check for insertion
        let foundInsertion = false;
        for (let k = i + 1; k <= Math.min(i + 5, origLines.length); k++) {
          if (origLines[k] === modLines[j]) {
            added++;
            j++;
            i = k;
            foundInsertion = true;
            break;
          }
        }
        if (!foundInsertion) {
          removed++;
          added++;
          i++;
          j++;
        }
      }
    }
  }

  while (i < origLines.length) { removed++; i++; }
  while (j < modLines.length) { added++; j++; }

  return { added, removed };
}

/**
 * Atomic write helper - writes to a temp file first, then renames.
 * Prevents data corruption if the write fails mid-way.
 */
async function atomicWrite(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  try {
    fs.writeFileSync(tempPath, content, encoding);
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Clean up temp file on failure
    try { fs.unlinkSync(tempPath); } catch {}
    throw err;
  }
}

/**
 * Get parent directory contents for error context.
 */
function getParentContents(filePath: string): string[] {
  const parentDir = path.dirname(filePath);
  if (fs.existsSync(parentDir)) {
    try {
      return fs.readdirSync(parentDir);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get nearby lines for error context when search string not found.
 */
function getNearbyLines(content: string, searchStr: string, contextLines: number = 3): string {
  const lines = content.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    // Find approximate position of search string
    const idx = content.indexOf(searchStr);
    if (idx !== -1) {
      // Find which line the search string is on
      let lineStart = 0;
      let lineNum = 1;
      for (let j = 0; j < idx; j++) {
        if (content[j] === '\n') {
          lineNum++;
          lineStart = j + 1;
        }
      }
      
      // Show context lines around the search string
      const startLine = Math.max(0, lineNum - 1 - contextLines);
      const endLine = Math.min(lines.length, lineNum + contextLines);
      
      for (let k = startLine; k < endLine; k++) {
        result.push(`  ${k + 1}: ${lines[k]}`);
      }
      break;
    }
  }
  
  return result.length > 0 ? `\nNearby content:\n${result.join('\n')}` : '';
}

/**
 * Main edit function - applies operations sequentially.
 */
export async function editFile(
  filePath: string,
  operations: EditOperation[],
  options: EditFileOptions = {}
): Promise<string> {
  const resolvedPath = path.resolve(filePath);

  try {
    // Read the file
    if (!fs.existsSync(resolvedPath)) {
      const parentContents = getParentContents(resolvedPath);
      const availableItems = parentContents.length > 0 ? `[${parentContents.join(', ')}]` : 'N/A';
      return JSON.stringify({
        success: false,
        error: `File not found: ${resolvedPath}\nHint: Files in parent directory: ${availableItems}`
      }, null, 2);
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    const lines = content.split('\n');

    // Apply operations in order to an in-memory copy
    let modifiedLines = [...lines];
    // Define normalizedOps for delete operations
    const normalizedOps = operations.map(op => {
      if (op.type === 'delete') {
        return {
          ...op,
          startLine: op.startLine || op.line,
          endLine: op.endLine || op.line
        };
      }
      return op;
    });
    const ops = normalizedOps || operations;
    for (const op of ops) {
      if (!op.type) {
        return JSON.stringify({
          success: false,
          error: 'Each operation must have a "type" field (replace, insert, or delete)'
        }, null, 2);
      }

      if (op.type === 'replace') {
        if (!op.search) {
          return JSON.stringify({
            success: false,
            error: '"replace" operation requires a "search" field'
          }, null, 2);
        }
        // Replace first occurrence only for consistency with replaceTextInFile
        const idx = content.indexOf(op.search);
        if (idx === -1) {
          const nearby = getNearbyLines(content, op.search);
          return JSON.stringify({
            success: false,
            error: `Search string not found in file: "${op.search}"${nearby}`
          }, null, 2);
        }
        // Apply replacement to modifiedLines by working with full content first
      } else if (op.type === 'insert') {
        if (op.line === undefined || !op.text) {
          return JSON.stringify({
            success: false,
            error: '"insert" operation requires "line" and "text" fields'
          }, null, 2);
        }
        const lineNum = op.line;
        if (lineNum < 1 || lineNum > modifiedLines.length + 1) {
          return JSON.stringify({
            success: false,
            error: `Line number ${lineNum} out of range (1-${modifiedLines.length + 1})\nHint: File has ${modifiedLines.length} lines.`
          }, null, 2);
        }
        modifiedLines.splice(lineNum - 1, 0, op.text);
      } else if (op.type === 'delete') {
        if (op.startLine === undefined) {
          return JSON.stringify({
            success: false,
            error: '"delete" operation requires "startLine" field'
          }, null, 2);
        }
        const start = op.startLine;
        const end = op.endLine !== undefined ? op.endLine : start;
        if (start < 1 || start > modifiedLines.length) {
          return JSON.stringify({
            success: false,
            error: `Start line ${start} out of range (1-${modifiedLines.length})\nHint: File has ${modifiedLines.length} lines.`
          }, null, 2);
        }
        if (end < start || end > modifiedLines.length) {
          return JSON.stringify({
            success: false,
            error: `End line ${end} out of range (${start}-${modifiedLines.length})\nHint: File has ${modifiedLines.length} lines.`
          }, null, 2);
        }
        modifiedLines.splice(start - 1, end - start + 1);
      } else {
        return JSON.stringify({
          success: false,
          error: `Unknown operation type: ${op.type}`
        }, null, 2);
      }
    }

    // For replace operations, we need to handle them differently since they work on full content
    // Re-read and apply all operations properly
    let newContent = content;
    for (const op of operations) {
      if (op.type === 'replace' && op.search !== undefined) {
        const idx = newContent.indexOf(op.search);
        if (idx === -1) {
          return JSON.stringify({
            success: false,
            error: `Search string not found in file: "${op.search}"`
          }, null, 2);
        }
        // Replace first occurrence only
        newContent = newContent.substring(0, idx) + (op.replace || '') + newContent.substring(idx + op.search.length);
      } else if (op.type === 'insert' && op.line !== undefined && op.text !== undefined) {
        const lineNum = op.line;
        const linesArr = newContent.split('\n');
        if (lineNum < 1 || lineNum > linesArr.length + 1) {
          return JSON.stringify({
            success: false,
            error: `Line number ${lineNum} out of range`
          }, null, 2);
        }
        linesArr.splice(lineNum - 1, 0, op.text);
        newContent = linesArr.join('\n');
      } else if (op.type === 'delete' && op.startLine !== undefined) {
        const start = op.startLine;
        const end = op.endLine !== undefined ? op.endLine : start;
        const linesArr = newContent.split('\n');
        if (start < 1 || start > linesArr.length) {
          return JSON.stringify({
            success: false,
            error: `Start line ${start} out of range`
          }, null, 2);
        }
        linesArr.splice(start - 1, end - start + 1);
        newContent = linesArr.join('\n');
      }
    }

    // DRY-RUN MODE: Return diff preview without writing
    if (options.dryRun) {
      const unifiedDiff = computeUnifiedDiff(content, newContent);
      const changes = countChanges(content, newContent);
      
      return JSON.stringify({
        would_edit: true,
        path: resolvedPath,
        operations_applied: operations.length,
        lines_changed: changes,
        diff_preview: unifiedDiff.length > 2000 
          ? unifiedDiff.substring(0, 2000) + `\n... (truncated, total ${unifiedDiff.length} chars)`
          : unifiedDiff,
        message: 'Dry-run mode: no changes were written. Re-call with dryRun: false to apply.'
      }, null, 2);
    }

    // Actually write the file
    await atomicWrite(resolvedPath, newContent);

    return JSON.stringify({
      success: true,
      operationsApplied: operations.length,
      path: resolvedPath
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as any).code;
    
    let errorMessage = `Error editing file '${resolvedPath}': ${errMsg}`;
    if (code === 'EACCES' || code === 'EPERM') {
      errorMessage += `\nHint: Permission denied. Try writing to a different location or check permissions.`;
    }
    
    return JSON.stringify({ success: false, error: errorMessage }, null, 2);
  }
}

/**
 * Simple find-and-replace wrapper.
 */
export async function replaceTextInFile(
  filePath: string,
  oldString: string,
  newString: string,
  options: EditFileOptions = {}
): Promise<string> {
  const resolvedPath = path.resolve(filePath);

  try {
    if (!fs.existsSync(resolvedPath)) {
      const parentContents = getParentContents(resolvedPath);
      const availableItems = parentContents.length > 0 ? `[${parentContents.join(', ')}]` : 'N/A';
      return JSON.stringify({
        success: false,
        error: `File not found: ${resolvedPath}\nHint: Files in parent directory: ${availableItems}`
      }, null, 2);
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');

    if (!content.includes(oldString)) {
      const nearby = getNearbyLines(content, oldString);
      return JSON.stringify({
        success: false,
        error: `Search string not found in file: "${oldString}"${nearby}`
      }, null, 2);
    }

    // DRY-RUN MODE: Return preview without writing
    if (options.dryRun) {
      const newContent = content.replace(oldString, newString);
      return JSON.stringify({
        would_replace: true,
        path: resolvedPath,
        old_string_preview: oldString.length > 500 ? oldString.substring(0, 500) + '...' : oldString,
        new_string_preview: newString.length > 500 ? newString.substring(0, 500) + '...' : newString,
        message: 'Dry-run mode: no changes were written. Re-call with dryRun: false to apply.'
      }, null, 2);
    }

    const newContent = content.replace(oldString, newString);
    await atomicWrite(resolvedPath, newContent);

    return JSON.stringify({
      success: true,
      replaced: oldString,
      with: newString,
      path: resolvedPath
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as any).code;
    
    let errorMessage = `Error replacing text in file '${resolvedPath}': ${errMsg}`;
    if (code === 'EACCES' || code === 'EPERM') {
      errorMessage += `\nHint: Permission denied. Try writing to a different location or check permissions.`;
    }
    
    return JSON.stringify({ success: false, error: errorMessage }, null, 2);
  }
}

/**
 * Insert text at a specific line (1-indexed).
 */
export async function insertLinesInFile(
  filePath: string,
  lineNum: number,
  text: string,
  options: EditFileOptions = {}
): Promise<string> {
  const resolvedPath = path.resolve(filePath);

  try {
    if (!fs.existsSync(resolvedPath)) {
      const parentContents = getParentContents(resolvedPath);
      const availableItems = parentContents.length > 0 ? `[${parentContents.join(', ')}]` : 'N/A';
      return JSON.stringify({
        success: false,
        error: `File not found: ${resolvedPath}\nHint: Files in parent directory: ${availableItems}`
      }, null, 2);
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    const lines = content.split('\n');

    if (lineNum < 1 || lineNum > lines.length + 1) {
      return JSON.stringify({
        success: false,
        error: `Line number ${lineNum} out of range (1-${lines.length + 1})\nHint: File has ${lines.length} lines.`
      }, null, 2);
    }

    // DRY-RUN MODE: Return preview without writing
    if (options.dryRun) {
      const newLines = [...lines];
      newLines.splice(lineNum - 1, 0, text);
      return JSON.stringify({
        would_insert_at_line: lineNum,
        path: resolvedPath,
        inserted_text_preview: text.length > 500 ? text.substring(0, 500) + '...' : text,
        resulting_lines_count: newLines.length,
        message: 'Dry-run mode: no changes were written. Re-call with dryRun: false to apply.'
      }, null, 2);
    }

    lines.splice(lineNum - 1, 0, text);
    const newContent = lines.join('\n');
    await atomicWrite(resolvedPath, newContent);

    return JSON.stringify({
      success: true,
      insertedAtLine: lineNum,
      path: resolvedPath
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as any).code;
    
    let errorMessage = `Error inserting text at line ${lineNum} in '${resolvedPath}': ${errMsg}`;
    if (code === 'EACCES' || code === 'EPERM') {
      errorMessage += `\nHint: Permission denied. Try writing to a different location or check permissions.`;
    }
    
    return JSON.stringify({ success: false, error: errorMessage }, null, 2);
  }
}

/**
 * Delete lines from startLine to endLine (1-indexed, inclusive).
 */
export async function deleteLinesInFile(
  filePath: string,
  startLine: number,
  endLine?: number,
  options: EditFileOptions = {}
): Promise<string> {
  const resolvedPath = path.resolve(filePath);
  const end = endLine !== undefined ? endLine : startLine;

  try {
    if (!fs.existsSync(resolvedPath)) {
      const parentContents = getParentContents(resolvedPath);
      const availableItems = parentContents.length > 0 ? `[${parentContents.join(', ')}]` : 'N/A';
      return JSON.stringify({
        success: false,
        error: `File not found: ${resolvedPath}\nHint: Files in parent directory: ${availableItems}`
      }, null, 2);
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    const lines = content.split('\n');

    if (startLine < 1 || startLine > lines.length) {
      return JSON.stringify({
        success: false,
        error: `Start line ${startLine} out of range (1-${lines.length})\nHint: File has ${lines.length} lines.`
      }, null, 2);
    }
    if (end < startLine || end > lines.length) {
      return JSON.stringify({
        success: false,
        error: `End line ${end} out of range (${startLine}-${lines.length})\nHint: File has ${lines.length} lines.`
      }, null, 2);
    }

    // DRY-RUN MODE: Return preview without writing
    if (options.dryRun) {
      const newLines = [...lines];
      newLines.splice(startLine - 1, end - startLine + 1);
      return JSON.stringify({
        would_delete_lines: `${startLine}-${end}`,
        path: resolvedPath,
        resulting_lines_count: newLines.length,
        deleted_content_preview: lines.slice(startLine - 1, end).join('\n').length > 500 
          ? lines.slice(startLine - 1, end).join('\n').substring(0, 500) + '...'
          : lines.slice(startLine - 1, end).join('\n'),
        message: 'Dry-run mode: no changes were written. Re-call with dryRun: false to apply.'
      }, null, 2);
    }

    lines.splice(startLine - 1, end - startLine + 1);
    const newContent = lines.join('\n');
    await atomicWrite(resolvedPath, newContent);

    return JSON.stringify({
      success: true,
      deletedLines: `${startLine}-${end}`,
      path: resolvedPath
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as any).code;
    
    let errorMessage = `Error deleting lines ${startLine}-${end} from '${resolvedPath}': ${errMsg}`;
    if (code === 'EACCES' || code === 'EPERM') {
      errorMessage += `\nHint: Permission denied. Try writing to a different location or check permissions.`;
    }
    
    return JSON.stringify({ success: false, error: errorMessage }, null, 2);
  }
}
