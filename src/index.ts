// LM Studio SDK toolsProvider pattern
import { PluginContext, ToolsProviderController, tool, Tool } from "@lmstudio/sdk";
import { z } from "zod";
import * as crypto from 'crypto';

// Import all tool implementations from separate modules
import { webSearch, fetchWebContent } from './tools/websearch';
import { createFile, readFile, searchDirectory } from './tools/fileops';
import { cat, catMultiple, isSymlink, getSymlinkTarget } from './tools/read_file';
import { grep } from './tools/grep';
import { runCommand } from './tools/terminal';
import { executeCode } from './tools/exec';
import { applyPatch } from './tools/patch';
import { visualQuestionAnswering } from './tools/vision';
import { memorySet, memoryGet, memoryList, memoryDelete, memoryLogAppend, memoryLogTail } from './tools/memory';
import { indexBuild, indexQuery, indexUpdate } from './tools/index';
import { validateSchema } from './tools/validate';
import { readImage } from './tools/vision';
// sandbox.ts is truncated - using stubs
import { stubTool as checkEnv, stubTool as runInSandbox, stubTool as manageSandbox } from './tools/sandbox';
import { gitStatus, gitDiff, gitLog, gitBlame } from './tools/git_ops';
// git_read.ts is truncated - using stubs
import { stubTool as listFilesInCommit, stubTool as readFileFromCommit } from './tools/git_read';
import { runBackgroundTask, checkTaskStatus, stopTask } from './tools/background';
import { transcribeAudio } from './tools/audio';
import { describeImage } from './tools/image_desc';
// github_ops.ts is truncated - using stubs
import { analyzeVideo } from './tools/video';
import { findSymbol, getReferences } from './tools/code_intel';
import { saveWork, loadWork, clearWork, setBreak, checkBreak } from './tools/task_state';
import { writeFile, writeFileAppend } from './tools/write_file';
import { editFile, replaceTextInFile, insertLinesInFile, deleteLinesInFile } from './tools/edit_file';
import { listDirectory } from './tools/list_directory';
// cleanupSandboxFiles stubs
const cleanupSandboxFiles = async () => JSON.stringify({ success: false, error: 'Tool truncated' });
const cleanupSandboxFilesTTL = async () => JSON.stringify({ success: false, error: 'Tool truncated' });
import { copyFile } from './tools/copy_file';
// drive_ops.ts is truncated - using stubs
import { stubTool as cleanupDriveAuth } from './tools/drive_ops';
import { cleanupBackgroundResources, stopBackgroundCleanup } from './tools/background';
import { clearIndex } from './tools/index';

// Memory & Context Tools (Design 2)
// memory_rebuild.ts is truncated - using stubs
import { stubTool as rebuildMemory, stubTool as readMemoryProfile, stubTool as indexConversations } from './tools/memory_rebuild';

// ===================== PATTERN BREAKER (DRY-RUN & SAFETY) =====================
// External loop guard for agentic safety - prevents models from 
// calling the same tool with identical arguments repeatedly.

interface ToolCallEntry {
  name: string;
  argsHash: string; // SHA-256 of JSON-stringified sorted params
}

class PatternBreaker {
  private disabled = false;
  private window: ToolCallEntry[] = [];
  private readonly MAX_WINDOW = 20;
  private readonly CONSECUTIVE_THRESHOLD = 3;

  check(newCall: ToolCallEntry): { blocked: true; message: string } | { blocked: false } {
    // If disabled, skip all checks
    if (this.disabled) {
      return { blocked: false };
    }
    this.window.unshift({ ...newCall });
    if (this.window.length > this.MAX_WINDOW) this.window.pop();

    // Check consecutive runs of identical calls
    let count = 1;
    for (let i = 1; i < this.window.length; i++) {
      if (
        this.window[i].name === newCall.name &&
        this.window[i].argsHash === newCall.argsHash
      ) {
        count++;
      } else break;
    }

    if (count >= this.CONSECUTIVE_THRESHOLD) {
      return {
        blocked: true,
        message: `You've called ${newCall.name} with identical arguments ${count} times in a row. Stop and reconsider your approach before continuing.`
      };
    }

    // Also check for near-duplicates (same tool name, very similar args)
    const similarCalls = this.window.filter(
      entry => entry.name === newCall.name && entry !== newCall
    );
    if (similarCalls.length >= 5) {
      return {
        blocked: true,
        message: `You've called ${newCall.name} with very similar arguments ${similarCalls.length + 1} times recently. Consider a different approach.`
      };
    }

    return { blocked: false };
  }

  reset(): void {
    this.window = [];
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
  }

  getDisabled(): boolean {
    return this.disabled;
  }
}

/**
 * Sort object keys recursively for consistent hashing.
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted: any = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObjectKeys(obj[key]);
  });
  return sorted;
}

/**
 * Create a SHA-256 hash of tool arguments.
 */
function argsToHash(args: Record<string, any>): string {
  return crypto.createHash('sha256')
    .update(JSON.stringify(sortObjectKeys(args)))
    .digest('hex');
}

// Global pattern breaker instance (shared across all tool calls)
const patternBreaker = new PatternBreaker();

/**
 * Wrap a tool implementation with pattern breaker checking.
 * Blocks repetitive tool calls to prevent infinite loops.
 */
function wrapWithPatternBreaker(
  toolName: string,
  impl: (params: any, ctx: any) => Promise<string>
): (params: any, ctx: any) => Promise<string> {
  return async (params: any, ctx: any) => {
    const checkResult = patternBreaker.check({
      name: toolName,
      argsHash: argsToHash(params)
    });

    if (checkResult.blocked) {
      return JSON.stringify({
        success: false,
        blocked_by_pattern_breaker: true,
        message: `Repetitive call blocked: ${toolName}`
      });
    }

    // Proceed with actual tool call
    return impl(params, ctx);
  };
}
/**
 * Reset pattern breaker state (useful for manual intervention).
 */
export function resetPatternBreaker(): void {
  patternBreaker.reset();
}

/**
 * Check if the pattern breaker is currently disabled.
 */
export function isPatternBreakerDisabled(): boolean {
  return patternBreaker.getDisabled();
}

/**
 * Toggle the pattern breaker on/off.
 */
export function togglePatternBreaker(): void {
  patternBreaker.setDisabled(!patternBreaker.getDisabled());
}

/**
 * Safe handler wrapper for tool implementations
 */
function safeHandler(fn: () => Promise<string>): () => Promise<string> {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, null, 2);
    }
  };
}

/**
 * Registers all tools using the LM Studio SDK toolsProvider pattern.
 */
export async function toolsProvider(ctl: ToolsProviderController): Promise<Tool[]> {
  const tools: Tool[] = [];

  // === CORE TOOLS ===

  const webSearchTool = tool({
    name: "web_search",
    description: "Search the web using DuckDuckGo (default). For Google, Bing, or other search engines, use the browse_js tool to render the search page in a headless browser.",
    parameters: {
      query: z.string().describe("Search query"),
      engine: z.enum(["duckduckgo"]).default("duckduckgo").describe("Search engine to use (currently only DuckDuckGo is supported via node-fetch)"),
      max_results: z.number().default(10).describe("Maximum number of results"),
      search_type: z.enum(["web", "news", "images"]).default("web").describe("Type of search"),
      region: z.string().default("wt-wt").describe("Region code (e.g., us-en, uk-en)"),
      safesearch: z.enum(["on", "moderate", "off"]).default("moderate").describe("Safe search level"),
      language: z.string().default("en").describe("Language code (e.g., en, es, fr)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      return webSearch({
        query: params.query,
        engine: params.engine,
        maxResults: params.max_results,
        searchType: params.search_type,
        region: params.region,
        safesearch: params.safesearch,
        language: params.language
      });
    }
  });
  tools.push(webSearchTool);

  const fetchWebContentTool = tool({
    name: "fetch_web_content",
    description: "Fetch and extract clean text content from a URL. Removes scripts, styles, and navigation elements.",
    parameters: {
      url: z.string().describe("URL to fetch"),
      max_length: z.number().default(10000).describe("Maximum text length to return")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      return fetchWebContent(params.url, params.max_length);
    }
  });
  tools.push(fetchWebContentTool);

  const createFileTool = tool({
    name: "create_file",
    description: "Create a file in various formats (txt, md, json, csv, html, docx, pdf).",
    parameters: {
      file_type: z.enum(["txt", "md", "json", "csv", "html", "docx", "pdf"]).describe("File format"),
      filename: z.string().describe("Output filename"),
      content: z.string().optional().describe("Content text (for txt, md, html, docx, pdf)"),
      title: z.string().optional().describe("Document title (for docx, pdf, html, md)"),
      headers: z.string().optional().describe("CSV headers (comma-separated)"),
      rows: z.string().optional().describe("CSV rows (pipe-separated)"),
      data: z.string().optional().describe("JSON data string"),
      output_dir: z.string().optional().describe("Output directory (default: home directory)"),
      styled: z.boolean().default(true).describe("Add CSS styling for HTML"),
      paragraphs: z.string().optional().describe("DOCX paragraphs (pipe-separated)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const options: Record<string, any> = {};
      if (params.title) options.title = params.title;
      if (params.output_dir) options.outputDir = params.output_dir;
      if (params.headers) options.headers = params.headers;
      if (params.rows) options.rows = params.rows;
      if (params.data) options.data = params.data;
      if (params.styled !== undefined) options.styled = params.styled;
      if (params.paragraphs) options.paragraphs = params.paragraphs;
      return createFile(params.file_type, params.filename, params.content || '', options);
    }
  });
  tools.push(createFileTool);

  const readFileTool = tool({
    name: "read_file",
    description: "Read the content of a file (txt, md, json, csv, html, docx, pdf, ts, js, py, css, json, xml, yaml, yml, toml, ini, cfg, log, sql, sh, bash, zsh, ps1, rb, go, rs, java, c, cpp, h, cs, php, swift, kt, scala, r, m, pl, lua, hs, ml, ex, exs, erl, hrl, v, sv, verilog, vhdl, asm, s, Makefile, CMakeLists.txt, Dockerfile, Wscript, wsf, cmd, bat, ps1, psd1, psm1, jscsrc, eslintrc, babelrc, prettierrc, editorconfig, npmrc, yarn.lock, package-lock.json, tsconfig.json, jsconfig.json, webpack.config.js, rollup.config.js, vite.config.js, vite.config.ts, tailwind.config.js, postcss.config.js, jest.config.js, karma.conf.js, mocharc.json, cypress.json, wdio.conf.js, protractor.conf.js, angular.json, nx.json, lerna.json, pnpm-workspace.yaml, turbo.json, rush.json, lighthouse-ci.json, eslint.json, stylelint.json, commitlint.config.js, husky.config.js, lint-staged.config.js, release.config.js, semantic-release.config.js, changelog.config.js, standard-version.config.js, conventional-changelog.config.js, cz-customizable.config.js, commitizen.config.js, cz-config.js, cz-customizable.js, cz-conventional-changelog.js, cz-emoji.js, cz-emoji-config.js, cz-git.js, cz-git-config.js, cz-cli.js, cz-cli-config.js, cz-conventional.js, cz-conventional-config.js, cz-emoji.js, cz-emoji-config.js, cz-git.js, cz-git-config.js, cz-cli.js, cz-cli-config.js. ⚠️ PREFERRED OVER SHELL COMMANDS! Use this instead of run_command for reading files to avoid escaping bugs.",
    parameters: {
      filepath: z.string().describe("Path to the file to read")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      return readFile(params.filepath);
    }
  });
  tools.push(readFileTool);

  const searchDirectoryTool = tool({
    name: "search_directory",
    description: "Search for files in a directory by name pattern, extension, size, date, or content. Supports recursive search and sorting.",
    parameters: {
      root_dir: z.string().describe("Directory to search"),
      pattern: z.string().optional().describe("Glob pattern (e.g., *.py, config*)"),
      extensions: z.string().optional().describe("File extensions (comma-separated, e.g., py,txt,md)"),
      min_size: z.number().optional().describe("Minimum file size in bytes"),
      max_size: z.number().optional().describe("Maximum file size in bytes"),
      after_date: z.string().optional().describe("Modified after date (YYYY-MM-DD)"),
      before_date: z.string().optional().describe("Modified before date (YYYY-MM-DD)"),
      content_query: z.string().optional().describe("Search file contents for text"),
      recursive: z.boolean().default(true).describe("Search subdirectories recursively"),
      sort_by: z.enum(["name", "size", "date", "type"]).default("name").describe("Sort results by"),
      case_sensitive: z.boolean().default(false).describe("Case-sensitive matching"),
      max_results: z.number().default(200).describe("Maximum results to return"),
      max_output_length: z.number().default(50000).describe("Maximum output length in characters to prevent token limit exceeded"),
      show_details: z.boolean().default(true).describe("Show detailed output with size, date, type")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const options: Record<string, any> = {};
      if (params.pattern) options.pattern = params.pattern;
      if (params.extensions) options.extensions = params.extensions;
      if (params.min_size !== undefined) options.minSize = params.min_size;
      if (params.max_size !== undefined) options.maxSize = params.max_size;
      if (params.after_date) options.afterDate = params.after_date;
      if (params.before_date) options.beforeDate = params.before_date;
      if (params.content_query) options.contentQuery = params.content_query;
      if (params.recursive !== undefined) options.recursive = params.recursive;
      if (params.sort_by) options.sortBy = params.sort_by;
      if (params.case_sensitive !== undefined) options.caseSensitive = params.case_sensitive;
      if (params.max_results !== undefined) options.maxResults = params.max_results;
      if (params.max_output_length !== undefined) options.maxOutputLength = params.max_output_length;
      if (params.show_details !== undefined) options.showDetails = params.showDetails;
      return searchDirectory(params.root_dir, options);
    }
  });
  tools.push(searchDirectoryTool);

  const grepTool = tool({
    name: "grep",
    description: "Search files for a pattern using ripgrep (rg). Fast, recursive, and supports regex.",
    parameters: {
      pattern: z.string().describe("Search pattern (regex supported)"),
      path: z.string().default(".").describe("Path to search (default: current directory)"),
      recursive: z.boolean().default(true).describe("Search subdirectories recursively"),
      ignore_case: z.boolean().default(false).describe("Case-insensitive search"),
      glob: z.string().optional().describe("Glob pattern to filter files (e.g., \"*.py\")"),
      max_count: z.number().optional().describe("Maximum number of matches to return"),
      include_line_numbers: z.boolean().default(true).describe("Include line numbers in output"),
      use_json: z.boolean().default(false).describe("Return structured JSON output"),
      timeout_seconds: z.number().default(30).describe("Timeout in seconds")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await grep({
        pattern: params.pattern,
        path: params.path || ".",
        recursive: params.recursive ?? true,
        ignore_case: params.ignore_case ?? false,
        glob: params.glob,
        max_count: params.max_count,
        include_line_numbers: params.include_line_numbers ?? true,
        use_json: params.use_json ?? false,
        timeout_seconds: params.timeout_seconds ?? 30
      });
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(grepTool);

  const runCommandTool = tool({
    name: "run_command",
    description: "Execute a terminal command. Use \"auto\" for the shell to let the plugin choose the best shell for the OS (PowerShell on Windows, Bash on Linux/Mac). WARNING: This executes arbitrary commands. ⚠️ PREFER toolkit tools (write_file, edit_file, read_file) over run_command for text operations. Complex PowerShell/Bash strings break escaping through JSON tool calls. Use run_command only for sandboxing (Docker/WSL), external binaries, or native shell operations.",
    parameters: {
      command: z.string().describe("The command to execute"),
      shell: z.enum(["auto", "powershell", "cmd", "bash", "sh"]).default("auto").describe("The shell to use"),
      timeout: z.number().default(30000).describe("Command timeout in milliseconds")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      return runCommand({
        command: params.command,
        shell: params.shell,
        timeout: params.timeout
      });
    }
  });
  tools.push(runCommandTool);

  const executeCodeTool = tool({
    name: "execute_code",
    description: "Execute code in Python, Bash, or Node.js with timeout, output capture, and truncation. Returns structured JSON with stdout, stderr, exit_code, timed_out, and duration_ms.",
    parameters: {
      language: z.enum(["python", "bash", "powershell", "node"]).describe("Language to execute"),
      code: z.string().optional().describe("Inline code to execute"),
      file_path: z.string().optional().describe("Path to file to execute (mutually exclusive with code)"),
      timeout_seconds: z.number().default(15).describe("Timeout in seconds (default: 15, max: 120)"),
      cwd: z.string().optional().describe("Working directory"),
      args: z.array(z.string()).optional().describe("Command arguments")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await executeCode(
        params.language,
        params.code,
        params.file_path,
        params.timeout_seconds,
        params.cwd,
        params.args
      );
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(executeCodeTool);

  const applyPatchTool = tool({
    name: "apply_patch",
    description: "Apply a unified diff patch to a file. Supports dry-run mode, hunk-by-hunk application with conflict reporting, and automatic .bak backups.",
    parameters: {
      file_path: z.string().describe("Path to file to patch"),
      diff: z.string().describe("Unified diff string"),
      dry_run: z.boolean().default(false).describe("Validate only, do not write"),
      all_or_nothing: z.boolean().default(false).describe("Fail if any hunk fails")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      // Wrap with pattern breaker for safety
      const wrappedImpl = wrapWithPatternBreaker("apply_patch", (p: any) => 
        applyPatch(p.file_path, p.diff, p.dry_run, p.all_or_nothing).then(r => JSON.stringify(r, null, 2))
      );
      return wrappedImpl(params, ctx);
    }
  });
  tools.push(applyPatchTool);

  // === MEMORY TOOLS ===

  const memorySetTool = tool({
    name: "memory_set",
    description: "Set a key-value pair in persistent memory (SQLite-backed). Survives LM Studio restarts.",
    parameters: {
      key: z.string().describe("Storage key"),
      value: z.string().describe("Value to store"),
      namespace: z.string().default("default").describe("Namespace for isolation")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await memorySet(params.key, params.value, params.namespace);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(memorySetTool);

  const memoryGetTool = tool({
    name: "memory_get",
    description: "Get a value by key from persistent memory. Returns null if absent (not an error).",
    parameters: {
      key: z.string().describe("Storage key"),
      namespace: z.string().default("default").describe("Namespace to search in")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await memoryGet(params.key, params.namespace);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(memoryGetTool);

  const memoryListTool = tool({
    name: "memory_list",
    description: "List keys in persistent memory. Supports prefix filtering.",
    parameters: {
      namespace: z.string().default("default").describe("Namespace to list from"),
      prefix: z.string().optional().describe("Prefix filter (LIKE match)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await memoryList(params.namespace, params.prefix);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(memoryListTool);

  const memoryDeleteTool = tool({
    name: "memory_delete",
    description: "Delete a key from persistent memory.",
    parameters: {
      key: z.string().describe("Key to delete"),
      namespace: z.string().default("default").describe("Namespace to delete from")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await memoryDelete(params.key, params.namespace);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(memoryDeleteTool);

  const memoryLogAppendTool = tool({
    name: "memory_log_append",
    description: "Append text to the append-only memory log. Auto-timestamped.",
    parameters: {
      text: z.string().describe("Text to log")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await memoryLogAppend(params.text);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(memoryLogAppendTool);

  const memoryLogTailTool = tool({
    name: "memory_log_tail",
    description: "Get the last N log entries from persistent memory. Default: 50.",
    parameters: {
      n: z.number().default(50).describe("Number of entries to return")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await memoryLogTail(params.n);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(memoryLogTailTool);

  // === MEMORY REBUILD & AUTO-INJECT (DESIGN 2) ===

  const rebuildMemoryTool = tool({
    name: "rebuild_memory",
    description: "Rebuild persistent memory profile from LM Studio conversations. Reads recent conversation JSON files, extracts key information, and produces a structured summary at ~/.toolkit/memory/user_profile.md organized into categories (work context, personal context, top of mind, recent history, long-term background). Run this after starting new projects to establish baseline context.",
    parameters: {
      conversations_dir: z.string().optional().describe("Path to LM Studio conversations directory (default: ~/.lmstudio/conversations)"),
      output_path: z.string().optional().describe("Output path for memory profile.md (default: ~/.toolkit/memory/user_profile.md)"),
      max_conversations: z.number().default(100).describe("Max conversation files to analyze"),
      max_summary_length: z.number().default(500).describe("Max chars per summary entry")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      return JSON.stringify(await rebuildMemory({
        conversationsDir: params.conversations_dir,
        outputPath: params.output_path,
        maxConversations: params.max_conversations,
        maxSummaryLength: params.max_summary_length
      }), null, 2);
    }
  });
  tools.push(rebuildMemoryTool);

  const readMemoryProfileTool = tool({
    name: "read_memory_profile",
    description: "Read the current persistent memory profile. Returns the structured summary at ~/.toolkit/memory/user_profile.md. Useful for auto-inject context or manual review.",
    parameters: {
      path: z.string().optional().describe("Path to memory profile (default: ~/.toolkit/memory/user_profile.md)"),
      max_chars: z.number().default(10000).describe("Limit returned content length for auto-inject")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      return JSON.stringify(await readMemoryProfile({
        path: params.path,
        maxChars: params.max_chars
      }), null, 2);
    }
  });
  tools.push(readMemoryProfileTool);

  // === VALIDATION & VISION ===

  const validateSchemaTool = tool({
    name: "validate_schema",
    description: "Validate JSON/YAML data against JSON Schema. Returns precise error paths for fixing.",
    parameters: {
      data: z.string().optional().describe("Inline JSON/YAML string"),
      schema: z.string().optional().describe("Inline JSON Schema string"),
      file_path: z.string().optional().describe("Path to data file (JSON or YAML)"),
      schema_path: z.string().optional().describe("Path to schema file (JSON)"),
      format: z.enum(["json", "yaml"]).default("json").describe("Data format")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await validateSchema(
        params.data,
        params.schema,
        params.file_path,
        params.schema_path,
        params.format
      );
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(validateSchemaTool);

  const readImageTool = tool({
    name: "read_image",
    description: "Extract text from images using Tesseract OCR (offline). Reports image dimensions/format regardless of OCR success.",
    parameters: {
      file_path: z.string().describe("Path to image file"),
      ocr_only: z.boolean().default(false).describe("Only return text (no metadata)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await readImage(params.file_path, params.ocr_only);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(readImageTool);

  // === SANDBOX TOOLS ===

  const checkEnvTool = tool({
    name: "check_env",
    description: "Checks the host environment for Docker, WSL2, and PowerShell 7+ availability. Returns system status and default sandbox type.",
    parameters: {
      check_docker: z.boolean().default(true).describe("Check for Docker"),
      check_wsl2: z.boolean().default(true).describe("Check for WSL2"),
      check_pwsh: z.boolean().default(true).describe("Check for PowerShell 7+")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await checkEnv();
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(checkEnvTool);

  const runInSandboxTool = tool({
    name: "run_in_sandbox",
    description: "Execute code in an isolated sandbox environment (Docker or WSL2). Provides security by isolating execution from the host system.",
    parameters: {
      language: z.enum(["python", "node", "bash"]).describe("Language to execute"),
      code: z.string().optional().describe("Inline code to execute"),
      file_path: z.string().optional().describe("Path to file to execute (mutually exclusive with code)"),
      timeout_seconds: z.number().default(30).describe("Timeout in seconds (default: 30, max: 120)"),
      cwd: z.string().optional().describe("Working directory"),
      args: z.array(z.string()).optional().describe("Command arguments"),
      network_enabled: z.boolean().default(false).describe("Enable network access in sandbox")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await runInSandbox(
        params.language,
        params.code,
        params.file_path,
        params.timeout_seconds,
        params.cwd,
        params.args,
        params.network_enabled
      );
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(runInSandboxTool);

  const manageSandboxTool = tool({
    name: "manage_sandbox",
    description: "Manage sandbox resources, such as pulling Docker images or listing available images.",
    parameters: {
      action: z.enum(["pull", "list"]).describe("Action to perform"),
      image: z.string().describe("Docker image name (required for pull action)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await manageSandbox(params.action, params.image);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(manageSandboxTool);

  // === GIT TOOLS ===

  const gitStatusTool = tool({
    name: "git_status",
    description: "Check the status of a Git repository. Returns modified files, untracked files, and current branch.",
    parameters: {
      directory: z.string().describe("Path to the Git repository")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await gitStatus(params.directory);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(gitStatusTool);

  const gitDiffTool = tool({
    name: "git_diff",
    description: "Show changes between commits, commit and working tree, etc. Returns the diff output.",
    parameters: {
      directory: z.string().describe("Path to the Git repository"),
      file: z.string().optional().describe("Specific file to diff (optional)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await gitDiff(params.directory, params.file);
  // === VQA TOOL ===
  const visualQuestionAnsweringTool = tool({
    name: "visual_question_answering",
    description: "Answer specific questions about an image using BLIP-2. Supports yes/no, object detection, and reasoning.",
    parameters: {
      file_path: z.string().describe("Path to the image file"),
      question: z.string().describe("The question to answer about the image")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await visualQuestionAnswering(params.file_path, params.question);
      return JSON.stringify({ success: true, answer: result }, null, 2);
    }
  });
  tools.push(visualQuestionAnsweringTool);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(gitDiffTool);

  const gitLogTool = tool({
    name: "git_log",
    description: "List commit history. Returns recent commits with hash, author, date, and message.",
    parameters: {
      directory: z.string().describe("Path to the Git repository"),
      n: z.number().default(10).describe("Number of commits to show")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await gitLog(params.directory, params.n);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(gitLogTool);

  const gitBlameTool = tool({
    name: "git_blame",
    description: "Show what revision and author last modified each line of a file. Useful for tracking code ownership.",
    parameters: {
      directory: z.string().describe("Path to the Git repository"),
      file: z.string().describe("File to blame")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await gitBlame(params.directory, params.file);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(gitBlameTool);

  const gitListFilesTool = tool({
    name: "git_list_files",
    description: "List files in a specific Git commit or branch. Useful for browsing historical code.",
    parameters: {
      directory: z.string().describe("Path to the Git repository"),
      commit: z.string().default("HEAD").describe("Commit hash, branch, or tag"),
      path_in_tree: z.string().optional().describe("Optional subdirectory to list")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await listFilesInCommit(params.directory, params.commit, params.path_in_tree);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(gitListFilesTool);

  const gitReadFileTool = tool({
    name: "git_read_file",
    description: "Read the content of a file from a specific Git revision.",
    parameters: {
      directory: z.string().describe("Path to the Git repository"),
      commit: z.string().default("HEAD").describe("Commit hash, branch, or tag"),
      file_path: z.string().describe("Path to the file in the repository")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await readFileFromCommit(params.directory, params.commit, params.file_path);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(gitReadFileTool);

  // === BACKGROUND TASK TOOLS ===

  const runBackgroundTaskTool = tool({
    name: "run_background_task",
    description: "Run a command in the background. Returns a task_id immediately. Use check_task_status to monitor progress.",
    parameters: {
      command: z.string().describe("The command to execute"),
      shell: z.enum(["auto", "powershell", "cmd", "bash", "sh"]).default("auto").describe("The shell to use"),
      cwd: z.string().optional().describe("Working directory"),
      timeout: z.number().default(300).describe("Timeout in seconds")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await runBackgroundTask(
        params.command,
        params.shell,
        params.cwd,
        params.timeout
      );
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(runBackgroundTaskTool);

  const checkTaskStatusTool = tool({
    name: "check_task_status",
    description: "Check the status of a background task. Returns stdout, stderr, and exit code if completed.",
    parameters: {
      task_id: z.string().describe("The task ID returned by run_background_task")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await checkTaskStatus(params.task_id);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(checkTaskStatusTool);

  const stopTaskTool = tool({
    name: "stop_task",
    description: "Stop a running background task.",
    parameters: {
      task_id: z.string().describe("The task ID to stop")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await stopTask(params.task_id);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(stopTaskTool);

  // === MULTIMODAL TOOLS ===

  const transcribeAudioTool = tool({
    name: "transcribe_audio",
    description: "Transcribe audio files using whisper.cpp (offline). Supports .wav, .mp3, .mp4 formats.",
    parameters: {
      file_path: z.string().describe("Path to the audio file"),
      language: z.string().default("en").describe("Language code (e.g., en, es, fr)"),
      model: z.string().default("base").describe("Whisper model size (tiny, base, small, medium, large)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await transcribeAudio(params.file_path, params.language, params.model);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(transcribeAudioTool);

  const describeImageTool = tool({
    name: "describe_image",
    description: "Describe the content of an image using a local vision model (BLIP). Returns a text description, not just OCR.",
    parameters: {
      file_path: z.string().describe("Path to the image file")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await describeImage(params.file_path);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(describeImageTool);

  // === CODE INTEL TOOLS ===

  const findSymbolTool = tool({
    name: "find_symbol",
    description: "Find the definition of a symbol (function, variable) in a directory.",
    parameters: {
      symbol: z.string().describe("The symbol name to find"),
      directory: z.string().describe("Path to the directory to search"),
      language: z.enum(["python", "javascript", "typescript", "cpp", "c"]).default("python").describe("Language of the symbol")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await findSymbol(params.symbol, params.directory, params.language);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(findSymbolTool);

  const getReferencesTool = tool({
    name: "get_references",
    description: "Find all references to a symbol in a directory.",
    parameters: {
      symbol: z.string().describe("The symbol name to find references for"),
      directory: z.string().describe("Path to the directory to search"),
      language: z.enum(["python", "javascript", "typescript", "cpp", "c"]).default("python").describe("Language of the symbol")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await getReferences(params.symbol, params.directory, params.language);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(getReferencesTool);

  const browseJsTool = tool({
    name: "browse_js",
    description: "Render a dynamic web page using a headless browser (Playwright). Returns the full HTML content. Supports waiting for specific elements to load.",
    parameters: {
      url: z.string().describe("URL to browse"),
      wait_for_selector: z.string().default("").describe("Optional CSS selector to wait for before returning (e.g., \"#main-content\")")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const { browseWebsite } = await import('./tools/browser');
      const result = await browseWebsite(
        params.url,
        params.wait_for_selector || undefined,
        15000
      );
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(browseJsTool);
  
  // === VIDEO ANALYSIS ===

  const analyzeVideoTool = tool({
    name: "analyze_video",
    description: "Analyze a video file by extracting visual chunks (frames) and full audio transcripts. Returns structured data for AI consumption.",
    parameters: {
      file_path: z.string().describe("Path to the video file"),
      interval: z.number().default(5).describe("Seconds between visual frames (default: 5)"),
      question: z.string().optional().describe("Optional question to answer based on the analysis")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await analyzeVideo({
        video_path: params.file_path,
        num_frames: Math.ceil(params.interval * 10),
        ocr: true,
        whisper: true
      });
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(analyzeVideoTool);

  // === TASK STATE TOOLS ===

  const saveWorkTool = tool({
    name: "save_work",
    description: "Save work state to a persistent key for later retrieval.",
    parameters: {
      key: z.string().describe("Storage key"),
      content: z.string().describe("Content to save")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await saveWork(params.key, params.content);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(saveWorkTool);

  const loadWorkTool = tool({
    name: "load_work",
    description: "Load previously saved work state by key.",
    parameters: {
      key: z.string().describe("Storage key")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await loadWork(params.key);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(loadWorkTool);

  const clearWorkTool = tool({
    name: "clear_work",
    description: "Clear saved work state by key.",
    parameters: {
      key: z.string().describe("Storage key")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await clearWork(params.key);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(clearWorkTool);

  const setBreakTool = tool({
    name: "set_break",
    description: "Set a break flag to halt current approach and force clarification.",
    parameters: {} as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await setBreak();
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(setBreakTool);

  const checkBreakTool = tool({
    name: "check_break",
    description: "Check if a break flag has been set in the last minute.",
    parameters: {} as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await checkBreak();
      return JSON.stringify({ success: true, break_set: result }, null, 2);
    }
  });
  tools.push(checkBreakTool);

  // === FILE WRITE TOOLS (DRY-RUN SUPPORTED) ===

  const writeFileTool = tool({
    name: "write_file",
    description: "Write content to a file. Creates parent directories automatically if they don't exist. Supports dry_run mode for preview.",
    parameters: {
      path: z.string().describe("Absolute or relative path to the file"),
      content: z.string().describe("Content to write to the file"),
      append: z.boolean().default(false).describe("If true, append instead of overwrite"),
      create_dir: z.boolean().default(true).describe("Create parent directories if needed"),
      dry_run: z.boolean().default(false).describe("If true, preview changes without writing (returns would_write: true with content hash)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      // Wrap with pattern breaker for safety
      const wrappedImpl = wrapWithPatternBreaker("write_file", (p: any) => 
        writeFile(p.path, p.content, { createDir: p.create_dir, dryRun: p.dry_run }).then(r => JSON.stringify(r, null, 2))
      );
      return wrappedImpl(params, ctx);
    }
  });
  tools.push(writeFileTool);

  const writeAppendTool = tool({
    name: "write_file_append",
    description: "Write content to a file by appending. Creates parent directories automatically if they don't exist. Supports dry_run mode for preview.",
    parameters: {
      path: z.string().describe("Absolute or relative path to the file"),
      content: z.string().describe("Content to append to the file"),
      create_dir: z.boolean().default(true).describe("Create parent directories if needed"),
      dry_run: z.boolean().default(false).describe("If true, preview changes without writing (returns would_append: true)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      // Wrap with pattern breaker for safety
      const wrappedImpl = wrapWithPatternBreaker("write_file_append", (p: any) => 
        writeFileAppend(p.path, p.content, { createDir: p.create_dir, dryRun: p.dry_run }).then(r => JSON.stringify(r, null, 2))
      );
      return wrappedImpl(params, ctx);
    }
  });
  tools.push(writeAppendTool);

  // === EDIT FILE TOOLS (DRY-RUN SUPPORTED) ===

  const editFileTool = tool({
    name: "edit_file",
    description: "Edit a file by applying operations: replace (find/replace text), insert (add lines at position), or delete (remove line ranges). Supports dry_run mode for preview with unified diff.",
    parameters: {
      file_path: z.string().describe("Path to the file to edit"),
      operations: z.array(z.object({
        type: z.enum(["replace", "insert", "delete"]).describe("Operation type"),
        search: z.string().optional().describe("Text to find (for replace)"),
        replace: z.string().optional().describe("Replacement text (for replace)"),
        line: z.number().optional().describe("1-indexed line number (for insert/delete)"),
        text: z.string().optional().describe("Text to insert (for insert)"),
        end_line: z.number().optional().describe("1-indexed end line, inclusive (for delete)")
      })).describe("Array of edit operations to apply"),
      dry_run: z.boolean().default(false).describe("If true, preview changes with unified diff without writing")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      // Wrap with pattern breaker for safety
      const wrappedImpl = wrapWithPatternBreaker("edit_file", (p: any) => 
        editFile(p.file_path, p.operations, { dryRun: p.dry_run }).then(r => JSON.stringify(r, null, 2))
      );
      return wrappedImpl(params, ctx);
    }
  });
  tools.push(editFileTool);

  const replaceTextTool = tool({
    name: "replace_text_in_file",
    description: "Replace a specific string in a file with a new string. The old_string must be unique in the file.",
    parameters: {
      file_path: z.string().describe("Path to the file"),
      old_string: z.string().describe("Exact text to find and replace"),
      new_string: z.string().describe("Text to replace with")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await replaceTextInFile(params.file_path, params.old_string, params.new_string);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(replaceTextTool);

  const insertLineTool = tool({
    name: "insert_at_line",
    description: "Insert content at a specific line number in a file (1-indexed). Existing content at that line and below will be pushed down.",
    parameters: {
      file_path: z.string().describe("Path to the file"),
      line_number: z.number().describe("1-indexed line number to insert at"),
      content_to_insert: z.string().describe("Text content to insert")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await insertLinesInFile(params.file_path, params.line_number, params.content_to_insert);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(insertLineTool);

  const deleteLinesTool = tool({
    name: "delete_lines_in_file",
    description: "Delete a specific line or range of lines from a file. Line numbers are 1-indexed. If end_line is omitted, only start_line will be deleted.",
    parameters: {
      file_path: z.string().describe("Path to the file"),
      start_line: z.number().describe("Starting line number to delete (1-indexed)"),
      end_line: z.number().optional().describe("Ending line number to delete (inclusive)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await deleteLinesInFile(params.file_path, params.start_line, params.end_line);
      return JSON.stringify(result, null, 2);
    }
  });
  tools.push(deleteLinesTool);


  // === DIRECTORY LISTING ===

  const listDirectoryTool = tool({
    name: "list_directory",
    description: "List files and directories in a given path. Returns structured information including name, type, size, and modification date.",
    parameters: {
      path: z.string().describe("Path to the directory to list"),
      recursive: z.boolean().default(false).describe("List subdirectories recursively"),
      include_files: z.boolean().default(true).describe("Include files in results"),
      include_dirs: z.boolean().default(true).describe("Include directories in results"),
      max_depth: z.number().default(0).describe("Maximum depth for recursive listing (0 = unlimited)"),
      sort_by: z.enum(["name", "size", "date"]).default("name").describe("Sort results by"),
      ascending: z.boolean().default(true).describe("Sort direction")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await listDirectory(params.path, {
        recursive: params.recursive,
        includeFiles: params.include_files,
        includeDirs: params.include_dirs,
        maxDepth: params.max_depth,
        sortBy: params.sort_by,
        ascending: params.ascending
      });
      return result;
    }
  });
  tools.push(listDirectoryTool);


  // === READ FILE / CAT TOOLS (from read_file.ts) ===

  const catTool = tool({
    name: "cat",
    description: "Read any file type with cat-like behavior. Supports text files, binary files, documents (PDF, DOCX, etc.), and more. Returns structured JSON with metadata. Use for reading files that readFile might not handle well (binary documents, specific encodings). Supports streaming for large files, symlink following, line range filtering, and dry-run mode.",
    parameters: {
      filepath: z.string().describe("Path to the file to read"),
      follow_symlinks: z.boolean().default(true).describe("Follow symbolic links (default: true)"),
      max_bytes: z.number().default(52428800).describe("Maximum bytes to read (default: 50MB)"),
      streaming: z.boolean().default(true).describe("Enable streaming for large files >1MB (default: true)"),
      silent: z.boolean().default(false).describe("Suppress metadata output, return raw content only (default: false)"),
      line_range: z.object({
        start: z.number().describe("Starting line number (1-indexed)"),
        end: z.number().optional().describe("Ending line number (1-indexed, optional)")
      }).optional().describe("Read specific line range"),
      dry_run: z.boolean().default(false).describe("Preview without reading the file (default: false)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const options: any = {};
      if (params.follow_symlinks !== undefined) options.followSymlinks = params.follow_symlinks;
      if (params.max_bytes !== undefined) options.maxBytes = params.max_bytes;
      if (params.streaming !== undefined) options.streaming = params.streaming;
      if (params.silent !== undefined) options.silent = params.silent;
      if (params.line_range) options.lineRange = params.line_range;
      if (params.dry_run !== undefined) options.dryRun = params.dry_run;
      return cat(params.filepath, options);
    }
  });
  tools.push(catTool);

  const catMultipleTool = tool({
    name: "cat_multiple",
    description: "Read multiple files and concatenate their content. Returns structured JSON with per-file results and total content. Useful for reading related files together (e.g., multiple source files, config files).",
    parameters: {
      filepaths: z.array(z.string()).describe("Array of file paths to read"),
      follow_symlinks: z.boolean().default(true).describe("Follow symbolic links (default: true)"),
      max_bytes: z.number().default(52428800).describe("Maximum bytes per file (default: 50MB)"),
      streaming: z.boolean().default(true).describe("Enable streaming for large files (default: true)"),
      silent: z.boolean().default(false).describe("Suppress metadata output (default: false)"),
      dry_run: z.boolean().default(false).describe("Preview without reading (default: false)")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const options: any = {};
      if (params.follow_symlinks !== undefined) options.followSymlinks = params.follow_symlinks;
      if (params.max_bytes !== undefined) options.maxBytes = params.max_bytes;
      if (params.streaming !== undefined) options.streaming = params.streaming;
      if (params.silent !== undefined) options.silent = params.silent;
      if (params.dry_run !== undefined) options.dryRun = params.dry_run;
      return catMultiple(params.filepaths, options);
    }
  });
  tools.push(catMultipleTool);

  const isSymlinkTool = tool({
    name: "is_symlink",
    description: "Check if a given path is a symbolic link. Returns structured JSON with the result and path information.",
    parameters: {
      filepath: z.string().describe("Path to check for symlink")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = isSymlink(params.filepath);
      return JSON.stringify({
        success: true,
        path: params.filepath,
        is_symlink: result,
        message: result ? "Path is a symbolic link." : "Path is not a symbolic link."
      }, null, 2);
    }
  });
  tools.push(isSymlinkTool);

  const getSymlinkTargetTool = tool({
    name: "get_symlink_target",
    description: "Get the target of a symbolic link. Returns the resolved target path or null if not a symlink.",
    parameters: {
      filepath: z.string().describe("Path to the symbolic link")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const target = getSymlinkTarget(params.filepath);
      return JSON.stringify({
        success: true,
        path: params.filepath,
        is_symlink: target !== null,
        symlink_target: target,
        message: target ? "Symlink target: " + target : "Path is not a symbolic link."
      }, null, 2);
    }
  });
  tools.push(getSymlinkTargetTool);

  // === COPY FILE TOOL ===

  const copyFileTool = tool({
    name: "copy_file",
    description: "Copy files or directories from source to destination without reading their contents. Useful for moving stuff around without triggering read operations.",
    parameters: {
      source: z.string().describe("Path to the source file or directory"),
      destination: z.string().describe("Path to the destination file or directory"),
      is_directory: z.boolean().default(false).describe("If true, treats source as a directory and copies recursively"),
      create_destination_dir: z.boolean().default(true).describe("Automatically create parent directories if they don't exist")
    } as unknown as Record<string, { parse: (input: any) => any }>,
    implementation: async (params, ctx) => {
      const result = await copyFile(
        params.source,
        params.destination,
        {
          isDirectory: params.is_directory,
          createDestinationDir: params.create_destination_dir
        }
      );
      return result;
    }
  });
  tools.push(copyFileTool);

  return tools;
  return tools;
}

// C-01 FIX: Add cleanupAllResources function to prevent resource leaks
export function cleanupAllResources(): void {
  cleanupSandboxFiles();
  cleanupSandboxFilesTTL();
  cleanupDriveAuth();
  cleanupBackgroundResources();
  stopBackgroundCleanup();
  clearIndex();
}

// LM Studio plugin entry point - required by lms dev
export async function main(context: PluginContext) {
  context.withToolsProvider(toolsProvider);
}

// Keep the process alive so main() doesn't exit immediately
setInterval(() => {}, 60000);

