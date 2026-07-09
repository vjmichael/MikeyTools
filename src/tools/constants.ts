/**
 * L-03 FIX: Centralized constants for the toolkit.
 * Replaces magic numbers scattered throughout the codebase.
 * 
 * IMPORTANT: MAX_OUTPUT_LENGTH is now exported from truncator.ts as DEFAULT_MAX_CHARS.
 * All tools should import DEFAULT_MAX_CHARS from truncator.ts instead of defining their own.
 */

// ===================== TIMEOUTS =====================
export const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
export const MAX_TIMEOUT_MS = 120000; // 2 minutes
export const TASK_TTL_MS = 3600000; // 1 hour
export const CLEANUP_INTERVAL_MS = 300000; // 5 minutes
export const VIDEO_TIMEOUT_MS = 300000; // 5 minutes (for Whisper)

// ===================== BUFFER SIZES =====================
export const MAX_BUFFER_SIZE = 1024 * 1024 * 50; // 50MB

// ===================== FILE SIZES =====================
export const MAX_FILE_SIZE_FOR_PATCH = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_FOR_READ = 100 * 1024 * 1024; // 100MB

// ===================== SEARCH =====================
export const DEFAULT_MAX_RESULTS = 200;
export const DEFAULT_SEARCH_DEPTH = 100;

// ===================== EMBEDDINGS =====================
export const DEFAULT_CHUNK_SIZE = 60;
export const DEFAULT_OVERLAP = 10;
export const DEFAULT_TOP_K = 5;
export const SIMILARITY_FLOOR = 0.3;
export const EMBEDDING_DIMENSION = 384;

// ===================== SANDBOX =====================
export const DEFAULT_SANDBOX_TIMEOUT = 30; // seconds
export const MAX_SANDBOX_TIMEOUT = 120; // seconds
export const SANDBOX_TEMP_DIR_PREFIX = 'sandbox-';

// ===================== GIT =====================
export const GIT_LOG_DEFAULT_N = 10;
export const GIT_BLAME_MAX_LINES = 10000;

// ===================== MEMORY =====================
export const MEMORY_DB_PATH = '.toolkit/memory.sqlite';
export const MEMORY_META_DIR = '.toolkit/meta';
export const BREAK_FLAG_VALIDITY_MS = 60000; // 1 minute

// ===================== GITHUB =====================
export const ALLOWED_GITHUB_ROUTE_PREFIXES = [
  '/repos/',
  '/orgs/',
  '/users/',
  '/search/',
  '/graphql',
  '/app/',
  '/rate_limit'
];

// ===================== VIDEO =====================
export const DEFAULT_NUM_FRAMES = 10;
export const DEFAULT_OUTPUT_DIR = './video_frames';
export const DEFAULT_WHISPER_MODEL = 'base';

// ===================== DOCKER =====================
export const DEFAULT_DOCKER_IMAGE_TAG = '3.19';
export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '*.pyc',
  '*.o',
  '*.class',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.tmp',
  '.toolkit'
];

// ===================== OCR =====================
export const DEFAULT_OCR_LANGUAGE = 'eng';
export const TESSERACT_DATA_DOWNLOAD_URL = 'https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata';

// ===================== VALIDATION =====================
export const DEFAULT_SCHEMA_FORMAT = 'json';

// ===================== GENERAL =====================
export const TOOLKIT_VERSION = '2.2.0';
export const TOOLKIT_NAME = 'universal-toolkit-lm-plugin';
