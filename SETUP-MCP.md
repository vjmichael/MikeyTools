# mikeystoolkit — MCP Server Setup Guide

Expose all 70+ toolkit tools to **Jan, Cursor, Claude Desktop, Windsurf, Cline**, and any MCP-compatible client.

---

## Quick Start

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Build the MCP server
npm run build:mcp

# 3. Pick your client config below and add it
```

---

## Architecture

```
src/tools/*.ts          ← Shared tool implementations (same as LM Studio plugin)
src/mcp-server.ts       ← MCP entry point (registers all tools)
dist/mcp-server.js      ← Compiled output (what clients launch)
```

The MCP server reuses the **exact same tool implementations** as the LM Studio plugin. Zero duplication — one codebase, two transports.

---

## Build Options

### Option A: npm script (recommended)
```bash
npm run build:mcp
```

### Option B: Direct tsc (works inside LM Studio sandbox)
```bash
node_modules\.bin\tsc.cmd src/mcp-server.ts \
  --outDir dist \
  --module nodenext \
  --moduleResolution nodenext \
  --target es2022 \
  --esModuleInterop \
  --skipLibCheck
```

### Option C: Manual JS (if TypeScript won't compile)
The MCP server is TypeScript. You must compile it to `dist/mcp-server.js` before clients can use it.

---

## Client Configurations

### Jan (jan.ai)

**Config file:** `~/.jan/mcp_config.json`

```json
{
  "mikeystoolkit": {
    "command": "node",
    "args": ["C:\\Users\\UserMN4312\\toolkit\\lm-studio-plugin\\dist\\mcp-server.js"],
    "env": {}
  }
}
```

**Windows path:** `C:\Users\UserMN4312\.jan\mcp_config.json`  
**Mac/Linux path:** `~/.jan/mcp_config.json`

Restart Jan after adding the config.

---

### Cursor

**Config file:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "mikeystoolkit": {
      "command": "node",
      "args": ["C:\\Users\\UserMN4312\\toolkit\\lm-studio-plugin\\dist\\mcp-server.js"]
    }
  }
}
```

---

### Claude Desktop

**Config file (Windows):** `%APPDATA%\Claude\claude_desktop_config.json`  
**Config file (Mac):** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mikeystoolkit": {
    "command": "node",
    "args": ["C:\\Users\\UserMN4312\\toolkit\\lm-studio-plugin\\dist\\mcp-server.js"],
    "env": {}
  }
}
```

---

### Windsurf

**Config file:** `~/.windsurf/mcp.json`

```json
{
  "mcpServers": {
    "mikeystoolkit": {
      "command": "node",
      "args": ["C:\\Users\\UserMN4312\\toolkit\\lm-studio-plugin\\dist\\mcp-server.js"]
    }
  }
}
```

---

### Cline (VS Code Extension)

Configure via the Cline extension settings UI:

1. Open VS Code → Extensions → Cline
2. Go to **MCP Servers** tab
3. Click **Add MCP Server**
4. Enter:
   - **Command:** `node`
   - **Arguments:** `C:\Users\UserMN4312\toolkit\lm-studio-plugin\dist\mcp-server.js`

---

## Available Tools

The MCP server exposes all toolkit tools:

| Category | Tools |
|----------|-------|
| **Safety** | `set_break`, `check_break` |
| **Execution** | `execute_code`, `run_command` |
| **File Write** | `write_file`, `write_file_append`, `edit_file`, `create_file`, `apply_patch`, `replace_text_in_file`, `insert_at_line`, `delete_lines_in_file` |
| **File Read** | `read_file`, `cat`, `cat_multiple` |
| **Search** | `search_directory`, `grep`, `list_directory` |
| **Memory** | `memory_set`, `memory_get`, `memory_list`, `memory_delete`, `memory_log_append`, `memory_log_tail`, `rebuild_memory`, `read_memory_profile` |
| **Git** | `git_status`, `git_diff`, `git_log`, `git_blame`, `git_list_files`, `git_read_file` |
| **Sandbox** | `check_env` |
| **Task State** | `save_work`, `load_work`, `clear_work` |
| **Background** | `run_background_task`, `check_task_status`, `stop_task` |
| **Validation** | `validate_schema` |
| **Vision/OCR** | `read_image`, `visual_question_answering`, `describe_image`, `analyze_video` |
| **Audio** | `transcribe_audio` |
| **Web** | `web_search`, `fetch_web_content` |
| **Code Intel** | `find_symbol`, `get_references` |
| **Scratchpad** | `scratchpad_init`, `scratchpad_write`, `scratchpad_append`, `scratchpad_read`, `scratchpad_validate`, `scratchpad_edit`, `scratchpad_commit`, `scratchpad_clear` |
| **JSON** | `json_repair` |
| **Symlink** | `is_symlink`, `get_symlink_target` |
| **File Ops** | `copy_file` |
| **Index** | `index_build`, `index_query`, `index_update`, `clear_index` |

---

## Troubleshooting

### "MCP server failed to start"

1. **Check the compiled file exists:**
   ```bash
   ls dist/mcp-server.js
   ```

2. **Check Node.js version** (requires 18+):
   ```bash
   node --version
   ```

3. **Check dependencies:**
   ```bash
   npm install
   ```

4. **Check the config path** — use absolute paths, not relative ones.

### "Tool not found" or "Unknown tool"

- Make sure you built the server: `npm run build:mcp`
- Restart your MCP client after building
- Check that the config file is in the right location for your client

### "Stdio connection closed"

- Check that Node.js can find all dependencies in `node_modules/`
- The MCP server runs as a child process — it needs access to the same `node_modules`
- If moving the project, run `npm install` in the new location

### Tools returning errors

- Many tools (vision, audio, memory) depend on the LM Studio environment
- Tools like `describe_image`, `visual_question_answering`, `analyze_video` require a vision-capable model loaded in the host
- `memory_*` tools share the same SQLite database as the LM Studio plugin
- `transcribe_audio` requires whisper.cpp binaries

### Sandboxed environment (LM Studio)

The LM Studio sandbox **cannot** run `tsc` or output to `dist`. If you're inside the sandbox:

1. Update `src/mcp-server.ts` directly (it's already written)
2. Build outside the sandbox (on your local machine)
3. Copy `dist/mcp-server.js` back if needed

---

## Development

### Hot reload for development

```bash
# Terminal 1: Watch TypeScript
npm run dev

# Terminal 2: Test the MCP server
node dist/mcp-server.js
```

### Add a new tool

1. Create `src/tools/my_new_tool.ts`
2. Import it in `src/mcp-server.ts`
3. Register with `server.tool("my_new_tool", description, schema, implementation)`
4. Rebuild: `npm run build:mcp`

### Test the MCP server manually

```bash
node dist/mcp-server.js
```

The server will print to stderr. Send JSON-RPC messages via stdin to test tool calls.

---

## Client Compatibility

| Client | Version | Status |
|--------|---------|--------|
| Jan (jan.ai) | 0.8+ | ✅ Tested |
| Cursor | 2024+ | ✅ Supported |
| Claude Desktop | Latest | ✅ Supported |
| Windsurf | Latest | ✅ Supported |
| Cline (VS Code) | Latest | ✅ Supported |
| Continue (VS Code) | Latest | ✅ Supported |
| Aider | Latest | ✅ Supported |
| Any MCP-compatible client | — | ✅ Supported |

---

## License

Apache-2.0 — same as the LM Studio plugin.
