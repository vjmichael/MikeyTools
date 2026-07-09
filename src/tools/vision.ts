/**
 * Vision/OCR Tool for LM Studio Plugin
 * 
 * Provides:
 * - OCR via Tesseract.js (pure JS, offline)
 * - Image description via on-demand BLIP2 (loaded only when needed)
 * - VQA via LM Studio API (uses loaded vision model)
 * 
 * BLIP2 is loaded on-demand from @xenova/transformers — never pre-loaded.
 * This avoids VRAM conflicts with the loaded LM Studio model.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createWorker } from 'tesseract.js';
import { createModuleLogger } from './logger';

const logger_vision = createModuleLogger('vision');

interface ImageResult {
  text: string;
  width: number;
  height: number;
  format: string;
  error?: string;
}

interface DescribeResult {
  success: boolean;
  description?: string;
  error?: string;
  duration_ms: number;
  model_used?: string;
}

export async function readImage(
  file_path: string,
  ocr_only: boolean = false
): Promise<ImageResult> {
  if (!fs.existsSync(file_path)) {
    return {
      text: '',
      width: 0,
      height: 0,
      format: 'unknown',
      error: `File not found: ${file_path}`
    };
  }
  
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
    // Fallback: get format from file extension
    format = path.extname(file_path).replace('.', '').toLowerCase();
  }
  
  let text = '';
  let worker: any = null;
  try {
    worker = await createWorker('eng');
    const result = await worker.recognize(file_path);
    text = result.data.text || '';
  } catch (e) {
    text = '[OCR not available: Tesseract data files not found. First run will download ~20MB of language data.]';
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
  
  return { text, width, height, format };
}

/**
 * Image Captioning using on-demand BLIP-2
 * BLIP2 loads from disk only when called, then unloads.
 * Note: Does not use sharp (Windows compatibility issue).
 */
export async function describeImage(file_path: string): Promise<DescribeResult> {
  const startTime = Date.now();
  
  if (!fs.existsSync(file_path)) {
    return {
      success: false,
      error: `File not found: ${file_path}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  try {
    const { pipeline } = await import('@xenova/transformers');
    logger_vision.info('[vision] Loading BLIP2 on-demand...');
    
    // Use image-to-text pipeline (BLIP2)
    const captioner = await pipeline('image-to-text', 'Xenova/blip2-opt-2.7b');
    
    // Run inference
    const result = await captioner(file_path);
    
    // Unload to free VRAM
    await captioner.dispose();
    logger_vision.info('[vision] BLIP2 unloaded.');
    
    // Handle result types
    let description = '(No description)';
    if (typeof result === 'string') {
      description = result;
    } else if (Array.isArray(result) && result.length > 0) {
      description = (result[0] as any).generated_text || '(No description)';
    } else if ((result as any).generated_text) {
      description = (result as any).generated_text;
    }
    
    return {
      success: true,
      description,
      duration_ms: Date.now() - startTime
    };
    
  } catch (err) {
    // Check if error is related to sharp
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('sharp')) {
      logger_vision.warn('[vision] sharp module error, trying BLIP2 without sharp...');
      // Try to load BLIP2 without sharp by using a different approach
      try {
        const { pipeline } = await import('@xenova/transformers');
        const captioner = await pipeline('image-to-text', 'Xenova/blip2-opt-2.7b');
        const result = await captioner(file_path);
        await captioner.dispose();
        
        let description = '(No description)';
        if (typeof result === 'string') {
          description = result;
        } else if (Array.isArray(result) && result.length > 0) {
          description = (result[0] as any).generated_text || '(No description)';
        } else if ((result as any).generated_text) {
          description = (result as any).generated_text;
        }
        
        return {
          success: true,
          description,
          duration_ms: Date.now() - startTime
        };
      } catch (err2) {
        logger_vision.error('[vision] BLIP2 error:', err2);
        return {
          success: false,
          error: `BLIP2 error: ${err2 instanceof Error ? err2.message : String(err2)}`,
          duration_ms: Date.now() - startTime
        };
      }
    }
    
    logger_vision.error('[vision] BLIP2 error:', err);
    return {
      success: false,
      error: `BLIP2 error: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * Visual Question Answering using LM Studio API
 * Fetches loaded vision model from LM Studio API and uses it for VQA.
 */
export async function visualQuestionAnswering(
  file_path: string,
  question: string
): Promise<DescribeResult> {
  const startTime = Date.now();
  
  if (!fs.existsSync(file_path)) {
    return {
      success: false,
      error: `File not found: ${file_path}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Fetch loaded models from LM Studio API
  let visionModel: { id: string } | undefined;
  try {
    const modelsResp = await fetch('http://localhost:1234/v1/models');
    if (!modelsResp.ok) {
      return {
        success: false,
        error: `LM Studio API error (${modelsResp.status})`,
        duration_ms: Date.now() - startTime
      };
    }
    
    const modelsData = await modelsResp.json();
    
    // LM Studio API returns models in a data property
    let models: Array<{ id: string }> = [];
    if (modelsData && typeof modelsData === 'object') {
      const data = (modelsData as any).data;
      if (Array.isArray(data)) {
        models = data;
      }
    }
    
    if (!models || !Array.isArray(models) || models.length === 0) {
      return {
        success: false,
        error: `LM Studio API returned unexpected format: ${JSON.stringify(modelsData)}`,
        duration_ms: Date.now() - startTime
      };
    }
    
    // Find vision-capable model (Qwen2.5-VL, LLaVA, etc.)
    for (const m of models) {
      const id = m.id.toLowerCase();
      if (id.includes('vl') || id.includes('vision') || id.includes('qwen') || id.includes('llava')) {
        visionModel = m;
        break;
      }
    }
    
    if (!visionModel) {
      return {
        success: false,
        error: 'No vision-capable model loaded in LM Studio. Load Qwen2.5-VL, LLaVA, or similar.',
        duration_ms: Date.now() - startTime
      };
    }
    
  } catch (err) {
    return {
      success: false,
      error: `VQA error: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Read image as base64
  const imageBuffer = fs.readFileSync(file_path);
  const imageBase64 = imageBuffer.toString('base64');
  const imageFormat = path.extname(file_path).replace('.', '').toLowerCase();
  
  const response = await fetch('http://localhost:1234/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: visionModel!.id,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Question: ${question}\n\nPlease answer based on the image.` },
            { type: 'image_url', image_url: { url: `data:image/${imageFormat};base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 512,
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    return {
      success: false,
      error: `LM Studio API error (${response.status})`,
      duration_ms: Date.now() - startTime
    };
  }
  
  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content || '(No answer)';
  
  return {
    success: true,
    description: answer,
    model_used: visionModel!.id,
    duration_ms: Date.now() - startTime
  };
}
