# Universal Toolkit - Dependency Matrix

This matrix shows all tools and their dependencies. Use this to understand what software must be installed before using each tool.

## Tier 1: Simplest Tools (No External Dependencies)

| Tool | File | External Software | npm Packages | Model/Data Files | Notes |
|------|------|-------------------|--------------|------------------|-------|
| `write_file` | `write_file.ts` | None | None | None | Pure Node.js, atomic writes |
| `read_file` | `read_file.ts` | None | None | None | Pure Node.js, smart encoding |
| `edit_file` | `edit_file.ts` | None | None | None | Pure Node.js, diff-based |
| `create_file` | `fileops.ts` | None | csv-stringify, docx, pdfkit, pdf-parse, jszip | None | 7 file formats |
| `list_directory` | `list_directory.ts` | None | None | None | Pure Node.js, recursive |
| `grep` | `grep.ts` | ripgrep (rg) CLI | None | None | Falls back gracefully if missing |
| `patch` | `patch.ts` | None | None | None | Pure Node.js, unified diff |

## Tier 2: Moderate Tools (Common npm Dependencies)

| Tool | File | External Software | npm Packages | Model/Data Files | Notes |
|------|------|-------------------|--------------|------------------|-------|
| `web_search` | `websearch.ts` | None | cheerio | None | Uses DuckDuckGo/Google/Bing |
| `fetch_web_content` | `websearch.ts` | None | None | None | Uses native Node.js fetch |
| `git_ops` | `git_ops.ts` | git CLI | None | None | Local Git operations |
| `git_read` | `git_read.ts` | git CLI | None | None | Read-only Git operations |
| `validate` | `validate.ts` | None | ajv, js-yaml | None | JSON/YAML validation |
| `memory` | `memory.ts` | None | sql.js | None | SQLite-backed persistent storage |
| `task_state` | `task_state.ts` | None | None | None | File-based work state |
| `background` | `background.ts` | None | None | None | In-memory task tracking |
| `memory_rebuild` | `memory_rebuild.ts` | None | None | None | Conversation summarization |
| `logger` | `logger.ts` | None | None | None | Centralized logging |
| `utils` | `utils.ts` | None | None | None | Shared utilities |
| `constants` | `constants.ts` | None | None | None | Centralized constants |
| `types` | `types.ts` | None | None | None | Shared type definitions |

## Tier 3: Complex Tools (Require External Installation)

| Tool | File | External Software | npm Packages | Model/Data Files | Notes |
|------|------|-------------------|--------------|------------------|-------|
| `sandbox` | `sandbox.ts` | Docker **OR** WSL2 | None | None | Isolated code execution |
| `exec` | `exec.ts` | Python/Node/bash CLI | None | None | Direct code execution |
| `terminal` | `terminal.ts` | PowerShell 7+ (Win) or bash | None | None | Shell access |
| `browser` | `browser.ts` | Chromium/Puppeteer | playwright | None | Headless browser automation |

## Tier 4: Specialized Tools (Heavy Dependencies)

| Tool | File | External Software | npm Packages | Model/Data Files | Notes |
|------|------|-------------------|--------------|------------------|-------|
| `index` | `index.ts` | None | @xenova/transformers | ~100MB model | Semantic search, downloads model on first use |
| `image_desc` | `image_desc.ts` | None | @xenova/transformers | ~100MB model | Image understanding, downloads model on first use |
| `vision` | `vision.ts` | None | tesseract.js, sharp | ~20MB OCR data | OCR from images, downloads data on first use |
| `video` | `video.ts` | ffmpeg, Python | None | None | Video frame extraction + OCR |
| `audio` | `audio.ts` | whisper.cpp | None | None | Audio transcription |
| `drive_ops` | `drive_ops.ts` | None | googleapis | None | Requires OAuth2 token.json |
| `github_ops` | `github_ops.ts` | git CLI | None | None | GitHub API + authentication |
| `docker_ops` | `docker_ops.ts` | Docker Desktop | None | None | Docker image management |
| `code_intel` | `code_intel.ts` | tree-sitter (native) | None | None | Currently disabled (no C++ build tools) |

## Prerequisite Checklist

Before using complex tools, verify these are installed:

### Core Requirements (All Tools)
- [ ] Node.js 18+
- [ ] npm (comes with Node.js)
- [ ] PowerShell 7+ (Windows) or bash (Linux/Mac)

### Tier 2 Prerequisites
- [ ] git CLI (for `git_ops`, `git_read`, `github_ops`)
- [ ] ripgrep (rg) (for `grep`, optional - falls back gracefully)

### Tier 3 Prerequisites (Choose ONE)
- [ ] Docker Desktop installed **OR**
- [ ] WSL2 installed (`wsl --install` on Windows)

### Tier 3 Alternative Prerequisites
- [ ] Python 3.x (for `exec` with Python)
- [ ] Node.js (for `exec` with Node.js)
- [ ] Chromium/Chrome (for `browser`)

### Tier 4 Prerequisites (Only if needed)
- [ ] @xenova/transformers model (~100MB, downloaded automatically)
- [ ] Tesseract OCR data files (~20MB, downloaded automatically)
- [ ] ffmpeg (for `video`)
- [ ] whisper.cpp (for `audio`)
- [ ] OAuth2 token.json (for `drive_ops`)
- [ ] GitHub authentication configured (for `github_ops`)
- [ ] Docker Desktop (for `docker_ops`)

## Quick Reference: "Do I Need X?"

| I want to use... | Do I need extra software? |
|-----------------|---------------------------|
| read/write/edit files | No |
| list directories | No |
| grep/search files | ripgrep (optional, falls back) |
| web search | No |
| Git operations | git CLI |
| JSON/YAML validation | No |
| Persistent memory | No |
| Sandbox execution | Docker **OR** WSL2 |
| Execute code | Python/Node/bash |
| Browser automation | Chromium |
| Semantic search | Auto-downloads model |
| Image OCR | Auto-downloads data |
| Video analysis | ffmpeg + Python |
| Audio transcription | whisper.cpp |
| Google Drive | OAuth2 token.json |
| GitHub API | git CLI + auth |
