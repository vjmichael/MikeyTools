import * as fs from 'fs';
import * as path from 'path';

// ===================== LIST DIRECTORY =====================

export interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  depth?: number;
}

export interface ListDirectoryOptions {
  recursive?: boolean;
  includeFiles?: boolean;
  includeDirs?: boolean;
  maxDepth?: number;
  sortBy?: 'name' | 'size' | 'date';
  ascending?: boolean;
}

/**
 * List files and directories in a given path.
 */
export async function listDirectory(
  dirPath: string,
  options: ListDirectoryOptions = {}
): Promise<string> {
  const resolvedPath = path.resolve(dirPath);
  const {
    recursive = false,
    includeFiles = true,
    includeDirs = true,
    maxDepth = 0,
    sortBy = 'name',
    ascending = true
  } = options;

  try {
    if (!fs.existsSync(resolvedPath)) {
      // Provide helpful context
      const parentDir = path.dirname(resolvedPath);
      let suggestion = `Path '${dirPath}' does not exist.`;
      if (fs.existsSync(parentDir)) {
        const parentEntries = fs.readdirSync(parentDir);
        suggestion += ` Files in parent directory: [${parentEntries.join(', ')}]`;
      }
      return JSON.stringify({ success: false, error: suggestion }, null, 2);
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      return JSON.stringify({ success: false, error: `Path '${dirPath}' is not a directory. It is a ${stats.isFile() ? 'file' : 'other type'}.` }, null, 2);
    }

    const entries: DirectoryEntry[] = [];

    function listDir(currentPath: string, currentDepth: number) {
      let items: string[];
      try {
        items = fs.readdirSync(currentPath);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return JSON.stringify({ success: false, error: `Permission denied reading '${currentPath}': ${errMsg}` }, null, 2);
      }

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue; // Skip entries we can't stat
        }

        const isFile = stat.isFile();
        const isDir = stat.isDirectory();

        if (isFile && includeFiles) {
          entries.push({
            name: item,
            type: 'file',
            size: stat.size,
            modified: stat.mtime.toISOString(),
            depth: currentDepth
          });
        } else if (isDir && includeDirs) {
          entries.push({
            name: item,
            type: 'directory',
            modified: stat.mtime.toISOString(),
            depth: currentDepth
          });

          // Recurse if enabled and depth limit not reached
          if (recursive && (maxDepth === 0 || currentDepth < maxDepth)) {
            listDir(fullPath, currentDepth + 1);
          }
        }
      }
    }

    listDir(resolvedPath, 0);

    // Sort entries
    entries.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        comparison = (a.size || 0) - (b.size || 0);
      } else if (sortBy === 'date') {
        comparison = new Date(a.modified || 0).getTime() - new Date(b.modified || 0).getTime();
      }
      return ascending ? comparison : -comparison;
    });

    return JSON.stringify({
      success: true,
      path: resolvedPath,
      count: entries.length,
      entries
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: `Error listing directory '${dirPath}': ${errMsg}` }, null, 2);
  }
}
