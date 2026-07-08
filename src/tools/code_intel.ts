/**
 * Code Intelligence Tool for LM Studio Plugin
 * 
 * Provides symbol-level code navigation using tree-sitter.
 * Supports Python, JavaScript, TypeScript, and other common languages.
 * 
 * NOTE: tree-sitter native dependencies are currently excluded to allow
 * compilation on systems without a C++ build toolchain. This module
 * falls back to grep-based searching.
 */

import * as fs from 'fs';
import { findFiles } from './utils';
import * as path from 'path';

export interface SymbolResult {
  success: boolean;
  symbol?: string;
  file?: string;
  line?: number;
  column?: number;
  error?: string;
}

export interface ReferenceResult {
  success: boolean;
  references?: Array<{
    file: string;
    line: number;
    column: number;
    snippet: string;
  }>;
  error?: string;
}

/**
 * Finds the definition of a symbol.
 */
export async function findSymbol(
  symbol: string,
  directory: string,
  language: string = 'python',
  caseInsensitive: boolean = false
): Promise<SymbolResult> {
  try {
    // Find all files
    // BUG-FIX: Await async findFiles
    const files = await findFiles(directory, `*.${language === 'python' ? 'py' : language === 'javascript' || language === 'typescript' ? 'js,jsx,ts,tsx' : 'c,h,cpp,hpp'}`);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Fallback to grep for performance in this phase
      const grepResult = await grepSymbol(file, symbol, true, caseInsensitive);
      if (grepResult) {
        return {
          success: true,
          symbol: symbol,
          file: file,
          line: grepResult.line,
          column: grepResult.column
        };
      }
    }

    return { success: false, error: `Symbol '${symbol}' not found in '${directory}'` };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Finds references to a symbol.
 */
export async function getReferences(
  symbol: string,
  directory: string,
  language: string = 'python',
  caseInsensitive: boolean = false
): Promise<ReferenceResult> {
  try {
    // BUG-FIX: Await async findFiles
    const files = await findFiles(directory, `*.${language === 'python' ? 'py' : language === 'javascript' || language === 'typescript' ? 'js,jsx,ts,tsx' : 'c,h,cpp,hpp'}`);
    const references = [];

    for (const file of files) {
      const grepResult = await grepSymbol(file, symbol, true, caseInsensitive);
      if (grepResult) {
        references.push({
          file: file,
          line: grepResult.line,
          column: grepResult.column,
          snippet: grepResult.snippet
        });
      }
    }

    return {
      success: true,
      references: references
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMsg };
  }
}

/**
 * Helper to grep for a symbol in a file.
 * BUG-08 FIX: Added caseInsensitive parameter for flexible searching.
 */
async function grepSymbol(file: string, symbol: string, includeSnippet: boolean = false, caseInsensitive: boolean = false): Promise<{ line: number; column: number; snippet: string } | null> {
  return new Promise((resolve) => {
    const fileContent = fs.readFileSync(file, 'utf8');
    const lines = fileContent.split('\n');
    const searchSymbol = caseInsensitive ? symbol.toLowerCase() : symbol;
    
    for (let i = 0; i < lines.length; i++) {
      const lineContent = caseInsensitive ? lines[i].toLowerCase() : lines[i];
      const idx = lineContent.indexOf(searchSymbol);
      if (idx !== -1) {
        resolve({
          line: i + 1,
          column: idx,
          snippet: includeSnippet ? lines[i] : ''
        });
        return;
      }
    }
    resolve(null);
  });
}