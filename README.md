# Mike's Multi-Tool Kit (mikeystoolkit) - LM Studio Plugin

A comprehensive TypeScript plugin for LM Studio that provides advanced file operations, web search, content fetching, code execution, persistent memory, schema validation, and code intelligence.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🚨 Prerequisites & Required Software (READ FIRST!)

Before running or installing this plugin in modern LM Studio, you **must have all of the following** installed on your machine!

### Core Runtime Requirements
1.  **PowerShell 7+ (*Windows ONLY*)** — Install from [GitHub](https://github.com/PowerShell/PowerShell/releases/latest)
```Alternative install. Press the Windows Key ⊞ + X. Select Powershell.
winget search --id Microsoft.PowerShell --exact
```

2.  **Node.js v18+** ([Download](https://nodejs.org/)) — Runtime environment for TypeScript compilation and npm packages!

### Feature-Specific Dependencies
3.  **Python Latest Version** ([Download](https://www.python.org/downloads/)) — Required by OCR, semantic search, and schema validation
```powershell
winget install Python.Python.3.14
```  
4.  **Headless Chromium / Chrome for Testing** — Needed by browser automation capabilities
```powershell
$chromeInstaller = "chrome_installer.exe"
Invoke-WebRequest -Uri "https://dl.google.com/chrome/install/latest/chrome_installer.exe" -OutFile $chromeInstaller
Start-Process -FilePath $chromeInstaller -ArgumentList "/silent", "/install" -NoNewWindow -Wait
Remove-Item -Path $chromeInstaller
```
5.  **Vision-Capable AI Model** — Required for `describe_image`, `visual_question_answering`, `analyze_video` (see [AI Model Requirements](#-ai-model-requirements-for-vision-tools))

---

## Features 

### 🔍 Advanced Directory Search
- Glob pattern matching (`*.py`, `config*`, etc.)
- Case-insensitive search
- Filter by file extension, size, and date
- Search within file contents (grep-style)
- Sort by name, size, date, or type
- Recursive or single-directory mode

### 🌐 Web Search
- News search
- Image search with URLs
- Configurable results count and region

### 📄 File Operations (NO EXTENSION RESTRICTIONS)

**Write to ANY file** - AI model decides appropriate extensions:
- `write_file` - Overwrite entire file
- `write_file_append` - Append to file
- `create_file` - Create files with any extension

**Read ANY file** - Content-based detection (not extension-based):
- `read_file` - Read files with auto-detection
- `cat` - Cat-like behavior for any file
- `cat_multiple` - Read multiple files

**Edit ANY file** - Flexible editing:
- `edit_file` - Complex operations (replace/insert/delete)
- `replace_text_in_file` - Simple find-and-replace
- `insert_at_line` - Insert at specific line
- `delete_lines_in_file` - Delete line ranges

### 🧠 JSON Repair (Layer 2)
Automatic JSON syntax repair for simple malformed tool-call arguments:
- Removes trailing commas
- Balances brackets/braces
- Fixes escape sequences
- Wraps partial JSON

### 📝 Scratchpad (Layer 1)
### 🎯 AI Model Requirements for Vision Tools

**Vision tools (`describe_image`, `visual_question_answering`) require an AI model with vision and tool support loaded in LM Studio.**

| Tool | AI Model Required? | Notes |
|------|-------------------|-------|
| `describe_image` | ⚠️ Optional | Blip2 (offline;bundled with @xenova/transformers); Not needed if using a vision-capable model (e.g., Qwen3.6-35B-A3B) |
| `visual_question_answering` | ✅ Yes | Must use a vision-capable model |
| `read_image` (OCR) | ❌ No | Uses Tesseract.js (offline, no AI model) |
| ~~transcribe_audio`~~ | ~~⚠️ Optional~~ | ~~Uses whisper.cpp (offline); future: Qwen3-Omni~~ |
| `analyze_video` | ✅ Yes | Must use a vision-capable model |

**Recommended Models:**
- **Qwen3.6-35B-A3B** — Best balance of quality and VRAM (~18GB)

**Note:** The plugin is **AI-agnostic** for vision tasks — it calls whatever model is loaded in LM Studio. BLIP2 is optional or separate vision models needed.

---

Incremental JSON building for complex structures:
- `scratchpad_init` - Initialize scratchpad
- `scratchpad_write` - Overwrite scratchpad
- `scratchpad_append` - Append to scratchpad
- `scratchpad_read` - Read scratchpad (with truncation)
- `scratchpad_validate` - Validate JSON
- `scratchpad_edit` - Fix syntax errors
- `scratchpad_commit` - Commit and clear (with truncation)
- `scratchpad_clear` - Clear without returning

### 📖 File Reading
- Auto-detects text vs binary based on content
- Handles UTF-8, UTF-16, ASCII, and binary files
- Streaming for large files (>1MB)
- Line range filtering

### 🖼️ Image Captioning & VQA
- `describe_image` - Describe images using the **loaded AI model** (requires vision-capable model)
- `visual_question_answering` - Answer questions about images using the **loaded AI model** (requires vision-capable model)
- `read_image` - Extract text from images using Tesseract OCR (offline, no AI model required)

### ⚠️ Note on Vision Tool Output
**Vision tools (`describe_image`, `visual_question_answering`) return their results in the gray result box, not in the main chat.**

This is a **limitation of LM Studio's plugin architecture**:
- Toolkit tools return strings to LM Studio
- LM Studio displays results in the gray result box (by design)
- LM Studio does **not** provide an API to push messages to chat from plugins
- When the LM Studio Server API is active, the server can push return strings into chat messages

**Possible Workaround:** Use LM Studio's Server API

### ⚠️ Deprecated: Git Tools
**Git operations have been deprecated** (2025-07-09) due to sandbox security constraints.
The following tools now return deprecation messages:
- `git_status`
- `git_diff`
- `git_log`
- `git_blame`
- `git_list_files`
- `git_read_file`
- All GitHub tools (`github_push`, `github_create_pr`, etc.)

**Alternative:** Use LM Studio's native Git interface for Git operations.

### 🛡️ WASM Sandboxing (Pyodide Only)

**Code execution in isolated WASM environments — no Docker/WSL required!**

| Tool | Description | Sandbox |
|------|-------------|---------|
| `execute_code` | Execute code in Python, Bash, or Node.js | Pyodide (Python) / Node.js (JS) |
| `check_env` | Check WASM sandbox availability | Reports Pyodide status |

**Pyodide WASM:**
- Python execution in isolated WASM
- Full Python standard library
- Scientific packages (numpy, pandas) available

**JavaScript Execution:**
- Uses Node.js directly (not sandboxed)
- QuickJS WASM was deprecated and removed (2026-07-09)

**Docker/WSL could not be implemented**
- The goal was to use Docker with WSL being the fallback. But the Docker and WSL tools cannot find the system path. LM Studio has its own internal path and does not inherit Window's system environment paths. Therefore, any tool that requires access to the OS's system environment paths were sandboxed in. Was not able to test to see if Linux is the same or different.
  
## Installation

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- Python Latest Version
- Hugging Face CLI (`pip install huggingface_hub`)

### Verify Installation
```powershell
node --version   # Should be v18.0.0 or higher
npm --version    # Should be 9.0.0 or higher
```

### Setup (Windows PowerShell 7+)
```powershell
# Navigate to plugin directory
cd "C:\Users\$yourusename$\Downloads\Mikeystoolkit"

# Install dependencies automatically
npm install --legacy-peer-deps

# Ensure a vision-capable AI model is loaded in LM Studio (e.g., Qwen3.6-35B-A3B)

# Build TypeScript into dist/index.js
npm run build

# Install plugin in LM Studio
lms dev --install
```

---

## Usage Examples

### File Operations (Any Extension)
```typescript
// Write to any file - AI decides extension
write_file({path: "data.json", content: '{"key": "value"}'})
write_file({path: "config.yaml", content: "key: value"})
write_file({path: "script.ts", content: "const x = 1;"})

// Append to any file
write_file_append({path: "logs.txt", content: "new log entry\n"})

// Create file with any extension
create_file({file_type: "json", filename: "output.json", content: '{"data": []}'})
```

### JSON Repair (Layer 2)
```typescript
// Auto-repairs simple malformed JSON
json_repair({json_string: '{"key": "value",}'})
// Returns: {"success": true, "repaired": "{\"key\": \"value\"}", "repairs_applied": ["removed_trailing_commas"]}
```

### Scratchpad (Layer 1)
```typescript
// Initialize scratchpad
scratchpad_init()

// Build complex JSON incrementally
scratchpad_write({content: '{"users": ['})
scratchpad_append({content: '{"name": "John"},'})
scratchpad_append({content: '{"name": "Jane"}'})
scratchpad_append({content: ']}'})

// Validate before committing
scratchpad_validate()

// Commit and get JSON (with truncation if > 8000 chars)
scratchpad_commit()
```

### Web Search
```typescript
// Web search with DuckDuckGo
web_search({
  query: "python tutorial",
  engine: "duckduckgo",
  max_results: 10,
  search_type: "web",
  region: "us-en",
  safesearch: "moderate",
  language: "en"
})

// News search
web_search({query: "AI news", search_type: "news"})
```

### Image Captioning
```typescript
// Describe an image using the loaded AI model (requires vision-capable model)
describe_image({file_path: "C:/path/to/image.jpg"})

// Answer questions about an image using the loaded AI model
visual_question_answering({
  file_path: "C:/path/to/image.jpg",
  question: "What color is the car?"
})

// Extract text from image (offline, no AI model required)
read_image({file_path: "C:/path/to/image.jpg", ocr_only: true})
```

---

## Architecture

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

### Truncator Integration (Single Source of Truth)
- **`DEFAULT_MAX_CHARS = 8000`** exported from `truncator.ts`
- All outputs > 8000 chars are chunked
- Prevents context overflow causing LM Studio faults
- All tools use the same truncation limit via `wrapWithTruncation()`

### Truncation Format
```
--- CHUNK 1/3 ---
{...}

[Output was X chars, split into Y chunks...]
```

---

## Security Notes

### ⚠️ Critical Security Reality

**LM Studio does NOT provide directory whitelisting sandboxing.**

- The AI model **CAN** code, run commands, and execute code in the development folder
- The AI model **CAN** write to ANY file in the storage device
- The AI model **CAN** execute malicious code with exception to sandboxing python by Pyodide currently.
- There is **NO default sandboxing** for working within a defined environment by LM Studio

### Why This Exists
This is intentional to work with "abliterated" editions of AI models for **red teaming** and security research.

### What This Toolkit DOES Provide
- Atomic file writes (prevents data corruption)
- Idempotency checks (avoids unnecessary writes)
- Error handling and validation
- Content-based file detection (not extension-based)
- WASM sandboxing for code execution (QuickJS + Pyodide)

### What This Toolkit DOES Provide (Sandboxing)
- **WASM sandboxing for code execution** (currently Pyodide)
- **Pyodide WASM** — Python code execution in isolated WASM environment
- **Testing other programming language requires installing the appropriate compiler.

### What This Toolkit DOES NOT Provide
- File operation whitelisting
- Protection against malicious file operations
- Isolation from the host filesystem
- Any security boundaries beyond WASM sandboxing

### Security Responsibility
**Users are responsible for:**
- Monitoring AI model behavior
- Restricting access to sensitive files
- Running AI models in controlled environments
- Understanding the risks of unfiltered AI execution
- running malicious code whether intentional or accidentall.

Conclusion: LM Studio has created a very interesting app that allows users great flexibility for better or worse. Becareful of running unknown malicious scripts or non-trusted code.
---

### Tool List Reference

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


*Last Updated: 2026-07-10*
*Updated: AI-agnostic vision layer architecture, removed BLIP2 dependency, added AI model requirements*
