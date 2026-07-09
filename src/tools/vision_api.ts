/**
 * AI-Agnostic Vision Layer for LM Studio Plugin
 * 
 * Provides vision capabilities by calling the loaded AI model in LM Studio
 * via the LM Studio API. Falls back to on-demand BLIP2 when no vision model is loaded.
 * 
 * @module vision_api
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createModuleLogger } from './logger';

const logger_vision_api = createModuleLogger('vision_api');

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

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
  nativeVideoSupport: boolean;
  isQwen25VL: boolean;
}

// ===================== LM STUDIO API CLIENT =====================

async function getLmStudioConfig(): Promise<{
  baseUrl: string;
  apiKey: string;
  modelInfo: { name: string; hasVision: boolean } | null;
}> {
  return {
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    modelInfo: null
  };
}

export async function detectVisionCapability(): Promise<VisionCapability | null> {
  try {
    const config = await getLmStudioConfig();
    
    const response = await fetch(`${config.baseUrl}/models`, {
      method: 'GET',
      headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}
    });
    
    if (!response.ok) {
      logger_vision_api.debug('[vision_api] LM Studio API not available');
      return null;
    }
    
    const modelsData = await response.json();
    let models: Array<{ id: string; object: string; created: number }> = [];
    if (modelsData && typeof modelsData === 'object' && Array.isArray((modelsData as any).data)) {
      models = (modelsData as any).data;
    }
    
    let visionModel: { id: string; object: string; created: number } | undefined;
    for (const m of models) {
      const id = m.id.toLowerCase();
      if (id.includes('vl') || id.includes('vision') || id.includes('qwen') || id.includes('llava') || id.includes('bakllava')) {
        visionModel = m;
        break;
      }
    }
    
    if (visionModel) {
      const isQwen25VL = visionModel.id.toLowerCase().includes('qwen2.5-vl') || 
                         visionModel.id.toLowerCase().includes('qwen25-vl');
      const hasNativeVideo = isQwen25VL || 
                            visionModel.id.toLowerCase().includes('llava-video') ||
                            visionModel.id.toLowerCase().includes('llava-next-video');
      
      logger_vision_api.info(`[vision_api] Vision model: ${visionModel.id} (native video: ${hasNativeVideo})`);
      
      return {
        hasVision: true,
        modelName: visionModel.id,
        maxImagesPerRequest: 1,
        supportsVideo: true,
        nativeVideoSupport: hasNativeVideo,
        isQwen25VL: isQwen25VL
      };
    }
    
    logger_vision_api.debug('[vision_api] No vision-capable model detected');
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

// ===================== BLIP2 FALLBACK =====================

/**
 * Fallback image description using on-demand BLIP2.
 * BLIP2 loads from disk only when needed, then unloads.
 */
export async function describeImageViaBlip2(file_path: string, prompt: string = 'Describe the content of this image in detail.'): Promise<VisionResult> {
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
    logger_vision_api.info('[vision_api] Loading BLIP2 on-demand...');
    
    const captioner = await pipeline('image-to-text', 'Xenova/blip2-opt-2.7b');
    const result = await captioner(file_path);
    
    await captioner.dispose();
    logger_vision_api.info('[vision_api] BLIP2 unloaded.');
    
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
      model_used: 'Xenova/blip2-opt-2.7b (fallback)',
      duration_ms: Date.now() - startTime
    };
  } catch (err) {
    logger_vision_api.error('[vision_api] BLIP2 error:', err);
    return {
      success: false,
      error: `BLIP2 error: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * Fallback VQA using LM Studio API (BLIP2-VQA not available in this version).
 */
export async function visualQuestionAnsweringViaBlip2(file_path: string, question: string): Promise<VisionResult> {
  const startTime = Date.now();
  
  if (!fs.existsSync(file_path)) {
    return {
      success: false,
      error: `File not found: ${file_path}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  try {
    // Check for vision model in LM Studio
    const config = await getLmStudioConfig();
    const modelsResp = await fetch(`${config.baseUrl}/models`);
    if (!modelsResp.ok) {
      return {
        success: false,
        error: 'LM Studio API not available.',
        duration_ms: Date.now() - startTime
      };
    }
    
    const modelsData = await modelsResp.json();
    let models: Array<{ id: string }> = [];
    if (modelsData && typeof modelsData === 'object' && Array.isArray((modelsData as any).data)) {
      models = (modelsData as any).data;
    }
    
    let visionModel: { id: string } | undefined;
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
    
    // Read image as base64
    const imageBuffer = fs.readFileSync(file_path);
    const imageBase64 = imageBuffer.toString('base64');
    const imageFormat = path.extname(file_path).replace('.', '').toLowerCase();
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: visionModel.id,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Question: ${question}\n\nPlease answer based on the image.` },
              { type: 'image_url', image_url: { url: `data:image/${imageFormat};base64,${imageBase64}` } }
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
        error: `LM Studio API error (${response.status}): ${errorText}`,
        duration_ms: Date.now() - startTime
      };
    }
    
    const data = await response.json();
    const rawAnswer = data.choices?.[0]?.message?.content || '';
    const answer = stripThinkTags(rawAnswer) || '(No answer)';
    
    return {
      success: true,
      answer,
      model_used: visionModel.id,
      duration_ms: Date.now() - startTime
    };
    
  } catch (err) {
    logger_vision_api.error('[vision_api] VQA error:', err);
    return {
      success: false,
      error: `VQA error: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
}

// ===================== MAIN VISION FUNCTIONS =====================

export async function describeImageViaLmStudio(
  file_path: string,
  prompt: string = 'Describe the content of this image in detail.'
): Promise<VisionResult> {
  const startTime = Date.now();
  
  if (!fs.existsSync(file_path)) {
    return {
      success: false,
      error: `File not found: ${file_path}`,
      duration_ms: Date.now() - startTime
    };
  }
  
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
  
  const capability = await detectVisionCapability();
  
  if (!capability) {
    logger_vision_api.info('[vision_api] LM Studio API unavailable, falling back to BLIP2...');
    return await describeImageViaBlip2(file_path, prompt);
  }
  
  if (!capability.hasVision) {
    logger_vision_api.info(`[vision_api] No vision model (${capability.modelName}), falling back to BLIP2...`);
    return await describeImageViaBlip2(file_path, prompt);
  }
  
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
              { type: 'text', text: prompt },
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
      logger_vision_api.warn(`[vision_api] LM Studio API error (${response.status}), falling back to BLIP2...`);
      return await describeImageViaBlip2(file_path, prompt);
    }
    
    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || '(No description)';
    
    return {
      success: true,
      description,
      model_used: capability.modelName,
      duration_ms: Date.now() - startTime
    };
    
  } catch (err) {
    logger_vision_api.warn(`[vision_api] API error, falling back to BLIP2: ${err instanceof Error ? err.message : String(err)}`);
    return await describeImageViaBlip2(file_path, prompt);
  }
}

export async function visualQuestionAnsweringViaLmStudio(
  file_path: string,
  question: string
): Promise<VisionResult> {
  const startTime = Date.now();
  
  if (!fs.existsSync(file_path)) {
    return {
      success: false,
      error: `File not found: ${file_path}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  const capability = await detectVisionCapability();
  
  // Always use LM Studio model for VQA (Qwen3.6 has vision support)
  if (!capability) {
    logger_vision_api.info('[vision_api] LM Studio API unavailable, falling back to BLIP2-VQA...');
    return await visualQuestionAnsweringViaBlip2(file_path, question);
  }
  
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
  
  let imageFormat = path.extname(file_path).replace('.', '').toLowerCase();
  
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
        max_tokens: 2048,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger_vision_api.warn(`[vision_api] VQA API error (${response.status}), falling back to BLIP2-VQA...`);
      return await visualQuestionAnsweringViaBlip2(file_path, question);
    }
    
    const data = await response.json();
    const rawAnswer = data.choices?.[0]?.message?.content || '';
    const answer = stripThinkTags(rawAnswer) || '(No answer)';
    
    return {
      success: true,
      answer,
      model_used: capability.modelName,
      duration_ms: Date.now() - startTime
    };
    
  } catch (err) {
    logger_vision_api.warn(`[vision_api] VQA API error, falling back to BLIP2-VQA: ${err instanceof Error ? err.message : String(err)}`);
    return await visualQuestionAnsweringViaBlip2(file_path, question);
  }
}

export async function analyzeVideoViaLmStudio(
  file_path: string,
  intervalMs: number = 5000,
  question?: string
): Promise<VideoAnalysisResult> {
  const startTime = Date.now();
  
  if (!fs.existsSync(file_path)) {
    return {
      success: false,
      frames_analyzed: 0,
      error: `File not found: ${file_path}`,
      duration_ms: Date.now() - startTime
    };
  }
  
  const capability = await detectVisionCapability();
  
  if (!capability || !capability.hasVision) {
    return {
      success: false,
      frames_analyzed: 0,
      error: 'No vision-capable model loaded and video BLIP2 fallback not implemented.',
      duration_ms: Date.now() - startTime
    };
  }
  
  if (capability.isQwen25VL) {
    return analyzeVideoNative(file_path, question, capability, startTime);
  }
  
  return analyzeVideoWithSmartSampling(file_path, intervalMs, question, capability, startTime);
}

async function analyzeVideoNative(
  file_path: string,
  question: string | undefined,
  capability: VisionCapability,
  startTime: number
): Promise<VideoAnalysisResult> {
  logger_vision_api.info(`[vision_api] Native video: ${file_path}`);
  
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
  
  const videoFormat = path.extname(file_path).replace('.', '').toLowerCase() || 'mp4';
  
  try {
    const config = await getLmStudioConfig();
    
    const prompt = question 
      ? `Question: ${question}\n\nPlease analyze this video.`
      : `Please analyze this video and provide a detailed summary.`;
    
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
    const summary = data.choices?.[0]?.message?.content || '(No video analysis)';
    
    return {
      success: true,
      frames_analyzed: 0,
      summary,
      native_video: true,
      model_used: capability.modelName,
      duration_ms: Date.now() - startTime
    };
    
  } catch (err) {
    return {
      success: false,
      frames_analyzed: 0,
      error: `Native video error: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - startTime
    };
  }
}

async function analyzeVideoWithSmartSampling(
  file_path: string,
  intervalMs: number,
  question: string | undefined,
  capability: VisionCapability,
  startTime: number
): Promise<VideoAnalysisResult> {
  logger_vision_api.info(`[vision_api] Smart sampling: ${file_path}`);
  
  const tempDir = path.join(os.tmpdir(), 'vision_api_frames');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  let durationSec = 0;
  try {
    const { execSync } = require('child_process');
    const ffprobePath = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffprobe.exe');
    const probeOutput = execSync(`"${ffprobePath}" -v error -show_entries format=duration -of csv=p=0 "${file_path}"`, {
      encoding: 'utf8'
    });
    durationSec = parseFloat(probeOutput.trim()) || 0;
  } catch (err) {
    durationSec = 60;
  }
  
  const MAX_FRAMES = 10;
  const keyFrames = [0, durationSec * 0.25, durationSec * 0.5, durationSec * 0.75, durationSec];
  
  const intermediateFrames: number[] = [];
  for (let t = intervalMs / 1000; t < durationSec; t += intervalMs / 1000) {
    intermediateFrames.push(t);
  }
  
  const allFrames = [...new Set([...keyFrames, ...intermediateFrames])].sort((a, b) => a - b);
  const selectedFrames = allFrames.slice(0, MAX_FRAMES);
  
  const frameDescriptions: Array<{ frame_number: number; timestamp: number; description: string }> = [];
  
  logger_vision_api.info(`[vision_api] Smart sampling: ${selectedFrames.length} frames from ${durationSec}s`);
  
  for (let i = 0; i < selectedFrames.length; i++) {
    const timestamp = selectedFrames[i];
    const framePath = path.join(tempDir, `frame_${i.toString().padStart(4, '0')}.jpg`);
    
    try {
      const { execSync } = require('child_process');
      const ffmpegPath = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
      execSync(`"${ffmpegPath}" -i "${file_path}" -vframes 1 -ss ${timestamp} -y "${framePath}"`, {
        stdio: 'pipe'
      });
      
      const frameBuffer = fs.readFileSync(framePath);
      const frameBase64 = frameBuffer.toString('base64');
      const frameFormat = 'jpg';
      
      const config = await getLmStudioConfig();
      const prompt = question 
        ? `Question: ${question}\n\nDescribe this frame at ${timestamp}s.`
        : `Describe this video frame at ${timestamp}s.`;
      
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
      
      if (fs.existsSync(framePath)) {
        fs.unlinkSync(framePath);
      }
      
    } catch (err) {
      logger_vision_api.warn(`[vision_api] Frame ${timestamp}s failed:`, err);
    }
  }
  
  try {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file));
    }
    fs.rmdirSync(tempDir);
  } catch (err) {
    // Ignore cleanup errors
  }
  
  let summary = '';
  if (frameDescriptions.length > 0) {
    summary = `Video analysis (${frameDescriptions.length} frames from ${durationSec}s).\n\nKey observations:\n${frameDescriptions.map(f => `- ${f.timestamp}s: ${f.description}`).join('\n')}`;
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
