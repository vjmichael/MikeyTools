# LM Studio Plugin - Installation Guide & Dependencies

## 🚨 Prerequisites: Required Software (READ FIRST!)

Before installing or running this plugin, you **must have all of the following** installed on your machine. Without these exact dependencies, features will fail silently or crash! 

### Core Runtime Requirements
1.  **PowerShell 7+ (Windows ONLY)** — Install from [GitHub](https://github.com/PowerShell/PowerShell/releases/latest) if not already present. This plugin requires PowerShell's modern module loading capabilities; the legacy Windows PowerShell is NOT compatible.

2.  **Node.js v18+** ([Download](https://nodejs.org/)) — The TypeScript compiler and runtime environment. npm comes bundled with Node.js automatically! 

### Sandbox / Execution Environment (Choose ONE)
3a. **WSL (Windows Subsystem for Linux)** *(REQUIRED fallback on Windows)*: 
   - Open PowerShell 7+ as Administrator, then run: `wsl --install`  
   - Restart your machine after installation completes

3b. **Docker Desktop** *(Optional but recommended alternative to WSL)*:
   - Download from [docker.com/products/docker-desktop](https://www.docker.com/) and install via their installer 
   - Enable "WSL 2 backend" in Docker settings if you also have WSL installed 

> ⚠️ **Note:** On Linux/macOS, standard bash/zsh terminals work natively without extra sandboxing requirements.

### Feature-Specific Dependencies
4.  **Python Latest Version** ([Download](https://www.python.org/downloads/)) — Required by multiple features: OCR (`read_image`), semantic search (`index_build`), schema validation (`validate_schema`), and PDF processing libraries. Install via official installer with "Add to PATH" checked!

5.  **Headless Chromium / Chrome for Testing** ([Download](https://developer.chrome.com/blog/chrome-for-testing/)) — Required by Puppeteer/Playwright browser automation features (image search, web content fetching). After downloading:
   - Extract the zip file  
   - Set environment variable `PUPPETEER_EXECUTABLE_PATH` to point at your extracted binary path!

---

## 📦 Project Dependencies (`package.json`) 

This plugin relies heavily on external TypeScript packages (like `cheerio`, `docx`, etc.). **You do not need to install these manually.** By running the installation commands below, npm will automatically download and configure every necessary dependency from our project's package.json!

---

## 🪟 Windows Installation Steps (PowerShell 7+)

```powershell
# 1. Navigate to plugin directory 
cd "c:\Users\UserMN4312\toolkit/lm-studio-plugin" 

# 2. Install all Node.js dependencies automatically:
npm install --legacy-peer-deps  

# 3. Build TypeScript into a format LM Studio can read (dist/index.js):
npm run build

# 4. Verify dist folder was created successfully:
dir dist 
```

**Troubleshooting Windows Issues:**  
- If `node` or `npm` is not recognized, restart PowerShell and try again! 
- For Python dependencies after installing everything else: `pip install -r requirements.txt` (see below)
- To verify WSL installation works correctly in your environment: run `wsl --status`

---

## 🐧 Linux Installation Steps

```bash  
# 1. Navigate to plugin directory on your machine: 
cd /path/to/toolkit/lm-studio-plugin 

# 2. Install all Node.js dependencies automatically from package.json:
npm install --legacy-peer-deps  

# 3. Build TypeScript into a format LM Studio can read (dist/index.js): 
npm run build

# 4. Verify dist folder was created successfully:  
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
      "args": ["C:/Users/UserMN4312/toolkit/lm-studio-plugin/dist/index.js"]
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
| `execute_code` | Execute Python/Bash/Node code safely in sandboxed environment | WSL or Docker required!
| `memory_set/get/list/delete/log_append/tail` | Persistent sql.js-backed key-value store & log management | Pure JS — no extra deps needed!  
| `index_build/query/update` | Semantic search indexing over directories using sentence transformers | Python + numpy/sentence-transformers installed via pip above 
| `validate_schema` / `read_image` (OCR) | JSON/YAML validation against schemas and Tesseract-based image text extraction | Pillow, pytesseract, jsonschema packages from pip list above!
