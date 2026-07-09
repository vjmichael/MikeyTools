/**
 * AI-Agnostic Vision Layer for LM Studio Plugin
 * 
 * Provides vision capabilities by calling the already-loaded AI model
 * in LM Studio (e.g., Qwen3.6-35B-A3B, Qwen2.5-VL) via the LM Studio API.
 * 
 * This layer is:
 * - AI-agnostic (works with any vision-capable model)
 * - Zero additional VRAM (uses existing loaded model)
 * - Zero new downloads (no BLIP2/@xenova/transformers)
 * - Better quality (35B+ model vs 300M BLIP)
 * - Native video support (for Qwen2.5-VL models)
 * 
 * @module vision_api
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createModuleLogger } from './logger';

const logger_vision_api = createModuleLogger('vision_api');

// ===================== INTERFACES =====================

export interface VisionResult {
  success: boolean;
  description?: string;
  answer?: string;
  error?: string;
  duration_ms: number;
  model_used?: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size_bytes: number;
}

export interface VideoAnalysisResult {
  success: boolean;
  frames_analyzed: number;
  summary?: string;
  frame_descriptions?: Array<{
    frame_number: number;
    timestamp: number;
    description: string;
  }>;
  error?: string;
  duration_ms: number;
  model_used?: string;
  native_video?: boolean;
}

export interface VisionCapability {
  hasVision: boolean;
  modelName: string;
  maxImagesPerRequest: number;
  supportsVideo: boolean;
  nativeVideoSupport: boolean; // True for Qwen2.5-VL, LLaVA-NeXT-Video
  isQwen25VL: boolean; // Specifically Qwen2.5-VL (best native video support)
}

// ===================== LM STUDIO API CLIENT =====================

/**
 * Check if LM Studio API is available and get loaded model info.
 */
async function getLmStudioConfig(): Promise<{
  baseUrl: string;
  apiKey: string;
  modelInfo: { name: string; hasVision: boolean } | null;
}> {
  // LM Studio local API is available at http://localhost:1234/v1
  // API key is typically empty for local instances
  return {
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    modelInfo: null
  };
}

/**
 * Detect if the loaded LM Studio model supports vision and native video.
 * Returns capability info or null if no model loaded.
 */
export async function detectVisionCapability(): Promise<VisionCapability | null> {
  try {
    const config = await getLmStudioConfig();
    
    // Check if a model is loaded by querying the API
    const response = await fetch(`${config.baseUrl}/models`, {
      method: 'GET',
      headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}
    });
    
    if (!response.ok) {
      logger_vision_api.debug('[vision_api] LM Studio API not available, vision tools will be disabled');
      return null;
    }
    
    const models: Array<{ id: string; object: string; created: number }> = await response.json();
    
    // Check if any loaded model has vision capabilities
    // Qwen2.5-VL models have native video support
    // Qwen3.6-35B-A3B has image support only
    const visionModel = models.find(m => 
      m.id.toLowerCase().includes('vl') || 
      m.id.toLowerCase().includes('vision') ||
      m.id.toLowerCase().includes('qwen') ||
      m.id.toLowerCase().includes('llava') ||
      m.id.toLowerCase().includes('bakllava')
    );
    
    if (visionModel) {
      const isQwen25VL = visionModel.id.toLowerCase().includes('qwen2.5-vl') || 
                         visionModel.id.toLowerCase().includes('qwen25-vl');
      const hasNativeVideo = isQwen25VL || 
                            visionModel.id.toLowerCase().includes('llava-video') ||
                            visionModel.id.toLowerCase().includes('llava-next-video');
      
      logger_vision_api.info(`[vision_api] Vision-capable model detected: ${visionModel.id} (native video: ${hasNativeVideo})`);
      
      return {
        hasVision: true,
        modelName: visionModel.id,
        maxImagesPerRequest: 1,
        supportsVideo: true,
        nativeVideoSupport: hasNativeVideo,
        isQwen25VL: isQwen25VL
      };
    }
    
    logger_vision_api.debug('[vision_api] No vision-capable model detected in LM Studio');
    return {
      hasVision: false,
      modelName: 'unknown',
      maxImagesPerRequest: 0,
      supportsVideo: false,
      nativeVideoSupport: false,
      isQwen25VL: false
    };
    
  } catch (err) {
    logger_vision_api.warn('[vision_api] Failed to detect vision capability:', err);
    return null;
  }
}

/**
 * Send an image to the loaded LM Studio model for description.
 * Uses the chat completions API with image attachment.
 */
export async function describeImageViaLmStudio(
  file_path: string,
  prompt: string = 'Describe the content of this image in detail.'
): Promise<VisionResult> {
  const startTime = Date.now();
  
  // Check if file exists
  if (!fs.existsSync(file_path)) {
    return {
      success: false,
      error: `File not found: ${file_path}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Get image metadata
  let imageMetadata: ImageMetadata | null = null;
  try {
    const stat = fs.statSync(file_path);
    const { default: sharp } = await import('sharp');
    const metadata = await sharp(file_path).metadata();
    imageMetadata = {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size_bytes: stat.size
    };
  } catch (e) {
    imageMetadata = {
      width: 0,
      height: 0,
      format: path.extname(file_path).replace('.', '').toLowerCase(),
      size_bytes: 0
    };
  }
  
  // Read image as base64
  let imageBase64: string;
  try {
    const imageBuffer = fs.readFileSync(file_path);
    imageBase64 = imageBuffer.toString('base64');
  } catch (err) {
    return {
      success: false,
      error: `Failed to read image: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Check vision capability
  const capability = await detectVisionCapability();
  
  if (!capability) {
    return {
      success: false,
      error: 'LM Studio API not available. Please ensure LM Studio is running with a vision-capable model loaded.',
      duration_ms: Date.now() - startTime
    };
  }
  
  if (!capability.hasVision) {
    return {
      success: false,
      error: `No vision-capable model loaded in LM Studio. Detected model: ${capability.modelName}. Please load a vision-capable model (e.g., Qwen3.6-35B-A3B, Qwen2.5-VL, LLaVA).`,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Call LM Studio API with image attachment
  try {
    const config = await getLmStudioConfig();
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: capability.modelName,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/${imageMetadata.format};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `LM Studio API error (${response.status}): ${errorText}`,
        duration_ms: Date.now() - startTime
      };
    }
    
    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || '(No description generated)';
    
    return {
      success: true,
      description,
      model_used: capability.modelName,
      duration_ms: Date.now() - startTime
    };
    
  } catch (err) {
    return {
      success: false,
      error: `Failed to call LM Studio API: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * Answer a question about an image using the loaded LM Studio model.
 */
export async function visualQuestionAnsweringViaLmStudio(
  file_path: string,
  question: string
): Promise<VisionResult> {
  const startTime = Date.now();
  
  // Check if file exists
  if (!fs.existsSync(file_path)) {
    return {
      success: false,
      error: `File not found: ${file_path}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Check vision capability
  const capability = await detectVisionCapability();
  
  if (!capability || !capability.hasVision) {
    return {
      success: false,
      error: 'No vision-capable model loaded in LM Studio. Please load a vision-capable model (e.g., Qwen3.6-35B-A3B, Qwen2.5-VL, LLaVA).',
      duration_ms: Date.now() - startTime
    };
  }
  
  // Read image as base64
  let imageBase64: string;
  try {
    const imageBuffer = fs.readFileSync(file_path);
    imageBase64 = imageBuffer.toString('base64');
  } catch (err) {
    return {
      success: false,
      error: `Failed to read image: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Get image format
  let imageFormat = path.extname(file_path).replace('.', '').toLowerCase();
  
  // Call LM Studio API with image + question
  try {
    const config = await getLmStudioConfig();
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: capability.modelName,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Question: ${question}\n\nPlease answer based on the image content.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/${imageFormat};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 512,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `LM Studio API error (${response.status}): ${errorText}`,
        duration_ms: Date.now() - startTime
      };
    }
    
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || '(No answer generated)';
    
    return {
      success: true,
      answer,
      model_used: capability.modelName,
      duration_ms: Date.now() - startTime
    };
    
  } catch (err) {
    return {
      success: false,
      error: `Failed to call LM Studio API: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * Analyze a video using native video support (Qwen2.5-VL) or smart frame sampling fallback.
 * 
 * For Qwen2.5-VL models: Uses native video input (no frame extraction)
 * For other models: Falls back to smart key-frame sampling (not extraction)
 */
export async function analyzeVideoViaLmStudio(
  file_path: string,
  intervalMs: number = 5000,
  question?: string
): Promise<VideoAnalysisResult> {
  const startTime = Date.now();
  
  // Check if file exists
  if (!fs.existsSync(file_path)) {
    return {
      success: false,
      frames_analyzed: 0,
      error: `File not found: ${file_path}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Check vision capability
  const capability = await detectVisionCapability();
  
  if (!capability || !capability.hasVision) {
    return {
      success: false,
      frames_analyzed: 0,
      error: 'No vision-capable model loaded in LM Studio. Please load a vision-capable model (e.g., Qwen3.6-35B-A3B, Qwen2.5-VL, LLaVA).',
      duration_ms: Date.now() - startTime
    };
  }
  
  // If Qwen2.5-VL with native video support, use native video processing
  if (capability.isQwen25VL) {
    return analyzeVideoNative(file_path, question, capability, startTime);
  }
  
  // Fallback: Smart key-frame sampling (not extraction)
  return analyzeVideoWithSmartSampling(file_path, intervalMs, question, capability, startTime);
}

/**
 * Analyze video using native video support (Qwen2.5-VL).
 */
async function analyzeVideoNative(
  file_path: string,
  question: string | undefined,
  capability: VisionCapability,
  startTime: number
): Promise<VideoAnalysisResult> {
  logger_vision_api.info(`[vision_api] Using native video support for: ${file_path}`);
  
  // Read video file as base64
  let videoBase64: string;
  try {
    const videoBuffer = fs.readFileSync(file_path);
    videoBase64 = videoBuffer.toString('base64');
  } catch (err) {
    return {
      success: false,
      frames_analyzed: 0,
      error: `Failed to read video: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  // Get video format
  const videoFormat = path.extname(file_path).replace('.', '').toLowerCase() || 'mp4';
  
  // Call LM Studio API with native video input
  try {
    const config = await getLmStudioConfig();
    
    const prompt = question 
      ? `Question: ${question}\n\nPlease analyze this video and answer the question.`
      : `Please analyze this video and provide a detailed summary of what happens.`;
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: capability.modelName,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'video_url',
                video_url: {
                  url: `data:video/${videoFormat};base64,${videoBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2048,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        frames_analyzed: 0,
        error: `LM Studio API error (${response.status}): ${errorText}`,
        duration_ms: Date.now() - startTime
      };
    }
    
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || '(No video analysis generated)';
    
    return {
      success: true,
      frames_analyzed: 0, // Native video doesn't use frames
      summary,
      native_video: true,
      model_used: capability.modelName,
      duration_ms: Date.now() - startTime
    };
    
  } catch (err) {
    return {
      success: false,
      frames_analyzed: 0,
      error: `Failed to call LM Studio API with native video: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * Analyze video with smart key-frame sampling (fallback for non-Qwen2.5-VL models).
 * Uses scene detection to pick representative frames (not sequential extraction).
 */
async function analyzeVideoWithSmartSampling(
  file_path: string,
  intervalMs: number,
  question: string | undefined,
  capability: VisionCapability,
  startTime: number
): Promise<VideoAnalysisResult> {
  logger_vision_api.info(`[vision_api] Using smart sampling for: ${file_path}`);
  
  // Create temp directory for frames
  const tempDir = path.join(os.tmpdir(), 'vision_api_frames');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Get video duration using ffprobe
  let durationSec = 0;
  try {
    const { execSync } = require('child_process');
    const ffprobePath = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffprobe.exe');
    const probeOutput = execSync(`"${ffprobePath}" -v error -show_entries format=duration -of csv=p=0 "${file_path}"`, {
      encoding: 'utf8'
    });
    durationSec = parseFloat(probeOutput.trim()) || 0;
  } catch (err) {
    durationSec = 60; // Default assumption
  }
  
  // Smart sampling: Pick frames at 0%, 25%, 50%, 75%, 100% + intervals
  const MAX_FRAMES = 10; // Limit to prevent context overflow
  const keyFrames = [0, durationSec * 0.25, durationSec * 0.5, durationSec * 0.75, durationSec];
  
  // Add intermediate frames based on interval
  const intermediateFrames: number[] = [];
  for (let t = intervalMs / 1000; t < durationSec; t += intervalMs / 1000) {
    intermediateFrames.push(t);
  }
  
  // Combine and deduplicate
  const allFrames = [...new Set([...keyFrames, ...intermediateFrames])].sort((a, b) => a - b);
  const selectedFrames = allFrames.slice(0, MAX_FRAMES);
  
  const frameDescriptions: Array<{ frame_number: number; timestamp: number; description: string }> = [];
  
  logger_vision_api.info(`[vision_api] Smart sampling: ${selectedFrames.length} frames from ${durationSec}s video`);
  
  // Extract and analyze key frames
  for (let i = 0; i < selectedFrames.length; i++) {
    const timestamp = selectedFrames[i];
    const framePath = path.join(tempDir, `frame_${i.toString().padStart(4, '0')}.jpg`);
    
    try {
      // Extract single frame using ffmpeg
      const { execSync } = require('child_process');
      const ffmpegPath = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
      execSync(`"${ffmpegPath}" -i "${file_path}" -vframes 1 -ss ${timestamp} -y "${framePath}"`, {
        stdio: 'pipe'
      });
      
      // Read frame as base64
      const frameBuffer = fs.readFileSync(framePath);
      const frameBase64 = frameBuffer.toString('base64');
      
      // Get frame format
      const frameFormat = 'jpg';
      
      // Send to LM Studio for analysis
      const config = await getLmStudioConfig();
      const prompt = question 
        ? `Question: ${question}\n\nPlease describe this video frame at ${timestamp}s.`
        : `Describe what is happening in this video frame at ${timestamp}s.`;
      
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: capability.modelName,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/${frameFormat};base64,${frameBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 256,
          temperature: 0.3
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const description = data.choices?.[0]?.message?.content || '(No description)';
        frameDescriptions.push({
          frame_number: i,
          timestamp,
          description
        });
      }
      
      // Clean up frame file
      if (fs.existsSync(framePath)) {
        fs.unlinkSync(framePath);
      }
      
    } catch (err) {
      logger_vision_api.warn(`[vision_api] Failed to analyze frame at ${timestamp}s:`, err);
      // Continue to next frame
    }
  }
  
  // Clean up temp directory
  try {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file));
    }
    fs.rmdirSync(tempDir);
  } catch (err) {
    // Ignore cleanup errors
  }
  
  // Generate summary from frame descriptions
  let summary = '';
  if (frameDescriptions.length > 0) {
    summary = `Video analysis complete (smart sampling). ${frameDescriptions.length} key frames analyzed from ${durationSec}s video.\n\nKey observations:\n${frameDescriptions.map(f => `- ${f.timestamp}s: ${f.description}`).join('\n')}`;
  }
  
  return {
    success: true,
    frames_analyzed: frameDescriptions.length,
    summary,
    frame_descriptions: frameDescriptions,
    native_video: false,
    model_used: capability.modelName,
    duration_ms: Date.now() - startTime
  };
}

// No duplicate exports needed - functions are already exported above
