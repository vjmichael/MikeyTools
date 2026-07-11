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
