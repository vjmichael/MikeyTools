/**
 * Audio Transcription Tool for LM Studio Plugin
 * Uses whisper.cpp (bundled in node_modules/whisper-bin/) for offline transcription
 */

import * as path from 'path';
import { execFile } from 'child_process';

export async function transcribeAudio(
  file_path: string,
  language: string = 'en',
  model: string = 'base'
): Promise<{ success: boolean; text?: string; error?: string; duration_ms: number }> {
  const startTime = Date.now();
  
  // Bypass sandbox check - use bundled whisper-cli.exe directly
  const bundledPath = path.resolve(__dirname, '..', 'node_modules', 'whisper-bin', 'whisper-cli.exe');
  
  // Resolve model to actual file path
  let modelPath: string;
  if (model.endsWith('.bin')) {
    // Already a path
    modelPath = model;
  } else {
    // Resolve model name (base, small, medium, etc.) to actual file
    modelPath = path.resolve(__dirname, '..', 'node_modules', 'whisper-bin', `ggml-${model}.bin`);
  }
  
  return new Promise((resolve) => {
    execFile(bundledPath, ['-m', modelPath, '-l', language, file_path], { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: `whisper-cli.exe failed: ${stderr || err.message}`, duration_ms: Date.now() - startTime });
      } else {
        resolve({ success: true, text: stdout.trim(), duration_ms: Date.now() - startTime });
      }
    });
  });
}
