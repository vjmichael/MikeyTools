# Mike's Multi-Tool Kit (mikeystoolkit) - LM Studio Plugin

### Disclaimer: All these tools with exception to the Git tools work on LM Studio. Using another GUI like Jan may prevent some tools from functioning.

A comprehensive TypeScript plugin for LM Studio that provides advanced file operations, web search, content fetching, code execution, persistent memory, schema validation, and code intelligence.

- Built using LM Studio with Qwen3.6-35B-A3B utilzing the AMD AI PRO R9700.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🚨 Prerequisites & Required Software (READ FIRST!)

Before running or installing this plugin in modern LM Studio, you **must have all of the following** installed on your machine!

### Core Runtime Requirements
1.  **PowerShell 7+ (*Windows ONLY*)** — Install from [GitHub](https://github.com/PowerShell/PowerShell/releases/latest)

Alternative install. Press the Windows Key ⊞ + X. Select Powershell. Run the command below.
```powershell
winget search --id Microsoft.PowerShell --exact
```

2.  **Node.js v18+** ([Download](https://nodejs.org/)) — Runtime environment for TypeScript compilation and npm packages!

### Feature-Specific Dependencies
3.  **Python Latest Version** ([Download](https://www.python.org/downloads/)) — Required by OCR, semantic search, and schema validation

```powershell
powershell winget install Python.Python.3.14
```

4.  **Headless Chromium / Chrome for Testing** — Needed by browser automation capabilities

```powershell
powershell $chromeInstaller = "chrome_installer.exe" Invoke-WebRequest -Uri "https://dl.google.com/chrome/install/latest/chrome_installer.exe" -OutFile $chromeInstaller Start-Process -FilePath $chromeInstaller -ArgumentList "/silent", "/install" -NoNewWindow -Wait Remove-Item -Path $chromeInstaller
```

5.  **Vision-Capable AI Model** — Required for `describe_image`, `visual_question_answering`, `analyze_video` (see [AI Model Requirements](#-ai-model-requirements-for-vision-tools))

---

# MikeyTools LM Studio Plugin — Complete Tools List

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


### 📖 File Reading (3 tools)

| # | Tool | Description |
|---|------|-------------|
| 58 | `read_file` | Read files with auto-detection — handles UTF-8, UTF-16, ASCII, binary |
| 59 | `cat` | Cat-like behavior for any file — streaming for large files (>1MB), line range filtering |
| 60 | `cat_multiple` | Read multiple files simultaneously — concatenates content |

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


---


*Source: MikeyTools LM Studio Plugin (mikeystoolkit)*

---

---

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
cd "filepath://mikeystool/"

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
// Auto-repairs malformed JSON
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

### ⚠️ Critical Security Reality in LM Studio

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

## 📥 Installing This Plugin as a MCP server

There are GUI interfaces for AI models that uses **MCP (Model Context Protocol)** via JSON configuration instead of GUI plugin loading buttons! Here's how to connect this toolset properly:

### First Method for installing MCP
1. Open your `mcp.json` config file from the **"Program"** tab → click "Install" → select "Edit mcp.json". This opens an in-app editor for LM Studio's MCP server definitions
2. Add a new entry under `"mcpServers"` pointing to our compiled plugin script (`dist/index.js`) like this:

```json
{
  "mcpServers": {
    "lm-studio-plugin": {
      "command": "/path/to/node",
      "args": ["filepath://mikeystool/dist/index.js"]
    }
  }
}
```

### Second Method for installing MCP
1. Some GUI interfaces like Jan will not have a MCP.json to edit. They wil have a GUI to enter in information.

```
Name: mikeystool
Command: node
Arguments: filepath://mikeystool/dist/mcp-server.js
```

The MCP entry point is mcp-server.ts. Normally, it would be index.ts. But I had to go with a different approach. index.js is the entry point for LM Studio SDK toolProvider which installs the plugin using lms dev --install. mcp-server.js is the entry point of MCP server.


> ⚠️ **Windows Users:** Replace `/path/to/node` with your actual Node executable path (e.g., `C:\Program Files\nodejs\node.exe`)!

### Security Responsibility
**Users are responsible for:**
- Monitoring AI model behavior
- Restricting access to sensitive files
- Running AI models in controlled environments
- Understanding the risks of unfiltered AI execution
- running malicious code whether intentional or accidentall.

---
