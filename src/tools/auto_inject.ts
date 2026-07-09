// Auto-Inject Memory: Automatically injects relevant persistent memory
// into the user's message before it reaches the model.
// Used as a promptPreprocessor via context.withPromptPreprocessor().

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { memoryLogTail } from './memory';
import type { ChatMessage } from '@lmstudio/sdk';

// ===================== CONFIGURATION =====================

const CONFIG = {
  // Maximum characters of memory to inject (hard cap)
  maxInjectedChars: 2500,
  
  // Characters reserved for the always-inject summary
  summaryMaxChars: 800,
  
  // Minimum keyword overlap ratio to trigger full profile injection (0.0 - 1.0)
  relevanceThreshold: 0.15,
  
  // Keywords that indicate memory-relevant context
  memoryRelevantKeywords: [
    'project', 'code', 'file', 'memory', 'know', 'remember',
    'context', 'history', 'previous', 'earlier', 'earlier in',
    'what do you know', 'what do you remember', 'profile',
    'work on', 'working on', 'about', 'regarding',
    'already', 'previously', 'before', 'earlier',
    'user profile', 'persistent', 'storage', 'key',
    'workspace', 'directory', 'repository', 'repo',
    'build', 'run', 'test', 'debug', 'fix', 'implement'
  ],
  
  // Section headers in the memory profile to watch for relevance
  profileSectionKeywords: [
    'work context', 'personal context', 'top of mind',
    'recent history', 'long-term background', 'project',
    'code', 'file', 'directory', 'repository', 'repo',
    'task', 'goal', 'objective', 'status', 'progress'
  ],
  
  // Separator used between memory content and the user message
  separator: '\n\n---\n\n',
  
  // Prefix for the always-inject summary
  summaryPrefix: '[MEMORY: Top of Mind]\n',
  
  // Prefix for the conditional full profile
  profilePrefix: '[MEMORY: Full Profile]\n',
};

// ===================== MEMORY PROFILE FILE =====================

/**
 * Get the path to the persistent memory profile file.
 * Same path used by rebuild_memory and read_memory_profile tools.
 */
function getMemoryProfilePath(): string {
  const homeDir = os.homedir() || os.tmpdir();
  return path.join(homeDir, '.toolkit', 'memory', 'user_profile.md');
}

/**
 * Read the persistent memory profile file.
 * Returns null if the file doesn't exist or can't be read.
 */
function readMemoryProfileFile(maxChars?: number): string | null {
  const profilePath = getMemoryProfilePath();
  
  try {
    if (!fs.existsSync(profilePath)) {
      return null;
    }
    
    const content = fs.readFileSync(profilePath, 'utf-8');
    
    if (maxChars && content.length > maxChars) {
      return content.substring(0, maxChars) + '...';
    }
    
    return content;
  } catch {
    return null;
  }
}

// ===================== MEMORY RELEVANCE CHECK =====================

/**
 * Check if a user message appears relevant to stored memory content.
 * Uses simple keyword overlap (no semantic search needed for v1).
 */
function isMemoryRelevant(userMessage: string): boolean {
  const lowerMsg = userMessage.toLowerCase();
  
  // Check memory-relevant keywords in the message
  const msgHasMemoryKeywords = CONFIG.memoryRelevantKeywords.some(kw => 
    lowerMsg.includes(kw.toLowerCase())
  );
  
  // Check profile section keywords in the message
  const msgHasProfileKeywords = CONFIG.profileSectionKeywords.some(kw => 
    lowerMsg.includes(kw.toLowerCase())
  );
  
  // If the message contains memory-related keywords, it's likely relevant
  return msgHasMemoryKeywords || msgHasProfileKeywords;
}

/**
 * Calculate a simple overlap score between the user message 
 * and the memory profile content.
 */
function calculateRelevanceScore(userMessage: string, profileContent: string): number {
  const lowerMsg = userMessage.toLowerCase();
  const lowerProfile = profileContent.toLowerCase();
  
  // Count shared words (simple token overlap)
  const msgWords = new Set(lowerMsg.split(/\W+/).filter(w => w.length > 2));
  const profileWords = new Set(lowerProfile.split(/\W+/).filter(w => w.length > 2));
  
  let overlap = 0;
  for (const word of msgWords) {
    if (profileWords.has(word)) overlap++;
  }
  
  const maxPossible = Math.min(msgWords.size, profileWords.size);
  if (maxPossible === 0) return 0;
  
  return overlap / maxPossible;
}

// ===================== ALWAYS-INJECT SUMMARY =====================

/**
 * Build the "top of mind" summary that's always injected.
 * This is small, cheap, and high-value — current project,
 * most recent unresolved thread, last 3-5 log entries.
 */
async function buildAlwaysInjectSummary(): Promise<string> {
  const lines: string[] = [];
  
  // Get last 5 memory log entries
  try {
    const logResult = await memoryLogTail(5);
    if (logResult && logResult.log_entries && logResult.log_entries.length > 0) {
      const recentLogEntries = logResult.log_entries.slice(-3).map(entry => {
        const timestamp = entry.timestamp ? ` [${entry.timestamp}]` : '';
        return `${timestamp} ${entry.text}`;
      });
      
      if (recentLogEntries.length > 0) {
        lines.push('Recent activity:');
        lines.push(...recentLogEntries);
        lines.push('');
      }
    }
  } catch {
    // Memory log might be empty or unavailable — skip gracefully
  }
  
  // Build a compact summary
  const summary = lines.join('\n');
  
  // Cap at summaryMaxChars
  if (summary.length > CONFIG.summaryMaxChars) {
    return summary.substring(0, CONFIG.summaryMaxChars) + '...';
  }
  
  return summary;
}

// ===================== CONDITIONAL FULL PROFILE =====================

/**
 * Check if the full memory profile should be conditionally injected.
 * Uses keyword overlap between user message and profile content.
 */
async function shouldInjectFullProfile(userMessage: string): Promise<boolean> {
  // Read the memory profile with a reasonable cap
  const profileContent = readMemoryProfileFile(4000);
  
  if (!profileContent || profileContent.length === 0) {
    return false;
  }
  
  // Check simple relevance
  if (!isMemoryRelevant(userMessage)) {
    return false;
  }
  
  // Calculate overlap score
  const score = calculateRelevanceScore(userMessage, profileContent);
  
  return score >= CONFIG.relevanceThreshold;
}

/**
 * Get the full memory profile content, capped at a reasonable size.
 */
function getFullProfile(): string {
  const profileContent = readMemoryProfileFile(
    CONFIG.maxInjectedChars - CONFIG.summaryMaxChars - 200
  );
  
  return profileContent || '';
}

// ===================== MAIN AUTO-INJECT FUNCTION =====================

/**
 * Auto-inject relevant memory into the user's message.
 * 
 * Always injects: a short "top of mind" summary (~500-800 chars)
 * Conditionally injects: full memory profile when the message appears relevant
 * 
 * Total is hard-capped at maxInjectedChars to prevent context domination.
 */
export async function autoInjectMemory(userMessage: string): Promise<string> {
  const parts: string[] = [];
  let totalChars = 0;
  
  // === ALWAYS INJECT: Top of mind summary ===
  const summary = await buildAlwaysInjectSummary();
  if (summary.length > 0) {
    parts.push(CONFIG.summaryPrefix + summary);
    totalChars += CONFIG.summaryPrefix.length + summary.length;
  }
  
  // === CONDITIONALLY INJECT: Full profile ===
  const shouldInject = await shouldInjectFullProfile(userMessage);
  
  if (shouldInject) {
    const remainingChars = CONFIG.maxInjectedChars - totalChars - CONFIG.separator.length;
    
    if (remainingChars > 200) { // Need room for meaningful content
      const profile = getFullProfile();
      
      if (profile.length > 0) {
        // Cap profile to remaining budget
        const cappedProfile = profile.length > remainingChars
          ? profile.substring(0, remainingChars) + '...'
          : profile;
        
        parts.push(CONFIG.profilePrefix + cappedProfile);
        totalChars += CONFIG.profilePrefix.length + cappedProfile.length;
      }
    }
  }
  
  // === FORMAT ===
  if (parts.length === 0) {
    // No memory to inject — return original message
    return userMessage;
  }
  
  const memoryBlock = parts.join(CONFIG.separator);
  return `${memoryBlock}${CONFIG.separator}${userMessage}`;
}

// ===================== PROMPT PREPROCESSOR WRAPPER =====================

/**
 * Create a promptPreprocessor function suitable for context.withPromptPreprocessor().
 * This is the bridge between the LM Studio SDK and our auto-inject logic.
 */
export function createAutoInjectPreprocessor() {
  return async (
    _ctl: any,
    userMessage: ChatMessage
  ): Promise<string | ChatMessage> => {
    // Only process user messages, not assistant/tool messages
    if (userMessage.getRole() !== 'user') {
      return userMessage;
    }
    
    const injectedMessage = await autoInjectMemory(userMessage.getText());
    
    // Return as a string (will be treated as the new user message content)
    return injectedMessage;
  };
}
