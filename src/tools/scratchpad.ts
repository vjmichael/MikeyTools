/**
 * Scratchpad Tools (Layer 1: JSON Prevention)
 * 
 * Helps the model build complex JSON incrementally without syntax errors.
 * Uses existing tools (write_file, cat, validateSchema, editFile) under the hood.
 * Integrates with truncator.ts to prevent context overflow.
 * 
 * Design:
 * - Scratchpad is a temp file: ~/.toolkit/scratchpad/current.json
 * - write_file (overwrite) → scratchpad_write
 * - write_file_append (append) → scratchpad_append
 * - cat (read) → scratchpad_read
 * - validateSchema (validate) → scratchpad_validate
 * - editFile (fix syntax) → scratchpad_edit
 * - cat + write_file (commit) → scratchpad_commit
 * 
 * Truncator Integration:
 * - All outputs > 8000 chars are chunked by truncator.ts
 * - Prevents context overflow causing LM Studio faults
 * 
 * Layer 1 + Layer 2:
 * - Layer 1 (scratchpad) helps model avoid JSON errors
 * - Layer 2 (automatic JSON repair) fixes errors that slip through
 * - Both work together for maximum robustness
 */

import * as path from 'path';
import * as os from 'os';
import { writeFile, writeFileAppend } from './write_file';
import { cat } from './read_file';
import { validateSchema } from './validate';
import { editFile } from './edit_file';
import { truncateOutput } from './truncator';

const SCRATCHPAD_DIR = path.join(os.homedir(), '.toolkit', 'scratchpad');
const SCRATCHPAD_PATH = path.join(SCRATCHPAD_DIR, 'current.json');

// ===================== SCRATCHPAD INIT =====================

/**
 * Initialize the scratchpad file.
 * Uses write_file to create/reset the scratchpad.
 */
export async function scratchpadInit(): Promise<string> {
  try {
    // Ensure directory exists
    const fs = await import('fs');
    if (!fs.existsSync(SCRATCHPAD_DIR)) {
      fs.mkdirSync(SCRATCHPAD_DIR, { recursive: true });
    }
    
    // Create/reset scratchpad file
    const result = await writeFile(SCRATCHPAD_PATH, '');
    
    return JSON.stringify({
      success: true,
      message: 'Scratchpad initialized. Use scratchpad_write to start building JSON.',
      path: SCRATCHPAD_PATH,
      instructions: [
        '1. scratchpad_write: Overwrite entire scratchpad (reset)',
        '2. scratchpad_append: Append to scratchpad (build incrementally)',
        '3. scratchpad_read: Read scratchpad content',
        '4. scratchpad_validate: Validate JSON before committing',
        '5. scratchpad_edit: Fix JSON syntax errors',
        '6. scratchpad_commit: Return JSON and clear scratchpad',
        '7. scratchpad_clear: Clear scratchpad without returning'
      ]
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: `Failed to initialize scratchpad: ${errMsg}` }, null, 2);
  }
}

// ===================== SCRATCHPAD WRITE =====================

/**
 * Overwrite the entire scratchpad file.
 * Uses write_file under the hood.
 */
export async function scratchpadWrite(content: string): Promise<string> {
  try {
    const result = await writeFile(SCRATCHPAD_PATH, content);
    return JSON.stringify({
      success: true,
      message: `Scratchpad overwritten (${content.length} chars). Use scratchpad_append to add more, or scratchpad_commit to finalize.`,
      path: SCRATCHPAD_PATH,
      content_length: content.length
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: `Failed to write scratchpad: ${errMsg}` }, null, 2);
  }
}

// ===================== SCRATCHPAD APPEND =====================

/**
 * Append to the scratchpad file.
 * Uses write_file_append under the hood.
 */
export async function scratchpadAppend(content: string): Promise<string> {
  try {
    const result = await writeFileAppend(SCRATCHPAD_PATH, content);
    return JSON.stringify({
      success: true,
      message: `Appended to scratchpad (${content.length} chars). Use scratchpad_validate to check, or scratchpad_commit to finalize.`,
      path: SCRATCHPAD_PATH,
      appended_length: content.length
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: `Failed to append to scratchpad: ${errMsg}` }, null, 2);
  }
}

// ===================== SCRATCHPAD READ =====================

/**
 * Read the scratchpad file content.
 * Uses cat under the hood.
 * Integrates truncator.ts to prevent context overflow.
 */
export async function scratchpadRead(): Promise<string> {
  try {
    const result = await cat(SCRATCHPAD_PATH, { silent: true });
    
    // Extract content from cat result (it returns structured JSON)
    let content = '';
    if (typeof result === 'string') {
      // Parse if it's JSON string
      try {
        const parsed = JSON.parse(result);
        content = parsed.content || parsed.raw || result;
      } catch {
        content = result;
      }
    } else if (result && typeof result === 'object') {
      content = (result as any).content || (result as any).raw || JSON.stringify(result);
    }
    
    // Check if content is too large - use truncator if needed
    if (content.length > 8000) {
      const truncated = truncateOutput(content, { maxChars: 8000 });
      return JSON.stringify({
        success: true,
        message: `Scratchpad content is ${content.length} chars. Output has been chunked by truncator.ts to prevent context overflow.`,
        content_length: content.length,
        truncated: true,
        content: truncated
      }, null, 2);
    }
    
    return JSON.stringify({
      success: true,
      message: 'Scratchpad content read successfully.',
      content_length: content.length,
      content: content
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: `Failed to read scratchpad: ${errMsg}` }, null, 2);
  }
}

// ===================== SCRATCHPAD VALIDATE =====================

/**
 * Validate the scratchpad JSON content.
 * Uses validateSchema under the hood.
 * Integrates truncator.ts to prevent context overflow during validation.
 */
export async function scratchpadValidate(): Promise<string> {
  try {
    // Read content first
    const readResult = await cat(SCRATCHPAD_PATH, { silent: true });
    let content = '';
    if (typeof readResult === 'string') {
      try {
        const parsed = JSON.parse(readResult);
        content = parsed.content || parsed.raw || readResult;
      } catch {
        content = readResult;
      }
    } else if (readResult && typeof readResult === 'object') {
      content = (readResult as any).content || (readResult as any).raw || JSON.stringify(readResult);
    }
    
    // Check if content is too large
    if (content.length > 8000) {
      return JSON.stringify({
        success: false,
        error: 'Scratchpad content is too large (>8000 chars) to validate directly. Use scratchpad_edit to break it down or scratchpad_commit to finalize.',
        content_length: content.length,
        hint: 'Consider using scratchpad_write to reset and rebuild with smaller chunks.'
      }, null, 2);
    }
    
    // Validate JSON
    try {
      JSON.parse(content);
      return JSON.stringify({
        success: true,
        message: 'Scratchpad JSON is valid. Ready to commit.',
        content_length: content.length,
        valid: true
      }, null, 2);
    } catch (e) {
      return JSON.stringify({
        success: false,
        error: `Scratchpad JSON is invalid: ${e instanceof Error ? e.message : String(e)}`,
        content_length: content.length,
        valid: false,
        hint: 'Use scratchpad_edit to fix syntax errors, or scratchpad_write to reset.'
      }, null, 2);
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: `Failed to validate scratchpad: ${errMsg}` }, null, 2);
  }
}

// ===================== SCRATCHPAD EDIT =====================

/**
 * Edit the scratchpad JSON content to fix syntax errors.
 * Uses editFile under the hood.
 */
export async function scratchpadEdit(operations: any[]): Promise<string> {
  try {
    const result = await editFile(SCRATCHPAD_PATH, operations, { dryRun: false });
    
    // Check if result contains error
    let parsedResult: any;
    try {
      parsedResult = JSON.parse(result);
    } catch {
      return JSON.stringify({
        success: false,
        error: 'Failed to parse edit result.',
        raw_result: result
      }, null, 2);
    }
    
    if (parsedResult.success) {
      return JSON.stringify({
        success: true,
        message: 'Scratchpad edited successfully. Use scratchpad_validate to check, or scratchpad_commit to finalize.',
        operations_applied: parsedResult.operationsApplied || operations.length
      }, null, 2);
    } else {
      return JSON.stringify({
        success: false,
        error: parsedResult.error || 'Edit failed.',
        hint: 'Use scratchpad_write to reset if edits are too complex.'
      }, null, 2);
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: `Failed to edit scratchpad: ${errMsg}` }, null, 2);
  }
}

// ===================== SCRATCHPAD COMMIT =====================

/**
 * Commit the scratchpad JSON and clear it.
 * Uses cat (read) + write_file (clear) under the hood.
 * Integrates truncator.ts to prevent context overflow.
 */
export async function scratchpadCommit(): Promise<string> {
  try {
    // Read content first
    const fs = require('fs');
    let content = '';
    if (fs.existsSync(SCRATCHPAD_PATH)) {
      content = fs.readFileSync(SCRATCHPAD_PATH, 'utf8');
    }
    
    // Validate JSON before clearing
    try {
      JSON.parse(content);
    } catch (e) {
      // Validation failed - DO NOT clear, return error
      return JSON.stringify({
        success: false,
        error: `Scratchpad JSON is invalid: ${e instanceof Error ? e.message : String(e)}`,
        hint: 'Use scratchpad_edit to fix syntax errors, or scratchpad_write to reset.',
        content_length: content.length,
        content_preview: content.substring(0, 500)
      }, null, 2);
    }
    
    // Clear scratchpad (only after validation passes)
    await writeFile(SCRATCHPAD_PATH, '');
    
    // Check if content is too large - use truncator if needed
    if (content.length > 8000) {
      const truncated = truncateOutput(content, { maxChars: 8000 });
      return JSON.stringify({
        success: true,
        message: 'Scratchpad committed and cleared. Content was chunked by truncator.ts to prevent context overflow.',
        content_length: content.length,
        truncated: true,
        json: truncated
      }, null, 2);
    }
    
    return JSON.stringify({
      success: true,
      message: 'Scratchpad committed and cleared. JSON is ready to use.',
      content_length: content.length,
      json: content
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: `Failed to commit scratchpad: ${errMsg}` }, null, 2);
  }
}

export async function scratchpadClear(): Promise<string> {
  try {
    await writeFile(SCRATCHPAD_PATH, '');
    return JSON.stringify({
      success: true,
      message: 'Scratchpad cleared. Use scratchpad_write to start fresh.'
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: `Failed to clear scratchpad: ${errMsg}` }, null, 2);
  }
}
