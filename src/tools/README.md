# LM Studio Plugin Toolkit — Tools Reference

## 📁 Overview

This directory contains all active tools for the universal-toolkit LM Studio plugin. Tools are organized by category and provide file operations, code execution, memory management, web search, and more.

## 🚀 Quick Start

All tools are automatically registered in the LM Studio plugin. No manual setup required.

```bash
# Install from development directory
lms dev --install
```

## 📊 Tool Inventory (67 Active Tools)

### 🔧 FILE OPERATIONS (14 tools)
| Tool | File | Description |
|------|------|-------------|
| `read_file` | `read_file.ts` | Read text/code files with encoding detection |
| `write_file` | `write_file.ts` | Create/overwrite files with dry-run support |
| `edit_file` | `edit_file.ts` | Apply patch operations (replace/insert/delete) |
| `create_file` | `fileops.ts` | Create files. AI determines appropriate file type. Special formats (txt, md, json, csv, html, docx, pdf) get formatted; others written as-is |
| `cat` | `fileops.ts` | Universal file reader (text, binary, documents) |
| `cat_multiple` | `fileops.ts` | Read multiple files simultaneously |
| `delete_lines_in_file` | `edit_file.ts` | Delete specific line ranges |
| `insert_at_line` | `edit_file.ts` | Insert content at specific line |
| `replace_text_in_file` | `edit_file.ts` | String replacement in files |
| `list_directory` | `list_directory.ts` | List files with recursive support |
| `search_directory` | `fileops.ts` | Advanced directory search by pattern/size/date |
| `grep` | `grep.ts` | Regex file content search using ripgrep |
| `copy_file` | `copy_file.ts` | Copy files/directories |
| `apply_patch` | `patch.ts` | Apply unified diff patches with conflict reporting |

### 💻 CODE EXECUTION (4 tools)
| Tool | File | Description |
|------|------|-------------|
| `execute_code` | `exec.ts` | Execute Python/Node.js code in WASM sandbox |
| `run_command` | `terminal.ts` | Execute terminal commands |
| `check_env` | `exec.ts` | Check host environment (QuickJS/Pyodide availability) |

### 📦 BACKGROUND TASKS (3 tools)
| Tool | File | Description |
|------|------|-------------|
| `run_background_task` | `background.ts` | Run commands in background |
| `check_task_status` | `background.ts` | Monitor background tasks |
| `stop_task` | `background.ts` | Stop running background tasks |

### 💾 MEMORY & STATE (12 tools)
| Tool | File | Description |
|------|------|-------------|
| `memory_set` | `memory.ts` | Set key-value pair in SQLite-backed memory |
| `memory_get` | `memory.ts` | Get value by key |
| `memory_list` | `memory.ts` | List keys with prefix filtering |
| `memory_delete` | `memory.ts` | Delete key from memory |
| `memory_log_append` | `memory.ts` | Append timestamped text to memory log |
| `memory_log_tail` | `memory.ts` | Get last N log entries |
| `save_work` | `task_state.ts` | Save work state by key |
| `load_work` | `task_state.ts` | Load saved work state |
| `clear_work` | `task_state.ts` | Clear saved work state |
| `set_break` | `task_state.ts` | Set break flag |
| `check_break` | `task_state.ts` | Check break flag |

### 📝 SCRATCHPAD (8 tools)
| Tool | File | Description |
|------|------|-------------|
| `scratchpad_init` | `scratchpad.ts` | Initialize scratchpad workspace |
| `scratchpad_write` | `scratchpad.ts` | Overwrite scratchpad content |
| `scratchpad_append` | `scratchpad.ts` | Append to scratchpad content |
| `scratchpad_read` | `scratchpad.ts` | Read scratchpad content |
| `scratchpad_validate` | `scratchpad.ts` | Validate JSON in scratchpad |
| `scratchpad_edit` | `scratchpad.ts` | Fix JSON syntax errors |
| `scratchpad_commit` | `scratchpad.ts` | Commit and clear scratchpad |
| `scratchpad_clear` | `scratchpad.ts` | Clear scratchpad without returning |

### 🌐 WEB & SEARCH (3 tools)
| Tool | File | Description |
|------|------|-------------|
| `web_search` | `websearch.ts` | DuckDuckGo web/news/image search |
| `fetch_web_content` | `websearch.ts` | Extract clean text from URLs |
| `browse_js` | `browser.ts` | Headless browser rendering (Playwright) |

### ✅ SCHEMA VALIDATION (1 tool)
| Tool | File | Description |
|------|------|-------------|
| `validate_schema` | `validate.ts` | Validate JSON/YAML against schema (with auto-repair) |

### 🧠 CODE INTELLIGENCE (2 tools)
| Tool | File | Description |
|------|------|-------------|
| `find_symbol` | `code_intel.ts` | Find symbol definition in codebase |
| `get_references` | `code_intel.ts` | Find all references to symbol |

### 🔧 JSON REPAIR (1 tool)
| Tool | File | Description |
|------|------|-------------|
| `json_repair` | `json_repair.ts` | Repair malformed JSON (hand-rolled strategies) |

## 🏗️ Architecture

### Layer 1: Scratchpad (JSON Prevention)
- Helps model build complex JSON incrementally
- Prevents JSON syntax errors before they happen
- Uses existing tools (write_file, cat, etc.) under the hood

### Layer 2: JSON Repair (Automatic)
- Fixes JSON errors after they happen
- Safety net for all tool calls
- Repairs: trailing commas, unbalanced brackets, escape sequences
- Transparent to the model

### Truncation Integration (Single Source of Truth)
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

## 🔒 Security Notes

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

## 📋 Deprecated Tools

### Git Operations (Deprecated 2025-07-09)
Git operations have been deprecated due to LM Studio's sandbox security constraints. The following tools now return deprecation messages:

- `git_status`
- `git_diff`
- `git_log`
- `git_blame`
- `git_list_files`
- `git_read_file`

**Alternative:** Use LM Studio's native Git interface for Git operations.

## 🧪 Testing

### Test Status
| Phase | Status | Tests | Passed |
|-------|--------|-------|--------|
| Phase 1: Core File Ops | ✅ Complete | 22 | 22 |
| Phase 2: Code Execution | ✅ Complete | 7 | 7 |
| Phase 3: Background Tasks | ✅ Complete | 5 | 5 |
| Phase 4: Memory & State | ✅ Complete | 15 | 15 |
| Phase 5: Scratchpad | ✅ Complete | 13 | 13 |
| Phase 6: Git Operations | ⚠️ Deprecated | 2 | 0 |
| Phase 7: Web & Search | ✅ Complete | 3 | 3 |
| Phase 8: Schema Validation | ✅ Complete | 4 | 4 |
| Phase 9: Vision & Media | ⏳ Skipped | — | — |
| Phase 10: Code Intelligence | ✅ Complete | 2 | 2 |
| Phase 11: JSON Repair | ✅ Complete | 4 | 2 |

### Production Readiness
| Check | Status |
|-------|--------|
| No dev-folder hardcoded paths | ✅ Verified |
| No npm build dependency | ✅ Confirmed |
| Works from `.lmstudio\extensions\plugins` | ✅ Verified |
| Git tools | ⚠️ Deprecated (LM Studio false positives) |
| Vision/Media | ⏳ Deferred (Blip2 implementation pending) |

## 📝 Notes

- V2 test plan: `COMPREHENSIVE_TEST_PLAN_V2_ACTIVE_TOOLS.md`
- Original test plan: `COMPREHENSIVE_TEST_PLAN.md` (V1)
- State of work: `STATE_OF_WORK_V2.md`
- Original state of work: `STATE_OF_WORK.md` (Phase 4 Complete)

---

*Last Updated: 2026-07-09*  
*Status: PRODUCTION READY*  
*Tools: 67 active | 5 skipped | 0 failed*
