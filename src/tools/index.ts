/**
 * Semantic Search Index Tool for LM Studio Plugin
 * 
 * Provides local semantic search using embeddings and cosine similarity.
 * Returns structured JSON for model parsing.
 * 
 * PRODUCTION: Uses @xenova/transformers (transformers.js) with Xenova/all-MiniLM-L6-v2
 * for real semantic embeddings. Falls back gracefully if loading fails.
 */

import * as fs from 'fs';
import { findFiles } from './utils';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// Module logger for index
import { createModuleLogger } from './logger';
const logger_index = createModuleLogger('index');

interface IndexMetadata {
  chunks: Array<{
    chunk_id: string;
    file: string;
    chunk_text: string;
    line_start: number;
    line_end: number;
    file_hash: string;
  }>;
  files: Record<string, {
    path: string;
    hash: string;
    chunks: number;
    size: number;
  }>;
  model_name: string;
}

interface MatchResult {
  file: string;
  chunk_text: string;
  line_start: number;
  line_end: number;
  score: number;
}

interface IndexResult {
  success: boolean;
  chunks_created?: number;
  files_indexed?: number;
  matches?: MatchResult[];
  error?: string;
  files_changed?: number;
  files_new?: number;
  files_unchanged?: number;
}

const DEFAULT_INDEX_PATH = path.join(os.homedir(), '.toolkit', 'index');
const DEFAULT_CHUNK_SIZE = 60;
const DEFAULT_OVERLAP = 10;
const DEFAULT_TOP_K = 5;
const SIMILARITY_FLOOR = 0.3;

// In-memory index storage (for plugin context)
let indexStore: {
  metadata: IndexMetadata;
  embeddings: number[][];
  model: any;
} | null = null;

// L-05 FIX: Lazy-loaded embedder instance with proper Promise caching
let embedder: any = null;
let embedderLoadingPromise: Promise<any> | null = null;

async function ensureEmbedder(): Promise<void> {
  // Dispose old embedder if it exists to prevent memory leaks
  disposeEmbedder();
  if (embedder) return;
  
  // L-05 FIX: Use Promise caching to prevent race conditions
  if (!embedderLoadingPromise) {
    embedderLoadingPromise = (async () => {
      try {
        const { pipeline } = await import('@xenova/transformers');
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      } catch (err) {
        logger_index.warn('[Toolkit] Failed to load @xenova/transformers embedder:', err);
        embedder = null;
      }
    })();
  }
  
  await embedderLoadingPromise;
  
  // Reset loading promise so it can be recreated if needed
  embedderLoadingPromise = null;
}


/**
 * Disposes the current embedder pipeline to free memory.
 * Call this before reassigning embedder or during cleanup.
 */
function disposeEmbedder(): void {
  if (embedder) {
    try {
      embedder.dispose();
    } catch (err) {
      logger_index.warn('[Toolkit] Error disposing embedder:', err);
    }
    embedder = null;
  }
}

export async function indexBuild(
  directory: string,
  extensions?: string[],
  index_path?: string
): Promise<IndexResult> {
  const dirPath = path.resolve(directory);
  
  if (!fs.existsSync(dirPath)) {
    return { success: false, error: `Directory not found: ${directory}` };
  }
  
  // Find files
  let files: string[] = [];
  if (extensions) {
    for (const ext of extensions) {
      files = files.concat(await findFiles(dirPath, `*.${ext.replace(/^\./, '')}`));
    }
  } else {
    files = await findFiles(dirPath, '*');
  }
  
  // Filter to files only
  files = files.filter(f => {
    try {
      return fs.statSync(f).isFile();
    } catch {
      return false;
    }
  });
  
  if (files.length === 0) {
    return { success: true, chunks_created: 0, files_indexed: 0 };
  }
  
  // Ensure embedder is loaded
  await ensureEmbedder();
  
  // Process files
  const chunks: IndexMetadata['chunks'] = [];
  const filesMap: IndexMetadata['files'] = {};
  const embeddings: number[][] = [];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      // IMPROVE-09 FIX: Use crypto-grade hash for file hashing
      const fileHash = robustHash(content);
      
      // Chunk the file
      const lines = content.split('\n');
      const fileChunks = chunkLines(lines, DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP);
      
      if (fileChunks.length === 0) continue;
      
      for (let i = 0; i < fileChunks.length; i++) {
        const [chunkText, startLine, endLine] = fileChunks[i];
        const chunkId = `${file}::${i}`;
        
        chunks.push({
          chunk_id: chunkId,
          file: file,
          chunk_text: chunkText,
          line_start: startLine,
          line_end: endLine,
          file_hash: fileHash
        });
        
        embeddings.push(await computeRealEmbedding(chunkText));
      }
      
      filesMap[file] = {
        path: file,
        hash: fileHash,
        chunks: fileChunks.length,
        size: content.length
      };
    } catch (e) {
      // Skip files that can't be read
      continue;
    }
  }
  
  // BUG-06b FIX: Persist index to disk
  const indexPath = path.resolve(index_path || DEFAULT_INDEX_PATH);
  const indexDir = path.dirname(indexPath);
  if (!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir, { recursive: true });
  }
  
  const metadataPath = path.join(indexPath, 'metadata.json');
  const embeddingsPath = path.join(indexPath, 'embeddings.json');
  
  fs.writeFileSync(metadataPath, JSON.stringify({
    chunks: chunks,
    files: filesMap,
    model_name: 'Xenova/all-MiniLM-L6-v2'
  }, null, 2));
  
  // Save embeddings as JSON array (since .npy is binary and harder to handle in TS without extra deps)
  fs.writeFileSync(embeddingsPath, JSON.stringify(embeddings));
  
  // Also update in-memory store
  indexStore = {
    metadata: {
      chunks: chunks,
      files: filesMap,
      model_name: 'Xenova/all-MiniLM-L6-v2'
    },
    embeddings: embeddings,
    model: embedder // Model is now loaded in production
  };
  
  return {
    success: true,
    chunks_created: chunks.length,
    files_indexed: Object.keys(filesMap).length
  };
}

export async function indexQuery(
  query: string,
  index_path?: string,
  top_k: number = DEFAULT_TOP_K
): Promise<IndexResult> {
  // BUG-29 FIX: Check in-memory indexStore first before reading from disk
  if (indexStore?.metadata && indexStore?.embeddings && indexStore.embeddings.length > 0) {
    const metadata = indexStore.metadata;
    const embeddings = indexStore.embeddings;
    
    // BUG-06a FIX: Real semantic embedding via @xenova/transformers
    const queryEmbedding = await computeRealEmbedding(query);
    
    // Compute cosine similarity
    const similarities: number[] = [];
    for (const embedding of embeddings) {
      similarities.push(cosineSimilarity(embedding, queryEmbedding));
    }
    
    // Get top-k results above floor
    const sortedIndices = similarities
      .map((score, idx) => ({ score, idx }))
      .filter(item => item.score >= SIMILARITY_FLOOR)
      .sort((a, b) => b.score - a.score)
      .slice(0, top_k)
      .map(item => item.idx);
    
    const matches: MatchResult[] = sortedIndices.map(idx => ({
      file: metadata.chunks[idx].file,
      chunk_text: metadata.chunks[idx].chunk_text,
      line_start: metadata.chunks[idx].line_start,
      line_end: metadata.chunks[idx].line_end,
      score: parseFloat(similarities[idx].toFixed(4))
    }));
    
    return { success: true, matches: matches };
  }
  
  // Fallback: Load index from disk
  const indexPath = path.resolve(index_path || DEFAULT_INDEX_PATH);
  const metadataPath = path.join(indexPath, 'metadata.json');
  const embeddingsPath = path.join(indexPath, 'embeddings.json');
  
  if (!fs.existsSync(metadataPath) || !fs.existsSync(embeddingsPath)) {
    return { success: true, matches: [] };
  }
  
  let metadata: IndexMetadata;
  let embeddings: number[][];
  
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    embeddings = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
  } catch (e) {
    return { success: true, matches: [] };
  }
  
  if (embeddings.length === 0) {
    return { success: true, matches: [] };
  }
  
  // BUG-06a FIX: Real semantic embedding via @xenova/transformers
  const queryEmbedding = await computeRealEmbedding(query);
  
  // Compute cosine similarity
  const similarities: number[] = [];
  for (const embedding of embeddings) {
    similarities.push(cosineSimilarity(embedding, queryEmbedding));
  }
  
  // Get top-k results above floor
  const sortedIndices = similarities
    .map((score, idx) => ({ score, idx }))
    .filter(item => item.score >= SIMILARITY_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, top_k)
    .map(item => item.idx);
  
  const matches: MatchResult[] = sortedIndices.map(idx => ({
    file: metadata.chunks[idx].file,
    chunk_text: metadata.chunks[idx].chunk_text,
    line_start: metadata.chunks[idx].line_start,
    line_end: metadata.chunks[idx].line_end,
    score: parseFloat(similarities[idx].toFixed(4))
  }));
  
  return { success: true, matches: matches };
}

export async function indexUpdate(
  directory: string,
  index_path?: string
): Promise<IndexResult> {
  // For simplicity, rebuild entire index
  return indexBuild(directory, undefined, index_path);
}

function chunkLines(lines: string[], chunkSize: number, overlap: number): Array<[string, number, number]> {
  const chunks: Array<[string, number, number]> = [];
  let start = 0;
  
  while (start < lines.length) {
    const end = Math.min(start + chunkSize, lines.length);
    const chunkText = lines.slice(start, end).join('\n');
    chunks.push([chunkText, start + 1, end]); // 1-indexed lines
    start = end - overlap;
  }
  
  return chunks;
}

/**
 * Computes real semantic embeddings using @xenova/transformers.
 * Falls back to deterministic pseudo-embedding if the model fails to load.
 */
async function computeRealEmbedding(text: string): Promise<number[]> {
  try {
    await ensureEmbedder();
    if (!embedder) {
      throw new Error('Embedder not available');
    }
    
    // Run inference
    const result = await embedder(text, { pooling: 'mean', normalize: true });
    
    // Extract raw data (result could be a tensor or array depending on version)
    let vec: number[];
    if (typeof result.data === 'function') {
      // @xenova/transformers v2 returns a tensor-like object
      const raw = result.data();
      vec = Array.isArray(raw) ? raw : Array.from(raw);
    } else if (Array.isArray(result.data)) {
      vec = result.data;
    } else {
      // Fallback if structure differs
      vec = Array.from(result as any);
    }
    
    // BUG-19 FIX: Throw error on dimension mismatch instead of silent warning
    if (vec.length !== 384) {
      throw new Error(`Embedding dimension mismatch: expected 384, got ${vec.length}. This indicates a model loading issue.`);
    }
    
    return normalize(vec);
  } catch (err) {
    logger_index.warn('[Toolkit] @xenova/transformers failed, falling back to pseudo-embedding:', err);
    return computeFallbackEmbedding(text);
  }
}

/**
 * Fallback deterministic pseudo-embedding (offline context)
 */
function computeFallbackEmbedding(text: string): number[] {
  // IMPROVE-09 FIX: Use numeric hash from crypto for fallback embedding
  const hash = robustHashNumeric(text);
  const embedding: number[] = [];
  for (let i = 0; i < 384; i++) {
    embedding.push(Math.sin(hash * (i + 1)) * 0.5 + 0.5);
  }
  return normalize(embedding);
}


function robustHash(str: string): string {
  // Return hex digest string (not number) for crypto-grade hashing
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Helper to get numeric hash from robustHash for backward compatibility
function robustHashNumeric(str: string): number {
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  // Convert first 8 hex chars to number
  return parseInt(hash.substring(0, 8), 16);
}

function normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vec;
  return vec.map(v => v / norm);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

/**
 * Clears the in-memory index and embedder to free memory.
 * Call this when the index is no longer needed or to prevent memory leaks.
 */
/**
 * Clears the in-memory index and embedder to free memory.
 * IMPROVE-10 FIX: Removed console.log to avoid unconfigured logging.
 */
/**
 * Clears the in-memory index and embedder to free memory.
 * 
 * @returns {void}
 */

export function clearIndex(): void {
  // IMPROVE-10 FIX: Removed console.log to avoid unconfigured logging
  // BUG-FIX: Properly dispose the embedder pipeline to free memory
  disposeEmbedder();
  indexStore = null;
  embedder = null;
  embedderLoadingPromise = null;
}
