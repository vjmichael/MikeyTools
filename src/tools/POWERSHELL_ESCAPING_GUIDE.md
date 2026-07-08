# PowerShell Escaping & WSL Guide

This guide documents the PowerShell escaping issues encountered when using the `execute_code` tool and provides solutions.

## Table of Contents
- [Known Issues](#known-issues)
- [Solutions & Workarounds](#solutions--workarounds)
- [WSL Detection](#wsl-detection)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Known Issues

### 1. Here-strings (`@'...'@`) Fail
**Problem:** Here-strings require the closing `@'` on its own line with no trailing whitespace. The `execute_code` tool passes code as a single command string, breaking multi-line syntax.

```powershell
# ❌ FAILS
@'
import { Tool } from './types';
'@ | Set-Content -Path "file.ts"

# ✅ WORKS - Use write_file tool instead
```

### 2. Regex Character Classes Break
**Problem:** Patterns like `['\"]` get parsed as separate arguments by the tool's argument parser.

```powershell
# ❌ FAILS - ] is treated as a command-line token
Select-String -Pattern "from ['\"]\./types['\"]"

# ✅ WORKS - Use -SimpleMatch flag
Select-String -Pattern "from './types'" -SimpleMatch

# ✅ WORKS - Use grep tool instead
```

### 3. Single Quotes Inside Single-Quoted Strings
**Problem:** PowerShell requires doubling single quotes (`''`) to represent a literal single quote inside single-quoted strings.

```powershell
# ❌ FAILS
$env:PATH = 'C:\bin'

# ✅ WORKS - Double the single quotes
$env:PATH = 'C:\bin''s path'

# ✅ WORKS - Use double quotes with escaping
$env:PATH = "C:\bin's path"
```

### 4. Dollar Signs ($) in Double-Quoted Strings
**Problem:** PowerShell interprets `$` as variable expansion.

```powershell
# ❌ FAILS - $LASTEXITCODE gets expanded
Write-Output "Exit code: $LASTEXITCODE"

# ✅ WORKS - Escape $ as $$
Write-Output "Exit code: $$LASTEXITCODE"

# ✅ WORKS - Use single quotes
Write-Output 'Exit code: $LASTEXITCODE'
```

### 5. Backticks (`) in Double-Quoted Strings
**Problem:** PowerShell uses backticks as escape characters.

```powershell
# ❌ FAILS
Write-Output "Use `` to escape"

# ✅ WORKS
Write-Output "Use ```` to escape"
```

---

## Solutions & Workarounds

### Use the Right Tool for the Job

| Operation | Recommended Tool | Why |
|-----------|-----------------|-----|
| File content operations | `write_file` / `edit_file` | No escaping issues, handles content as structured data |
| Pattern searching | `grep` tool | Avoids Select-String regex escaping issues |
| File system operations | `list_directory` | Pure Node.js, no shell escaping |
| npm/npx commands | `cmd` shell | Avoids $LASTEXITCODE issues in npm.ps1 |
| Direct .cmd execution | `cmd` shell | Bypasses PowerShell shim entirely |

### PowerShell Helper Functions

The `powershell_utils.ts` module provides safe patterns:

```typescript
import { 
  escapeForSingleQuote,
  escapeForDoubleQuote,
  buildGrepCommand,
  buildWslCheckCommand 
} from './powershell_utils';

// Safe single quote escaping
const escaped = escapeForSingleQuote("it's a test");
// Result: "it''s a test"

// Safe double quote escaping
const escaped = escapeForDoubleQuote("$HOME/path");
// Result: "$$HOME/path"

// Safe grep command
const cmd = buildGrepCommand("pattern", "C:/path", true);
// Result: 'Select-String -Path "C:C:/path" -Recurse -Pattern "pattern" -SimpleMatch'
```

### WSL Detection

The `wsl_utils.ts` module provides WSL detection:

```typescript
import { 
  buildWslDetectionCommand,
  parseWslDetection,
  isGarbledUtf16,
  recommendShell 
} from './wsl_utils';

// Check WSL availability
const cmd = buildWslDetectionCommand();

// Detect garbled output
if (isGarbledUtf16(output)) {
  // WSL not installed - use PowerShell instead
}

// Get shell recommendation
const rec = recommendShell('build');
// Returns: { shell: 'cmd', reason: '...', fallback: 'powershell' }
```

---

## WSL Detection

### How to Check WSL Availability

**Via PowerShell:**
```powershell
# Check if wsl command exists
Get-Command wsl -ErrorAction SilentlyContinue

# List WSL distributions
wsl --list --verbose
```

### Detecting WSL Stub Output

When WSL is not installed, the `bash` command falls back to a WSL stub that outputs:
```
Windows Subsystem for Linux has no installed distributions.
```

This output appears garbled with null bytes between characters when interpreted as UTF-8:
```
W\u0000i\u0000n\u0000d\u0000o\u0000w\u0000s\u0000 ...
```

**Detection:**
```typescript
if (output.includes('Windows Subsystem for Linux') || /[\u0000]/.test(output)) {
  // WSL not installed - use PowerShell instead
}
```

---

## Best Practices

### 1. File Operations
```typescript
// ❌ BAD - PowerShell escaping issues
execute_code({
  language: 'powershell',
  code: 'Copy-Item -Path "C:\\src\\file.ts" -Destination "C:\\dest\\file.ts"'
})

// ✅ GOOD - Use write_file tool
write_file({
  path: 'C:/dest/file.ts',
  content: fileContent
})
```

### 2. Pattern Searching
```typescript
// ❌ BAD - Regex escaping issues
execute_code({
  language: 'powershell',
  code: 'Select-String -Path "..." -Pattern "from [\'\\\\"]\\.\\./types[\'\\\\"]"'
})

// ✅ GOOD - Use grep tool
grep({
  pattern: 'import.*types',
  path: 'src',
  recursive: true
})
```

### 3. Build Commands
```typescript
// ❌ BAD - npm.ps1 $LASTEXITCODE issues
execute_code({
  language: 'powershell',
  code: 'npm run build'
})

// ✅ GOOD - Use cmd shell
run_command({
  command: 'cd C:\\path && .\\node_modules\\.bin\\tsc.cmd',
  shell: 'cmd'
})
```

### 4. Cross-Platform Compatibility
```typescript
// ❌ BAD - Assumes WSL is available
execute_code({
  language: 'bash',
  code: 'grep -r "pattern" .'
})

// ✅ GOOD - Check WSL first
const wslCheck = buildWslCheckCommand();
if (wslAvailable) {
  execute_code({ language: 'bash', code: 'grep -r "pattern" .' })
} else {
  grep({ pattern: 'pattern', path: '.', recursive: true })
}
```

---

## Examples

### Example 1: Safe File Copy
```typescript
// Using write_file tool (recommended)
write_file({
  path: 'C:/dest/file.ts',
  content: 'file content here'
})

// Using PowerShell (if necessary)
execute_code({
  language: 'powershell',
  code: 'Copy-Item -Path "C:/src/file.ts" -Destination "C:/dest/file.ts" -Force'
})
```

### Example 2: Safe Pattern Search
```typescript
// Using grep tool (recommended)
grep({
  pattern: 'import.*types',
  path: 'src',
  recursive: true
})

// Using PowerShell with -SimpleMatch (if necessary)
execute_code({
  language: 'powershell',
  code: 'Select-String -Path "C:/src/**/*.ts" -Pattern "import.*types" -SimpleMatch'
})
```

### Example 3: Build Verification
```typescript
// Using cmd shell (recommended)
run_command({
  command: 'cd C:\\Users\\UserMN4312\\toolkit\\lm-studio-plugin && .\\node_modules\\.bin\\tsc.cmd',
  shell: 'cmd'
})
```

---

## Quick Reference

### When to Use What

| Scenario | Tool/Shell | Reason |
|----------|-----------|--------|
| File content | `write_file` | No escaping issues |
| Pattern search | `grep` tool | Avoids regex escaping |
| File listing | `list_directory` | Pure Node.js |
| npm commands | `cmd` shell | Avoids $LASTEXITCODE |
| Build commands | `cmd` + `.cmd` files | Bypasses PowerShell shim |
| WSL commands | PowerShell check first | Avoids silent failures |
| Complex PowerShell | `powershell_utils.ts` | Safe escaping patterns |

### PowerShell Escaping Cheat Sheet

| Character | Single Quotes | Double Quotes |
|-----------|--------------|---------------|
| `'` (single quote) | `''` | No escaping needed |
| `$` (dollar sign) | No escaping needed | `$$` |
| `` ` `` (backtick) | No escaping needed | `` `` `` |
| `\` (backslash) | No escaping needed | `\\` (before special chars) |

---

## Troubleshooting

### Issue: Command returns garbled output with null bytes
**Solution:** WSL is not installed. Use PowerShell or cmd shell instead.

### Issue: `Select-String` throws "positional parameter cannot be found"
**Solution:** Regex character classes are breaking the argument parser. Use `-SimpleMatch` or the `grep` tool.

### Issue: `$LASTEXITCODE` not set error
**Solution:** npm.ps1 shim issue. Use `cmd` shell or execute `.cmd` files directly.

### Issue: Here-string fails with "No characters are allowed after here-string header"
**Solution:** Here-strings require multi-line input. Use `write_file` tool instead.

---

## Related Files

- `src/tools/powershell_utils.ts` - PowerShell helper functions
- `src/tools/wsl_utils.ts` - WSL detection and encoding utilities
- `behavioral-guidance.json` - Tool selection and behavioral rules
- `src/tools/README.md` - General tools documentation
