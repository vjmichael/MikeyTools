/**
 * Memory Rebuild Tool - Summarizes LM Studio conversations into persistent memory.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os'; // FIX: Added missing import for cross-platform home resolution

interface ConversationFile {
  name: string;
  createdAt: number;
  tokenCount?: number;
  systemPrompt?: string;
  messages?: Array<{
    versions?: Array<{
      type?: string;
      role?: string;
      content?: Array<{type: string; text?: string}>;
      steps?: Array<{type: string; content?: Array<{type: string; text?: string}>}>;
    }>;
  }>;
}

interface MemorySummary {
  work_context: string[];
  personal_context: string[];
  top_of_mind: string[];
  recent_history: RecentHistoryEntry[];
  long_term_background: string[];
  last_updated: string;
  total_conversations_analyzed: number;
}

interface RecentHistoryEntry {
  date: string;
  title: string;
  token_count?: number;
  summary: string;
}

/**
 * Extract text content from a message object (handles nested versions/steps).
 */
function extractMessageText(message: any): string {
  if (!message) return '';
  
  // Try versions array first
  if (message.versions && Array.isArray(message.versions)) {
    for (const version of message.versions) {
      if (version.preprocessed?.content) {
        const texts = version.preprocessed.content
          .filter((c: any) => c.type === 'text' && c.text)
          .map((c: any) => c.text);
        if (texts.length > 0) return texts.join('\n');
      }
      
      // Try content array directly
      if (version.content) {
        const texts = version.content
          .filter((c: any) => c.type === 'text' && c.text)
          .map((c: any) => c.text);
        if (texts.length > 0) return texts.join('\n');
      }
      
      // Try steps array
      if (version.steps) {
        const allTexts: string[] = [];
        for (const step of version.steps) {
          if (step.content) {
            const texts = step.content
              .filter((c: any) => c.type === 'text' && c.text)
              .map((c: any) => c.text);
            allTexts.push(...texts);
          }
        }
        if (allTexts.length > 0) return allTexts.join('\n');
      }
    }
  }
  
  // Try content array directly on message
  if (message.content && Array.isArray(message.content)) {
    const texts = message.content
      .filter((c: any) => c.type === 'text' && c.text)
      .map((c: any) => c.text);
    return texts.join('\n');
  }
  
  return '';
}

/**
 * Truncate text to max length with ellipsis.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate a simple summary of conversation content using keyword extraction.
 */
function generateSimpleSummary(messages: any[]): string {
  const allTexts = messages.map(m => extractMessageText(m)).filter(t => t.length > 0);
  
  // Combine last N messages for context (last 10 by default)
  const recentMessages = allTexts.slice(-10).join('\n\n');
  
  if (recentMessages.length < 50) {
    return truncate(recentMessages, 200);
  }
  
  // Simple keyword extraction: count word frequency
  const words = recentMessages.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const wordCount: Record<string, number> = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }
  
  // Get top keywords
  const sortedWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  
  return `Keywords: ${sortedWords.map(([word]) => word).join(', ')} | Length: ${recentMessages.length} chars`;
}

/**
 * Read all conversation files from LM Studio's conversations directory.
 */
function readConversations(conversationsDir: string): Array<{
  dirName: string;
  fileName: string;
  data: ConversationFile;
}> {
  const results: Array<{dirName: string; fileName: string; data: ConversationFile}> = [];
  
  if (!fs.existsSync(conversationsDir)) {
    return results;
  }
  
  try {
    // Get all subdirectories (conversation threads)
    const entries = fs.readdirSync(conversationsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const threadPath = path.join(conversationsDir, entry.name);
      try {
        const files = fs.readdirSync(threadPath).filter(f => f.endsWith('.conversation.json'));
        
        // Sort by filename (timestamp) descending to get newest first
        files.sort().reverse();
        
        for (const file of files.slice(0, 20)) { // Limit to 20 most recent per thread
          const filePath = path.join(threadPath, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data: ConversationFile = JSON.parse(content);
            results.push({ dirName: entry.name, fileName: file, data });
          } catch (parseErr) {
            // FIX: Gracefully skip corrupted JSON files instead of crashing
          }
        }
      } catch (e) {
        // Skip unreadable threads
      }
    }
  } catch (e) {
    // Directory access error
  }
  
  return results;
}

/**
 * Categorize a conversation based on its content and metadata.
 */
function categorizeConversation(
  dirName: string,
  fileName: string,
  data: ConversationFile
): Pick<MemorySummary, 'work_context' | 'personal_context' | 'top_of_mind' | 'recent_history' | 'long_term_background'> {
  const title = data.name || path.parse(fileName).name;
  const summary = generateSimpleSummary(data.messages || []);
  
  // Categorize based on thread name and content hints
  const isWorkRelated = dirName.toLowerCase().includes('work') || 
                        dirName.toLowerCase().includes('project') ||
                        dirName.toLowerCase().includes('toolkit') ||
                        data.tokenCount && data.tokenCount > 10000;
  
  const hasLongContent = (data.messages?.length || 0) > 20;
  
  return {
    work_context: isWorkRelated ? [`Thread "${title}": ${summary}`] : [],
    personal_context: !isWorkRelated && data.tokenCount ? [`${dirName}/${title}: ${data.tokenCount} tokens`] : [],
    top_of_mind: hasLongContent ? [{ date: new Date(data.createdAt).toISOString(), title, token_count: data.tokenCount, summary }] as any[] : [],
    recent_history: [{ 
      date: new Date(data.createdAt).toISOString(), 
      title: `${dirName}/${title}`,
      token_count: data.tokenCount,
      summary: truncate(summary, 300)
    }],
    long_term_background: []
  };
}

/**
 * Rebuild memory from LM Studio conversations.
 */
export async function rebuildMemory(
  options: {
    conversationsDir?: string;
    outputPath?: string;        
    maxConversations?: number;  
    maxSummaryLength?: number;  
  } = {}
): Promise<string> {
  // FIX: Replaced environment variable fallback with os.homedir() for Windows/Linux/Mac safety
  const homeDir = os.homedir();
  const conversationsDir = options.conversationsDir || path.join(homeDir, '.lmstudio', 'conversations');
  const outputPath = options.outputPath || path.join(homeDir, '.toolkit', 'memory', 'user_profile.md');
  const maxConversations = options.maxConversations || 100;
  const maxSummaryLength = options.maxSummaryLength || 500;

  try {
    // Read all conversations (newest first)
    let conversations = readConversations(conversationsDir);
    
    // Sort by createdAt descending and limit
    conversations.sort((a, b) => (b.data.createdAt || 0) - (a.data.createdAt || 0));
    conversations = conversations.slice(0, maxConversations);

    if (conversations.length === 0) {
      return JSON.stringify({
        success: false,
        error: `No conversation files found in ${conversationsDir}`,
        hint: 'LM Studio may not have any saved conversations yet.'
      }, null, 2);
    }

    // Categorize all conversations
    const workContexts: string[] = [];
    const personalContexts: string[] = [];
    const topOfMind: RecentHistoryEntry[] = [];
    const recentHistory: RecentHistoryEntry[] = [];
    const longTermBackground: string[] = [];

    for (const { dirName, fileName, data } of conversations) {
      const categorized = categorizeConversation(dirName, fileName, data);
      
      workContexts.push(...categorized.work_context.slice(0, 5));
      personalContexts.push(...categorized.personal_context.slice(0, 3));
      topOfMind.push(...((categorized.top_of_mind as unknown) as RecentHistoryEntry[]).slice(0, 10));
      recentHistory.push(...categorized.recent_history);
      longTermBackground.push(...categorized.long_term_background);
    }

    // Build markdown summary
    const lines: string[] = [];
    lines.push('# Persistent Memory Profile');
    lines.push('');
    lines.push(`> Auto-generated by rebuild_memory tool`);
    lines.push(`> Last updated: ${new Date().toISOString()}`);
    lines.push(`> Analyzed ${conversations.length} conversation files from LM Studio.`);
    lines.push('');

    // Work/Professional Context
    if (workContexts.length > 0) {
      lines.push('## Work / Professional Context');
      lines.push('');
      for (const item of workContexts.slice(0, 20)) {
        lines.push(`- ${truncate(item, maxSummaryLength)}`);
      }
      lines.push('');
    }

    // Personal Context
    if (personalContexts.length > 0) {
      lines.push('## Personal Context');
      lines.push('');
      for (const item of personalContexts.slice(0, 10)) {
        lines.push(`- ${truncate(item, maxSummaryLength)}`);
      }
      lines.push('');
    }

    // Top of Mind â€” Active Work
    if (topOfMind.length > 0) {
      lines.push('## Top of Mind â€” Active / In-Progress Work');
      lines.push('');
      for (const entry of topOfMind.slice(0, 15)) {
        const dateStr = new Date(entry.date).toLocaleDateString();
        lines.push(`### [${dateStr}] ${entry.title}`);
        if (entry.token_count) {
          lines.push(`- Tokens: ${entry.token_count}`);
        }
        lines.push(`- Summary: ${truncate(entry.summary, maxSummaryLength)}`);
        lines.push('');
      }
    }

    // Recent History
    if (recentHistory.length > 0) {
      lines.push('## Recent History â€” Compressed Narrative');
      lines.push('');
      for (const entry of recentHistory.slice(0, 30)) {
        const dateStr = new Date(entry.date).toLocaleDateString();
        const tokenInfo = entry.token_count ? ` (${entry.token_count} tokens)` : '';
        lines.push(`- **${dateStr}**: ${truncate(entry.summary, maxSummaryLength)}${tokenInfo}`);
      }
      lines.push('');
    }

    // Long-Term Background
    if (longTermBackground.length > 0) {
      lines.push('## Long-Term Background â€” Durable Facts');
      lines.push('');
      for (const item of longTermBackground.slice(0, 15)) {
        lines.push(`- ${truncate(item, maxSummaryLength)}`);
      }
      lines.push('');
    }

    // Write summary file
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const markdownContent = lines.join('\n');
    fs.writeFileSync(outputPath, markdownContent, 'utf8');

    return JSON.stringify({
      success: true,
      message: `Memory rebuilt successfully from ${conversations.length} conversation files`,
      output_path: outputPath,
      conversations_analyzed: conversations.length,
      summary_length_chars: markdownContent.length,
      categories: {
        work_context_entries: workContexts.length,
        personal_context_entries: personalContexts.length,
        top_of_mind_entries: topOfMind.length,
        recent_history_entries: recentHistory.length,
        long_term_background_entries: longTermBackground.length
      },
      hint: 'This file is human-editable. Open ~/.toolkit/memory/user_profile.md to review or correct entries.'
    }, null, 2);

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: `Failed to rebuild memory: ${errMsg}`,
      conversations_dir: conversationsDir,
      output_path: outputPath
    }, null, 2);
  }
}

/**
 * Read the current memory profile (for auto-inject).
 */
export async function readMemoryProfile(
  options: {
    path?: string; 
    maxChars?: number; 
  } = {}
): Promise<string> {
  const homeDir = os.homedir(); // FIX: Use homedir for consistency
  const memoryPath = options.path || path.join(homeDir, '.toolkit', 'memory', 'user_profile.md');

  if (!fs.existsSync(memoryPath)) {
    return JSON.stringify({
      success: false,
      error: `Memory profile not found at ${memoryPath}`,
      hint: 'Run rebuild_memory tool first to generate the profile.'
    }, null, 2);
  }

  try {
    const content = fs.readFileSync(memoryPath, 'utf8');
    
    // Truncate if needed for auto-inject context limits
    const maxChars = options.maxChars || 10000;
    const truncatedContent = content.length > maxChars 
      ? content.substring(0, maxChars) + '\n\n... (truncated for context limit)'
      : content;

    return JSON.stringify({
      success: true,
      path: memoryPath,
      length_chars: content.length,
      last_modified: new Date(fs.statSync(memoryPath).mtime).toISOString(),
      content: truncatedContent
    }, null, 2);

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      success: false,
      error: `Failed to read memory profile: ${errMsg}`
    }, null, 2);
  }
}

// ===================== CONVERSATION INDEXING HELPER =====================
/**
 * Helper to index LM Studio conversations for semantic search.
 */
export async function indexConversations(
  options: {
    conversationsDir?: string; 
    indexPath?: string;        
    maxFilesPerThread?: number; 
  } = {}
): Promise<string> {
  const homeDir = os.homedir(); // FIX: Use homedir for consistency
  const conversationsDir = options.conversationsDir || path.join(homeDir, '.lmstudio', 'conversations');
  const indexPath = options.indexPath || path.join(homeDir, '.toolkit', 'index', 'lm_studio_conversations.idx');
  const maxFilesPerThread = options.maxFilesPerThread || 50;

  if (!fs.existsSync(conversationsDir)) {
    return JSON.stringify({
      success: false,
      error: `Conversations directory not found: ${conversationsDir}`,
      hint: 'LM Studio may need to be opened first to create the conversations folder.'
    }, null, 2);
  }

  // Count total files to index
  let totalCount = 0;
  const entries = fs.readdirSync(conversationsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      try {
        const files = fs.readdirSync(path.join(conversationsDir, entry.name));
        totalCount += Math.min(files.length, maxFilesPerThread);
      } catch {}
    }
  }

  return JSON.stringify({
    success: true,
    message: `Ready to index ${totalCount} conversation files from ${entries.filter(e => e.isDirectory()).length} threads`,
    conversations_dir: conversationsDir,
    index_path: indexPath,
    estimated_files: totalCount,
    hint: 'Use the index_build tool with directory parameter set to \"' + conversationsDir + '\" to create the semantic search index.',
    note: 'The LM Studio SDK provides indexBuild() which can be called programmatically. For now, run rebuild_memory first to create user_profile.md, then use index_build with the conversations dir.'
  }, null, 2);
}
