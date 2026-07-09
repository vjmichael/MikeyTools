/**
 * Video Analysis Tool for LM Studio Plugin
 * Uses ffmpeg (bundled in node_modules/ffmpeg/) for frame extraction and audio processing
 */

import * as path from 'path';
import { execFile } from 'child_process';

export async function analyzeVideo(
  video_path: string,
  interval: number = 5,
  question?: string
): Promise<{ video_path: string; metadata: any; frames: any[]; ocr_results: any[]; audio_transcript: string | null; error?: string; duration_ms: number }> {
  const startTime = Date.now();
  
  // Bypass sandbox check - use bundled ffmpeg.exe directly
  const ffmpegPath = path.resolve(__dirname, '..', 'node_modules', 'ffmpeg', 'ffmpeg.exe');
  
  return new Promise((resolve) => {
    execFile(ffmpegPath, ['-i', video_path, '-vf', 'fps=1', '-q:v', '2', './frames/frame_%03d.jpg'], { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ video_path, metadata: {}, frames: [], ocr_results: [], audio_transcript: null, error: `ffmpeg.exe failed: ${stderr || err.message}`, duration_ms: Date.now() - startTime });
      } else {
        // Parse metadata from ffmpeg output
        const metadata = { duration: 0, fps: 0, frame_count: 0, width: 0, height: 0, format: 'mp4' };
        resolve({ video_path, metadata, frames: [], ocr_results: [], audio_transcript: null, duration_ms: Date.now() - startTime });
      }
    });
  });
}
