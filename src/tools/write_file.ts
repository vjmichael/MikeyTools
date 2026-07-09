import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { truncateOutput } from './truncator';

// ===================== FILE TYPE SUPPORT =====================

export interface FileTypeConfig {
  extensions: string[];
  encoding: BufferEncoding;
  isBinary: boolean;
  description: string;
}

const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  // Code files
  'ts': { extensions: ['.ts', '.tsx'], encoding: 'utf8', isBinary: false, description: 'TypeScript' },
  'js': { extensions: ['.js', '.jsx'], encoding: 'utf8', isBinary: false, description: 'JavaScript' },
  'py': { extensions: ['.py', '.pyw'], encoding: 'utf8', isBinary: false, description: 'Python' },
  'java': { extensions: ['.java'], encoding: 'utf8', isBinary: false, description: 'Java' },
  'cpp': { extensions: ['.cpp', '.cxx', '.cc', '.c++'], encoding: 'utf8', isBinary: false, description: 'C++' },
  'c': { extensions: ['.c'], encoding: 'utf8', isBinary: false, description: 'C' },
  'h': { extensions: ['.h', '.hpp', '.hxx'], encoding: 'utf8', isBinary: false, description: 'C/C++ Header' },
  'cs': { extensions: ['.cs'], encoding: 'utf8', isBinary: false, description: 'C#' },
  'go': { extensions: ['.go'], encoding: 'utf8', isBinary: false, description: 'Go' },
  'rs': { extensions: ['.rs'], encoding: 'utf8', isBinary: false, description: 'Rust' },
  'swift': { extensions: ['.swift'], encoding: 'utf8', isBinary: false, description: 'Swift' },
  'kt': { extensions: ['.kt', '.kts'], encoding: 'utf8', isBinary: false, description: 'Kotlin' },
  'rb': { extensions: ['.rb', '.rbw'], encoding: 'utf8', isBinary: false, description: 'Ruby' },
  'php': { extensions: ['.php', '.php3', '.php4', '.php5'], encoding: 'utf8', isBinary: false, description: 'PHP' },
  'html': { extensions: ['.html', '.htm'], encoding: 'utf8', isBinary: false, description: 'HTML' },
  'css': { extensions: ['.css'], encoding: 'utf8', isBinary: false, description: 'CSS' },
  'xml': { extensions: ['.xml'], encoding: 'utf8', isBinary: false, description: 'XML' },
  'json': { extensions: ['.json'], encoding: 'utf8', isBinary: false, description: 'JSON' },
  'yaml': { extensions: ['.yaml', '.yml'], encoding: 'utf8', isBinary: false, description: 'YAML' },
  'toml': { extensions: ['.toml'], encoding: 'utf8', isBinary: false, description: 'TOML' },
  'ini': { extensions: ['.ini', '.cfg', '.conf'], encoding: 'utf8', isBinary: false, description: 'INI/Config' },
  'sql': { extensions: ['.sql'], encoding: 'utf8', isBinary: false, description: 'SQL' },
  'sh': { extensions: ['.sh', '.bash', '.zsh'], encoding: 'utf8', isBinary: false, description: 'Shell Script' },
  'ps1': { extensions: ['.ps1', '.psd1', '.psm1'], encoding: 'utf8', isBinary: false, description: 'PowerShell' },
  'md': { extensions: ['.md', '.markdown'], encoding: 'utf8', isBinary: false, description: 'Markdown' },
  'txt': { extensions: ['.txt', '.text'], encoding: 'utf8', isBinary: false, description: 'Text' },
  'csv': { extensions: ['.csv'], encoding: 'utf8', isBinary: false, description: 'CSV' },
  'svg': { extensions: ['.svg'], encoding: 'utf8', isBinary: false, description: 'SVG' },
  'pdf': { extensions: ['.pdf'], encoding: 'binary', isBinary: true, description: 'PDF' },
  'docx': { extensions: ['.docx'], encoding: 'binary', isBinary: true, description: 'DOCX' },
  'pptx': { extensions: ['.pptx'], encoding: 'binary', isBinary: true, description: 'PPTX' },
  'xlsx': { extensions: ['.xlsx'], encoding: 'binary', isBinary: true, description: 'XLSX' },
  'png': { extensions: ['.png'], encoding: 'binary', isBinary: true, description: 'PNG' },
  'jpg': { extensions: ['.jpg', '.jpeg'], encoding: 'binary', isBinary: true, description: 'JPEG' },
  'gif': { extensions: ['.gif'], encoding: 'binary', isBinary: true, description: 'GIF' },
  'webp': { extensions: ['.webp'], encoding: 'binary', isBinary: true, description: 'WebP' },
  'mp4': { extensions: ['.mp4'], encoding: 'binary', isBinary: true, description: 'MP4' },
  'avi': { extensions: ['.avi'], encoding: 'binary', isBinary: true, description: 'AVI' },
  'mov': { extensions: ['.mov'], encoding: 'binary', isBinary: true, description: 'MOV' },
  'mp3': { extensions: ['.mp3'], encoding: 'binary', isBinary: true, description: 'MP3' },
  'wav': { extensions: ['.wav'], encoding: 'binary', isBinary: true, description: 'WAV' },
  'zip': { extensions: ['.zip'], encoding: 'binary', isBinary: true, description: 'ZIP' },
  'tar': { extensions: ['.tar'], encoding: 'binary', isBinary: true, description: 'TAR' },
  'gz': { extensions: ['.gz', '.tgz'], encoding: 'binary', isBinary: true, description: 'GZIP' },
  'default': { extensions: [], encoding: 'utf8', isBinary: false, description: 'Default' }
};

function getFileTypeConfig(filePath: string): FileTypeConfig {
  const ext = path.extname(filePath).toLowerCase();
  for (const [key, config] of Object.entries(FILE_TYPE_CONFIGS)) {
    if (key !== 'default' && config.extensions.includes(ext)) {
      return config;
    }
  }
  return FILE_TYPE_CONFIGS.default;
}

function getSupportedExtensions(): string[] {
  const extensions = new Set<string>();
  for (const config of Object.values(FILE_TYPE_CONFIGS)) {
    for (const ext of config.extensions) {
      extensions.add(ext);
    }
  }
  return Array.from(extensions).sort();
}

function formatSupportedExtensions(): string {
  const extensions = getSupportedExtensions();
  const first20 = extensions.slice(0, 20).join(', ');
  const remainder = extensions.length > 20 ? `... and ${extensions.length - 20} more` : '';
  return first20 + (remainder ? ' ' + remainder : '');
}

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
      new_content_preview: truncateOutput(content, 1000),
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
      appended_content_preview: truncateOutput(content, 1000),
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
