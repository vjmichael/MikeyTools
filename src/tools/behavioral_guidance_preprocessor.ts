// Behavioral Guidance Preprocessor
// Reads behavioral-guidance.json and formats it into a concise system message
// injected into every user message turn.

import * as fs from 'fs';
import * as path from 'path';
import type { ChatMessage } from '@lmstudio/sdk';
import { autoInjectMemory } from './auto_inject';

export function createBehavioralGuidancePreprocessor(): (
  _ctl: any,
  message: ChatMessage
) => Promise<string | ChatMessage> {
  // Resolve path to behavioral-guidance.json relative to the bundled location.
  // Bundled production.js lives at <plugin-root>/.lmstudio/production.js, so
  // __dirname here is <plugin-root>/.lmstudio — only ONE level up reaches the
  // plugin root, then into src/tools where behavioral-guidance.json lives.
  // (Previous version used '../../' — two levels up — which skipped past the
  // plugin root entirely and caused ENOENT.)
  const guidancePath = path.join(__dirname, '..', 'src', 'tools', 'behavioral-guidance.json');
  
  let guidance: any;
  try {
    const raw = fs.readFileSync(guidancePath, 'utf-8');
    guidance = JSON.parse(raw);
  } catch (e) {
    console.warn('[Toolkit] Failed to load behavioral-guidance.json:', e);
    return async (_ctl: any, msg: ChatMessage) => msg;
  }

  // Format concise guidance optimized for model context windows
  const formatGuidance = (g: any): string => {
    let out = '\n--- TOOLKIT BEHAVIORAL GUIDANCE ---\n';
    
    out += '## PRIORITY ORDER (Always follow)\n';
    g.toolSelectionRules?.forEach((rule: any) => {
      out += `### Tier ${rule.tier}: ${rule.reason}\n`;
      out += `- ✅ Prefer: ${rule.preferenceOrder.join(', ')}\n`;
      if (rule.avoidUnlessNecessary?.length) {
        out += `- ⛔ Avoid unless necessary: ${rule.avoidUnlessNecessary.join(', ')}\n`;
      }
      out += '\n';
    });

    out += '## CRITICAL RULES\n';
    const criticalRules = g.behavioralGuidance?.filter((r: string) => 
      r.toLowerCase().includes('prefer') || 
      r.toLowerCase().includes('avoid') || 
      r.toLowerCase().includes('never') || 
      r.toLowerCase().includes('always') ||
      r.toLowerCase().includes('use run_command only') ||
      r.toLowerCase().includes('dryrun') ||
      r.toLowerCase().includes('powershell') ||
      r.toLowerCase().includes('wsl')
    ) || g.behavioralGuidance?.slice(0, 8); // Fallback to first 8 if filter misses
    
    criticalRules.forEach((rule: string) => {
      out += `- ${rule}\n`;
    });

    out += '## SAFE PATTERNS\n';
    g.powerShellEscaping?.safePatterns?.forEach((p: string) => {
      out += `- ${p}\n`;
    });

    out += '## WSL SAFETY\n';
    g.wslHandling?.bestPractices?.forEach((p: string) => {
      out += `- ${p}\n`;
    });

    out += '--- END GUIDANCE ---\n';
    return out;
  };

  const guidanceText = formatGuidance(guidance);

  return async (_ctl: any, message: ChatMessage): Promise<string | ChatMessage> => {
    // Only inject for user messages to avoid polluting assistant/tool turns
    if (message.getRole() !== 'user') {
      return message;
    }
    
    // First, auto-inject relevant memory into the message
    let msgText = await autoInjectMemory(message.getText());
    
    // Then, append behavioral guidance
    return `${guidanceText}${msgText}`;
  };
}
