/**
 * Google Drive Operations Tool for LM Studio Plugin
 * 
 * Provides full Google Drive integration (list, upload, download, search, delete).
 * Authentication is handled via a local `token.json` file (OAuth2) or a provided Access Token.
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Track auth clients for cleanup
const authClients: Set<any> = new Set();

/**
 * Cleans up all Google Drive auth clients. Call during plugin shutdown.
 */
/**
 * Cleans up all Google Drive auth clients. Call during plugin shutdown.
 * BUG-11 FIX: Documented that this should be called during shutdown.
 */
/**
 * Cleans up all Google Drive auth clients. Call during plugin shutdown.
 * 
 * @returns {void}
 */

export function cleanupDriveAuth(): void {
  for (const auth of authClients) {
    try {
      if (auth.close) auth.close();
    } catch {
      // Ignore cleanup errors
    }
  }
  authClients.clear();
}

const drive = google.drive('v3');

export interface DriveListResult {
  success: boolean;
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    size?: string;
  }>;
  error?: string;
}

export interface DriveUploadResult {
  success: boolean;
  file_id?: string;
  message: string;
  error?: string;
}

export interface DriveDownloadResult {
  success: boolean;
  path?: string;
  message: string;
  error?: string;
}

export interface DriveSearchResult {
  success: boolean;
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
  }>;
  error?: string;
}

export interface DriveDeleteResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface DriveMetadataResult {
  success: boolean;
  metadata?: any;
  error?: string;
}

// BUG-46 FIX: Cache auth clients by their key to prevent memory leaks
const authCache: Map<string, any> = new Map();

/**
 * Helper to get Google Drive Auth client.
 * Priority: 1. Access Token passed in args. 2. token.json in toolkit root. 3. Environment variable.
 * H-07 FIX: Cache auth instances to prevent unbounded memory growth.
 */
async function getDriveAuth(token?: string, tokenPath?: string): Promise<any> {
  // Generate cache key
  const cacheKey = token ? `token_${token.substring(0, 8)}...` : (tokenPath || 'default');
  
  // H-07 FIX: Check cache first
  if (authCache.has(cacheKey)) {
    return authCache.get(cacheKey);
  }

  let auth: any;
  
  // 1. Use provided Access Token
  if (token) {
    auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    authCache.set(cacheKey, auth);
    authClients.add(auth);
    return auth;
  }

  // 2. Use local token.json
  const effectivePath = tokenPath || path.join(os.homedir(), '.toolkit', 'token.json');
  if (fs.existsSync(effectivePath)) {
    auth = new google.auth.GoogleAuth({
      keyFile: effectivePath,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    authCache.set(cacheKey, auth);
    authClients.add(auth);
    return auth;
  }

  // BUG-11 FIX: Documented that cleanupDriveAuth should be called during shutdown
  // BUG-13 FIX: Check for refresh_token in environment variable as last resort
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (refreshToken) {
    auth = new google.auth.OAuth2();
    auth.setCredentials({ refresh_token: refreshToken });
    authCache.set(cacheKey, auth);
    authClients.add(auth);
    return auth;
  }

  throw new Error('No authentication found. Provide a token via args, place token.json in ~/.toolkit/, or set GOOGLE_DRIVE_REFRESH_TOKEN env var.');
}

/**
 * Lists files in a specific folder or the root.
 */
export async function listFiles(
  directoryId: string = 'root',
  query?: string,
  token?: string,
  tokenPath?: string
): Promise<DriveListResult> {
  try {
    const auth = await getDriveAuth(token, tokenPath);
    const res = await drive.files.list({
      auth,
      spaces: 'drive',
      fields: 'files(id, name, mimeType, modifiedTime, size)',
      q: query || `'${directoryId}' in parents and trashed = false`,
      pageSize: 50
    });

    return {
      success: true,
      files: res.data.files?.map(f => ({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType!,
        modifiedTime: f.modifiedTime!,
        size: f.size?.toString() || undefined
      }))
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Uploads a local file to Google Drive.
 */
export async function uploadFile(
  localPath: string,
  name: string,
  parentId: string = 'root',
  token?: string,
  tokenPath?: string
): Promise<DriveUploadResult> {
  try {
    const auth = await getDriveAuth(token, tokenPath);
    const fileMetadata = {
      name: name,
      parents: [parentId]
    };
    
    const media = {
      mimeType: 'application/octet-stream',
      body: fs.createReadStream(localPath)
    };

    const res = await drive.files.create({
      auth,
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });

    return { success: true, file_id: res.data.id!, message: 'File uploaded successfully.' };
  } catch (err: any) {
    return { success: false, message: 'Upload failed.', error: err.message };
  }
}

/**
 * Downloads a file from Google Drive.
 */
export async function downloadFile(
  fileId: string,
  destPath: string,
  token?: string,
  tokenPath?: string
): Promise<DriveDownloadResult> {
  try {
    const auth = await getDriveAuth(token, tokenPath);
    const res = await drive.files.get({
      auth,
      fileId: fileId,
      alt: 'media'
    });

    // Create directories if they don't exist
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // BUG-53 FIX: Add backpressure handling for large file downloads
    const writer = fs.createWriteStream(destPath);
    let downloadedBytes = 0;
    const MAX_DOWNLOAD_SIZE = 10 * 1024 * 1024 * 1024; // 10GB max
    
    return new Promise((resolve) => {
      const stream = (res.data as any);
      
      // Handle large file downloads with size limit
      stream.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        if (downloadedBytes > MAX_DOWNLOAD_SIZE) {
          writer.destroy(new Error('Download exceeded maximum size limit (10GB)'));
        }
      });
      
      stream.pipe(writer);
      
      writer.on('finish', () => {
        resolve({ success: true, path: destPath, message: `File downloaded. (${downloadedBytes.toLocaleString()} bytes)` });
      });
      writer.on('error', (err) => resolve({ success: false, message: 'Download failed.', error: err.message }));
      
      // Handle stream errors
      stream.on('error', (err: Error) => resolve({ success: false, message: 'Download failed.', error: err.message }));
    });
  } catch (err: any) {
    return { success: false, message: 'Download failed.', error: err.message };
  }
}

/**
 * Searches for files in Google Drive.
 */
export async function searchFiles(
  query: string,
  token?: string,
  tokenPath?: string
): Promise<DriveSearchResult> {
  try {
    const auth = await getDriveAuth(token, tokenPath);
    const res = await drive.files.list({
      auth,
      q: query,
      fields: 'files(id, name, mimeType, modifiedTime)'
    });

    return {
      success: true,
      files: res.data.files?.map(f => ({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType!,
        modifiedTime: f.modifiedTime!
      }))
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteFile(
  fileId: string,
  token?: string,
  tokenPath?: string
): Promise<DriveDeleteResult> {
  try {
    const auth = await getDriveAuth(token, tokenPath);
    await drive.files.delete({
      auth,
      fileId: fileId
    });
    return { success: true, message: 'File deleted.' };
  } catch (err: any) {
    return { success: false, message: 'Delete failed.', error: err.message };
  }
}

/**
 * Gets metadata for a file.
 */
export async function getMetadata(
  fileId: string,
  token?: string,
  tokenPath?: string
): Promise<DriveMetadataResult> {
  try {
    const auth = await getDriveAuth(token, tokenPath);
    const res = await drive.files.get({
      auth,
      fileId: fileId,
      fields: '*'
    });
    return { success: true, metadata: res.data };
  } catch (err: any) {
    // BUG-58 FIX: Add specific error handling for common failure cases
    if (err.code === 404) {
      return { success: false, error: `File not found: ${fileId}` };
    } else if (err.code === 403) {
      return { success: false, error: `Permission denied for file: ${fileId}` };
    }
    return { success: false, error: err.message };
  }
}
