/**
 * JSON Repair Utility for LM Studio Plugin
 * 
 * Prevents JSON syntax breakage from the model's output (input side).
 * Provides both a standalone repair tool and automatic repair at the tool dispatch layer.
 * 
 * Design:
 * - Hand-rolled bracket/quote balancing (no external dependencies)
 * - Attempts multiple repair strategies in order of sophistication
 * - Logs repair attempts for visibility/debugging
 * - Returns structured error messages when repair fails
 * 
 * This is Layer 2 of the JSON syntax breakage fix:
 * - Layer 1: scratchpad tools (long-term, ergonomic)
 * - Layer 2: JSON parse-and-repair at tool dispatch (built first, safety net)
 */

export interface RepairResult {
  success: boolean;
  repaired?: string;
  original_length?: number;
  repaired_length?: number;
  repairs_applied?: string[];
  error?: string;
  suggestions?: string[];
}

export interface RepairOptions {
  logRepairs?: boolean;
  maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Attempt to repair a malformed JSON string.
 * 
 * Strategies (in order):
 * 1. Direct JSON.parse (if already valid)
 * 2. Remove trailing commas before } or ]
 * 3. Balance unbalanced brackets/braces/quotes
 * 4. Fix common escape sequence issues
 * 5. Wrap partial JSON in proper structure
 * 
 * @param input - The potentially malformed JSON string
 * @param options - Repair options
 * @returns RepairResult with success status and details
 */
export function repairJSON(
  input: string,
  options: RepairOptions = {}
): RepairResult {
  const { logRepairs = false, maxAttempts = DEFAULT_MAX_ATTEMPTS } = options;
  const repairsApplied: string[] = [];

  // Strategy 1: Already valid JSON
  try {
    JSON.parse(input);
    return {
      success: true,
      repaired: input,
      original_length: input.length,
      repaired_length: input.length,
      repairs_applied: []
    };
  } catch {
    // Not valid - continue to repair strategies
  }

  let current = input;

  // Strategy 2: Remove trailing commas (very common issue)
  const beforeTrailing = current;
  current = current.replace(/,\s*([}\]])/g, '$1');
  if (current !== beforeTrailing) {
    repairsApplied.push('removed_trailing_commas');
    // Check if repair succeeded
    try { JSON.parse(current); return { success: true, repaired: current, original_length: input.length, repaired_length: current.length, repairs_applied: repairsApplied }; } catch {}
  }

  // Strategy 3: Balance brackets/braces/quotes
  const beforeBalance = current;
  current = balanceBrackets(current);
  if (current !== beforeBalance) {
    repairsApplied.push('balanced_brackets');
    // Check if repair succeeded
    try { JSON.parse(current); return { success: true, repaired: current, original_length: input.length, repaired_length: current.length, repairs_applied: repairsApplied }; } catch {}
  }

  // Strategy 4: Fix escape sequences
  const beforeEscape = current;
  current = fixEscapeSequences(current);
  if (current !== beforeEscape) {
    repairsApplied.push('fixed_escape_sequences');
    // Check if repair succeeded
    try { JSON.parse(current); return { success: true, repaired: current, original_length: input.length, repaired_length: current.length, repairs_applied: repairsApplied }; } catch {}
  }

  // Strategy 5: Wrap partial JSON
  const beforeWrap = current;
  current = wrapPartialJSON(current);
  if (current !== beforeWrap) {
    repairsApplied.push('wrapped_partial_json');
  }

  // Final validation
  try {
    JSON.parse(current);
    return {
      success: true,
      repaired: current,
      original_length: input.length,
      repaired_length: current.length,
      repairs_applied: repairsApplied
    };
  } catch (e) {
    // Repair failed - provide helpful error
    return {
      success: false,
      original_length: input.length,
      repaired_length: current.length,
      repairs_applied: repairsApplied,
      error: `JSON repair failed after ${repairsApplied.length} strategies. String may be too malformed to repair automatically.`,
      suggestions: getSuggestions(input, current)
    };
  }
}

/**
 * Balance unbalanced brackets, braces, and quotes.
 * Works by scanning left-to-right and adding missing closing characters.
 */
function balanceBrackets(input: string): string {
  const stack: { char: string; index: number }[] = [];
  let result = input;
  let offset = 0;

  // First pass: find all brackets and track stack
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if (char === '"' || char === "'" || char === '`') {
      // Skip strings (simplified - doesn't handle escaped quotes inside strings)
      let j = i + 1;
      while (j < input.length && input[j] !== char) {
        if (input[j] === '\\') j++; // Skip escaped character
        j++;
      }
      i = j;
      continue;
    }

    if (char === '[' || char === '{' || char === '(') {
      stack.push({ char, index: i + offset });
    } else if (
      (char === ']' && stack[stack.length - 1]?.char === '[') ||
      (char === '}' && stack[stack.length - 1]?.char === '{') ||
      (char === ')' && stack[stack.length - 1]?.char === '(')
    ) {
      stack.pop();
    }
  }

  // Add missing closing brackets in reverse order
  const missing: string[] = [];
  while (stack.length > 0) {
    const top = stack.pop()!;
    switch (top.char) {
      case '[': missing.push(']'); break;
      case '{': missing.push('}'); break;
      case '(': missing.push(')'); break;
    }
  }

  if (missing.length > 0) {
    result = result + missing.reverse().join('');
    offset += missing.join('').length;
  }

  return result;
}

/**
 * Fix common escape sequence issues.
 */
function fixEscapeSequences(input: string): string {
  let result = input;

  // Fix unescaped newlines in strings (common in model output)
  result = result.replace(/"([^"\\]|\\.)*?(\n)/g, (match, content, newline) => {
    return match.replace(/\n/g, '\\n');
  });

  // Fix unescaped control characters
  result = result.replace(/[\x00-\x1f]/g, (char) => {
    return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
  });

  return result;
}

/**
 * Wrap partial JSON in proper structure.
 * Handles cases where the model outputs only part of the JSON.
 */
function wrapPartialJSON(input: string): string {
  const trimmed = input.trim();
  
  // If starts with { but missing closing }
  if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
    return trimmed + '}';
  }
  
  // If starts with [ but missing closing ]
  if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
    return trimmed + ']';
  }
  
  // If missing opening { or [
  if (trimmed.endsWith('}') || trimmed.endsWith(']')) {
    const openChar = trimmed.endsWith('}') ? '{' : '[';
    const closeChar = trimmed.endsWith('}') ? '}' : ']';
    return openChar + trimmed + closeChar;
  }

  return input;
}

/**
 * Generate helpful suggestions for manual repair.
 */
function getSuggestions(input: string, repaired: string): string[] {
  const suggestions: string[] = [];

  // Check for common issues
  if (input.includes('\\n') && !input.includes('\\n')) {
    suggestions.push('Check for unescaped newlines in string values');
  }
  
  if (input.match(/,\s*[,}]/)) {
    suggestions.push('Remove double commas or trailing comma before closing bracket');
  }
  
  if (input.split('{').length !== input.split('}').length) {
    suggestions.push('Unbalanced braces: add missing } characters');
  }
  
  if (input.split('[').length !== input.split(']').length) {
    suggestions.push('Unbalanced brackets: add missing ] characters');
  }
  
  if (input.split('"').length % 2 !== 0) {
    suggestions.push('Unbalanced quotes: check for missing or extra " characters');
  }

  // If repair was close to success, show the repaired version
  if (repaired !== input) {
    suggestions.push(`Partial repair applied. Try this: ${repaired.substring(0, 200)}...`);
  }

  return suggestions;
}

/**
 * Create a JSON repair tool implementation.
 * This can be registered as a tool that the model calls when it detects JSON issues.
 */
export function createJSONRepairTool() {
  return async (params: { json_string: string; options?: RepairOptions }): Promise<string> => {
    const { json_string, options } = params;
    const result = repairJSON(json_string, options);
    return JSON.stringify(result, null, 2);
  };
}

/**
 * Wrapper function for automatic JSON repair at the tool dispatch layer.
 * 
 * Usage:
 *   const wrappedImpl = withJSONRepair(async (params) => { ... });
 *   
 * @param impl - The original tool implementation
 * @param options - Repair options
 * @returns Wrapped implementation that attempts JSON repair on malformed input
 */
export function withJSONRepair(
  impl: (params: any) => Promise<string>,
  options: RepairOptions = {}
): (params: any) => Promise<string> {
  return async (params: any): Promise<string> => {
    try {
      return await impl(params);
    } catch (error) {
      // If the error is related to JSON parsing, attempt repair
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('JSON') || errMsg.includes('parse')) {
        // Try to extract and repair the JSON string
        const jsonMatch = errMsg.match(/Unexpected token (\S+) in JSON at position (\d+)/);
        if (jsonMatch) {
          const repairResult = repairJSON(params.input || String(params), options);
          if (repairResult.success) {
            // Retry with repaired JSON
            return impl(repairResult.repaired as any);
          }
        }
      }
      // Re-throw if not a JSON error or repair failed
      throw error;
    }
  };
}
