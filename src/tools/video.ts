/**
 * Video Analyzer Tool for LM Studio Plugin
 * 
 * Analyzes video files, extracts frames, performs OCR, and optionally
 * extracts audio for Whisper transcription.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { isCommandAvailable } from './utils';
import { createModuleLogger } from './logger';

// Module logger for video
const logger_video = createModuleLogger('video');

const execFileAsync = promisify(execFile);

interface VideoAnalysisResult {
  video_path: string;
  metadata: {
    file: string;
    duration: number;
    fps: number;
    frame_count: number;
    width: number;
    height: number;
    format: number;
  };
  frames: string[];
  ocr_results: Array<{
    frame: string;
    text: string;
  }>;
  audio_transcript: string | null;
  error?: string;
}

// BUG-41 FIX: Add timeout to prevent hanging if binary hangs
// IMPROVE-07 FIX: Use isCommandAvailable utility to reduce duplication

async function checkVideoDependencies(): Promise<{ ffmpeg: boolean; python: boolean }> {
  const TIMEOUT_MS = 5000; // 5 second timeout for dependency checks
  
  // Check ffmpeg with timeout
  const ffmpegAvailable = await Promise.race([
    isCommandAvailable('ffmpeg'),
    new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('ffmpeg check timed out')), TIMEOUT_MS)
    )
  ]).catch(() => false);
  
  // Check python with timeout
  const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3';
  const pythonAvailable = await Promise.race([
    isCommandAvailable(pythonCmd),
    new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('python check timed out')), TIMEOUT_MS)
    )
  ]).catch(() => false);
  
  return { ffmpeg: ffmpegAvailable, python: pythonAvailable };
}


export interface VideoOptions {
  video_path: string;
  num_frames?: number;
  output_dir?: string;
  ocr?: boolean;
  whisper?: boolean;
  whisper_model?: string;
}

// BUG-10/24 FIX: Detect Python interpreter and use configurable script path
function getPythonCommand(): string {
  return os.platform() === 'win32' ? 'python' : 'python3';
}

// BUG-50 FIX: Renamed from getScriptPath to getDefaultScriptPath to clarify it returns a default, not an existing file
function getDefaultScriptPath(): string {
  // BUG-11/24 FIX: Use process.cwd() or a configurable path instead of __filename
  // Try multiple locations for the script
  const possiblePaths = [
    path.join(process.cwd(), 'video_analyzer.py'),
    path.join(os.homedir(), '.toolkit', 'video_analyzer.py'),
    path.join(__dirname, '..', 'video_analyzer.py'),
  ];
  
  for (const scriptPath of possiblePaths) {
    if (fs.existsSync(scriptPath)) {
      return scriptPath;
    }
  }
  
  // If no script exists, return a default path
  return path.join(os.homedir(), '.toolkit', 'video_analyzer.py');
}

export async function analyzeVideo(options: VideoOptions): Promise<VideoAnalysisResult> {
  const {
    video_path,
    num_frames = 10, // BUG-56 FIX: Documented default value
    output_dir = './video_frames',
    ocr = true,
    whisper = false,
    whisper_model = 'base'
  } = options;

  if (!fs.existsSync(video_path)) {
    return {
      video_path,
      metadata: {
        file: video_path,
        duration: 0,
        fps: 0,
        frame_count: 0,
        width: 0,
        height: 0,
        format: 0
      },
      frames: [],
      ocr_results: [],
      audio_transcript: null,
      error: `Video file not found: ${video_path}`
    };
  }

  // BUG-FIX: Check dependencies before attempting video analysis
  const deps = await checkVideoDependencies();
  if (!deps.ffmpeg) {
    return {
      video_path,
      metadata: {
        file: video_path,
        duration: 0,
        fps: 0,
        frame_count: 0,
        width: 0,
        height: 0,
        format: 0
      },
      frames: [],
      ocr_results: [],
      audio_transcript: null,
      error: 'ffmpeg is not installed or not in PATH. Please install ffmpeg first.'
    };
  }
  if (!deps.python) {
    return {
      video_path,
      metadata: {
        file: video_path,
        duration: 0,
        fps: 0,
        frame_count: 0,
        width: 0,
        height: 0,
        format: 0
      },
      frames: [],
      ocr_results: [],
      audio_transcript: null,
      error: 'Python 3 is not installed or not in PATH. Please install Python 3 first.'
    };
  }

  const scriptPath = getDefaultScriptPath();
  
  if (!fs.existsSync(scriptPath)) {
    // BUG-FIX: Provide clear guidance on required dependencies
    return {
      video_path,
      metadata: {
        file: video_path,
        duration: 0,
        fps: 0,
        frame_count: 0,
        width: 0,
        height: 0,
        format: 0
      },
      frames: [],
      ocr_results: [],
      audio_transcript: null,
      error: 'video_analyzer.py script not found. Please place it in one of the expected locations or install it manually.'
    };
  }

  const pythonCmd = getPythonCommand();

  const args: string[] = [scriptPath, video_path];

  if (num_frames !== 10) {
    args.push('--num-frames', num_frames.toString());
  }

  if (output_dir && output_dir !== './video_frames') {
    args.push('--output-dir', output_dir);
  }

  if (!ocr) {
    args.push('--no-ocr');
  }

  if (whisper) {
    args.push('--whisper');
    if (whisper_model && whisper_model !== 'base') {
      args.push('--whisper-model', whisper_model);
    }
  }

  args.push('--json');

  try {
    // BUG-17 FIX: Increased maxBuffer from 10MB to 50MB for Whisper outputs
    const { stdout, stderr } = await execFileAsync(pythonCmd, args, {
      cwd: process.cwd(),
      timeout: 300000, // 5 minutes timeout for Whisper
      maxBuffer: 1024 * 1024 * 50 // 50MB buffer
    });

    if (stderr) {
      logger_video.error('Video Analyzer stderr:', stderr);
    }

    const result: VideoAnalysisResult = JSON.parse(stdout);
    return result;

  } catch (error: any) {
    return {
      video_path,
      metadata: {
        file: video_path,
        duration: 0,
        fps: 0,
        frame_count: 0,
        width: 0,
        height: 0,
        format: 0
      },
      frames: [],
      ocr_results: [],
      audio_transcript: null,
      error: `Failed to analyze video: ${error.message}`
    };
  }
}
