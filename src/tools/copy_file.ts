import * as fs from 'fs';
import * as path from 'path';

/**
 * Copy tool for LM Studio Plugin
 * Copies files or directories from source to destination without reading their contents.
 */

export interface CopyFileOptions {
  isDirectory?: boolean;
  createDestinationDir?: boolean;
}

export async function copyFile(
  source: string,
  destination: string,
  options: CopyFileOptions = {}
): Promise<string> {
  const resolvedSource = path.resolve(source);
  const resolvedDestination = path.resolve(destination);

  // Validate source exists
  if (!fs.existsSync(resolvedSource)) {
    return JSON.stringify({ success: false, error: `Source path does not exist: ${resolvedSource}` }, null, 2);
  }

  try {
    // Create destination directory if needed
    if (options.createDestinationDir !== false) {
      const destDir = options.isDirectory ? resolvedDestination : path.dirname(resolvedDestination);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
    }

    // Perform copy
    if (options.isDirectory ?? false) {
      fs.cpSync(resolvedSource, resolvedDestination, { recursive: true, force: true });
    } else {
      fs.copyFileSync(resolvedSource, resolvedDestination);
    }

    return JSON.stringify({
      success: true,
      message: `Successfully copied ${options.isDirectory ? 'directory' : 'file'} from ${resolvedSource} to ${resolvedDestination}`,
      source: resolvedSource,
      destination: resolvedDestination
    }, null, 2);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ success: false, error: `Failed to copy: ${errMsg}` }, null, 2);
  }
}
