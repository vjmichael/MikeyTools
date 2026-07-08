/**
 * Task State Management Tool
 * 
 * Provides mechanisms to save work state, break loops, and handle low confidence scenarios.
 * Prevents death loops by storing arguments in a persistent temp file and allowing explicit breaks.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const META_DIR = path.join(os.homedir(), '.toolkit', 'meta');

export interface TaskStateResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function saveWork(key: string, content: string): Promise<TaskStateResult> {
  try {
    if (!fs.existsSync(META_DIR)) {
      fs.mkdirSync(META_DIR, { recursive: true });
    }
    const filePath = path.join(META_DIR, `${key}.json`);
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, message: `Work saved to ${filePath}` };
  } catch (e: any) {
    return { success: false, message: 'Failed to save work', error: e.message };
  }
}

export async function loadWork(key: string): Promise<TaskStateResult> {
  try {
    const filePath = path.join(META_DIR, `${key}.json`);
    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'No work found for key' };
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, message: content };
  } catch (e: any) {
    return { success: false, message: 'Failed to load work', error: e.message };
  }
}

export async function clearWork(key: string): Promise<TaskStateResult> {
  try {
    const filePath = path.join(META_DIR, `${key}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true, message: 'Work cleared' };
    }
    return { success: false, message: 'No work found for key' };
  } catch (e: any) {
    return { success: false, message: 'Failed to clear work', error: e.message };
  }
}

export async function setBreak(): Promise<TaskStateResult> {
  try {
    const filePath = path.join(META_DIR, 'break_flag.json');
    fs.writeFileSync(filePath, JSON.stringify({ break: true, timestamp: Date.now() }), 'utf8');
    // BUG-FIX: Schedule auto-cleanup of break flag after 1 minute
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }, 60000);
    return { success: true, message: 'Break flag set. Current approach is abandoned. (Auto-cleanup in 60s)' };
  } catch (e: any) {
    return { success: false, message: 'Failed to set break flag', error: e.message };
  }
}

export async function checkBreak(): Promise<boolean> {
  try {
    const filePath = path.join(META_DIR, 'break_flag.json');
    if (!fs.existsSync(filePath)) return false;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Flag is valid for 1 minute
    if (data.break && (Date.now() - data.timestamp < 60000)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
