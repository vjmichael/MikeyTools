import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { truncateOutput } from './truncator';


// ===================== CAT ABILITIES =====================

export interface CatOptions {
  followSymlinks?: boolean; // Follow symbolic links (default: true)
  maxBytes?: number; // Maximum bytes to read (default: 50MB for cat)
  streaming?: boolean; // Enable streaming for large files (default: true)
  multipleFiles?: boolean; // Support multiple file inputs (default: false)
  silent?: boolean; // Suppress metadata output (default: false)
  lineRange?: { start: number; end: number }; // Read specific line range (1-indexed)
  dryRun?: boolean; // DRY-RUN: preview without reading
}

/**
 * Resolve a file path, following symlinks if requested.
 * Returns the resolved path or throws an error.
 */
function resolvePath(filePath: string, followSymlinks: boolean = true): string {
  const resolvedPath = path.resolve(filePath);
  
  if (!followSymlinks) {
    return resolvedPath;
  }
  
  try {
    // Check if it's a symlink
    const lstats = fs.lstatSync(resolvedPath);
    if (lstats.isSymbolicLink()) {
      // Resolve the symlink target
      const target = fs.readlinkSync(resolvedPath);
      const resolvedTarget = path.resolve(path.dirname(resolvedPath), target);
      
      // Check for circular symlinks (max 10 levels)
      let currentPath = resolvedTarget;
      let depth = 0;
      const visited = new Set<string>();
      
      while (depth < 10) {
        if (!fs.existsSync(currentPath)) {
          throw new Error(`Symlink chain broken at ${currentPath}`);
        }
        if (!fs.lstatSync(currentPath).isSymbolicLink()) {
          break;
        }
        if (visited.has(currentPath)) {
          throw new Error(`Circular symlink detected at ${resolvedPath}`);
        }
        visited.add(currentPath);
        const targetLink = fs.readlinkSync(currentPath);
        currentPath = path.resolve(path.dirname(currentPath), targetLink);
        depth++;
      }
      
      return currentPath;
    }
  } catch (err) {
    // If lstat fails, just return the resolved path
    // The file might not exist yet, which will be caught later
  }
  
  return resolvedPath;
}

/**
 * Read a file in streaming mode for large files.
 * Returns content in chunks with progress tracking.
 */
function readFileStreaming(
  filePath: string,
  maxBytes: number,
  encoding: BufferEncoding = 'utf8'
): Promise<{ content: string; truncated: boolean; totalBytes: number }> {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    let bytesRead = 0;
    let content = '';
    let truncated = false;
    
    const stream = fs.createReadStream(filePath, {
      highWaterMark: 64 * 1024, // 64KB chunks
      start: 0,
      end: Math.min(maxBytes, fileSize) - 1
    });
    
    stream.on('data', (chunk: string | Buffer) => {
      const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString(encoding);
      content += chunkStr;
      bytesRead += chunk.length;
      
      // Check if we've reached the limit
      if (bytesRead >= maxBytes) {
        truncated = true;
        stream.destroy();
        resolve({ content, truncated, totalBytes: fileSize });
      }
    });
    
    stream.on('end', () => {
      if (!truncated) {
        resolve({ content, truncated: false, totalBytes: fileSize });
      }
    });
    
    stream.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Read a file with cat-like behavior - reads any file type.
 * Returns structured JSON for LM Studio model parsing.
 */
export async function cat(
  filePath: string,
  options: CatOptions = {}
): Promise<string> {
  const followSymlinks = options.followSymlinks !== false; // Default: true
  const maxBytes = options.maxBytes || 50 * 1024 * 1024; // Default: 50MB for cat
  const streaming = options.streaming !== false; // Default: true
  const silent = options.silent || false;

// Resolve path (follow symlinks if requested)
  let resolvedPath: string;
  try {
    resolvedPath = resolvePath(filePath, followSymlinks);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({
      success: false,
      error: `Failed to resolve path '${filePath}': ${errMsg}`,
      hint: 'Check if the file or symlink target exists.'
    }, null, 2);
  }
  
  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    return JSON.stringify({
      success: false,
      error: `File not found: ${resolvedPath}`,
      hint: 'Verify the file path is correct and the file exists.'
    }, null, 2);
  }
  
  // Check if it's a directory
  const stats = fs.statSync(resolvedPath);
  if (stats.isDirectory()) {
    return JSON.stringify({
      success: false,
      error: `Path is a directory, not a file: ${resolvedPath}`,
      hint: 'Provide a file path, not a directory.'
    }, null, 2);
  }
  
  const fileSize = stats.size;
  const isSymlink = fs.lstatSync(filePath).isSymbolicLink();
  
  // DRY-RUN MODE: Return preview without reading
  if (options.dryRun) {
    return JSON.stringify({
      would_read: true,
      path: resolvedPath,
      originalPath: filePath,
      file_size_bytes: fileSize,
      is_symlink: isSymlink,
      symlink_target: isSymlink ? fs.readlinkSync(filePath) : null,
      is_text_file: isTextFile(resolvedPath),
      is_binary_document: isBinaryDocument(resolvedPath),
      message: 'Dry-run mode: no file was read. Re-call with dryRun: false to apply.'
    }, null, 2);
  }
  
  try {
    let content: string = '';
    let encoding: string = 'utf8';
    let truncated: boolean = false;
    
    if (streaming && fileSize > 1024 * 1024) { // Use streaming for files > 1MB
      // BUG 5 FIX: Detect encoding BEFORE streaming, then pass it to the streaming reader
      const fileContent = fs.readFileSync(resolvedPath, { flag: 'r' });
      const detectedEncoding = detectEncoding(fileContent);
      
      let streamEncoding: BufferEncoding = 'utf8';
      if (detectedEncoding === 'utf8' || detectedEncoding === 'ascii') {
        streamEncoding = 'utf8';
      } else if (detectedEncoding === 'utf16le' || detectedEncoding === 'utf16be') {
        streamEncoding = detectedEncoding as BufferEncoding;
      } else {
        // Binary - use base64
        const result = await readFileStreaming(resolvedPath, maxBytes, 'utf8');
        content = result.content;
        encoding = 'base64';
        truncated = result.truncated;
      }
      
      if (streamEncoding !== 'base64') {
        const result = await readFileStreaming(resolvedPath, maxBytes, streamEncoding);
        content = result.content;
        encoding = streamEncoding;
        truncated = result.truncated;
      }
    } else {
      // Read entire file at once
      const fileContent = fs.readFileSync(resolvedPath);
      
      // Auto-detect encoding
      const detectedEncoding = detectEncoding(fileContent);
      encoding = detectedEncoding;
      
      if (detectedEncoding === 'utf8' || detectedEncoding === 'utf16le' || detectedEncoding === 'utf16be') {
        content = fileContent.toString(detectedEncoding as BufferEncoding);
      } else if (detectedEncoding === 'ascii') {
        content = fileContent.toString('ascii');
      } else if (detectedEncoding === 'binary') {
        // BUG 6 FIX: Explicit handling for binary encoding
        content = fileContent.toString('base64');
        encoding = 'base64';
      } else {
        // Unknown encoding - read as base64
        content = fileContent.toString('base64');
        encoding = 'base64';
      }
      
      truncated = fileContent.length > maxBytes;
      if (truncated) {
        content = content.substring(0, maxBytes);
      }
    }
    
    // BUG 1 FIX: Use actual newline characters (\n) instead of literal backslash-n
    // Apply line range if specified
    if (options.lineRange) {
      const lines = content.split('\n');
      const start = Math.max(1, options.lineRange.start);
      const end = options.lineRange.end ? Math.min(lines.length, options.lineRange.end) : lines.length;
      content = lines.slice(start - 1, end).join('\n');
    }
    
    // For silent mode, just return the content
    if (silent) {
      return content;
    }
    
    // Return structured output with metadata
    const contentLength = Buffer.byteLength(content, 'utf8');
    const fileHash = crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex');
    
    return JSON.stringify({
      success: true,
      path: resolvedPath,
      originalPath: filePath,
      fileSizeBytes: fileSize,
      contentLengthBytes: contentLength,
      encoding: encoding,
      isSymlink: isSymlink,
      symlinkTarget: isSymlink ? fs.readlinkSync(filePath) : null,
      isTextFile: isTextFile(resolvedPath),
      isBinaryDocument: isBinaryDocument(resolvedPath),
      truncated: truncated,
      maxBytesLimit: maxBytes,
      streamingUsed: streaming && fileSize > 1024 * 1024,
      contentPreview: truncateOutput(content, 10000),
      contentHash: fileHash,
      note: isBinaryDocument(resolvedPath) && encoding === 'base64'
        ? 'This is a binary document file. Content returned as base64-encoded. Use specialized tools for full content.'
        : undefined
    }, null, 2);
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as any).code;
    
    let errorMessage = `Error reading file '${resolvedPath}': ${errMsg}`;
    if (code === 'EACCES' || code === 'EPERM') {
      errorMessage += '\nHint: Permission denied. Check file permissions.';
    } else if (code === 'ENOENT') {
      errorMessage += '\nHint: File does not exist.';
    } else if (code === 'EISDIR') {
      errorMessage += '\nHint: Path is a directory, not a file.';
    }
    
    return JSON.stringify({ success: false, error: errorMessage }, null, 2);
  }
}

/**
 * Read multiple files with cat-like behavior.
 * Concatenates content from multiple files.
 */
export async function catMultiple(
  filePaths: string[],
  options: Omit<CatOptions, 'multipleFiles'> = {}
): Promise<string> {
  const results: Array<{ path: string; content: string; success: boolean; error?: string }> = [];
  let totalContent = '';
  
  for (const filePath of filePaths) {
    const result = await cat(filePath, options);
    const parsed = JSON.parse(result);
    
    if (parsed.success) {
      results.push({
        path: filePath,
        content: parsed.contentPreview,
        success: true
      });
      totalContent += parsed.contentPreview;
    } else {
      results.push({
        path: filePath,
        content: '',
        success: false,
        error: parsed.error
      });
    }
  }
  
  // Return structured result
  return JSON.stringify({
    success: true,
    filesProcessed: results.length,
    filesSuccessful: results.filter(r => r.success).length,
    filesFailed: results.filter(r => !r.success).length,
    results: results,
    totalContentLength: Buffer.byteLength(totalContent, 'utf8'),
    contentPreview: truncateOutput(totalContent, 10000),
    message: results.filter(r => !r.success).length > 0
      ? `Processed ${results.length} files: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed.`
      : `Successfully processed ${results.length} files.`
  }, null, 2);
}

/**
 * Check if a path is a symbolic link.
 */
export function isSymlink(filePath: string): boolean {
  try {
    return fs.lstatSync(filePath).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Get the target of a symbolic link.
 */
export function getSymlinkTarget(filePath: string): string | null {
  try {
    if (isSymlink(filePath)) {
      return fs.readlinkSync(filePath);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

// ===================== READ FILE =====================

export interface ReadFileOptions {
  encoding?: string;
  maxBytes?: number; // Maximum bytes to read (default: 10MB)
  detectEncoding?: boolean; // Auto-detect encoding (default: true)
  trimWhitespace?: boolean; // Trim leading/trailing whitespace (default: false)
  lineRange?: { start: number; end: number }; // Read specific line range (1-indexed)
  dryRun?: boolean; // DRY-RUN: preview without reading
}

/**
 * Auto-detect file encoding from binary content.
 * Returns 'utf8', 'ascii', 'base64', or 'binary'.
 */
function detectEncoding(content: Buffer): string {
  // Check for UTF-8 BOM
  if (content.length >= 3 && content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
    return 'utf8';
  }
  
  // Check for UTF-16 BOM
  if (content.length >= 2 && content[0] === 0xFF && content[1] === 0xFE) {
    return 'utf16le';
  }
  if (content.length >= 2 && content[0] === 0xFE && content[1] === 0xFF) {
    return 'utf16be';
  }
  
  // Check if content is valid UTF-8
  try {
    const text = content.toString('utf8');
    // If all bytes are valid UTF-8, it's UTF-8
    const reencoded = Buffer.from(text, 'utf8');
    if (reencoded.equals(content)) {
      return 'utf8';
    }
  } catch {
    // Not valid UTF-8
  }
  
  // Check for ASCII
  let isAscii = true;
  for (let i = 0; i < Math.min(content.length, 1024); i++) {
    if (content[i] > 127) {
      isAscii = false;
      break;
    }
  }
  
  return isAscii ? 'ascii' : 'binary';
}

/**
 * Check if a file is text-based (readable as text).
 */
function isTextFile(filePath: string): boolean {
  try {
    const fs = require('fs');
    const buffer = fs.readFileSync(filePath);
    
    // Check for null bytes (indicates binary)
    for (let i = 0; i < Math.min(buffer.length, 8192); i++) {
      if (buffer[i] === 0) {
        return false;
      }
    }
    
    // Check if content is valid UTF-8
    try {
      const text = buffer.toString('utf8');
      const reencoded = Buffer.from(text, 'utf8');
      if (reencoded.equals(buffer)) {
        return true;
      }
    } catch {
      return false;
    }
    
    return false;
  } catch {
    return false;
  }
}

function isBinaryDocument(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  
  const binaryDocs = new Set([
    // Office documents
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.odt', '.ods', '.odp', '.odg',
    '.numbers', '.pages', '.key',
    // PDF
    '.pdf',
    // E-books
    '.epub', '.mobi', '.azw', '.azw3', '.fb2',
    // Rich text
    '.rtf',
  ]);
  
  return binaryDocs.has(ext);
}

/**
 * Read a file with maximum size limit.
 */
async function readFileLimited(
  filePath: string,
  maxBytes: number,
  encoding: BufferEncoding = 'utf8'
): Promise<{ content: string; truncated: boolean }> {
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  
  if (fileSize === 0) {
    return { content: '', truncated: false };
  }
  
  // If file is smaller than maxBytes, read entirely
  if (fileSize <= maxBytes) {
    const content = fs.readFileSync(filePath, encoding);
    return { content: content.toString(), truncated: false };
  }
  
  // Otherwise, read up to maxBytes
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(maxBytes);
  const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, 0);
  fs.closeSync(fd);
  
  const content = buffer.slice(0, bytesRead).toString(encoding);
  return { content, truncated: true };
}

/**
 * Read a file with broad compatibility for text, code, and document files.
 * Returns structured JSON for LM Studio model parsing.
 */
export async function readFile(
  filePath: string,
  options: ReadFileOptions = {}
): Promise<string> {
  const resolvedPath = path.resolve(filePath);
  const encoding = options.encoding || 'utf8';
  const maxBytes = options.maxBytes || 10 * 1024 * 1024; // Default: 10MB
  
  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    return JSON.stringify({
      success: false,
      error: `File not found: ${resolvedPath}`,
      hint: 'Verify the file path is correct and the file exists.'
    }, null, 2);
  }
  
  // Check if it's a directory
  const stats = fs.statSync(resolvedPath);
  if (stats.isDirectory()) {
    return JSON.stringify({
      success: false,
      error: `Path is a directory, not a file: ${resolvedPath}`,
      hint: 'Provide a file path, not a directory.'
    }, null, 2);
  }
  
  const fileSize = stats.size;
  
  // DRY-RUN MODE: Return preview without reading
  if (options.dryRun) {
    return JSON.stringify({
      would_read: true,
      path: resolvedPath,
      file_size_bytes: fileSize,
      file_type: isTextFile(resolvedPath) ? 'text' : isBinaryDocument(resolvedPath) ? 'document' : 'binary',
      is_text_file: isTextFile(resolvedPath),
      is_binary_document: isBinaryDocument(resolvedPath),
      content_hash: crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex'),
      message: 'Dry-run mode: no file was read. Re-call with dryRun: false to apply.'
    }, null, 2);
  }
  
  try {
    let result: { content: string; truncated: boolean; encoding: string; fileType: string; fileHash?: string; note?: string };
    
    if (isTextFile(resolvedPath)) {
      // Text/code file - read as text
      const { content, truncated } = await readFileLimited(resolvedPath, maxBytes, 'utf8');
      
      // BUG 1 FIX: Use actual newline characters (\n) instead of literal backslash-n
      // Apply line range if specified
      let finalContent = content;
      if (options.lineRange) {
        const lines = content.split('\n');
        const start = Math.max(1, options.lineRange.start);
        const end = options.lineRange.end ? Math.min(lines.length, options.lineRange.end) : lines.length;
        finalContent = lines.slice(start - 1, end).join('\n');
      }
      
      // Trim whitespace if requested
      if (options.trimWhitespace) {
        finalContent = finalContent.trim();
      }
      
      result = {
        content: finalContent,
        truncated,
        encoding: 'utf8',
        fileType: 'text'
      };
    } else if (isBinaryDocument(resolvedPath)) {
      // Binary document - attempt to read, may need special handling
      try {
        const { content, truncated } = await readFileLimited(resolvedPath, maxBytes, 'utf8');
        
        // Check if it's actually text despite the extension
        if (isTextFile(resolvedPath)) {
          result = {
            content,
            truncated,
            encoding: 'utf8',
            fileType: 'document-text'
          };
        } else {
          // Binary document detected
          const fileHash = crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex');
          const contentPreview = content.substring(0, 1000);
          
          result = {
            content: contentPreview,
            truncated: contentPreview.length < content.length,
            encoding: 'binary',
            fileType: 'document-binary',
            fileHash,
            note: 'This is a binary document file. For full content, consider using specialized tools (e.g., PDF parser, DOCX reader).'
          };
        }
      } catch (err) {
        // If UTF-8 reading fails, read as binary
        const fileHash = crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex');
        const content = fs.readFileSync(resolvedPath, 'base64');
        
        result = {
          content: content,
          truncated: false,
          encoding: 'base64',
          fileType: 'document-binary',
          fileHash,
          note: 'File read as base64-encoded binary. Use a specialized reader for this file type.'
        };
      }
    } else {
      // Unknown file type - attempt UTF-8 first, fall back to binary
      try {
        const { content, truncated } = await readFileLimited(resolvedPath, maxBytes, 'utf8');
        result = {
          content,
          truncated,
          encoding: 'utf8',
          fileType: 'unknown-text'
        };
      } catch {
        // Fall back to binary
        const content = fs.readFileSync(resolvedPath, 'base64');
        const fileHash = crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex');
        
        result = {
          content: content,
          truncated: false,
          encoding: 'base64',
          fileType: 'unknown-binary',
          fileHash,
          note: 'File could not be read as text. Read as base64-encoded binary instead.'
        };
      }
    }
    
    const contentLength = Buffer.byteLength(result.content, 'utf8');
    const fileHash = crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex');
    
    return JSON.stringify({
      success: true,
      path: resolvedPath,
      fileSizeBytes: fileSize,
      contentLengthBytes: contentLength,
      encoding: result.encoding,
      fileType: result.fileType,
      isTextFile: isTextFile(resolvedPath),
      isBinaryDocument: isBinaryDocument(resolvedPath),
      truncated: result.truncated,
      maxBytesLimit: maxBytes,
      contentPreview: truncateOutput(result.content, 10000),
      contentHash: fileHash,
      note: result.note || undefined
    }, null, 2);
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as any).code;
    
    let errorMessage = `Error reading file '${resolvedPath}': ${errMsg}`;
    if (code === 'EACCES' || code === 'EPERM') {
      errorMessage += '\nHint: Permission denied. Check file permissions.';
    } else if (code === 'ENOENT') {
      errorMessage += '\nHint: File does not exist.';
    }
    
    return JSON.stringify({ success: false, error: errorMessage }, null, 2);
  }
}

/**
 * Read a file and return just the content as a string (simplified interface).
 */
export async function readFileSimple(
  filePath: string,
  options: Pick<ReadFileOptions, 'encoding' | 'maxBytes' | 'lineRange'> = {}
): Promise<string> {
  const result = await readFile(filePath, options);
  const parsed = JSON.parse(result);
  
  if (!parsed.success) {
    throw new Error(parsed.error);
  }
  
  return parsed.contentPreview;
}
