import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ===================== WRITE FILE =====================

export interface WriteFileOptions {
  encoding?: string;
  createDir?: boolean;
  dryRun?: boolean; // DRY-RUN: preview without writing
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
 * Compute SHA-256 hash of content.
 */
function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Write content directly to a file. Creates parent directories if needed.
 * Uses atomic write (temp file + rename) for robustness.
 * Includes idempotency check to avoid unnecessary writes.
 */
export async function writeFile(
  filePath: string,
  content: string,
  options: WriteFileOptions = {}
): Promise<string> {
  const resolvedPath = path.resolve(filePath);
  const encoding = options.encoding || 'utf8';

  // DRY-RUN MODE: Return preview without writing to disk
  if (options.dryRun) {
    const existingContent = fs.existsSync(resolvedPath) ? fs.readFileSync(resolvedPath, 'utf8') : '';
    const sizeBytes = Buffer.byteLength(content, encoding as BufferEncoding);
    
    return JSON.stringify({
      would_write: true,
      path: resolvedPath,
      new_content_preview: content.length > 1000 
        ? content.substring(0, 1000) + `\n... (truncated, total ${content.length} chars)`
        : content,
      size_bytes: sizeBytes,
      content_hash: computeHash(content),
      file_exists: fs.existsSync(resolvedPath),
      existing_size: fs.existsSync(resolvedPath) ? Buffer.byteLength(existingContent, encoding as BufferEncoding) : 0,
      message: 'Dry-run mode: no changes were written. Re-call with dryRun: false to apply.'
    }, null, 2);
  }

  try {
    // Create parent directories if needed
    if (options.createDir !== false) {
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Idempotency check (#2 from IMPROVEMENTS doc)
    if (fs.existsSync(resolvedPath)) {
      const existing = fs.readFileSync(resolvedPath, 'utf8');
      if (existing === content) {
        return JSON.stringify({
          success: true,
          unchanged: true,
          message: `No change needed: content is identical to existing file at ${resolvedPath}`
        }, null, 2);
      }
    }

    // Atomic write
    await atomicWrite(resolvedPath, content, encoding as BufferEncoding);

    const sizeBytes = Buffer.byteLength(content, encoding as BufferEncoding);
    return JSON.stringify({
      success: true,
      bytesWritten: sizeBytes,
      path: resolvedPath
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as any).code;
    
    let errorMessage = `Error writing file '${resolvedPath}': ${errMsg}`;
    if (code === 'ENOENT') {
      const parentDir = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDir)) {
        errorMessage += `\nHint: Parent directory '${parentDir}' does not exist. Set createDir: true or create it first.`;
      }
    } else if (code === 'EACCES' || code === 'EPERM') {
      errorMessage += `\nHint: Permission denied. Try writing to a different location or check permissions.`;
    }
    
    return JSON.stringify({ success: false, error: errorMessage }, null, 2);
  }
}

/**
 * Write content directly to a file, appending if it exists.
 * Uses atomic write (temp file + rename) for robustness.
 * Includes idempotency check to avoid unnecessary writes.
 */
export async function writeFileAppend(
  filePath: string,
  content: string,
  options: WriteFileOptions = {}
): Promise<string> {
  const resolvedPath = path.resolve(filePath);
  const encoding = options.encoding || 'utf8';

  // Read existing content if file exists
  let existingContent = '';
  if (fs.existsSync(resolvedPath)) {
    existingContent = fs.readFileSync(resolvedPath, 'utf8');
  }

  const newContent = existingContent + content;

  // DRY-RUN MODE: Return preview without writing to disk
  if (options.dryRun) {
    return JSON.stringify({
      would_append: true,
      path: resolvedPath,
      appended_content_preview: content.length > 1000 
        ? content.substring(0, 1000) + `\n... (truncated, total ${content.length} chars)`
        : content,
      existing_size: Buffer.byteLength(existingContent, encoding as BufferEncoding),
      resulting_size: Buffer.byteLength(newContent, encoding as BufferEncoding),
      file_exists: fs.existsSync(resolvedPath),
      message: 'Dry-run mode: no changes were written. Re-call with dryRun: false to apply.'
    }, null, 2);
  }

  try {
    // Create parent directories if needed
    if (options.createDir !== false) {
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Idempotency check (#2 from IMPROVEMENTS doc)
    if (existingContent === newContent) {
      return JSON.stringify({
        success: true,
        unchanged: true,
        message: `No change needed: append content is identical to existing file at ${resolvedPath}`
      }, null, 2);
    }

    // Atomic write with appended content
    await atomicWrite(resolvedPath, newContent, encoding as BufferEncoding);

    return JSON.stringify({
      success: true,
      appendedBytes: Buffer.byteLength(content, encoding as BufferEncoding),
      path: resolvedPath
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as any).code;
    
    let errorMessage = `Error appending to file '${resolvedPath}': ${errMsg}`;
    if (code === 'ENOENT') {
      const parentDir = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDir)) {
        errorMessage += `\nHint: Parent directory '${parentDir}' does not exist. Set createDir: true or create it first.`;
      }
    } else if (code === 'EACCES' || code === 'EPERM') {
      errorMessage += `\nHint: Permission denied. Try writing to a different location or check permissions.`;
    }
    
    return JSON.stringify({ success: false, error: errorMessage }, null, 2);
  }
}
