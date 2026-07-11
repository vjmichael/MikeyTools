/**
 * MCP Server entry point for mikeystoolkit
 * 
 * Exposes all toolkit tools via Model Context Protocol (MCP).
 * Compatible with Jan (jan.ai), Cursor, Claude Desktop, Windsurf, Cline, and any MCP-compatible client.
 * 
 * Launch: node dist/mcp-server.js
 * Config: Point your MCP client to this executable.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DEFAULT_MAX_CHARS, truncateOutput } from "./tools/truncator";

// ==================== IMPORT TOOL IMPLEMENTATIONS ====================

import { webSearch, fetchWebContent } from "./tools/websearch";
import { createFile, readFile, searchDirectory } from "./tools/fileops";
import { cat, catMultiple, isSymlink, getSymlinkTarget } from "./tools/read_file";
import { grep } from "./tools/grep";
import { runCommand } from "./tools/terminal";
import { executeCode } from "./tools/exec";
import { applyPatch } from "./tools/patch";
import { visualQuestionAnsweringViaLmStudio, analyzeVideoViaLmStudio, describeImageViaLmStudio } from "./tools/vision_api";
import { memorySet, memoryGet, memoryList, memoryDelete, memoryLogAppend, memoryLogTail } from "./tools/memory";
import { indexBuild, indexQuery, indexUpdate, clearIndex } from "./tools/index";
import { validateSchema } from "./tools/validate";
import { readImage } from "./tools/vision";
import { checkSandboxAvailability } from "./tools/sandbox";
import { gitStatus, gitDiff, gitLog, gitBlame } from "./tools/git_ops";
import { stubTool as listFilesInCommit, stubTool as readFileFromCommit } from "./tools/git_read";
import { runBackgroundTask, checkTaskStatus, stopTask } from "./tools/background";
import { transcribeAudio } from "./tools/audio";
import { analyzeVideo } from "./tools/video";
import { findSymbol, getReferences } from "./tools/code_intel";
import { saveWork, loadWork, clearWork, setBreak, checkBreak } from "./tools/task_state";
import { writeFile, writeFileAppend } from "./tools/write_file";
import { editFile, replaceTextInFile, insertLinesInFile, deleteLinesInFile } from "./tools/edit_file";
import { listDirectory } from "./tools/list_directory";
import { repairJSON, createJSONRepairTool } from "./tools/json_repair";
import { scratchpadInit, scratchpadWrite, scratchpadAppend, scratchpadRead, scratchpadValidate, scratchpadEdit, scratchpadCommit, scratchpadClear } from "./tools/scratchpad";
import { copyFile } from "./tools/copy_file";
import { cleanupBackgroundResources, stopBackgroundCleanup } from "./tools/background";
import { stubTool as rebuildMemory, stubTool as readMemoryProfile } from "./tools/memory_rebuild";
import { stubTool as cleanupDriveAuth } from "./tools/drive_ops";

// ==================== HELPER: Wrap tool with truncation ====================

function wrapTruncation(
  fn: (params: Record<string, any>) => Promise<string>,
  maxChars?: number
): (params: Record<string, any>) => Promise<string> {
  return async (params: Record<string, any>): Promise<string> => {
    const output = await fn(params);
    const truncated = truncateOutput(output, maxChars || DEFAULT_MAX_CHARS);
    return mcpResult(truncated);
  };
}

// ==================== HELPER: MCP tool result formatter ====================

function mcpResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
}

// ==================== SERVER INITIALIZATION ====================

const server = new McpServer({
  name: "mikeystoolkit",
  version: "2.3.0",
});

// Register all tools
async function registerTools() {

  // === 1. SAFETY & CONTROL ===

  server.tool(
    "set_break",
    "Set a break flag to halt current approach and force clarification.",
    {},
    async () => {
      const result = await setBreak();
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "check_break",
    "Check if a break flag has been set in the last minute.",
    {},
    async () => {
      const result = await checkBreak();
      return mcpResult(JSON.stringify({ success: true, break_set: result }, null, 2));
    }
  );

  // === 2. EXECUTION ===

  server.tool(
    "execute_code",
    "Execute code in Python, Bash, or Node.js with timeout, output capture, and truncation.",
    {
      language: z.enum(["python", "bash", "powershell", "node"]),
      code: z.string().optional(),
      file_path: z.string().optional(),
      timeout_seconds: z.number().default(15),
      cwd: z.string().optional(),
      args: z.array(z.string()).optional(),
    },
    wrapTruncation(async (params) => {
      const result = await executeCode(
        params.language, params.code, params.file_path,
        params.timeout_seconds, params.cwd, params.args
      );
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "run_command",
    "Execute a terminal command. Use \"auto\" for the shell to let the plugin choose the best shell for the OS.",
    {
      command: z.string(),
      shell: z.enum(["auto", "powershell", "cmd", "bash", "sh"]).default("auto"),
      timeout: z.number().default(30000),
    },
    wrapTruncation(async (params) => {
      return JSON.stringify(await runCommand({
        command: params.command, shell: params.shell, timeout: params.timeout,
      }), null, 2);
    })
  );

  // === 3. FILE WRITE ===

  server.tool(
    "write_file",
    "Write content to a file. Creates parent directories automatically. Supports dry_run mode for preview.",
    {
      path: z.string(),
      content: z.string(),
      append: z.boolean().default(false),
      create_dir: z.boolean().default(true),
      dry_run: z.boolean().default(false),
    },
    wrapTruncation(async (params) => {
      return JSON.stringify(await writeFile(params.path, params.content, {
        createDir: params.create_dir, dryRun: params.dry_run,
      }), null, 2);
    })
  );

  server.tool(
    "write_file_append",
    "Write content to a file by appending. Creates parent directories automatically. Supports dry_run mode for preview.",
    {
      path: z.string(),
      content: z.string(),
      create_dir: z.boolean().default(true),
      dry_run: z.boolean().default(false),
    },
    wrapTruncation(async (params) => {
      return JSON.stringify(await writeFileAppend(params.path, params.content, {
        createDir: params.create_dir, dryRun: params.dry_run,
      }), null, 2);
    })
  );

  server.tool(
    "edit_file",
    "Edit a file by applying operations: replace, insert, or delete. Supports dry_run mode for preview.",
    {
      file_path: z.string(),
      operations: z.array(z.object({
        type: z.enum(["replace", "insert", "delete"]),
        search: z.string().optional(),
        replace: z.string().optional(),
        line: z.number().optional(),
        text: z.string().optional(),
        end_line: z.number().optional(),
      })),
      dry_run: z.boolean().default(false),
    },
    wrapTruncation(async (params) => {
      return JSON.stringify(await editFile(params.file_path, params.operations, {
        dryRun: params.dry_run,
      }), null, 2);
    })
  );

  server.tool(
    "create_file",
    "Create a file. Supported special formats: txt, md, json, csv, html, docx, pdf. For other types, content is written as-is.",
    {
      file_type: z.string(),
      filename: z.string(),
      content: z.string().optional(),
      title: z.string().optional(),
      headers: z.string().optional(),
      rows: z.string().optional(),
      data: z.string().optional(),
      output_dir: z.string().optional(),
      styled: z.boolean().default(true),
      paragraphs: z.string().optional(),
    },
    wrapTruncation(async (params) => {
      const options: Record<string, any> = {};
      if (params.title) options.title = params.title;
      if (params.output_dir) options.outputDir = params.output_dir;
      if (params.headers) options.headers = params.headers;
      if (params.rows) options.rows = params.rows;
      if (params.data) options.data = params.data;
      if (params.styled !== undefined) options.styled = params.styled;
      if (params.paragraphs) options.paragraphs = params.paragraphs;
      return createFile(params.file_type, params.filename, params.content || "", options);
    })
  );

  server.tool(
    "apply_patch",
    "Apply a unified diff patch to a file. Supports dry-run mode and hunk-by-hunk application.",
    {
      file_path: z.string(),
      diff: z.string(),
      dry_run: z.boolean().default(false),
      all_or_nothing: z.boolean().default(false),
    },
    wrapTruncation(async (params) => {
      return JSON.stringify(await applyPatch(params.file_path, params.diff, params.dry_run, params.all_or_nothing), null, 2);
    })
  );

  server.tool(
    "replace_text_in_file",
    "Replace a specific string in a file with a new string. The old_string must be unique.",
    {
      file_path: z.string(),
      old_string: z.string(),
      new_string: z.string(),
    },
    wrapTruncation(async (params) => {
      return JSON.stringify(await replaceTextInFile(params.file_path, params.old_string, params.new_string), null, 2);
    })
  );

  server.tool(
    "insert_at_line",
    "Insert content at a specific line number in a file (1-indexed).",
    {
      file_path: z.string(),
      line_number: z.number(),
      content_to_insert: z.string(),
    },
    wrapTruncation(async (params) => {
      return JSON.stringify(await insertLinesInFile(params.file_path, params.line_number, params.content_to_insert), null, 2);
    })
  );

  server.tool(
    "delete_lines_in_file",
    "Delete a specific line or range of lines from a file. Line numbers are 1-indexed.",
    {
      file_path: z.string(),
      start_line: z.number(),
      end_line: z.number().optional(),
    },
    wrapTruncation(async (params) => {
      return JSON.stringify(await deleteLinesInFile(params.file_path, params.start_line, params.end_line), null, 2);
    })
  );

  // === 4. FILE READ ===

  server.tool(
    "read_file",
    "Read the content of a file. Supports txt, md, json, csv, html, docx, pdf, and source code files.",
    {
      filepath: z.string(),
    },
    wrapTruncation(async (params) => {
      return readFile(params.filepath);
    })
  );

  server.tool(
    "cat",
    "Read any file type with cat-like behavior. Supports text files, binary files, documents (PDF, DOCX, etc.).",
    {
      filepath: z.string(),
      follow_symlinks: z.boolean().default(true),
      max_bytes: z.number().default(52428800),
      streaming: z.boolean().default(true),
      silent: z.boolean().default(false),
      line_range: z.object({ start: z.number(), end: z.number().optional() }).optional(),
      dry_run: z.boolean().default(false),
    },
    wrapTruncation(async (params) => {
      const options: any = {};
      if (params.follow_symlinks !== undefined) options.followSymlinks = params.follow_symlinks;
      if (params.max_bytes !== undefined) options.maxBytes = params.max_bytes;
      if (params.streaming !== undefined) options.streaming = params.streaming;
      if (params.silent !== undefined) options.silent = params.silent;
      if (params.line_range) options.lineRange = params.line_range;
      if (params.dry_run !== undefined) options.dryRun = params.dry_run;
      return cat(params.filepath, options);
    })
  );

  server.tool(
    "cat_multiple",
    "Read multiple files and concatenate their content. Returns structured JSON with per-file results.",
    {
      filepaths: z.array(z.string()),
      follow_symlinks: z.boolean().default(true),
      max_bytes: z.number().default(52428800),
      streaming: z.boolean().default(true),
      silent: z.boolean().default(false),
      dry_run: z.boolean().default(false),
    },
    wrapTruncation(async (params) => {
      const options: any = {};
      if (params.follow_symlinks !== undefined) options.followSymlinks = params.follow_symlinks;
      if (params.max_bytes !== undefined) options.maxBytes = params.max_bytes;
      if (params.streaming !== undefined) options.streaming = params.streaming;
      if (params.silent !== undefined) options.silent = params.silent;
      if (params.dry_run !== undefined) options.dryRun = params.dry_run;
      return catMultiple(params.filepaths, options);
    })
  );

  // === 5. SEARCH ===

  server.tool(
    "search_directory",
    "Search for files in a directory by name pattern, extension, size, date, or content.",
    {
      root_dir: z.string(),
      pattern: z.string().optional(),
      extensions: z.string().optional(),
      min_size: z.number().optional(),
      max_size: z.number().optional(),
      after_date: z.string().optional(),
      before_date: z.string().optional(),
      content_query: z.string().optional(),
      recursive: z.boolean().default(true),
      sort_by: z.enum(["name", "size", "date", "type"]).default("name"),
      case_sensitive: z.boolean().default(false),
      max_results: z.number().default(200),
      max_output_length: z.number().default(DEFAULT_MAX_CHARS),
      show_details: z.boolean().default(true),
    },
    wrapTruncation(async (params) => {
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
      if (params.showDetails !== undefined) options.showDetails = params.showDetails;
      return searchDirectory(params.root_dir, options);
    })
  );

  server.tool(
    "grep",
    "Search files for a pattern using ripgrep (rg). Fast, recursive, and supports regex.",
    {
      pattern: z.string(),
      path: z.string().default("."),
      recursive: z.boolean().default(true),
      ignore_case: z.boolean().default(false),
      glob: z.string().optional(),
      max_count: z.number().optional(),
      include_line_numbers: z.boolean().default(true),
      use_json: z.boolean().default(false),
      timeout_seconds: z.number().default(30),
    },
    wrapTruncation(async (params) => {
      const result = await grep({
        pattern: params.pattern, path: params.path || ".",
        recursive: params.recursive ?? true, ignore_case: params.ignore_case ?? false,
        glob: params.glob, max_count: params.max_count,
        include_line_numbers: params.include_line_numbers ?? true,
        use_json: params.use_json ?? false, timeout_seconds: params.timeout_seconds ?? 30,
      });
      return JSON.stringify(result, null, 2);
    })
  );

  // === 6. DIRECTORY LISTING ===

  server.tool(
    "list_directory",
    "List files and directories in a given path. Returns structured information including name, type, size, and modification date.",
    {
      path: z.string(),
      recursive: z.boolean().default(false),
      include_files: z.boolean().default(true),
      include_dirs: z.boolean().default(true),
      max_depth: z.number().default(0),
      sort_by: z.enum(["name", "size", "date"]).default("name"),
      ascending: z.boolean().default(true),
      max_output_length: z.number().default(DEFAULT_MAX_CHARS),
      max_entries: z.number().default(2000),
    },
    wrapTruncation(async (params) => {
      const result = await listDirectory(params.path, {
        recursive: params.recursive, includeFiles: params.include_files,
        includeDirs: params.include_dirs, maxDepth: params.max_depth,
        sortBy: params.sort_by, ascending: params.ascending,
        max_output_length: params.max_output_length, max_entries: params.max_entries,
      });
      return result;
    })
  );

  // === 7. MEMORY ===

  server.tool(
    "memory_set",
    "Set a key-value pair in persistent memory (SQLite-backed). Survives restarts.",
    { key: z.string(), value: z.string(), namespace: z.string().default("default") },
    async (params) => {
      const result = await memorySet(params.key, params.value, params.namespace);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "memory_get",
    "Get a value by key from persistent memory. Returns null if absent.",
    { key: z.string(), namespace: z.string().default("default") },
    async (params) => {
      const result = await memoryGet(params.key, params.namespace);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "memory_list",
    "List keys in persistent memory. Supports prefix filtering.",
    { namespace: z.string().default("default"), prefix: z.string().optional() },
    async (params) => {
      const result = await memoryList(params.namespace, params.prefix);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "memory_delete",
    "Delete a key from persistent memory.",
    { key: z.string(), namespace: z.string().default("default") },
    async (params) => {
      const result = await memoryDelete(params.key, params.namespace);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "memory_log_append",
    "Append text to the append-only memory log. Auto-timestamped.",
    { text: z.string() },
    async (params) => {
      const result = await memoryLogAppend(params.text);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "memory_log_tail",
    "Get the last N log entries from persistent memory. Default: 50.",
    { n: z.number().default(50) },
    async (params) => {
      const result = await memoryLogTail(params.n);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  // === 8. MEMORY REBUILD ===

  server.tool(
    "rebuild_memory",
    "Rebuild persistent memory profile from LM Studio conversations.",
    {
      conversations_dir: z.string().optional(),
      output_path: z.string().optional(),
      max_conversations: z.number().default(100),
      max_summary_length: z.number().default(500),
    },
    wrapTruncation(async (params) => {
      return JSON.stringify(await rebuildMemory({
        conversationsDir: params.conversations_dir, outputPath: params.output_path,
        maxConversations: params.max_conversations, maxSummaryLength: params.max_summary_length,
      }), null, 2);
    })
  );

  server.tool(
    "read_memory_profile",
    "Read the current persistent memory profile.",
    { path: z.string().optional(), max_chars: z.number().default(10000) },
    wrapTruncation(async (params) => {
      return JSON.stringify(await readMemoryProfile({
        path: params.path, maxChars: params.max_chars,
      }), null, 2);
    })
  );

  // === 9. GIT ===

  server.tool(
    "git_status",
    "Check the status of a Git repository.",
    { directory: z.string() },
    wrapTruncation(async (params) => {
      const result = await gitStatus(params.directory);
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "git_diff",
    "Show changes between commits, commit and working tree, etc.",
    { directory: z.string(), file: z.string().optional() },
    wrapTruncation(async (params) => {
      const result = await gitDiff(params.directory, params.file);
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "git_log",
    "List commit history. Returns recent commits with hash, author, date, and message.",
    { directory: z.string(), n: z.number().default(10) },
    wrapTruncation(async (params) => {
      const result = await gitLog(params.directory, params.n);
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "git_blame",
    "Show what revision and author last modified each line of a file.",
    { directory: z.string(), file: z.string() },
    wrapTruncation(async (params) => {
      const result = await gitBlame(params.directory, params.file);
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "git_list_files",
    "List files in a specific Git commit or branch.",
    { directory: z.string(), commit: z.string().default("HEAD"), path_in_tree: z.string().optional() },
    wrapTruncation(async (params) => {
      const result = await listFilesInCommit(params.directory, params.commit, params.path_in_tree);
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "git_read_file",
    "Read the content of a file from a specific Git revision.",
    { directory: z.string(), commit: z.string().default("HEAD"), file_path: z.string() },
    wrapTruncation(async (params) => {
      const result = await readFileFromCommit(params.directory, params.commit, params.file_path);
      return JSON.stringify(result, null, 2);
    })
  );

  // === 10. SANDBOX ===

  server.tool(
    "check_env",
    "Checks the host environment for sandbox availability (QuickJS WASM, Pyodide WASM).",
    { check_docker: z.boolean().default(false), check_wsl2: z.boolean().default(false), check_pwsh: z.boolean().default(false) },
    async (params) => {
      const result = await checkSandboxAvailability();
      return mcpResult(JSON.stringify({
        success: true, js_sandbox: result.js, python_sandbox: result.python,
        bash_sandbox: false, default_sandbox_type: result.js ? "quickjs-wasm" : "none",
        message: result.message, docker_available: false, wsl2_available: false,
      }, null, 2));
    }
  );

  // === 11. TASK STATE ===

  server.tool(
    "save_work", "Save work state to a persistent key.",
    { key: z.string(), content: z.string() },
    async (params) => {
      const result = await saveWork(params.key, params.content);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "load_work", "Load previously saved work state by key.",
    { key: z.string() },
    async (params) => {
      const result = await loadWork(params.key);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "clear_work", "Clear saved work state by key.",
    { key: z.string() },
    async (params) => {
      const result = await clearWork(params.key);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  // === 12. BACKGROUND TASKS ===

  server.tool(
    "run_background_task",
    "Run a command in the background. Returns a task_id immediately.",
    { command: z.string(), shell: z.enum(["auto", "powershell", "cmd", "bash", "sh"]).default("auto"), cwd: z.string().optional(), timeout: z.number().default(300) },
    wrapTruncation(async (params) => {
      const result = await runBackgroundTask(params.command, params.shell, params.cwd, params.timeout);
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "check_task_status", "Check the status of a background task.",
    { task_id: z.string() },
    async (params) => {
      const result = await checkTaskStatus(params.task_id);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "stop_task", "Stop a running background task.",
    { task_id: z.string() },
    async (params) => {
      const result = await stopTask(params.task_id);
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );

  // === 13. VALIDATION ===

  server.tool(
    "validate_schema",
    "Validate JSON/YAML data against JSON Schema.",
    { data: z.string().optional(), schema: z.string().optional(), file_path: z.string().optional(), schema_path: z.string().optional(), format: z.enum(["json", "yaml"]).default("json") },
    wrapTruncation(async (params) => JSON.stringify(await validateSchema(params.data, params.schema, params.file_path, params.schema_path, params.format), null, 2))
  );

  // === 14. VISION / OCR ===

  server.tool(
    "read_image",
    "Extract text from images using Tesseract OCR (offline).",
    { file_path: z.string(), ocr_only: z.boolean().default(false) },
    wrapTruncation(async (params) => JSON.stringify(await readImage(params.file_path, params.ocr_only), null, 2))
  );

  // === 15. AUDIO ===

  server.tool(
    "transcribe_audio",
    "Transcribe audio files using whisper.cpp (offline).",
    { file_path: z.string(), language: z.string().default("en"), model: z.string().default("base") },
    wrapTruncation(async (params) => JSON.stringify(await transcribeAudio(params.file_path, params.language, params.model), null, 2))
  );

  // === 16. WEB ===

  server.tool(
    "web_search",
    "Search the web using DuckDuckGo.",
    { query: z.string(), engine: z.enum(["duckduckgo"]).default("duckduckgo"), max_results: z.number().default(10), search_type: z.enum(["web", "news", "images"]).default("web"), region: z.string().default("wt-wt"), safesearch: z.enum(["on", "moderate", "off"]).default("moderate"), language: z.string().default("en") },
    wrapTruncation(async (params) => {
      return webSearch({
        query: params.query, engine: params.engine, maxResults: params.max_results,
        searchType: params.search_type, region: params.region, safesearch: params.safesearch,
        language: params.language,
      });
    })
  );

  server.tool(
    "fetch_web_content",
    "Fetch and extract clean text content from a URL.",
    { url: z.string(), max_length: z.number().default(10000) },
    wrapTruncation(async (params) => {
      return fetchWebContent(params.url, params.max_length);
    })
  );

  // === 17. CODE INTEL ===

  server.tool(
    "find_symbol",
    "Find the definition of a symbol (function, variable) in a directory.",
    { symbol: z.string(), directory: z.string(), language: z.enum(["python", "javascript", "typescript", "cpp", "c"]).default("python") },
    wrapTruncation(async (params) => {
      const result = await findSymbol(params.symbol, params.directory, params.language);
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "get_references",
    "Find all references to a symbol in a directory.",
    { symbol: z.string(), directory: z.string(), language: z.enum(["python", "javascript", "typescript", "cpp", "c"]).default("python") },
    wrapTruncation(async (params) => {
      const result = await getReferences(params.symbol, params.directory, params.language);
      return JSON.stringify(result, null, 2);
    })
  );

  // === 18. SCRATCHPAD ===

  server.tool(
    "scratchpad_init", "Initialize the scratchpad workspace.",
    {},
    async () => mcpResult(JSON.stringify(await scratchpadInit(), null, 2))
  );

  server.tool(
    "scratchpad_write", "Overwrite the entire scratchpad file.",
    { content: z.string() },
    async (params) => mcpResult(JSON.stringify(await scratchpadWrite(params.content), null, 2))
  );

  server.tool(
    "scratchpad_append", "Append to the scratchpad file.",
    { content: z.string() },
    async (params) => mcpResult(JSON.stringify(await scratchpadAppend(params.content), null, 2))
  );

  server.tool(
    "scratchpad_read", "Read the scratchpad file content.",
    {},
    wrapTruncation(async () => JSON.stringify(await scratchpadRead(), null, 2))
  );

  server.tool(
    "scratchpad_validate", "Validate the scratchpad JSON content.",
    {},
    async () => mcpResult(JSON.stringify(await scratchpadValidate(), null, 2))
  );

  server.tool(
    "scratchpad_edit", "Edit the scratchpad JSON to fix syntax errors.",
    { operations: z.array(z.object({ type: z.enum(["replace", "insert", "delete"]), search: z.string().optional(), replace: z.string().optional(), line: z.number().optional(), text: z.string().optional(), end_line: z.number().optional() })) },
    async (params) => mcpResult(JSON.stringify(await scratchpadEdit(params.operations), null, 2))
  );

  server.tool(
    "scratchpad_commit", "Commit the scratchpad JSON and clear it.",
    {},
    async () => mcpResult(JSON.stringify(await scratchpadCommit(), null, 2))
  );

  server.tool(
    "scratchpad_clear", "Clear the scratchpad without returning content.",
    {},
    async () => mcpResult(JSON.stringify(await scratchpadClear(), null, 2))
  );

  // === 19. JSON REPAIR ===

  server.tool(
    "json_repair",
    "Repair malformed JSON strings. Automatically applies multiple repair strategies.",
    { json_string: z.string(), options: z.object({ logRepairs: z.boolean().optional(), maxAttempts: z.number().optional() }).optional() },
    wrapTruncation(async (params) => JSON.stringify(repairJSON(params.json_string, params.options || {}), null, 2))
  );

  // === 20. VIDEO ===

  server.tool(
    "analyze_video",
    "Analyze a video file using native video support or smart key-frame sampling.",
    { file_path: z.string(), interval: z.number().default(5), question: z.string().optional() },
    wrapTruncation(async (params) => {
      const result = await analyzeVideoViaLmStudio(params.file_path, Math.ceil(params.interval * 1000), params.question);
      return JSON.stringify(result, null, 2);
    })
  );

  // === 21. SYMLINK ===

  server.tool(
    "is_symlink", "Check if a given path is a symbolic link.",
    { filepath: z.string() },
    async (params) => {
      const result = isSymlink(params.filepath);
      return mcpResult(JSON.stringify({ success: true, path: params.filepath, is_symlink: result, message: result ? "Path is a symbolic link." : "Path is not a symbolic link." }, null, 2));
    }
  );

  server.tool(
    "get_symlink_target", "Get the target of a symbolic link.",
    { filepath: z.string() },
    async (params) => {
      const target = getSymlinkTarget(params.filepath);
      return mcpResult(JSON.stringify({ success: true, path: params.filepath, is_symlink: target !== null, symlink_target: target, message: target ? "Symlink target: " + target : "Path is not a symbolic link." }, null, 2));
    }
  );

  // === 22. COPY FILE ===

  server.tool(
    "copy_file",
    "Copy files or directories from source to destination without reading their contents.",
    { source: z.string(), destination: z.string(), is_directory: z.boolean().default(false), create_destination_dir: z.boolean().default(true) },
    async (params) => {
      const result = await copyFile(params.source, params.destination, { isDirectory: params.is_directory, createDestinationDir: params.create_destination_dir });
      return mcpResult(result);
    }
  );

  // === 23. VQA ===

  server.tool(
    "visual_question_answering",
    "Answer specific questions about an image using the loaded AI model.",
    { file_path: z.string(), question: z.string() },
    wrapTruncation(async (params) => {
      const result = await visualQuestionAnsweringViaLmStudio(params.file_path, params.question);
      if (result.success && result.answer) return `Answer: ${result.answer}`;
      return `Error: ${result.error || "Unknown error"}`;
    })
  );

  // === 24. IMAGE DESCRIPTION ===

  server.tool(
    "describe_image",
    "Describe the content of an image using the loaded AI model.",
    { file_path: z.string() },
    wrapTruncation(async (params) => {
      const result = await describeImageViaLmStudio(params.file_path);
      if (result.success && result.description) return `Image Description:\n\n${result.description}`;
      return `Error: ${result.error || "Unknown error"}`;
    })
  );

  // === 25. INDEX ===

  server.tool(
    "index_build", "Build a semantic search index over files in a directory.",
    { directory: z.string(), pattern: z.string().optional() },
    wrapTruncation(async (params) => {
      const result = await indexBuild(params.directory, params.pattern);
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "index_query", "Query a semantic search index.",
    { index_name: z.string(), query: z.string(), top_k: z.number().default(5) },
    wrapTruncation(async (params) => {
      const result = await indexQuery(params.index_name, params.query, params.top_k);
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "index_update", "Update an existing semantic search index.",
    { index_name: z.string(), directory: z.string(), pattern: z.string().optional() },
    wrapTruncation(async (params) => {
      const result = await indexUpdate(params.index_name, params.directory, params.pattern);
      return JSON.stringify(result, null, 2);
    })
  );

  server.tool(
    "clear_index", "Clear all semantic search indexes.",
    {},
    async () => { await clearIndex(); return mcpResult("All indexes cleared."); }
  );

  // === 26. DRIVE OPS (stub) ===

  server.tool(
    "cleanup_drive_auth", "Clean up Google Drive authentication tokens.",
    {},
    async () => {
      const result = await cleanupDriveAuth();
      return mcpResult(JSON.stringify(result, null, 2));
    }
  );
}

// ==================== MAIN ====================

async function main() {
  console.error("Starting mikeystoolkit MCP server...");
  await registerTools();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mikeystoolkit MCP server connected and ready.");
  setInterval(() => {}, 60000);
}

main().catch((err) => {
  console.error("Failed to start MCP server:", err);
  process.exit(1);
});
