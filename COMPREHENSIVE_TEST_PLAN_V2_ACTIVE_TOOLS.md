# Document

---
title: "Comprehensive Test Plan V2 - Active Tools"
---

# COMPREHENSIVE TEST PLAN V2 — ACTIVE TOOLS INVENTORY

## 📋 Document Info

| Field | Value |
|-------|-------|
| **Project** | universal-toolkit (v2.3.0) |
| **Directory** | `C:\Users\UserMN4312\toolkit\lm-studio-plugin` |
| **Source Root** | `src/tools/` |
| **Version** | V2 — Active Tools Only |
| **Date** | 2026-07-09 |
| **Based On** | `STATE_OF_WORK.md` (Phase 4 Complete) |

---

## 🎯 SCOPE & PURPOSE

This test plan is **V2** of the original comprehensive test plan. While the original (COMPREHENSIVE_TEST_PLAN.md) covered all 73 planned tools across 15 categories, **V2 focuses exclusively on the currently active, implemented tools** found in the `src/tools/` directory.

### Key Differences from V1:
- ✅ Only tools with actual source files in `src/tools/`
- ✅ Status reflects current implementation state (not planned)
- ✅ Test cases prioritized by active development status
- ✅ Explicitly marks stubs, truncated tools, and stubs

---

## 📊 ACTIVE TOOL INVENTORY (41 files → ~50+ tools)

### File-to-Tool Mapping

| # | Source File | Tool(s) Exposed | Category | Status |
|---|------------|-----------------|----------|--------|
| 1 | `audio.ts` | `transcribe_audio` | Audio | ✅ Implemented (Bundled) |
| 2 | `auto_inject.ts` | Auto-injection system | Core | ✅ Implemented |
| 3 | `background.ts` | `run_background_task`, `check_task_status`, `stop_task` | Background | ✅ Implemented |
| 4 | `behavioral_guidance_preprocessor.ts` | Behavioral guidance | Core | ✅ Implemented |
| 5 | `behavioral-guidance.json` | Guidance config | Core | ✅ Config |
| 6 | `browser.ts` | `browse_js` | Web | ✅ Implemented |
| 7 | `code_intel.ts` | `find_symbol`, `get_references` | Code Intel | ✅ Implemented |
| 8 | `constants.ts` | Shared constants | Utils | ✅ Implemented |
| 9 | `copy_file.ts` | `copy_file` | File Ops | ✅ Implemented |
| 10 | `drive_ops.ts` | `drive_ops` | Drive | ⚠️ Stub (Truncated) |
| 11 | `edit_file.ts` | `edit_file`, `delete_lines_in_file`, `insert_at_line`, `replace_text_in_file` | File Ops | ✅ Implemented |
| 12 | `exec.ts` | `execute_code`, `check_env` | Code Exec | ✅ Implemented |
| 13 | `fileops.ts` | `read_file`, `write_file`, `cat`, `cat_multiple`, `search_directory`, `is_symlink`, `get_symlink_target` | File Ops | ✅ Implemented |
| 14 | `git_ops.ts` | `git_status`, `git_diff`, `git_log`, `git_blame` | Git | ✅ Implemented |
| 15 | `git_read.ts` | `git_list_files`, `git_read_file` | Git | ✅ Implemented |
| 16 | `github_ops.ts` | `github_push`, `github_create_pr`, `github_create_issue`, `github_list_prs`, `github_get_pr`, `github_merge_pr`, `github_list_issues`, `github_get_issue`, `github_comment`, `github_api` | GitHub | ⚠️ All Stubs |
| 17 | `grep.ts` | `grep` | Search | ✅ Implemented |
| 18 | `image_desc.ts` | `image_desc` | Vision | ⚠️ Stub |
| 19 | `index.ts` | Tool registry | Core | ✅ Implemented |
| 20 | `json_repair.ts` | `json_repair` | Utils | ✅ Implemented |
| 21 | `list_directory.ts` | `list_directory` | File Ops | ✅ Implemented |
| 22 | `logger.ts` | Logging system | Utils | ✅ Implemented |
| 23 | `memory_rebuild.ts` | `rebuild_memory`, `read_memory_profile`, `index_*` tools | Memory | ⚠️ Partial |
| 24 | `memory.ts` | `memory_set`, `memory_get`, `memory_list`, `memory_delete`, `memory_log_append`, `memory_log_tail` | Memory | ✅ Implemented |
| 25 | `patch.ts` | `apply_patch` | Patching | ✅ Implemented |
| 26 | `POWERSHELL_ESCAPING_GUIDE.md` | Documentation | Docs | ✅ Reference |
| 27 | `powershell_utils.ts` | PowerShell utilities | Utils | ✅ Implemented |
| 28 | `read_file.ts` | `read_file` (detailed) | File Ops | ✅ Implemented |
| 29 | `README.md` | Documentation | Docs | ✅ Reference |
| 30 | `sandbox.ts` | `run_in_sandbox`, `manage_sandbox` | Sandbox | ⚠️ Stub |
| 31 | `scratchpad.ts` | `scratchpad_init`, `scratchpad_write`, `scratchpad_append`, `scratchpad_read`, `scratchpad_validate`, `scratchpad_edit`, `scratchpad_commit`, `scratchpad_clear` | Scratchpad | ✅ Implemented |
| 32 | `task_state.ts` | `save_work`, `load_work`, `clear_work`, `set_break`, `check_break` | State | ✅ Implemented |
| 33 | `terminal.ts` | `run_command` | Code Exec | ✅ Implemented |
| 34 | `truncator.ts` | Truncation system | Core | ✅ Implemented |
| 35 | `utils.ts` | General utilities | Utils | ✅ Implemented |
| 36 | `validate.ts` | `validate_schema` | Validation | ✅ Implemented |
| 37 | `video.ts` | `analyze_video` | Video | ✅ Implemented (Bundled) |
| 38 | `vision.ts` | `read_image`, `describe_image` | Vision | ⚠️ Partial |
| 39 | `websearch.ts` | `web_search`, `fetch_web_content` | Web | ✅ Implemented |
| 40 | `write_file.ts` | `write_file` (detailed) | File Ops | ✅ Implemented |

---

## 🧪 TEST PLAN — ACTIVE TOOLS

### PHASE 1: FILE OPERATIONS (12 tools from 7 files)

#### 1.1 `read_file` (fileops.ts + read_file.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-001 | Read existing text file | Content returned correctly | P0 |
| F1-002 | Read file with encoding (UTF-16) | Correct encoding applied | P0 |
| F1-003 | Read non-existent file | Error message returned | P0 |
| F1-004 | Read large file (>1MB) | Content truncated properly | P1 |
| F1-005 | Read binary file | Content returned as base64 | P1 |

#### 1.2 `write_file` (fileops.ts + write_file.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-006 | Create new file | File created with content | P0 |
| F1-007 | Overwrite existing file | Content replaced | P0 |
| F1-008 | Dry-run mode | No file written, preview returned | P0 |
| F1-009 | Create with parent dirs | Parent directories auto-created | P1 |
| F1-010 | Append mode | Content appended, not replaced | P1 |

#### 1.3 `edit_file` (edit_file.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-011 | Replace text operation | Text replaced correctly | P0 |
| F1-012 | Insert at line operation | Content inserted at line | P0 |
| F1-013 | Delete line range | Lines removed correctly | P0 |
| F1-014 | Multiple operations | All operations applied in order | P1 |
| F1-015 | Dry-run preview | Unified diff returned, no write | P1 |

#### 1.4 `cat` (fileops.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-016 | Read text file | Streaming content returned | P0 |
| F1-017 | Read binary file | Binary content handled | P1 |
| F1-018 | Large file streaming | Streaming works for >1MB | P1 |
| F1-019 | Line range filter | Only specified lines returned | P2 |

#### 1.5 `cat_multiple` (fileops.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-020 | Read 2 files simultaneously | Both contents concatenated | P0 |
| F1-021 | Read 5+ files | All contents returned | P1 |
| F1-022 | Mixed existing/non-existing | Error for missing files | P1 |

#### 1.6 `list_directory` (list_directory.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-023 | List root directory | All entries returned | P0 |
| F1-024 | Recursive listing | Subdirectory entries included | P0 |
| F1-025 | Filter by max_depth | Depth limited correctly | P1 |
| F1-026 | Sort by size/date | Entries sorted as specified | P2 |

#### 1.7 `search_directory` (fileops.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-027 | Search by pattern (*.ts) | Only .ts files returned | P0 |
| F1-028 | Search by content | Files containing text found | P0 |
| F1-029 | Search by size range | Files within size range found | P1 |
| F1-030 | Search by date range | Files within date range found | P1 |

#### 1.8 `grep` (grep.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-031 | Basic regex search | Matches returned with line numbers | P0 |
| F1-032 | Case-insensitive search | Case variations matched | P1 |
| F1-033 | Glob filter (*.py) | Only matching files searched | P1 |
| F1-034 | Max count limit | Results limited to count | P2 |

#### 1.9 `copy_file` (copy_file.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-035 | Copy single file | File copied to destination | P0 |
| F1-036 | Copy directory (recursive) | All subdirectories copied | P0 |
| F1-037 | Copy to non-existent dir | Destination dir auto-created | P1 |

#### 1.10 `apply_patch` (patch.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-038 | Apply valid unified diff | Changes applied correctly | P0 |
| F1-039 | Apply with conflicts | Conflict markers inserted | P1 |
| F1-040 | Dry-run mode | Diff preview, no write | P1 |

#### 1.11 `is_symlink` / `get_symlink_target` (fileops.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-041 | Check real file | Returns false | P0 |
| F1-042 | Check symlink | Returns true, target returned | P0 |
| F1-043 | Check broken symlink | Returns true, null target | P1 |

#### 1.12 `create_file` (fileops.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| F1-044 | Create TXT file | File created with content | P0 |
| F1-045 | Create JSON file | Valid JSON file created | P0 |
| F1-046 | Create CSV file | CSV with headers/rows created | P1 |
| F1-047 | Create HTML file | Styled HTML file created | P1 |

---

### PHASE 2: CODE EXECUTION (4 tools from 2 files)

#### 2.1 `execute_code` (exec.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| C2-001 | Execute Python code | Output captured, exit code 0 | P0 |
| C2-002 | Execute Node.js code | Output captured, exit code 0 | P0 |
| C2-003 | Execute Bash/PowerShell | Output captured | P0 |
| C2-004 | Code timeout | Execution halted after timeout | P1 |
| C2-005 | Execute with args | Arguments passed correctly | P1 |

#### 2.2 `run_command` (terminal.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| C2-006 | Run simple command | Output captured | P0 |
| C2-007 | Run with shell (bash) | Bash command executed | P1 |
| C2-008 | Run with PowerShell | PowerShell command executed | P1 |
| C2-009 | Long-running command | Timeout handled | P2 |

#### 2.3 `check_env` (exec.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| C2-010 | Check QuickJS WASM | WASM availability reported | P0 |
| C2-011 | Check Pyodide WASM | WASM availability reported | P0 |
| C2-012 | Check Docker | Docker status reported | P1 |
| C2-013 | Check WSL2 | WSL2 status reported | P1 |

---

### PHASE 3: BACKGROUND TASKS (3 tools from 1 file)

#### 3.1 `run_background_task` (background.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| B3-001 | Start background task | task_id returned immediately | P0 |
| B3-002 | Long-running task | Task continues in background | P1 |
| B3-003 | Task with timeout | Task terminated after timeout | P1 |

#### 3.2 `check_task_status` (background.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| B3-004 | Check completed task | stdout/stderr/exit_code returned | P0 |
| B3-005 | Check running task | Status shows running | P1 |
| B3-006 | Check invalid task_id | Error for unknown task_id | P1 |

#### 3.3 `stop_task` (background.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| B3-007 | Stop running task | Task terminated | P0 |
| B3-008 | Stop already stopped | Error or no-op | P2 |

---

### PHASE 4: MEMORY & STATE (12 tools from 3 files)

#### 4.1 `memory_set` / `memory_get` (memory.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| M4-001 | Set and get string | Value returned correctly | P0 |
| M4-002 | Set with namespace | Value isolated by namespace | P1 |
| M4-003 | Get non-existent key | Returns null | P0 |
| M4-004 | Overwrite existing key | New value stored | P1 |

#### 4.2 `memory_list` (memory.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| M4-005 | List all keys | All keys returned | P0 |
| M4-006 | List with prefix filter | Only matching keys returned | P1 |
| M4-007 | List from namespace | Keys from specific namespace | P1 |

#### 4.3 `memory_delete` (memory.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| M4-008 | Delete existing key | Key removed | P0 |
| M4-009 | Delete non-existent key | No error | P1 |
| M4-010 | Delete from namespace | Key removed from namespace | P1 |

#### 4.4 `memory_log_append` / `memory_log_tail` (memory.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| M4-011 | Append to log | Entry added with timestamp | P0 |
| M4-012 | Tail last N entries | N entries returned | P1 |
| M4-013 | Tail default (50) | Last 50 entries returned | P1 |

#### 4.5 `save_work` / `load_work` / `clear_work` (task_state.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| M4-014 | Save work state | State saved by key | P0 |
| M4-015 | Load saved state | State loaded correctly | P0 |
| M4-016 | Clear work state | State removed | P1 |
| M4-017 | Load non-existent state | Returns null/empty | P1 |

#### 4.6 `set_break` / `check_break` (task_state.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| M4-018 | Set break flag | Flag set | P0 |
| M4-019 | Check break flag | Returns true if set | P0 |
| M4-020 | Check after 1 min | Returns false (expired) | P1 |

#### 4.7 `rebuild_memory` / `read_memory_profile` (memory_rebuild.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| M4-021 | Rebuild from conversations | Profile generated | P1 |
| M4-022 | Read memory profile | Structured profile returned | P1 |

---

### PHASE 5: SCRATCHPAD (8 tools from 1 file)

#### 5.1 `scratchpad_init` (scratchpad.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| S5-001 | Initialize scratchpad | Temp file created | P0 |
| S5-02 | Clear existing content | Scratchpad reset | P1 |

#### 5.2 `scratchpad_write` / `scratchpad_append` (scratchpad.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| S5-03 | Write to scratchpad | Content written | P0 |
| S5-04 | Append to scratchpad | Content appended | P0 |
| S5-05 | Write large content | Content handled properly | P1 |

#### 5.3 `scratchpad_read` (scratchpad.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| S5-06 | Read scratchpad | Content returned | P0 |
| S5-07 | Read empty scratchpad | Empty/null returned | P1 |

#### 5.4 `scratchpad_validate` (scratchpad.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| S5-08 | Validate valid JSON | Validation passes | P0 |
| S5-09 | Validate invalid JSON | Validation fails with errors | P0 |
| S5-10 | Validate large JSON | Truncation handled | P1 |

#### 5.5 `scratchpad_edit` (scratchpad.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| S5-11 | Replace text in JSON | Text replaced | P0 |
| S5-12 | Insert line in JSON | Line inserted | P1 |
| S5-13 | Delete line in JSON | Line deleted | P1 |

#### 5.6 `scratchpad_commit` / `scratchpad_clear` (scratchpad.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| S5-14 | Commit scratchpad | Content returned, scratchpad cleared | P0 |
| S5-15 | Clear scratchpad | Scratchpad emptied | P1 |

---

### PHASE 6: GIT OPERATIONS (6 tools from 2 files)

#### 6.1 `git_status` (git_ops.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| G6-001 | Status with no changes | Clean status returned | P0 |
| G6-002 | Status with modified files | Modified files listed | P0 |
| G6-003 | Status with untracked files | Untracked files listed | P1 |

#### 6.2 `git_diff` (git_ops.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| G6-004 | Diff working tree | Changes shown | P0 |
| G6-005 | Diff specific file | File-specific diff | P1 |
| G6-006 | Diff between commits | Commit diff shown | P1 |

#### 6.3 `git_log` (git_ops.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| G6-007 | Recent commits | Commits returned | P0 |
| G6-008 | Limited commit count | N commits returned | P1 |

#### 6.4 `git_blame` (git_ops.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| G6-009 | Blame file | Line-by-line attribution | P0 |
| G6-010 | Blame specific file | File attribution shown | P1 |

#### 6.5 `git_list_files` (git_read.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| G6-011 | List HEAD files | Files in current commit | P0 |
| G6-012 | List specific commit | Files in specified commit | P1 |

#### 6.6 `git_read_file` (git_read.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| G6-013 | Read from HEAD | File content returned | P0 |
| G6-014 | Read from specific commit | Historical content returned | P1 |

---

### PHASE 7: WEB & SEARCH (3 tools from 2 files)

#### 7.1 `web_search` (websearch.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| W7-001 | Search query | Results returned | P0 |
| W7-002 | News search | News results returned | P1 |
| W7-003 | Image search | Image results returned | P1 |

#### 7.2 `fetch_web_content` (websearch.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| W7-004 | Fetch URL | Clean text content returned | P0 |
| W7-005 | Fetch with max_length | Content truncated | P1 |
| W7-006 | Fetch invalid URL | Error returned | P1 |

#### 7.3 `browse_js` (browser.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| W7-007 | Render URL | HTML content returned | P0 |
| W7-008 | Wait for selector | Waits for element | P1 |
| W7-009 | Dynamic page rendering | JavaScript executed | P1 |

---

### PHASE 8: SCHEMA VALIDATION (1 tool from 1 file)

#### 8.1 `validate_schema` (validate.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| V8-001 | Validate valid JSON | Validation passes | P0 |
| V8-002 | Validate invalid JSON | Errors with paths returned | P0 |
| V8-003 | Validate YAML | YAML validation works | P1 |
| V8-004 | Validate from file | File validation works | P1 |

---

### PHASE 9: VISION & MEDIA (5 tools from 3 files)

#### 9.1 `read_image` (vision.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| I9-001 | OCR text image | Text extracted | P0 |
| I9-002 | OCR document image | Text extracted | P1 |
| I9-003 | OCR handwritten text | Text extracted | P2 |

#### 9.2 `describe_image` (vision.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| I9-004 | Describe scene | Description returned | P0 |
| I9-005 | Describe object | Object description returned | P1 |
| I9-006 | Describe chart | Chart description returned | P1 |

#### 9.3 `transcribe_audio` (audio.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| A9-001 | Transcribe WAV | Transcript returned | P0 |
| A9-002 | Transcribe MP3 | Transcript returned | P1 |
| A9-003 | Transcribe with language | Language-specific transcription | P1 |

#### 9.4 `analyze_video` (video.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| V9-001 | Analyze video frames | Frame data returned | P0 |
| V9-002 | Analyze with interval | Custom interval frames | P1 |
| V9-003 | Analyze with question | Question answered | P1 |

#### 9.5 `image_desc` (image_desc.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| I9-007 | Image description utility | Description returned | P2 |

---

### PHASE 10: CODE INTELLIGENCE (2 tools from 1 file)

#### 10.1 `find_symbol` (code_intel.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| CI0-001 | Find function definition | File/line returned | P0 |
| CI0-002 | Find variable definition | File/line returned | P1 |
| CI0-003 | Find in TS files | TypeScript files searched | P1 |

#### 10.2 `get_references` (code_intel.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| CI0-004 | Get symbol references | All references returned | P0 |
| CI0-005 | Get references in directory | Directory search works | P1 |

---

### PHASE 11: JSON REPAIR (1 tool from 1 file)

#### 11.1 `json_repair` (json_repair.ts)
| Test ID | Test Case | Expected | Priority |
|---------|-----------|----------|----------|
| JR1-001 | Repair trailing comma | Comma removed | P0 |
| JR1-002 | Repair unbalanced brackets | Brackets balanced | P0 |
| JR1-003 | Repair escape sequences | Escapes fixed | P1 |
| JR1-004 | Repair partial JSON | JSON completed | P1 |
| JR1-005 | Already valid JSON | No changes, success | P1 |

---

## 📊 EXPECTED TEST SUMMARY

| Category | Tools | P0 Tests | P1 Tests | P2 Tests |
|----------|-------|----------|----------|----------|
| File Operations | 12 | 15 | 15 | 5 |
| Code Execution | 4 | 5 | 3 | 0 |
| Background Tasks | 3 | 3 | 2 | 0 |
| Memory & State | 12 | 8 | 10 | 0 |
| Scratchpad | 8 | 5 | 5 | 0 |
| Git Operations | 6 | 5 | 4 | 0 |
| Web & Search | 3 | 3 | 3 | 0 |
| Schema Validation | 1 | 2 | 2 | 0 |
| Vision & Media | 5 | 3 | 6 | 1 |
| Code Intelligence | 2 | 2 | 2 | 0 |
| JSON Repair | 1 | 2 | 2 | 0 |
| **TOTAL** | **62** | **57** | **54** | **6** |

---

## ⚠️ KNOWN STUBS & TRUNCATED TOOLS

| Tool(s) | Source File | Status | Reason |
|---------|-------------|--------|--------|
| `drive_ops` | drive_ops.ts | ⚠️ Stub | Truncated per sandbox-first design |
| `github_*` (10 tools) | github_ops.ts | ⚠️ Stubs | `gh` auth not in sandbox |
| `run_in_sandbox` | sandbox.ts | ⚠️ Stub | Docker/WSL pathing blocked |
| `manage_sandbox` | sandbox.ts | ⚠️ Stub | Docker image management blocked |
| `describe_image` | vision.ts | ⚠️ Partial | BLIP model requires native execution |
| `index_*` (4 tools) | memory_rebuild.ts | ⚠️ Partial | Semantic search indexing |

---

## 🔄 EXECUTION ORDER

### Recommended Testing Sequence:
1. **Phase 1** - Core file operations (foundation for all other tests)
2. **Phase 10** - JSON repair (utility for schema validation)
3. **Phase 8** - Schema validation (data integrity)
4. **Phase 4** - Memory & state (persistent storage)
5. **Phase 5** - Scratchpad (incremental JSON building)
6. **Phase 6** - Git operations (version control)
7. **Phase 2** - Code execution (runtime capability)
8. **Phase 3** - Background tasks (concurrent execution)
9. **Phase 7** - Web & search (external connectivity)
10. **Phase 9** - Vision & media (specialized processing)
11. **Phase 11** - Code intelligence (analysis tools)

---

## 📋 ISSUE TRACKING

| Date | Issue | Severity | Status |
|------|-------|----------|--------|
| 2026-07-07 | Context window exceeded (878772 tokens) | Critical | Resolved |
| 2026-07-09 | Sandbox pathing blocked | High | Documented |
| 2026-07-09 | GitHub tools stubbed | Medium | Documented |

---

*V2 Generated: 2026-07-09*  
*Based on: STATE_OF_WORK.md (Phase 4 Complete)*  
*Active Tools Source: src/tools/ (41 files)*  
*Status: Ready for Execution*


---
*Generated by Universal Toolkit*