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

================================================================================
                    MIKEYTOOLS LM STUDIO PLUGIN — COMPLETE TOOLS LIST
================================================================================

Total Active Tools: 64
Total Deprecated: 6

================================================================================
📊 COMPLETE TOOLS INVENTORY
================================================================================

--- 🔧 FILE OPERATIONS (14 tools) ---

1.  write_file
    Description: Create/overwrite files
    Key Features: Dry-run mode, parent directory auto-creation

2.  write_file_append
    Description: Append to files
    Key Features: Dry-run mode, parent directory auto-creation

3.  edit_file
    Description: Complex file editing
    Key Features: Replace/insert/delete operations, dry-run diff preview

4.  create_file
    Description: Create files with any extension
    Key Features: AI determines file type, special formatting for txt/md/json/csv/html/docx/pdf

5.  read_file
    Description: Read any file
    Key Features: Auto-detects text vs binary, handles UTF-8/UTF-16/ASCII

6.  cat
    Description: Universal file reader
    Key Features: Streaming for large files, line range filtering, binary support

7.  cat_multiple
    Description: Read multiple files simultaneously
    Key Features: Concatenates content, per-file results

8.  delete_lines_in_file
    Description: Delete specific line ranges
    Key Features: 1-indexed line numbers, optional end_line

9.  insert_at_line
    Description: Insert content at specific line
    Key Features: 1-indexed line number, pushes existing content down

10. replace_text_in_file
    Description: Simple find-and-replace
    Key Features: Exact string matching, unique old_string required

11. list_directory
    Description: List files/directories
    Key Features: Recursive support, sorting by name/size/date, max_depth filter

12. search_directory
    Description: Advanced directory search
    Key Features: Pattern matching, size/date/content filters, recursive mode

13. grep
    Description: Regex file content search
    Key Features: ripgrep-based, case-insensitive, glob filtering

14. copy_file
    Description: Copy files/directories
    Key Features: Recursive directory copy, auto-create destination

15. apply_patch
    Description: Apply unified diff patches
    Key Features: Dry-run mode, conflict reporting, .bak backups

16. is_symlink
    Description: Check if path is a symlink
    Key Features: Returns true/false

17. get_symlink_target
    Description: Get symlink target
    Key Features: Returns resolved target path or null

--- 💻 CODE EXECUTION (4 tools) ---

18. execute_code
    Description: Execute Python/Node.js code
    Sandbox: Pyodide (Python) / Node.js (JS)

19. run_command
    Description: Execute terminal commands
    Sandbox: Native shell (auto-detects OS)

20. check_env
    Description: Check sandbox availability
    Sandbox: Reports Pyodide status

21. run_in_sandbox
    Description: DEPRECATED → execute_code
    Sandbox: Redirects to execute_code

--- 📦 BACKGROUND TASKS (3 tools) ---

22. run_background_task
    Description: Run commands in background
    Returns: task_id immediately

23. check_task_status
    Description: Monitor background tasks
    Returns: stdout/stderr/exit_code

24. stop_task
    Description: Stop running background task
    Action: Terminates task

--- 💾 MEMORY & STATE (14 tools) ---

25. memory_set
    Description: Set key-value pair in SQLite-backed memory

26. memory_get
    Description: Get value by key
    Returns: null if absent

27. memory_list
    Description: List keys with prefix filtering
    Features: LIKE match support

28. memory_delete
    Description: Delete key from memory

29. memory_log_append
    Description: Append timestamped text to memory log

30. memory_log_tail
    Description: Get last N log entries
    Default: 50

31. save_work
    Description: Save work state by key

32. load_work
    Description: Load saved work state

33. clear_work
    Description: Clear saved work state

34. set_break
    Description: Set break flag to halt approach

35. check_break
    Description: Check if break flag is set (60s validity)

36. rebuild_memory
    Description: Rebuild memory profile from conversations

37. read_memory_profile
    Description: Read current memory profile

--- 📝 SCRATCHPAD (8 tools) ---

38. scratchpad_init
    Description: Initialize scratchpad workspace

39. scratchpad_write
    Description: Overwrite scratchpad content

40. scratchpad_append
    Description: Append to scratchpad content

41. scratchpad_read
    Description: Read scratchpad content
    Note: Truncation if > 8000 chars

42. scratchpad_validate
    Description: Validate JSON in scratchpad

43. scratchpad_edit
    Description: Fix JSON syntax errors
    Features: Replace/insert/delete operations

44. scratchpad_commit
    Description: Commit and clear scratchpad
    Returns: final JSON

45. scratchpad_clear
    Description: Clear scratchpad without returning

--- 🌐 WEB & SEARCH (3 tools) ---

46. web_search
    Description: DuckDuckGo web/news/image search
    Features: Configurable results, region, safesearch

47. fetch_web_content
    Description: Extract clean text from URLs
    Features: Removes scripts/styles/navigation

48. browse_js
    Description: Headless browser rendering
    Engine: Playwright-based, wait for selectors

--- ✅ SCHEMA VALIDATION (1 tool) ---

49. validate_schema
    Description: Validate JSON/YAML against schema
    Returns: precise error paths

--- 🧠 CODE INTELLIGENCE (2 tools) ---

50. find_symbol
    Description: Find symbol definition in codebase
    Returns: file/line

51. get_references
    Description: Find all references to symbol
    Features: Directory search

--- 🔧 JSON REPAIR (1 tool) ---

52. json_repair
    Description: Repair malformed JSON
    Repairs: trailing commas, unbalanced brackets, escape sequences

--- 🖼️ VISION & MEDIA (5 tools) ---

53. describe_image
    AI Model Required: ⚠️ Optional
    Notes: Blip2 (offline); Not needed if using vision-capable model

54. visual_question_answering
    AI Model Required: ✅ Yes
    Notes: Must use vision-capable model

55. read_image (OCR)
    AI Model Required: ❌ No
    Notes: Uses Tesseract.js (offline)

56. transcribe_audio
    Status: ~~DEPRECATED~~ (strikethrough)
    Notes: ~~Uses whisper.cpp (offline); future: Qwen3-Omni~~

57. analyze_video
    AI Model Required: ✅ Yes
    Notes: Must use vision-capable model

--- 📖 FILE READING (3 tools) ---

58. read_file
    Description: Read files with auto-detection
    Features: Handles UTF-8, UTF-16, ASCII, binary

59. cat
    Description: Cat-like behavior for any file
    Features: Streaming for large files (>1MB), line range filtering

60. cat_multiple
    Description: Read multiple files simultaneously
    Features: Concatenates content

--- ⚠️ DEPRECATED TOOLS (6 tools) ---

61. git_status
    Alternative: LM Studio native Git interface

62. git_diff
    Alternative: LM Studio native Git interface

63. git_log
    Alternative: LM Studio native Git interface

64. git_blame
    Alternative: LM Studio native Git interface

65. git_list_files
    Alternative: LM Studio native Git interface

66. git_read_file
    Alternative: LM Studio native Git interface

================================================================================
🏗️ ARCHITECTURE OVERVIEW
================================================================================

--- Layer 1: Scratchpad (JSON Prevention) ---
- Helps model build complex JSON incrementally
- Prevents JSON syntax errors before they happen
- Uses existing tools (write_file, cat, etc.) under the hood
- Integrates with truncator.ts to prevent context overflow

--- Layer 2: JSON Repair (Automatic) ---
- Fixes JSON errors after they happen
- Safety net for all tool calls
- Repairs: trailing commas, unbalanced brackets, escape sequences
- Transparent to the model

--- Truncation Integration (Single Source of Truth) ---
- DEFAULT_MAX_CHARS = 8000 exported from truncator.ts
- All outputs > 8000 chars are chunked
- Prevents context overflow causing LM Studio faults
- All tools use the same truncation limit via wrapWithTruncation()

================================================================================
🛡️ WASM SANDBOXING (PYODIDE ONLY)
================================================================================

Language     | Execution Method     | Sandboxed?
-------------|---------------------|------------
Python       | Pyodide WASM        | ✅ Yes
JavaScript   | Node.js direct      | ❌ No
Bash         | Not supported       | ❌ Not available

================================================================================
📋 TOOL CATEGORIES SUMMARY
================================================================================

Category                  | Count
--------------------------|------
File Operations           | 14
Code Execution            | 4
Background Tasks          | 3
Memory & State            | 14
Scratchpad                | 8
Web & Search              | 3
Schema Validation         | 1
Code Intelligence         | 2
JSON Repair               | 1
Vision & Media            | 5
File Reading              | 3
Deprecated                | 6
--------------------------|------
TOTAL                     | 64

================================================================================
*Generated: 2026-07-09*
*Source: MikeyTools LM Studio Plugin (mikeystoolkit)*
================================================================================
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
