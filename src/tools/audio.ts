/**
 * Audio Ingestion Tool for LM Studio Plugin
 *
 * Provides offline audio transcription using whisper.cpp (via CLI).
 */

import { execFile } from 'child_process';
import { isCommandAvailable } from './utils';
import path from 'path';
import fs from 'fs';

// BUG-FIX: Cache whisper availability check
let cachedWhisperAvailable: boolean | null = null;

export interface TranscribeResult {
  success: boolean;
  text?: string;
  error?: string;
  duration_ms: number;
  language?: string;
}

/**
 * Checks if whisper.cpp is available.
 */
/**
 * Checks if whisper.cpp is available.
 * IMPROVE-01 FIX: Use shared isCommandAvailable utility.
 * BUG-FIX: Keep cached result to avoid repeated checks.
 */
async function checkWhisper(): Promise<boolean> {
  // BUG-FIX: Use cached result to avoid repeated checks
  if (cachedWhisperAvailable !== null) {
    return cachedWhisperAvailable;
  }
  
  const available = await isCommandAvailable('whisper');
  cachedWhisperAvailable = available;
  return available;
}

/**
 * Transcribes an audio file using whisper.cpp.
 */
export async function transcribeAudio(
  filePath: string,
  language: string = 'en',
  model: string = 'base'
): Promise<TranscribeResult> {
  const startTime = Date.now();

  const isWhisperAvailable = await checkWhisper();
  if (!isWhisperAvailable) {
    // BUG-FIX: Provide clear installation instructions for whisper.cpp
    return {
      success: false,
      error: 'whisper-cli.exe not found in node_modules/whisper-bin/ or system PATH. Please place whisper-cli.exe in node_modules/whisper-bin/ or add it to your system PATH.',\n    // Fallback: Use bundled binary directly\n    const bundledPath = path.resolve(__dirname, '..', 'node_modules', 'whisper-bin', 'whisper-cli.exe');
      duration_ms: Date.now() - startTime
    };
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    return {
      success: false,
      error: `File not found: ${filePath}`,
      duration_ms: Date.now() - startTime
    };
  }

  // whisper.cpp command structure:
  // whisper input.wav --model base --language en --output_format txt --output_dir ./
  const outputDir = path.dirname(resolvedPath);
  
  return new Promise((resolve) => {
    execFile(path.resolve(__dirname, '..', 'node_modules', 'whisper-bin', 'whisper-cli.exe'), [
      resolvedPath,
      '--model', model,
      '--language', language,
      '--output_format', 'txt',
      '--output_dir', outputDir
    ], { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          error: stderr || error.message,
          duration_ms: Date.now() - startTime
        });
      } else {
        // Extract text from stdout or look for the generated .txt file
        // whisper.cpp usually prints the text to stdout or creates a file
        let text = stdout;
        
        // If stdout is empty, check for the generated file
        if (!text || text.trim() === '') {
          const baseName = path.basename(resolvedPath, path.extname(resolvedPath));
          const txtPath = path.join(outputDir, `${baseName}.txt`);
          if (fs.existsSync(txtPath)) {
            text = fs.readFileSync(txtPath, 'utf8');
          } else {
            text = '(Transcription completed but no text output found)';
          }
        }

        resolve({
          success: true,
          text: text.trim(),
          duration_ms: Date.now() - startTime,
          language: language
        });
      }
    });
  });
}

// Cross-reference: audio.ts can be used by video.ts for audio extraction
export const extractAudioFromVideo = async (videoPath: string, outputPath: string): Promise<{ success: boolean; error?: string }> => {
  const ffmpegPath = path.resolve(__dirname, '..', '..', 'node_modules', 'ffmpeg', 'ffmpeg.exe');
  return new Promise((resolve) => {
    execFile(ffmpegPath, [
      '-y', '-i', videoPath, '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', outputPath
    ], { timeout: 60000 }, (error) => {
      resolve({ success: !error, error: error?.message });
    });
  });
};
