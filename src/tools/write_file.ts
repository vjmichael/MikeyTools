/**
 * Write File Tools - Maximum Flexibility Version
 * 
 * No extension restrictions - writes to ANY file regardless of extension.
 * Outputs content directly for chaining.
 * AI model decides appropriate file extensions.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { truncateOutput } from './truncator';

// ===================== WRITE FILE =====================

export interface WriteFileOptions {
  encoding?: string;
  createDir?: boolean;
  dryRun?: boolean;
}

/**
 * Atomic write helper - writes to a temp file first, then renames.
 */
async function atomicWrite(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  try {
    fs.writeFileSync(tempPath, content, encoding);
    fs.renameSync(tempPath, filePath);
  } catch (err) {
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
 * NO EXTENSION RESTRICTIONS - writes to ANY file.
 * Returns content for chaining.
 */
export async function writeFile(
  filePath: string,
  content: string,
  options: WriteFileOptions = {}
): Promise<string> {
  const resolvedPath = path.resolve(filePath);
  const encoding = options.encoding || 'utf8';

  // DRY-RUN MODE
  if (options.dryRun) {
    const existingContent = fs.existsSync(resolvedPath) ? fs.readFileSync(resolvedPath, 'utf8') : '';
    const sizeBytes = Buffer.byteLength(content, encoding as BufferEncoding);
    
    return JSON.stringify({
      would_write: true,
      path: resolvedPath,
      new_content_preview: truncateOutput(content, 1000),
      size_bytes: sizeBytes,
      content_hash: computeHash(content),
      file_exists: fs.existsSync(resolvedPath),
      existing_size: fs.existsSync(resolvedPath) ? Buffer.byteLength(existingContent, encoding as BufferEncoding) : 0,
      message: 'Dry-run mode: no changes were written.'
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

    // Idempotency check
    if (fs.existsSync(resolvedPath)) {
      const existing = fs.readFileSync(resolvedPath, 'utf8');
      if (existing === content) {
        return content;  // Return content directly
      }
    }

    // Atomic write
    await atomicWrite(resolvedPath, content, encoding as BufferEncoding);

    return content;  // Return content directly for chaining
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
      errorMessage += `\nHint: Permission denied. Try writing to a different location.`;
    }
    
    return JSON.stringify({ success: false, error: errorMessage });
  }
}

/**
 * Write content directly to a file, appending if it exists.
 * NO EXTENSION RESTRICTIONS - appends to ANY file.
 * Returns appended content for chaining.
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

  // DRY-RUN MODE
  if (options.dryRun) {
    return JSON.stringify({
      would_append: true,
      path: resolvedPath,
      appended_content_preview: truncateOutput(content, 1000),
      existing_size: Buffer.byteLength(existingContent, encoding as BufferEncoding),
      resulting_size: Buffer.byteLength(newContent, encoding as BufferEncoding),
      file_exists: fs.existsSync(resolvedPath),
      message: 'Dry-run mode: no changes were written.'
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

    // Idempotency check
    if (existingContent === newContent) {
      return content;  // Return content directly
    }

    // Atomic write with appended content
    await atomicWrite(resolvedPath, newContent, encoding as BufferEncoding);

    return content;  // Return appended content for chaining
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as any).code;
    
    let errorMessage = `Error appending to file '${resolvedPath}': ${errMsg}`;
    if (code === 'ENOENT') {
      const parentDir = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDir)) {
        errorMessage += `\nHint: Parent directory '${parentDir}' does not exist.`;
      }
    } else if (code === 'EACCES' || code === 'EPERM') {
      errorMessage += `\nHint: Permission denied.`;
    }
    
    return JSON.stringify({ success: false, error: errorMessage });
  }
}
