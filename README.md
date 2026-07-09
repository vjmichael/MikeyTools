# Universal Toolkit - LM Studio Plugin

***This tool is a work in progress. Some tools may not function. There is a known JSON breaking issue that I am aware and trying to fix.***

A comprehensive TypeScript plugin for LM Studio that provides advanced file operations, web search, and content fetching capabilities.

## 🚨 Prerequisites & Required Software (READ FIRST!)

Before running or installing this plugin in modern LM Studio, you **must have all of the following** installed on your machine! Without these exact dependencies, features will fail silently or crash! 

### Core Runtime Requirements
1.  **PowerShell 7+ (*Windows ONLY*) — Install from [GitHub](https://github.com/PowerShell/PowerShell/releases/latest). This plugin requires PowerShell modern module loading capabilities; legacy Windows PowerShell is NOT compatible.**

2.  **Node.js v18+** ([Download](https://nodejs.org/) ) — Runtime environment for TypeScript compilation and npm packages! 

### Sandbox / Execution Environment (Choose ONE)
~~3a. **WSL *(Windows Subsystem for Linux)* REQUIRED fallback**: Run `wsl --install` in PowerShell as Administrator, then restart your machine!~~

~~3b. Docker Desktop *Optional but recommended alternative to WSL*: Download from [docker.com](https://www.docker.com/) and enable 'WSL 2 backend'~~ ~~if you have it installed too!~~

### Feature-Specific Dependencies
4.  **Python Latest Version** ([Download](https://www.python.org/downloads/)) — Required by multiple features: OCR, semantic search (`index_build`), schema validation (`validate_schema`) etc! Install via official installer with Add to PATH checked!

5.  Headless Chromium / Chrome for Testing *Required* — Needed by browser automation capabilities (image search + web content fetching). After downloading from [developer.chrome.com](https://developer.chrome.com/blog/chrome-for-testing/) set environment variable `PUPPETEER_EXECUTABLE_PATH` pointing at your extracted binary path!

> ### Project Dependencies (`package.json`)
> This plugin relies heavily on external TypeScript packages (like `cheerio`, `docx`). **You do not need to install these manually!** By running the setup commands below in terminal, npm will automatically download and configure every necessary dependency from our project package.json.

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

### 📄 File Creation 
- **TXT** - Plain text files  
- **MD** - Markdown documents
- **JSON** - Structured data files
- **CSV** - Spreadsheets
- **HTML** - Styled web pages
- **DOCX** - Word documents (with headings and paragraphs)
- **PDF** - PDF documents (with styled titles)

### 📖 File Reading 
- **TXT/MD** - Plain text with encoding detection  
- **JSON** - Pretty-printed with size info
- **CSV** - Formatted table view with column alignment  
- **HTML** - Extracts clean text, titles, and links
- **DOCX** - Extracts text, paragraphs, and metadata 
- **PDF** - Extracts text from all pages

--- 

## Installation

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))  
- npm (comes with Node.js)  

### Verify Installation
```bash
node --version   # Should be v18.0.0 or higher 
npm --version    # Should be 9.0.0 or higher   
```

### Cross-Platform Setup 

#### Windows 10/11 (PowerShell 7+)  
```powershell
# Navigate to plugin directory 
cd "c:\Users\UserMN4312\toolkit/lm-studio-plugin"  

# Install dependencies automatically via package.json: 
npm install --legacy-peer-deps

# Build TypeScript into dist/index.js for LM Studio consumption:   
npm run build  
```

#### Linux (Ubuntu/Debian - bash)
```bash
cd /path/to/toolkit/lm-studio-plugin 

npm install --legacy-peer-deps  

npm run build 
```

### Troubleshooting
- If `npm install` fails with peer dependency errors: `npm install --legacy-peer-deps`  
- If Node.js is not recognized on Windows, restart PowerShell or run: `refreshenv`
- For Python dependencies after installing everything else above: `pip install -r requirements.txt` (see below)

--- 

## 📥 Installing This Plugin in Modern LM Studio  

Modern versions of LM Studio use **MCP (Model Context Protocol)** via JSON configuration instead of GUI plugin loading buttons! There are two ways to install the tool plugin. Here is the first way on how to connect this toolset properly:

1. Open your `mcp.json` config file from the **"Program"** tab → click "Install" → select "Edit mcp.json". This opens an in-app editor for LM Studio's MCP server definitions  
2. Add a new entry under `"mcpServers"` pointing to our compiled plugin script (`dist/index.js`) like this: 

```json
{ 
  "mcpServers": {    
    "lm-studio-plugin": {      
      "command": "/path/to/node",   # or full path on Windows! e.g., C:\Program Files\nodejs\node.exe       
      "args": ["C:/Users/UserMN4312/toolkit/lm-studio-plugin/dist/index.js"]
    }  
  } 
}
```

> ⚠️ **Windows Users:** Replace `/path/to/node` with your actual Node executable path (e.g., `C:\Program Files\nodejs\node.exe`)! 

---

## Second Method (Preferred Method)

1. In the tool plugin directory, open up terminal. On Windows, prese the Window's Key ⊞ + X. A menu will open up and choose the Powershell. 
Navigate to the tool plugin directory. 
2. Now enter the command "npm insall" to install the dependencies. Then type the command "npm run build." This should build the javascript (.js) 3. folder called dist. If you ever need to do a clean install, use the command "npm run clean" 
4. Then run the command "lms dev --install." You can run "lms dev" but pressing ctrl+c wills order a stop and your plugin will disappear from the LM Studio's Integration panel on the right.

```
npm install
npm run build
lms dev --install
```
---

## Usage Examples  

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
web_search({ query: "AI news", search_type: "news"}) 

// Image search  
web_search({query:"cats",search_type:"images"} )
```

### Fetch Web Content 
```typescript
fetch_web_content({url:"https://example.com",max_length:10000})   
```

---  

## New Tool Definitions (Advanced Features)  

These advanced tools require additional dependencies listed in the Prerequisites section above! 

### `execute_code`  
Execute code in Python, Bash, or Node.js with timeout and output capture. Requires WSL/Docker sandbox environment to function safely on Windows hosts!

**Parameters:**
| Parameter | Type | Required | Default | Description | 
|-----------|------|----------|---------|-------------|
| language | string | Yes | - | Language: python, bash, powershell, node  
| code | string | No | - | Inline code (mutually exclusive with file_path)   
| timeout_seconds | number | No | 15 | Timeout in seconds (max: 120)| 
| cwd | string | No | - | Working directory inside sandboxed container!

**Example:**
```typescript  
execute_code({language:"python",code:"print('Hello, World!')",timeout_seconds:30})   
```

---  

### `memory_set` / `memory_get` / `memory_list` / `delete` 
Persistent sql.js-backed key-value store & log management. **No extra dependencies needed** — runs entirely in pure JavaScript inside LM Studio environment out of the box! Supports WAL mode for better concurrency when multiple tools access memory simultaneously and persists data exactly like SQLite (full ACID compliance).

---  

### Semantic Search Tools (`index_build`, `index_query`, `update`)
Index directories semantically using sentence-transformers. Requires Python + numpy/sentence_transformers installed via pip from our feature-specific dependencies list above! 

```typescript  
// Build index over source code directory: 
await index_build({directory:"./backend",extensions:"py,md,index_path":"./data/index"})

// Query for similar chunks later on user requests matching query text against indexed content
index_query(query="race condition database writes",top_k=5)   
```  

--- 

### OCR & Image Processing (`read_image`)  
Extracts text from images using Tesseract.js v5 (pure JS port of Tesseract 4+). No native binaries or system installs required! Just install Pillow + pytesseract via pip as shown in feature dependencies section above.

**Returns:**
```json 
{ "text":"extracted OCR result...", width:1920, height:1080, format:"png" }  
```  

--- 

## Security Notes 

LM Studio has a sandbox but some tools such as run_command run outside of LM Studio's sandbox for better and worse. LM Studio also has internal system pathing and does not inherit Window's environmental system paths. I had to rethink my WSL2/Docker sandboxing and truncate any tools especially the ones that relied on external tools such as the Git API, WSL2/Docker and etc.
