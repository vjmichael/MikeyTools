# Mike's Multi-Tool Kit (mikeystoolkit) - LM Studio Plugin

A comprehensive TypeScript plugin for LM Studio that provides advanced file operations, web search, content fetching, code execution, persistent memory, schema validation, and code intelligence.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🚨 Prerequisites & Required Software (READ FIRST!)

Before running or installing this plugin in modern LM Studio, you **must have all of the following** installed on your machine!

### Core Runtime Requirements
1.  **PowerShell 7+ (*Windows ONLY*)** — Install from [GitHub](https://github.com/PowerShell/PowerShell/releases/latest)
2.  **Node.js v18+** ([Download](https://nodejs.org/)) — Runtime environment for TypeScript compilation and npm packages!

### Feature-Specific Dependencies
3.  **Python Latest Version** ([Download](https://www.python.org/downloads/)) — Required by OCR, semantic search, and schema validation
4.  **Headless Chromium / Chrome for Testing** — Needed by browser automation capabilities
5.  **Hugging Face CLI** — Required for downloading AI model weights (`blip2-opt-2.7b`)

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
Automatic JSON syntax repair for malformed tool-call arguments:
- Removes trailing commas
- Balances brackets/braces
- Fixes escape sequences
- Wraps partial JSON

### 📝 Scratchpad (Layer 1)
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
- `describe_image` - Describe images using BLIP-2
- `visual_question_answering` - Answer questions about images

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
cd "C:\Users\UserMN4312\toolkit\lm-studio-plugin"

# Install dependencies automatically
npm install --legacy-peer-deps

# Download BLIP-2 model weights (required for describe_image & visual_question_answering)
hf download Xenova/blip2-opt-2.7b --local-dir ./blip2-opt-2.7b

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
// Describe an image using BLIP-2
describe_image({file_path: "C:/path/to/image.jpg"})

// Answer questions about an image
visual_question_answering({
  file_path: "C:/path/to/image.jpg",
  question: "What color is the car?"
})
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
- The AI model **CAN** execute malicious code
- There is **NO default sandboxing** for working within a defined environment by LM Studio

### Why This Exists
This is intentional to work with "abliterated" editions of AI models for **red teaming** and security research.

### What This Toolkit DOES Provide
- Atomic file writes (prevents data corruption)
- Idempotency checks (avoids unnecessary writes)
- Error handling and validation
- Content-based file detection (not extension-based)
- WASM sandboxing for code execution (QuickJS + Pyodide)

### What This Toolkit DOES NOT Provide
- WSL2/Docker sandboxing for code execution
- File operation whitelisting
- Protection against malicious file operations
- Isolation from the host filesystem
- Any security boundaries

### Security Responsibility
**Users are responsible for:**
- Monitoring AI model behavior
- Restricting access to sensitive files
- Running AI models in controlled environments
- Understanding the risks of unfiltered AI execution

---

*Last Updated: 2025-07-09*
*Updated: Added git tools deprecation, truncator integration, single source of truth for max_output_length*
