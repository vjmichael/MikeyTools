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
cd "c:\Users\$yourusername$\MikeyTools\lm-studio-plugin" 

# 2. Install all Node.js dependencies automatically:
npm install --legacy-peer-deps  

# 3. Load an AI model with tool support in LM Studio (for describe_image, analyze_video):
# Open LM Studio → Discover tab → Search for any AI model with tools support → Download
# Look for AI Models with the hammer symbol next to them.```

<img width="1945" height="1390" alt="image" src="https://github.com/user-attachments/assets/484da405-a1ac-4594-88ef-12afcc09d740" />

```# 4. Build TypeScript into a format LM Studio can read (dist/index.js):
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

| Tool | Description | Dependencies Required |
|------|-------------|------------------------|  
| `web_search` / `fetch_web_content` | Search web/news/images via DuckDuckGo + fetch URLs | None (built-in) |  
| `create_file` / `read_file` | Create/read txt/md/json/csv/html/docx/pdf files | Node.js runtime only |
| `search_directory` | Advanced file/folder search with filters | None (built-in) 
| `execute_code` | Execute Python/Bash/Node code in **WASM sandbox** (QuickJS for JS, Pyodide for Python) | WASM sandbox (built-in) |
| `memory_set/get/list/delete/log_append/tail` | Persistent sql.js-backed key-value store & log management | Pure JS — no extra deps needed!  
| `index_build/query/update` | Semantic search indexing over directories using sentence transformers | Python + numpy/sentence-transformers installed via pip above 
| `validate_schema` / `read_image` (OCR) | JSON/YAML validation against schemas and Tesseract-based image text extraction | Pillow, pytesseract, jsonschema packages from pip list above!
| `describe_image` | Image captioning using loaded AI model (Qwen2.5-VL) | Qwen2.5-VL-3B loaded in LM Studio |
| `visual_question_answering` | Answer questions about an image using loaded AI model | Qwen2.5-VL-3B loaded in LM Studio |

### ⚠️ Deprecated: Git Tools (2025-07-09)

**The following tools have been deprecated** due to sandbox security constraints:

| Tool | Status | Alternative |
|------|--------|-------------|
| `git_status` | ❌ Deprecated | LM Studio native Git interface |
| `git_diff` | ❌ Deprecated | LM Studio native Git interface |
| `git_log` | ❌ Deprecated | LM Studio native Git interface |
| `git_blame` | ❌ Deprecated | LM Studio native Git interface |
| `git_list_files` | ❌ Deprecated | LM Studio native Git interface |
| `git_read_file` | ❌ Deprecated | LM Studio native Git interface |
| All GitHub tools | ❌ Deprecated | LM Studio native GitHub interface |

**To restore git tools in the future:**
1. Restore from `backup/system-path-tools/`
2. Update sandbox permissions to allow system pathing
3. Re-enable tools in `tools-order.ts`

---

## 🛡️ Security Model: WASM-Based Sandboxing (Pyodide Only)

This plugin uses **WebAssembly (WASM) sandboxing** for code execution:

- **JavaScript**: Node.js direct execution (not sandboxed)
- **Python**: `pyodide` (CPython compiled to WASM)
- **Bash**: Not supported in sandboxed mode (requires real OS shell)

**QuickJS WASM was deprecated and removed (2026-07-09):**
- ❌ Browser-first design (not compatible with LM Studio's Node.js environment)
- ❌ Intentionally restricts Node.js APIs for security
- ❌ WASM loading issues in non-browser environments
- ❌ Filesystem access restrictions break sandbox functionality
- ❌ Limited Node.js compatibility (explicitly stated by library authors)

**Pyodide WASM:**
- Python execution in isolated WASM environment
- Full Python standard library
- Scientific packages (numpy, pandas) available

**Benefits:**
- ✅ No Docker/WSL2 required
- ✅ Default-deny security (no network/filesystem access by default)
- ✅ Configurable timeouts and memory limits
- ✅ Works inside LM Studio's plugin sandbox

Have not tried any other programming language and scripts. So long as the appropriate compiler is install, the AI model can write and run any code.

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
