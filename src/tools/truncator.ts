/**
 * Truncator utility for LM Studio plugin
 * 
 * Prevents tool outputs from exceeding LM Studio's JSON serialization limits,
 * which causes the "JSON escaping bug" where tool call results appear to vanish.
 * 
 * Design:
 * - Default max output: 8000 chars — if exceeded, output is chunked
 * - Chunks are ~4000 chars each with numbered headers
 * - For JSON outputs: tries to preserve structure while chunking string fields
 * - For non-JSON outputs: splits into numbered segments
 * - Always returns valid JSON
 */

export interface TruncatorOptions {
  maxChars?: number;
  chunkSize?: number;
  includeMetadata?: boolean;
}

const DEFAULT_MAX_CHARS = 8000;
const DEFAULT_CHUNK_SIZE = 4000;

/**
 * Truncate or chunk a string output to prevent LM Studio JSON serialization issues.
 * 
 * - If output is under maxChars, returns unchanged
 * - If output is valid JSON, tries to chunk string fields while preserving structure
 * - If output is not valid JSON, splits into numbered chunks
 */
export function truncateOutput(
  output: string,
  optionsOrMaxChars: TruncatorOptions | number = {}
): string {
  let options: TruncatorOptions;
  if (typeof optionsOrMaxChars === 'number') {
    options = { maxChars: optionsOrMaxChars };
  } else {
    options = optionsOrMaxChars;
  }
  const {
    maxChars = DEFAULT_MAX_CHARS,
    chunkSize = DEFAULT_CHUNK_SIZE,
    includeMetadata = true
  } = options;

  // Under limit - no truncation needed
  if (output.length <= maxChars) {
    return output;
  }

  // Try to parse as JSON for smart chunking
  try {
    const parsed = JSON.parse(output);
    const result = chunkJSONFields(parsed, chunkSize);
    
    if (includeMetadata && typeof result === 'object' && result !== null) {
      return JSON.stringify({
        ...result,
        _truncated: true,
        _original_length: output.length,
        _output_length: JSON.stringify(result).length
      }, null, 2);
    }

    return JSON.stringify(result, null, 2);
  } catch {
    // Not valid JSON - split into numbered chunks
    const chunks = splitIntoChunks(output, chunkSize);
    const footer = `\n\n[Output was ${output.length} chars, split into ${chunks.length} chunks. Each chunk is ~${chunkSize} chars.]`;
    
    return chunks.map((chunk, i) => `--- CHUNK ${i + 1}/${chunks.length} ---\n${chunk}`).join('\n\n') + footer;
  }
}

/**
 * Recursively chunk string fields within a JSON structure.
 * Long string values get split into numbered arrays.
 */
function chunkJSONFields(obj: any, chunkSize: number): any {
  if (typeof obj === 'string') {
    if (obj.length <= chunkSize) return obj;
    return splitIntoChunks(obj, chunkSize);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => chunkJSONFields(item, chunkSize));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      result[key] = chunkJSONFields(obj[key], chunkSize);
    }
    return result;
  }

  return obj;
}

/**
 * Split a string into numbered chunks of approximately chunkSize characters.
 * Tries to split at natural boundaries (newlines, spaces) when possible.
 */
function splitIntoChunks(text: string, chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text];
  
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > chunkSize) {
    // Try to find a good split point near chunkSize
    let splitPoint = chunkSize;
    
    // Look for a newline within 200 chars of the target
    const nearTarget = remaining.substring(chunkSize - 200, chunkSize + 200);
    const newlineIdx = nearTarget.indexOf('\n');
    if (newlineIdx > 0 && chunkSize - 200 + newlineIdx > chunkSize - 100) {
      splitPoint = chunkSize - 200 + newlineIdx;
    } else {
      // Look for a space within 100 chars of the target
      const spaceIdx = remaining.lastIndexOf(' ', chunkSize + 100);
      if (spaceIdx > chunkSize - 100) {
        splitPoint = spaceIdx;
      }
    }
    
    // Ensure we don't go backwards
    if (splitPoint < chunkSize - 200) splitPoint = chunkSize;
    
    chunks.push(remaining.substring(0, splitPoint).trimEnd());
    remaining = remaining.substring(splitPoint).trimStart();
  }
  
  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  
  return chunks;
}

/**
 * Wrap a tool implementation with automatic chunking.
 * 
 * Usage:
 *   implementation: withTruncation(async (params, ctx) => { ... })
 *   implementation: withTruncation(async (params, ctx) => { ... }, { maxChars: 6000, chunkSize: 3000 })
 */
export function withTruncation(
  impl: (params: any, ctx: any) => Promise<string>,
  options: TruncatorOptions = {}
): (params: any, ctx: any) => Promise<string> {
  return async (params: any, ctx: any): Promise<string> => {
    const output = await impl(params, ctx);
    return truncateOutput(output, options);
  };
}
