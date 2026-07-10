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

📊 Complete Tools List (64 Active Tools)
🔧 FILE OPERATIONS (14 tools)
Tool	Description	Key Features
write_file	Create/overwrite files	Dry-run mode, parent directory auto-creation
write_file_append	Append to files	Dry-run mode, parent directory auto-creation
edit_file	Complex file editing	Replace/insert/delete operations, dry-run diff preview
create_file	Create files with any extension	AI determines file type, special formatting for txt/md/json/csv/html/docx/pdf
read_file	Read any file	Auto-detects text vs binary, handles UTF-8/UTF-16/ASCII
cat	Universal file reader	Streaming for large files, line range filtering, binary support
cat_multiple	Read multiple files simultaneously	Concatenates content, per-file results
delete_lines_in_file	Delete specific line ranges	1-indexed line numbers, optional end_line
insert_at_line	Insert content at specific line	1-indexed line number, pushes existing content down
replace_text_in_file	Simple find-and-replace	Exact string matching, unique old_string required
list_directory	List files/directories	Recursive support, sorting by name/size/date, max_depth filter
search_directory	Advanced directory search	Pattern matching, size/date/content filters, recursive mode
grep	Regex file content search	ripgrep-based, case-insensitive, glob filtering
copy_file	Copy files/directories	Recursive directory copy, auto-create destination
apply_patch	Apply unified diff patches	Dry-run mode, conflict reporting, .bak backups
is_symlink	Check if path is a symlink	Returns true/false
get_symlink_target	Get symlink target	Returns resolved target path or null
💻 CODE EXECUTION (4 tools)
Tool	Description	Sandbox
execute_code	Execute Python/Node.js code	Pyodide (Python) / Node.js (JS)
run_command	Execute terminal commands	Native shell (auto-detects OS)
check_env	Check sandbox availability	Reports Pyodide status
run_in_sandbox	DEPRECATED → execute_code	Redirects to execute_code
📦 BACKGROUND TASKS (3 tools)
Tool	Description
run_background_task	Run commands in background
check_task_status	Monitor background tasks
stop_task	Stop running background task
💾 MEMORY & STATE (12 tools)
Tool	Description
memory_set	Set key-value pair in SQLite-backed memory
memory_get	Get value by key
memory_list	List keys with prefix filtering
memory_delete	Delete key from memory
memory_log_append	Append timestamped text to memory log
memory_log_tail	Get last N log entries
save_work	Save work state by key
load_work	Load saved work state
clear_work	Clear saved work state
set_break	Set break flag to halt approach
check_break	Check if break flag is set (60s validity)
rebuild_memory	Rebuild memory profile from conversations
read_memory_profile	Read current memory profile
📝 SCRATCHPAD (8 tools)
Tool	Description
scratchpad_init	Initialize scratchpad workspace
scratchpad_write	Overwrite scratchpad content
scratchpad_append	Append to scratchpad content
scratchpad_read	Read scratchpad content
scratchpad_validate	Validate JSON in scratchpad
scratchpad_edit	Fix JSON syntax errors
scratchpad_commit	Commit and clear scratchpad
scratchpad_clear	Clear scratchpad without returning
🌐 WEB & SEARCH (3 tools)
Tool	Description
web_search	DuckDuckGo web/news/image search
fetch_web_content	Extract clean text from URLs
browse_js	Headless browser rendering
✅ SCHEMA VALIDATION (1 tool)
Tool	Description
validate_schema	Validate JSON/YAML against schema
🧠 CODE INTELLIGENCE (2 tools)
Tool	Description
find_symbol	Find symbol definition in codebase
get_references	Find all references to symbol
🔧 JSON REPAIR (1 tool)
Tool	Description
json_repair	Repair malformed JSON
🖼️ VISION & MEDIA (5 tools)
Tool	AI Model Required?	Notes
describe_image	⚠️ Optional	Blip2 (offline); Not needed if using vision-capable model
visual_question_answering	✅ Yes	Must use vision-capable model
read_image (OCR)	❌ No	Uses Tesseract.js (offline)
transcribe_audio	⚠️ Optional	Uses whisper.cpp (offline); future: Qwen3-Omni
analyze_video	✅ Yes	Must use vision-capable model
📖 FILE READING (3 tools)
Tool	Description
read_file	Read files with auto-detection
cat	Cat-like behavior for any file
cat_multiple	Read multiple files simultaneously
🏗️ Architecture Overview
Layer 1: Scratchpad (JSON Prevention)
Helps model build complex JSON incrementally
Prevents JSON syntax errors before they happen
Uses existing tools (write_file, cat, etc.) under the hood
Integrates with truncator.ts to prevent context overflow
Layer 2: JSON Repair (Automatic)
Fixes JSON errors after they happen
Safety net for all tool calls
Repairs: trailing commas, unbalanced brackets, escape sequences
Transparent to the model
Truncation Integration (Single Source of Truth)
DEFAULT_MAX_CHARS = 8000 exported from truncator.ts
All outputs > 8000 chars are chunked
Prevents context overflow causing LM Studio faults
All tools use the same truncation limit via wrapWithTruncation()
⚠️ Deprecated Tools (6 tools)
Tool	Status	Alternative
git_status	❌ Deprecated	LM Studio native Git interface
git_diff	❌ Deprecated	LM Studio native Git interface
git_log	❌ Deprecated	LM Studio native Git interface
git_blame	❌ Deprecated	LM Studio native Git interface
git_list_files	❌ Deprecated	LM Studio native Git interface
git_read_file	❌ Deprecated	LM Studio native Git interface
🛡️ WASM Sandboxing (Pyodide Only)
Language	Execution Method	Sandboxed?
Python	Pyodide WASM	✅ Yes
JavaScript	Node.js direct	❌ No
Bash	Not supported	❌ Not available

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
