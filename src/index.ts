// LM Studio plugin entry point - required by lms dev
// All tool registration is in tools-order.ts for clean priority ordering
import { PluginContext } from "@lmstudio/sdk";
import { toolsProvider, cleanupBackgroundResources, stopBackgroundCleanup, clearIndex } from "./tools-order";
import { createBehavioralGuidancePreprocessor } from "./tools/behavioral_guidance_preprocessor";

// C-01 FIX: Add cleanupAllResources function to prevent resource leaks
export function cleanupAllResources(): void {
  cleanupBackgroundResources();
  stopBackgroundCleanup();
  clearIndex();
}

// LM Studio plugin entry point - required by lms dev
export async function main(context: PluginContext) {
  // Register tools (all tool registration is in tools-order.ts)
  context.withToolsProvider(toolsProvider);
  
  // Register combined preprocessor (behavioral guidance + auto-inject memory)
  // LM Studio SDK only allows a single registered promptPreprocessor.
  // We combine both functionalities into one to avoid 'PromptPreprocessor already registered' error.
  context.withPromptPreprocessor(createBehavioralGuidancePreprocessor());
}

// Keep the process alive so main() doesn't exit immediately
setInterval(() => {}, 60000);
