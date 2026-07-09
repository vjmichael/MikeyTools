/**
 * Image Description Tool for LM Studio Plugin
 * 
 * DEPRECATED: This tool has been replaced by vision_api.ts which uses
 * the loaded LM Studio model (e.g., Qwen2.5-VL) for image description.
 * 
 * This file is kept for backward compatibility but returns a deprecation message.
 * 
 * @deprecated Use describeImageViaLmStudio from './vision_api' instead
 */

import * as fs from 'fs';
import * as path from 'path';
import { createModuleLogger } from './logger';

const logger_image_desc = createModuleLogger('image_desc');

export interface DescribeResult {
  success: boolean;
  description?: string;
  error?: string;
  duration_ms: number;
}

/**
 * Describes the content of an image.
 * @deprecated Use describeImageViaLmStudio from './vision_api' instead
 */
export async function describeImage(filePath: string): Promise<DescribeResult> {
  const startTime = Date.now();
  
  return {
    success: false,
    error: 'DEPRECATED: Image description now uses loaded LM Studio model (Qwen2.5-VL). Use describe_image tool instead.',
    duration_ms: Date.now() - startTime
  };
}
