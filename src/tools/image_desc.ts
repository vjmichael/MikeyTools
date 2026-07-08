/**
 * Image Description Tool for LM Studio Plugin
 * 
 * Provides real image understanding using @xenova/transformers (BLIP/VisualBERT).
 * Returns a description of the image content, not just extracted text.
 */

import * as fs from 'fs';
import * as path from 'path';


import { createModuleLogger } from './logger';

// Module logger for image_desc
const logger_image_desc = createModuleLogger('image_desc');
// L-05 FIX: Lazy-loaded image describer with proper Promise caching
let imageDescriber: any = null;
let describerLoadingPromise: Promise<any> | null = null;

async function ensureDescriber(): Promise<void> {
  // Dispose old describer if it exists to prevent memory leaks
  disposeDescriber();
  if (imageDescriber) return;
  
  // L-05 FIX: Use Promise caching to prevent race conditions
  if (!describerLoadingPromise) {
    describerLoadingPromise = (async () => {
      try {
        const { pipeline } = await import('@xenova/transformers');
        // Use a lightweight image-to-text model
        imageDescriber = await pipeline('image-to-text', 'Xenova/blip-image-captioning-base');
      } catch (err) {
        logger_image_desc.warn('[Toolkit] Failed to load @xenova/transformers image describer:', err);
        imageDescriber = null;
      }
    })();
  }
  
  await describerLoadingPromise;
  
  // Reset loading promise so it can be recreated if needed
  describerLoadingPromise = null;
}


/**
 * Disposes the image describer pipeline to free memory.
 */
function disposeDescriber(): void {
  if (imageDescriber) {
    try {
      imageDescriber.dispose();
    } catch (err) {
      logger_image_desc.warn('[Toolkit] Error disposing image describer:', err);
    }
    imageDescriber = null;
  }
}

export interface DescribeResult {
  success: boolean;
  description?: string;
  error?: string;
  duration_ms: number;
}

/**
 * Describes the content of an image.
 */
export async function describeImage(filePath: string): Promise<DescribeResult> {
  const startTime = Date.now();

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    return {
      success: false,
      error: `File not found: ${filePath}`,
      duration_ms: Date.now() - startTime
    };
  }

  await ensureDescriber();
  
  if (!imageDescriber) {
    return {
      success: false,
      error: 'Image describer not available. Ensure @xenova/transformers is installed and the model can be loaded.',
      duration_ms: Date.now() - startTime
    };
  }

  try {
    // Load image using the image-to-text pipeline
    // BUG-12 FIX: Load image as buffer and pass to featureExtractor
    const imageBuffer = fs.readFileSync(resolvedPath);
    const image = await imageDescriber.featureExtractor({ image: imageBuffer });
    
    // Generate caption
    const result = await imageDescriber(image);
    
    return {
      success: true,
      description: result[0]?.generated_text || '(No description generated)',
      duration_ms: Date.now() - startTime
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to describe image: ${errMsg}`,
      duration_ms: Date.now() - startTime
    };
  } finally {
    // BUG-FIX: Dispose describer to prevent memory leaks
    disposeDescriber();
  }
}
