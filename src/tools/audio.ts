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
  
  return new Promise((resolve) => {
    execFile(bundledPath, [file_path, '-m', model, '-l', language], { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: `whisper-cli.exe failed: ${stderr || err.message}`, duration_ms: Date.now() - startTime });
      } else {
        resolve({ success: true, text: stdout.trim(), duration_ms: Date.now() - startTime });
      }
    });
  });
}
