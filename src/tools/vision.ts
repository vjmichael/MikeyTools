/**
 * Vision/OCR Tool for LM Studio Plugin
 * 
 * Extracts text from images using Tesseract OCR (offline).
 * Returns structured JSON for model parsing.
 * 
 * Uses tesseract.js (pure JavaScript) instead of node-tesseract-ocr
 * which had an unsfixable OS Command Injection vulnerability (GHSA-8j44-735h-w4w2).
 * 
 * NOTE: BLIP2 image captioning has been deprecated and removed (2026-07-09).
 * Image description now uses the loaded LM Studio model (e.g., Qwen2.5-VL) via vision_api.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createWorker } from 'tesseract.js';

interface ImageResult {
  text: string;
  width: number;
  height: number;
  format: string;
  error?: string;
}

export async function readImage(
  file_path: string,
  ocr_only: boolean = false
): Promise<ImageResult> {
  // Check if file exists
  if (!fs.existsSync(file_path)) {
    return {
      text: '',
      width: 0,
      height: 0,
      format: 'unknown',
      error: `File not found: ${file_path}`
    };
  }
  
  // Get image metadata
  let width = 0;
  let height = 0;
  let format = 'unknown';
  
  try {
    const { default: sharp } = await import('sharp');
    const metadata = await sharp(file_path).metadata();
    width = metadata.width || 0;
    height = metadata.height || 0;
    format = metadata.format || 'unknown';
  } catch (e) {
    // Try to get basic info from file extension
    format = path.extname(file_path).replace('.', '').toLowerCase();
  }
  
  // Perform OCR using tesseract.js (pure JS, no native dependencies)
  let text = '';
  let worker: any = null;
  try {
    worker = await createWorker('eng');
    const result = await worker.recognize(file_path);
    text = result.data.text || '';
  } catch (e) {
    // Tesseract.js may fail if no data files are available
    text = '[OCR not available: Tesseract data files not found. First run will download ~20MB of language data.]';
  } finally {
    // H-01 FIX: Only terminate worker if it was successfully created
    if (worker) {
      await worker.terminate();
    }
  }
  
  if (ocr_only) {
    return {
      text: text,
      width: width,
      height: height,
      format: format
    };
  } else {
    return {
      text: text,
      width: width,
      height: height,
      format: format
    };
  }
}

/**
 * Image Captioning Tool using BLIP-2
 * @deprecated BLIP2 has been deprecated and removed (2026-07-09).
 * Image description now uses the loaded LM Studio model (e.g., Qwen2.5-VL) via vision_api.ts.
 */
export async function describeImage(file_path: string): Promise<string> {
  return '[DEPRECATED] BLIP2 image captioning has been removed. Use describe_image tool which calls the loaded LM Studio model (e.g., Qwen2.5-VL).';
}

/**
 * Visual Question Answering (VQA) Tool using BLIP-2
 * @deprecated BLIP2 has been deprecated and removed (2026-07-09).
 * VQA now uses the loaded LM Studio model (e.g., Qwen2.5-VL) via vision_api.ts.
 */
export async function visualQuestionAnswering(
  file_path: string,
  question: string
): Promise<string> {
  return '[DEPRECATED] BLIP2 VQA has been removed. Use visual_question_answering tool which calls the loaded LM Studio model (e.g., Qwen2.5-VL).';
}
