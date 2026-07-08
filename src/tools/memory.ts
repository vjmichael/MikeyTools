/**
 * Persistent Memory Tool for LM Studio Plugin
 * 
 * Provides durable key/value storage and append-only logging using SQLite (via sql.js).
 * Returns structured JSON for model parsing.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { createModuleLogger } from './logger';

// Module logger for memory
const logger_memory = createModuleLogger('memory');

// Default database path
// BUG-14 FIX: Add fallback for os.homedir() which can fail in some environments
function getDefaultDbPath(): string {
  try {
    const homeDir = os.homedir();
    if (homeDir) {
      return path.join(homeDir, '.toolkit', 'memory.sqlite');
    }
  } catch {
    // os.homedir() can throw in restricted environments
  }
  // Fallback to /tmp or system temp directory
  const tmpDir = os.tmpdir() || '/tmp';
  return path.join(tmpDir, '.toolkit', 'memory.sqlite');
}

const DEFAULT_DB_PATH = getDefaultDbPath();

// sql.js Database instance
let dbInstance: any = null;
let dbInitialized = false;
let dbLoading = false;

interface MemoryResult {
  success?: boolean;
  message?: string;
  key?: string;
  value?: string | null;
  namespace?: string;
  entries?: Array<{ key: string; value: string; updated_at: string }>;
  deleted?: boolean;
  log_id?: number;
  timestamp?: string;
  log_entries?: Array<{ id: number; timestamp: string; text: string }>;
  error?: string;
}

/**
 * Initializes the database using sql.js.
 * Loads from file if exists, otherwise creates fresh DB.
 */
async function initDb(): Promise<void> {
  if (dbInitialized) return;
  
  if (dbLoading) {
    // Wait for initialization to complete
    await initDb();
    return;
  }
  
  dbLoading = true;
  
  try {
    // Import sql.js - sql.js exports a default function
    const SQLModule = await import('sql.js');
    const initSqlJs = SQLModule.default;
    const SQL = await initSqlJs();
    
    // Create directory before opening database
    fs.mkdirSync(path.dirname(DEFAULT_DB_PATH), { recursive: true });
    
    // Load existing database or create new one
    if (fs.existsSync(DEFAULT_DB_PATH)) {
      const fileBuffer = fs.readFileSync(DEFAULT_DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } else {
      dbInstance = new SQL.Database();
    }
    
    // Initialize tables
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (namespace, key)
      )
    `);
    
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS log(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        text TEXT NOT NULL
      )
    `);
    
    // Enable WAL mode if supported
    try {
      dbInstance.exec('PRAGMA journal_mode=WAL');
    } catch (err: any) {
      logger_memory.warn('[Toolkit] WAL mode not supported, continuing without it');
    }
    
    dbInitialized = true;
  } catch (err: any) {
    logger_memory.error('[Toolkit] Error initializing database:', err);
    throw err;
  } finally {
    dbLoading = false;
  }
}

/**
 * Saves the database state to disk.
 */
function saveDb(): void {
  if (!dbInstance || !dbInitialized) return;
  
  try {
    const data = dbInstance.export();
    fs.writeFileSync(DEFAULT_DB_PATH, Buffer.from(data));
  } catch (err: any) {
    logger_memory.error('[Toolkit] Error saving database:', err);
  }
}

/**
 * Gets the database instance, initializing if necessary.
 */
async function getDb(): Promise<any> {
  if (!dbInitialized) {
    await initDb();
  }
  return dbInstance;
}

/**
 * Closes the database connection and saves state.
 * BUG-38 FIX: Ensures dbInstance is set to null to prevent stale connections.
 */
export function closeDb(): void {
  saveDb();
  dbInstance = null;
  dbInitialized = false;
  dbLoading = false;
}

/**
 * @deprecated Use closeDb() instead. Will be removed in a future version.
 * Alias for closeDb() for backward compatibility.
 */
export function cleanupDb(): void {
  closeDb();
}

export async function memorySet(
  key: string,
  value: string,
  namespace: string = 'default'
): Promise<MemoryResult> {
  const db = await getDb();
  
  try {
    db.run(`
      INSERT OR REPLACE INTO kv_store (namespace, key, value, updated_at) 
      VALUES (?, ?, ?, ?)
    `, [namespace, key, value, new Date().toISOString()]);
    
    saveDb();
    
    return {
      success: true,
      message: `Set key "${key}" in namespace "${namespace}"`,
      key,
      namespace
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function memoryGet(
  key: string,
  namespace: string = 'default'
): Promise<MemoryResult> {
  const db = await getDb();
  
  try {
    const result = db.exec(`
      SELECT value FROM kv_store WHERE namespace = ? AND key = ?
    `, [namespace, key]);
    
    if (result.length > 0 && result[0].values.length > 0) {
      return {
        value: result[0].values[0][0] as string,
        key,
        namespace
      };
    }
    
    return {
      value: null,
      key,
      namespace
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function memoryList(
  namespace: string = 'default',
  prefix: string = ''
): Promise<MemoryResult> {
  const db = await getDb();
  
  try {
    const sql = prefix
      ? `SELECT key, value, updated_at FROM kv_store WHERE namespace = ? AND key LIKE ?`
      : `SELECT key, value, updated_at FROM kv_store WHERE namespace = ?`;
    
    const params = prefix
      ? [namespace, `${prefix}%`]
      : [namespace];
    
    const result = db.exec(sql, params);
    
    if (result.length > 0) {
      const columns = result[0].columns;
      const values = result[0].values;
      
      const entries = values.map((row: any[]) => {
        const entry: any = {};
        columns.forEach((col: string, i: number) => {
          entry[col] = row[i];
        });
        return entry;
      });
      
      return {
        entries,
        namespace
      };
    }
    
    return {
      entries: [],
      namespace
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function memoryDelete(
  key: string,
  namespace: string = 'default'
): Promise<MemoryResult> {
  const db = await getDb();
  
  try {
    const result = db.run(`
      DELETE FROM kv_store WHERE namespace = ? AND key = ?
    `, [namespace, key]);
    
    saveDb();
    
    return {
      success: true,
      message: `Deleted key "${key}"`,
      key,
      namespace,
      deleted: result.changes > 0
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function memoryLogAppend(
  text: string
): Promise<MemoryResult> {
  const db = await getDb();
  
  try {
    const result = db.run(`
      INSERT INTO log (timestamp, text) VALUES (?, ?)
    `, [new Date().toISOString(), text]);
    
    saveDb();
    
    return {
      success: true,
      log_id: result.lastID,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function memoryLogTail(
  n: number = 50,
  options?: {
    since?: string;    // ISO timestamp - only entries after this time
    until?: string;    // ISO timestamp - only entries before this time
    text?: string;     // Filter entries containing this text
  }
): Promise<MemoryResult> {
  const db = await getDb();
  
  try {
    // BUG-54 FIX: Build query with optional filtering
    let query = 'SELECT id, timestamp, text FROM log';
    const params: any[] = [];
    
    if (options?.since) {
      query += ' WHERE timestamp >= ?';
      params.push(options.since);
    }
    if (options?.until) {
      query += params.length === 0 ? ' WHERE' : ' AND';
      query += ' timestamp <= ?';
      params.push(options.until);
    }
    if (options?.text) {
      query += params.length === 0 ? ' WHERE' : ' AND';
      query += ' text LIKE ?';
      params.push(`%${options.text}%`);
    }
    
    query += ' ORDER BY id DESC LIMIT ?';
    params.push(n);
    
    const result = db.exec(query, params);
    
    if (result.length > 0) {
      const columns = result[0].columns;
      const values = result[0].values;
      
      const entries = values.map((row: any[]) => {
        const entry: any = {};
        columns.forEach((col: string, i: number) => {
          entry[col] = row[i];
        });
        return entry;
      });
      
      // Reverse to get chronological order
      entries.reverse();
      
      return { log_entries: entries };
    }
    
    return { log_entries: [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
