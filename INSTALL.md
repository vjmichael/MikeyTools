# LM Studio Plugin - Installation Guide & Dependencies

## 🚨 Prerequisites: Required Software (READ FIRST!)

Before installing or running this plugin, you **must have all of the following** installed on your machine. Without these exact dependencies, features will fail silently or crash! 

### Core Runtime Requirements
1.  **PowerShell 7+ (Windows ONLY)** — Install from [GitHub](https://github.com/PowerShell/PowerShell/releases/latest) if not already present. This plugin requires PowerShell's modern module loading capabilities; the legacy Windows PowerShell is NOT compatible.
2.  **Node.js v18+** ([Download](https://nodejs.org/)) — The TypeScript compiler and runtime environment. npm comes bundled with Node.js automatically! 

### Feature-Specific Dependencies
3.  **Python Latest Version** ([Download](https://www.python.org/downloads/)) — Required by OCR, semantic search, and schema validation. Install via official installer with "Add to PATH" checked!
4.  **Hugging Face CLI** — Required for downloading AI model weights. Install via `pip install huggingface_hub`
5.  **Headless Chromium / Chrome for Testing** ([Download](https://developer.chrome.com/blog/chrome-for-testing/)) — Required by Puppeteer/Playwright browser automation features. After downloading, set environment variable `PUPPETEER_EXECUTABLE_PATH` to point at your extracted binary path!

---

## Download from Github ##
Click on the green code button.
<img width="139" height="47" alt="image" src="https://github.com/user-attachments/assets/b784da9f-3ed2-4c89-9ceb-7b1aefde8d4d" />

A menu will drop down. Cick on the download to download the repo.

<img width="512" height="463" alt="image" src="https://github.com/user-attachments/assets/0a081470-5344-4b18-a0bd-41f93a56f470" />

---

## 📦 Project Dependencies (`package.json`) 

This plugin relies heavily on external TypeScript packages. **You do not need to install these manually.** By running the installation commands below, npm will automatically download and configure every necessary dependency from our project's package.json!

### Runtime Dependencies (21 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `@sebastianwessel/quickjs` | ^3.0.0 | QuickJS WASM sandbox for JS execution |
| `@jitl/quickjs-wasmfile-release-sync` | ^0.32.0 | QuickJS WASM binary file |
| `pyodide` | ^314.0.2 | Python WASM sandbox for Python execution |
| `@xenova/transformers` | ^2.17.0 | ML models (Qwen2.5-VL, etc.) |
| `zod` | ^3.23.0 | Schema validation |
| `playwright` | ^1.50.0 | Browser automation |
| `cheerio` | ^1.1.0 | HTML parsing |
| `csv-stringify` | ^6.5.2 | CSV generation |
| `docx` | ^9.3.0 | DOCX file creation |
| `pdfkit` | ^0.15.2 | PDF generation |
| `pdf-parse` | ^1.1.1 | PDF reading |
| `sharp` | ^0.33.5 | Image processing |
| `tesseract.js` | ^5.1.1 | OCR (image text extraction) |
| `ajv` | ^8.17.1 | JSON schema validation |
| `js-yaml` | ^4.1.0 | YAML parsing |
| `jsonrepair` | ^3.15.0 | JSON repair utilities |
| `jszip` | ^3.10.1 | ZIP compression |
| `sql.js` | ^1.14.1 | SQLite database |
| `fs-extra` | ^11.3.0 | File system utilities |
| `googleapis` | ^144.0.0 | Google API integration |
| `ripgrep` | ^0.3.1 | Fast file search |

### Dev Dependencies (8 packages)

| Package | Purpose |
|---------|---------|
| `@lmstudio/sdk` | LM Studio plugin SDK |
| `typescript` | TypeScript compiler |
| `@types/node` | Node.js type definitions |
| `@types/fs-extra` | fs-extra type definitions |
| `@types/js-yaml` | js-yaml type definitions |
| `@types/pdf-parse` | pdf-parse type definitions |
| `@types/pdfkit` | pdfkit type definitions |
| `@types/sql.js` | sql.js type definitions |

### Additional Software Dependencies (Required for Full Feature Set)

| Software | Purpose | Install Command | Notes |
|----------|---------|----------------|-------|
| **ffmpeg** | Video/audio processing (`analyze_video`) | Download from https://ffmpeg.org | Add to PATH |
| **whisper.cpp** | Audio transcription (`transcribe_audio`) | https://github.com/ggerganov/whisper.cpp/releases | Add to PATH |
| **@xenova/transformers** | BLIP-2 image captioning & VQA | `npm install @xenova/transformers` | Already in package.json |
| **Hugging Face CLI** | Download BLIP-2 weights | `pip install huggingface_hub` | Run `hf auth login` first |
| **Visual Studio Build Tools** | Rust compilation (for tokenizers) | `winget install Microsoft.VisualStudio.2022.BuildTools` | Required for Rust-based packages |
| **Rust (rustup)** | Rust toolchain | `winget install Rustlang.Rustup` | Required for tokenizers compilation |

### PATH Configuration

Add these to your Windows Environment PATH (System or User variables):

```powershell
# Add whisper-bin
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;C:\Users\$yourusername$\MikeyTools\whisper-bin", "User")

# Add ffmpeg
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;C:\ffmpeg\bin", "User")

# Add Python Scripts (for hf CLI)
$env:PATH += ";$env:APPDATA\Python\Python314\Scripts"
```

**Verify:** Close and reopen PowerShell, then run `where.exe whisper-cli`, `where.exe ffmpeg`, and `where.exe hf`.

---

## 🪟 Windows Installation Steps (PowerShell 7+)

```powershell
# 1. Navigate to plugin directory 
cd "c:\Users\$yourusername$\Downloads\MikeyTools\" 

# 2. Install all Node.js dependencies automatically:
npm install --legacy-peer-deps  

# 3. Load an AI model with tool support in LM Studio (for describe_image, analyze_video):
# Open LM Studio → Discover tab → Search for any AI model with tools support → Download
# Look for AI Models with the hammer symbol next to them.
```

<img width="1945" height="1390" alt="image" src="https://github.com/user-attachments/assets/85cfe929-6462-4fce-a3fc-239bc8b0c1ab" size="50%"/>

```
# 4. Build TypeScript into a format LM Studio can read (dist/index.js):
npm run build

# 5. Verify dist folder was created successfully:
dir dist 
```

**Troubleshooting Windows Issues:**  
- If `node` or `npm` is not recognized, restart PowerShell and try again! 
- For Python dependencies after installing everything else: `pip install huggingface_hub`

---

## 🐧 Linux Installation Steps

```bash  
# 1. Navigate to plugin directory on your machine: 
cd /path/to/MikeyTools

# 2. Install all Node.js dependencies automatically from package.json:
npm install --legacy-peer-deps  

# 3. Load a tool enabled AI model in LM Studio (for describe_image, analyze_video):
# Open LM Studio → Discover tab → Search for an AI model that has the hammer symbol → Download

<img width="1945" height="1390" alt="image" src="https://github.com/user-attachments/assets/87a1886e-ab39-4419-a9d7-0c88766c2acd" />


# 4. Build TypeScript into a format LM Studio can read (dist/index.js): 
npm run build

# 5. Verify dist folder was created successfully:  
ls -la dist   
```

---

## 📥 Installing This Plugin in Modern LM Studio 

Modern versions of LM Studio use **MCP (Model Context Protocol)** via JSON configuration instead of GUI plugin loading buttons! Here's how to connect this toolset properly: 

1. Open your `mcp.json` config file from the **"Program"** tab → click "Install" → select "Edit mcp.json". This opens an in-app editor for LM Studio's MCP server definitions 
2. Add a new entry under `"mcpServers"` pointing to our compiled plugin script (`dist/index.js`) like this: 

```json
{ 
  "mcpServers": {    
    "lm-studio-plugin": {      
      "command": "/path/to/node",  # or full path on Windows! e.g., C:\Program Files\nodejs\node.exe       
      "args": ["C:/Users/$yourusername$/MikeyTools/dist/index.js"]
    }  
  } 
}
```

> ⚠️ **Windows Users:** Replace `/path/to/node` with your actual Node executable path (e.g., `C:\Program Files\nodejs\node.exe`)! 

---

## 🐍 Optional: Advanced Feature Python Dependencies  

If you want to use features like OCR, semantic search, or schema validation beyond basic file/web operations, install these after installing the core dependencies above:
```bash  
pip install sentence-transformers numpy jsonschema pyyaml Pillow pytesseract beautifulsoup4 lxml duckduckgo-search rich googlesearch-python bingsearch requests node-fetch pdf-parse docx jszip cheerio csv-stringify ddgs pdfkit 
```

---

## Available Tools 

# MikeyTools LM Studio Plugin — Complete Tools List

**Total Active Tools:** 64 | **Total Deprecated:** 6

---

## 📊 Complete Tools Inventory

### 🔧 File Operations (14 tools)

| # | Tool | Description | Key Features |
|---|------|-------------|--------------|
| 1 | `write_file` | Create/overwrite files | Dry-run mode, parent directory auto-creation |
| 2 | `write_file_append` | Append to files | Dry-run mode, parent directory auto-creation |
| 3 | `edit_file` | Complex file editing | Replace/insert/delete operations, dry-run diff preview |
| 4 | `create_file` | Create files with any extension | AI determines file type, special formatting for txt/md/json/csv/html/docx/pdf |
| 5 | `read_file` | Read any file | Auto-detects text vs binary, handles UTF-8/UTF-16/ASCII |
| 6 | `cat` | Universal file reader | Streaming for large files, line range filtering, binary support |
| 7 | `cat_multiple` | Read multiple files simultaneously | Concatenates content, per-file results |
| 8 | `delete_lines_in_file` | Delete specific line ranges | 1-indexed line numbers, optional end_line |
| 9 | `insert_at_line` | Insert content at specific line | 1-indexed line number, pushes existing content down |
| 10 | `replace_text_in_file` | Simple find-and-replace | Exact string matching, unique old_string required |
| 11 | `list_directory` | List files/directories | Recursive support, sorting by name/size/date, max_depth filter |
| 12 | `search_directory` | Advanced directory search | Pattern matching, size/date/content filters, recursive mode |
| 13 | `grep` | Regex file content search | ripgrep-based, case-insensitive, glob filtering |
| 14 | `copy_file` | Copy files/directories | Recursive directory copy, auto-create destination |
| 15 | `apply_patch` | Apply unified diff patches | Dry-run mode, conflict reporting, .bak backups |
| 16 | `is_symlink` | Check if path is a symlink | Returns true/false |
| 17 | `get_symlink_target` | Get symlink target | Returns resolved target path or null |

### 💻 Code Execution (4 tools)

| # | Tool | Description | Sandbox |
|---|------|-------------|---------|
| 18 | `execute_code` | Execute Python/Node.js code | Pyodide (Python) / Node.js (JS) |
| 19 | `run_command` | Execute terminal commands | Native shell (auto-detects OS) |
| 20 | `check_env` | Check sandbox availability | Reports Pyodide status |
| 21 | `run_in_sandbox` | DEPRECATED → execute_code | Redirects to execute_code |

### 📦 Background Tasks (3 tools)

| # | Tool | Description |
|---|------|-------------|
| 22 | `run_background_task` | Run commands in background — returns task_id immediately |
| 23 | `check_task_status` | Monitor background tasks — returns stdout/stderr/exit_code |
| 24 | `stop_task` | Stop running background task — terminates task |

### 💾 Memory & State (14 tools)

| # | Tool | Description |
|---|------|-------------|
| 25 | `memory_set` | Set key-value pair in SQLite-backed memory |
| 26 | `memory_get` | Get value by key — returns null if absent |
| 27 | `memory_list` | List keys with prefix filtering — LIKE match support |
| 28 | `memory_delete` | Delete key from memory |
| 29 | `memory_log_append` | Append timestamped text to memory log |
| 30 | `memory_log_tail` | Get last N log entries — default: 50 |
| 31 | `save_work` | Save work state by key |
| 32 | `load_work` | Load saved work state |
| 33 | `clear_work` | Clear saved work state |
| 34 | `set_break` | Set break flag to halt approach |
| 35 | `check_break` | Check if break flag is set (60s validity) |
| 36 | `rebuild_memory` | Rebuild memory profile from conversations |
| 37 | `read_memory_profile` | Read current memory profile |

### 📝 Scratchpad (8 tools)

| # | Tool | Description |
|---|------|-------------|
| 38 | `scratchpad_init` | Initialize scratchpad workspace |
| 39 | `scratchpad_write` | Overwrite scratchpad content |
| 40 | `scratchpad_append` | Append to scratchpad content |
| 41 | `scratchpad_read` | Read scratchpad content — truncation if > 8000 chars |
| 42 | `scratchpad_validate` | Validate JSON in scratchpad |
| 43 | `scratchpad_edit` | Fix JSON syntax errors — replace/insert/delete operations |
| 44 | `scratchpad_commit` | Commit and clear scratchpad — returns final JSON |
| 45 | `scratchpad_clear` | Clear scratchpad without returning |

### 🌐 Web & Search (3 tools)

| # | Tool | Description |
|---|------|-------------|
| 46 | `web_search` | DuckDuckGo web/news/image search — configurable results, region, safesearch |
| 47 | `fetch_web_content` | Extract clean text from URLs — removes scripts/styles/navigation |
| 48 | `browse_js` | Headless browser rendering — Playwright-based, wait for selectors |

### ✅ Schema Validation (1 tool)

| # | Tool | Description |
|---|------|-------------|
| 49 | `validate_schema` | Validate JSON/YAML against schema — returns precise error paths |

### 🧠 Code Intelligence (2 tools)

| # | Tool | Description |
|---|------|-------------|
| 50 | `find_symbol` | Find symbol definition in codebase — returns file/line |
| 51 | `get_references` | Find all references to symbol — directory search |

### 🔧 JSON Repair (1 tool)

| # | Tool | Description |
|---|------|-------------|
| 52 | `json_repair` | Repair malformed JSON — trailing commas, unbalanced brackets, escape sequences |

### 🖼️ Vision & Media (5 tools)

| # | Tool | AI Model Required? | Notes |
|---|------|-------------------|-------|
| 53 | `describe_image` | ⚠️ Optional | Blip2 (offline); Not needed if using vision-capable model |
| 54 | `visual_question_answering` | ✅ Yes | Must use vision-capable model |
| 55 | `read_image` (OCR) | ❌ No | Uses Tesseract.js (offline) |
| 56 | `transcribe_audio` | ~~DEPRECATED~~ | ~~Uses whisper.cpp (offline); future: Qwen3-Omni~~ |
| 57 | `analyze_video` | ✅ Yes | Must use vision-capable model |

### 📖 File Reading (3 tools)

| # | Tool | Description |
|---|------|-------------|
| 58 | `read_file` | Read files with auto-detection — handles UTF-8, UTF-16, ASCII, binary |
| 59 | `cat` | Cat-like behavior for any file — streaming for large files (>1MB), line range filtering |
| 60 | `cat_multiple` | Read multiple files simultaneously — concatenates content |

### ⚠️ Deprecated Tools (6 tools)

| Tool | Alternative |
|------|-------------|
| `git_status` | LM Studio native Git interface |
| `git_diff` | LM Studio native Git interface |
| `git_log` | LM Studio native Git interface |
| `git_blame` | LM Studio native Git interface |
| `git_list_files` | LM Studio native Git interface |
| `git_read_file` | LM Studio native Git interface |

---

## 🏗️ Architecture Overview

### Layer 1: Scratchpad (JSON Prevention)
- Helps model build complex JSON incrementally
- Prevents JSON syntax errors before they happen
- Uses existing tools (write_file, cat, etc.) under the hood
- Integrates with truncator.ts to prevent context overflow

### Layer 2: JSON Repair (Automatic)
- Fixes JSON errors after they happen
- Safety net for all tool calls
- Repairs: trailing commas, unbalanced brackets, escape sequences
- Transparent to the model

### Truncation Integration (Single Source of Truth)
- `DEFAULT_MAX_CHARS = 8000` exported from `truncator.ts`
- All outputs > 8000 chars are chunked
- Prevents context overflow causing LM Studio faults
- All tools use the same truncation limit via `wrapWithTruncation()`

---

## 🛡️ WASM Sandboxing (Pyodide Only)

| Language | Execution Method | Sandboxed? |
|----------|-----------------|------------|
| Python | Pyodide WASM | ✅ Yes |
| JavaScript | Node.js direct | ❌ No |
| Bash | Not supported | ❌ Not available |

---

## 📋 Tool Categories Summary

| Category | Count |
|----------|-------|
| File Operations | 14 |
| Code Execution | 4 |
| Background Tasks | 3 |
| Memory & State | 14 |
| Scratchpad | 8 |
| Web & Search | 3 |
| Schema Validation | 1 |
| Code Intelligence | 2 |
| JSON Repair | 1 |
| Vision & Media | 5 |
| File Reading | 3 |
| Deprecated | 6 |
| **TOTAL** | **64** |

---

*Generated: 2026-07-09*
*Source: MikeyTools LM Studio Plugin (mikeystoolkit)*


## 🛡️ Security Concerns: WASM-Based Sandboxing Currently (Pyodide Only)

Security is problematic with LM Studio. Some actions such as the AI model running npm run build compiles nothing but may still output useful compiler errors sometimes and sometimes false positive compiler results. The only sandboxing I put in was for python code sandboxing but I did not do a comprehensive testing on other compilers. I know why other plugins use a directory whitelisting mechanism to safeguard against malicious code. Initiall, the goal was to use WSL2/Docker to execute any code within but that proved problematic because the tools could not path correctly. After some debugging, LM Studio does not inherit the OS system environment paths. Have not test this on Linux.

This plugin uses **Pyodide WebAssembly (WASM) sandboxing** for code execution:

- **JavaScript**: Node.js direct execution (not sandboxed)
- **Python**: `pyodide` (CPython compiled to WASM)
- **Bash**: Not supported in sandboxed mode (requires real OS shell)
- Require additional compilers to test other programming languages and scripts.

**Pyodide WASM:**
- Python execution in isolated WASM environment
- Full Python standard library
- Scientific packages (numpy, pandas) available

**@sebastianwessel/quickJS WASM was deprecated and removed (2026-07-09):**
- ❌ Browser-first design (not compatible with LM Studio's Node.js environment)
- ❌ Intentionally restricts Node.js APIs for security
- ❌ WASM loading issues in non-browser environments
- ❌ LFilesystem access is not sandbox
- ❌ Limited Node.js compatibility (explicitly stated by library authors)

**Isolated-VM does not support odd numbered versions of Node.**
- ❌ LM Studio bundles Node 25.5.0 (odd-numbered, unstable/development track)

**vm2 and Node's built-in vm were immediately reject from the start.**
- ❌ vm2 has documented history of sandbox-escape CVEs.
- ❌ Node's built-in vm module has no security boundary at all. Code can escape to real Node process

**WSL2/Docker Sandboxed out**
- ❌ LM Studio has its own internal system paths and does not inherit Window's system envrionmental paths.

---

## 📐 Architecture: Truncator Integration

### Single Source of Truth for `max_output_length`

```
truncator.ts (SOURCE OF TRUTH)
    ├── export DEFAULT_MAX_CHARS = 8000
    ├── export truncateOutput()
    └── handles undefined/null by defaulting to DEFAULT_MAX_CHARS

tools-order.ts (TOOL REGISTRY)
    ├── imports DEFAULT_MAX_CHARS from truncator.ts ✅
    ├── exports wrapWithTruncation() helper ✅
    └── wraps all tools with truncator ✅
```

### Truncation Behavior
- All outputs > 8000 chars are automatically chunked
- JSON outputs preserve structure while chunking
- Non-JSON outputs split into numbered segments
- Prevents context overflow causing LM Studio faults

### Truncation Format
```
--- CHUNK 1/3 ---
{...}

[Output was X chars, split into Y chunks...]
```

---

*Last Updated: 2026-07-09*
*Updated: Removed BLIP2 dependency, added QuickJS/Pyodide WASM sandboxing docs, added Qwen2.5-VL vision model requirements*
