# Document

# COMPREHENSIVE TOOLKIT TEST PLAN

## Project Overview
- **Directory:** `C:\Users\UserMN4312\toolkit\lm-studio-plugin`
- **Plugin Name:** universal-toolkit (v2.3.0)
- **Author:** Universal Toolkit (mikeytools)
- **Entry Point:** `dist/index.js` (compiled from `src/index.ts`)

---

## TOOL CATEGORIES & TASK LIST

### 🔧 CATEGORY 1: FILE OPERATIONS (14 tools)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 1 | `read_file` | `src/tools/read_file.ts` | Read file content with encoding support |
| 2 | `write_file` | `src/tools/write_file.ts` | Create/overwrite files with dry-run support |
| 3 | `edit_file` | `src/tools/edit_file.ts` | Apply patch operations (replace/insert/delete) |
| 4 | `create_file` | `src/tools/fileops.ts` | Create files in multiple formats (txt, md, json, csv, html, docx, pdf) |
| 5 | `cat` | `src/tools/fileops.ts` | Read any file type with streaming support |
| 6 | `cat_multiple` | `src/tools/fileops.ts` | Read multiple files simultaneously |
| 7 | `delete_lines_in_file` | `src/tools/edit_file.ts` | Delete specific line ranges |
| 8 | `insert_at_line` | `src/tools/edit_file.ts` | Insert content at specific line |
| 9 | `replace_text_in_file` | `src/tools/edit_file.ts` | String replacement in files |
| 10 | `list_directory` | `src/tools/list_directory.ts` | List files with recursive support |
| 11 | `search_directory` | `src/tools/fileops.ts` | Advanced directory search by pattern/size/date/content |
| 12 | `grep` | `src/tools/grep.ts` | Regex file content search using ripgrep |
| 13 | `is_symlink` | `src/tools/fileops.ts` | Check if path is symbolic link |
| 14 | `get_symlink_target` | `src/tools/fileops.ts` | Get symlink target path |

### 🌐 CATEGORY 2: WEB & SEARCH (3 tools)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 15 | `web_search` | `src/tools/websearch.ts` | DuckDuckGo search engine |
| 16 | `fetch_web_content` | `src/tools/websearch.ts` | Extract clean text from URLs |
| 17 | `browse_js` | `src/tools/browser.ts` | Headless browser rendering (Playwright) |

### 💻 CATEGORY 3: CODE EXECUTION (6 tools)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 18 | `execute_code` | `src/tools/exec.ts` | Execute Python/Bash/Node.js code |
| 19 | `run_command` | `src/tools/terminal.ts` | Execute terminal commands |
| 20 | `run_background_task` | `src/tools/background.ts` | Run commands in background |
| 21 | `check_task_status` | `src/tools/background.ts` | Monitor background tasks |
| 22 | `stop_task` | `src/tools/background.ts` | Stop running background tasks |
| 23 | `check_env` | `src/tools/sandbox.ts` | Check host environment (Docker/WSL2/PowerShell) |

### 📦 CATEGORY 4: SANDBOX & DOCKER (3 tools)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 24 | `run_in_sandbox` | `src/tools/sandbox.ts` | Execute in isolated Docker/WSL2 environment |
| 25 | `manage_sandbox` | `src/tools/sandbox.ts` | Pull Docker images, list images |
| 26 | `drive_ops` | `src/tools/drive_ops.ts` | Drive operations utilities |

### 🔀 CATEGORY 5: PATCHING (1 tool)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 27 | `apply_patch` | `src/tools/patch.ts` | Apply unified diff patches with conflict reporting |

### 💾 CATEGORY 6: PERSISTENT MEMORY (13 tools)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 28 | `memory_set` | `src/tools/memory.ts` | Set key-value pair in SQLite-backed memory |
| 29 | `memory_get` | `src/tools/memory.ts` | Get value by key |
| 30 | `memory_list` | `src/tools/memory.ts` | List keys with prefix filtering |
| 31 | `memory_delete` | `src/tools/memory.ts` | Delete key from memory |
| 32 | `memory_log_append` | `src/tools/memory.ts` | Append timestamped text to memory log |
| 33 | `memory_log_tail` | `src/tools/memory.ts` | Get last N log entries |
| 34 | `rebuild_memory` | `src/tools/memory_rebuild.ts` | Rebuild memory profile from conversations |
| 35 | `read_memory_profile` | `src/tools/memory_rebuild.ts` | Read structured memory profile |
| 36 | `save_work` | `src/tools/task_state.ts` | Save work state by key |
| 37 | `load_work` | `src/tools/task_state.ts` | Load saved work state |
| 38 | `clear_work` | `src/tools/task_state.ts` | Clear saved work state |
| 39 | `set_break` | `src/tools/task_state.ts` | Set break flag |
| 40 | `check_break` | `src/tools/task_state.ts` | Check break flag |

### 🔍 CATEGORY 7: SEMANTIC SEARCH (4 tools)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 41 | `index_lm_studio_conversations` | `src/tools/memory_rebuild.ts` | Index conversations for semantic search |
| 42 | `index_build` | `src/tools/memory_rebuild.ts` | Build semantic search index |
| 43 | `index_query` | `src/tools/memory_rebuild.ts` | Query semantic search index |
| 44 | `index_update` | `src/tools/memory_rebuild.ts` | Incrementally update search index |

### ✅ CATEGORY 8: SCHEMA VALIDATION (1 tool)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 45 | `validate_schema` | `src/tools/validate.ts` | Validate JSON/YAML against JSON Schema |

### 🖼️ CATEGORY 9: IMAGE & VISION (3 tools)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 46 | `read_image` | `src/tools/vision.ts` | Tesseract OCR for images |
| 47 | `describe_image` | `src/tools/vision.ts` | BLIP vision model image description |
| 48 | `image_desc` | `src/tools/image_desc.ts` | Image description utilities |

### 🎵 CATEGORY 10: AUDIO (1 tool)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 49 | `transcribe_audio` | `src/tools/audio.ts` | Whisper.cpp audio transcription |

### 🎬 CATEGORY 11: VIDEO (1 tool)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 50 | `analyze_video` | `src/tools/video.ts` | Video frame extraction and analysis |

### 🔧 CATEGORY 12: GIT OPERATIONS (6 tools)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 51 | `git_status` | `src/tools/git_ops.ts` | Check Git repository status |
| 52 | `git_diff` | `src/tools/git_ops.ts` | Show commit/file changes |
| 53 | `git_log` | `src/tools/git_ops.ts` | List commit history |
| 54 | `git_blame` | `src/tools/git_ops.ts` | Track code ownership per line |
| 55 | `git_list_files` | `src/tools/git_read.ts` | List files in Git commit/branch |
| 56 | `git_read_file` | `src/tools/git_read.ts` | Read file from specific Git revision |

### 🐙 CATEGORY 13: GITHUB OPERATIONS (10 tools)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 57 | `github_push` | `src/tools/github_ops.ts` | Stage, commit, and push changes |
| 58 | `github_create_pr` | `src/tools/github_ops.ts` | Create Pull Request |
| 59 | `github_create_issue` | `src/tools/github_ops.ts` | Create GitHub Issue |
| 60 | `github_list_prs` | `src/tools/github_ops.ts` | List Pull Requests |
| 61 | `github_get_pr` | `src/tools/github_ops.ts` | Get PR details |
| 62 | `github_merge_pr` | `src/tools/github_ops.ts` | Merge a Pull Request |
| 63 | `github_list_issues` | `src/tools/github_ops.ts` | List Issues |
| 64 | `github_get_issue` | `src/tools/github_ops.ts` | Get Issue details |
| 65 | `github_comment` | `src/tools/github_ops.ts` | Add comment to PR/Issue |
| 66 | `github_api` | `src/tools/github_ops.ts` | Direct GitHub REST API calls |

### 🧠 CATEGORY 14: CODE INTELLIGENCE (2 tools)
| # | Tool Name | File | Description |
|---|-----------|------|-------------|
| 67 | `find_symbol` | `src/tools/code_intel.ts` | Find symbol definition |
| 68 | `get_references` | `src/tools/code_intel.ts` | Find all references to symbol |

### 🛠️ CATEGORY 15: UTILITIES (5 files)
| # | File Name | Description |
|---|-----------|-------------|
| 69 | `constants.ts` | Shared constants |
| 70 | `logger.ts` | Logging utilities |
| 71 | `utils.ts` | General utilities |
| 72 | `powershell_utils.ts` | PowerShell escaping utilities |
| 73 | `wsl_utils.ts` | WSL utilities |

---

## TEST EXECUTION ORDER

### Phase 1: Core File Operations
- Test read_file, write_file, edit_file, cat, list_directory, grep, search_directory

### Phase 2: Web & Search
- Test web_search, fetch_web_content, browse_js

### Phase 3: Code Execution
- Test execute_code, run_command, background tasks

### Phase 4: Memory & State
- Test all memory operations, work state management

### Phase 5: Semantic Search
- Test indexing and querying

### Phase 6: Schema Validation
- Test JSON/YAML validation

### Phase 7: Media Operations
- Test image, audio, video tools

### Phase 8: Git & GitHub
- Test all git operations, GitHub API

### Phase 9: Code Intelligence
- Test symbol finding and references

### Phase 10: Utilities
- Test environment checks, sandbox operations

---

## ISSUES LOG

| Date | Issue | Severity | Status |
|------|-------|----------|--------|
| 2026-07-07 | Context window exceeded (878772 tokens requested, 262144 available) | Critical | Documented - Resolved via state file |

---

*Last Updated: 2026-07-08*
*Tested By: AI Senior Developer Assistant*


---
*Generated by Universal Toolkit*