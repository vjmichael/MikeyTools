# read_file.ts - File Reading Tool

## Overview

The `read_file.ts` module provides comprehensive file reading capabilities for the LM Studio plugin. It includes two main interfaces:

1. **`readFile()`** - Optimized for text/code files with smart encoding detection
2. **`cat()`** - Universal file reader that handles any file type (text, binary, documents)

## Available Functions

### `readFile(filePath, options)`

Reads text and code files with automatic encoding detection and size limiting.

**Parameters:**
- `filePath` (string): Path to the file to read
- `options` (ReadFileOptions, optional):
  - `encoding` (string): Force a specific encoding (default: 'utf8')
  - `maxBytes` (number): Maximum bytes to read (default: 10MB)
  - `detectEncoding` (boolean): Auto-detect encoding (default: true)
  - `trimWhitespace` (boolean): Trim leading/trailing whitespace (default: false)
  - `lineRange` (object): Read specific line range `{ start: number, end?: number }` (1-indexed)
  - `dryRun` (boolean): Preview without reading (default: false)

**Returns:** Structured JSON with file metadata and content preview.

### `cat(filePath, options)`

Universal file reader that handles any file type including binary files and documents.

**Parameters:**
- `filePath` (string): Path to the file to read
- `options` (CatOptions, optional):
  - `followSymlinks` (boolean): Follow symbolic links (default: true)
  - `maxBytes` (number): Maximum bytes to read (default: 50MB)
  - `streaming` (boolean): Enable streaming for large files >1MB (default: true)
  - `silent` (boolean): Return raw content without metadata (default: false)
  - `lineRange` (object): Read specific line range `{ start: number, end?: number }` (1-indexed)
  - `dryRun` (boolean): Preview without reading (default: false)

**Returns:** Structured JSON with file metadata and content (or base64 for binary files).

### `catMultiple(filePaths, options)`

Reads multiple files and concatenates their content.

**Parameters:**
- `filePaths` (string[]): Array of file paths to read
- `options` (CatOptions): Same options as `cat()`

**Returns:** Structured JSON with per-file results and total content.

### `isSymlink(filePath)`

Checks if a path is a symbolic link.

**Parameters:**
- `filePath` (string): Path to check

**Returns:** boolean - true if the path is a symbolic link.

### `getSymlinkTarget(filePath)`

Gets the target of a symbolic link.

**Parameters:**
- `filePath` (string): Path to the symbolic link

**Returns:** string | null - The symlink target path, or null if not a symlink.

## Supported File Types

### Text Files (auto-detected by extension)
- **Code:** .ts, .js, .py, .java, .c, .cpp, .go, .rs, .rb, .php, .swift, .kt, .scala, etc.
- **Config:** .json, .yaml, .yml, .toml, .ini, .cfg, .conf, .xml, .html, .css, .sql
- **Documentation:** .md, .rst, .tex, .txt, .log
- **Shell:** .sh, .bash, .zsh, .ps1, .bat, .cmd
- **Markup:** .adoc, .org, .wiki, .textile

### Binary Documents (special handling)
- **Office:** .doc, .docx, .xls, .xlsx, .ppt, .pptx, .odt, .ods, .odp
- **PDF:** .pdf
- **E-books:** .epub, .mobi, .azw, .fb2
- **Rich Text:** .rtf

## Encoding Detection

The tool automatically detects file encoding:
- **UTF-8** (with BOM detection)
- **UTF-16 LE/BE** (with BOM detection)
- **ASCII** (for pure ASCII files)
- **Binary** (for files that aren't valid text - returned as base64)

## Streaming Mode

For files larger than 1MB, streaming mode is enabled by default:
- Reads files in 64KB chunks
- Respects the `maxBytes` limit
- Automatically detects encoding before streaming
- Returns truncated content with a note when the limit is reached

## Symlink Support

- Automatically follows symlinks by default
- Detects and reports circular symlinks (max 10 levels)
- Reports broken symlink chains
- `isSymlink()` and `getSymlinkTarget()` utilities for symlink inspection

## Dry-Run Mode

Set `dryRun: true` to preview file information without reading content:
- Returns file size, type, symlink info
- Returns content hash (SHA-256)
- Does not read the actual file content
- Useful for checking file existence and metadata

## Error Handling

The tool returns structured JSON with:
- `success`: boolean - Whether the operation succeeded
- `error`: string - Error message if failed
- `hint`: string - Suggested troubleshooting steps
- `path`: string - Resolved file path
- `fileSizeBytes`: number - File size in bytes
- `encoding`: string - Detected encoding
- `truncated`: boolean - Whether content was truncated

## Bug Fixes Applied

- **Bug 1:** Fixed escaped newlines in split/join - now uses actual newline characters
- **Bug 5:** Fixed streaming mode to pass detected encoding to the streaming reader
- **Bug 6:** Added explicit handling for 'binary' encoding case in detectEncoding()
- **Bug 9:** Registered as tools in the LM Studio plugin
- **Bug 10:** Documentation (this file)

## Shell Escaping Limitation (Bug 7)

When using automated fix scripts with this tool, be aware of shell escaping issues:

- Matching literal backslash-n (`\n` as two characters) requires careful escaping
- Python scripts: use `'\\\\n'` (four backslashes in source = two in value)
- Node.js scripts: use `'\\\\n'` (same issue)
- The `edit_file` tool adds an additional escaping layer

**Workaround:** Always manually verify automated fixes by reading the file content
after applying changes to ensure the correct characters were written.

This limitation affects the `execute_code` tool with both Node.js and Python runtimes.
Manual string matching requires careful escaping at every layer.

## Examples

### Read a text file
```json
{
  "name": "read_file",
  "parameters": {
    "filepath": "/path/to/file.ts"
  }
}
```

### Read with line range
```json
{
  "name": "read_file",
  "parameters": {
    "filepath": "/path/to/file.ts",
    "lineRange": {
      "start": 10,
      "end": 20
    }
  }
}
```

### Read a binary document
```json
{
  "name": "cat",
  "parameters": {
    "filepath": "/path/to/document.pdf",
    "silent": false
  }
}
```

### Read multiple files
```json
{
  "name": "cat_multiple",
  "parameters": {
    "filepaths": [
      "/path/to/file1.ts",
      "/path/to/file2.ts"
    ]
  }
}
```

### Check if path is a symlink
```json
{
  "name": "is_symlink",
  "parameters": {
    "filepath": "/path/to/link"
  }
}
```

### Get symlink target
```json
{
  "name": "get_symlink_target",
  "parameters": {
    "filepath": "/path/to/link"
  }
}
```
