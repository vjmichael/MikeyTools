/**
 * Browser Control Tool for LM Studio Plugin
 * 
 * Uses Playwright to browse websites in a headless, isolated environment.
 * This allows the AI to fetch dynamic content (JavaScript rendered) without
 * interfering with the user's active browser sessions.
 */

import { chromium } from 'playwright';

export interface BrowseResult {
  success: boolean;
  content: string;
  error?: string;
}

/**
 * Browses a URL using a headless browser.
 * 
 * @param url - The URL to visit.
 * @param waitSelector - Optional CSS selector to wait for before returning (e.g., '#main-content').
 * @param timeoutMs - Timeout in milliseconds (default 15s).
 */
export async function browseWebsite(
  url: string,
  waitSelector?: string,
  timeoutMs: number = 15000
): Promise<BrowseResult> {
  let browser: any;
  let pageContext: any;
  try {
    // 1. Launch in Headless Mode
    // This ensures the browser runs in the background with NO visible window.
    browser = await chromium.launch({ 
      headless: true 
    });
    
    // 2. Create a new isolated context (Incognito mode)
    // This ensures the AI does NOT use the user's cookies, history, or logged-in sessions.
    // It prevents interference with the user's own browsing.
    pageContext = await browser.newContext();
    const page = await pageContext.newPage();

    // 3. Navigate to the URL
    const response = await page.goto(url, { 
      waitUntil: 'networkidle', // Wait for network to be quiet
      timeout: timeoutMs 
    });

    // BUG-45 FIX: Check content type and handle non-HTML responses appropriately
    const contentType = response?.headers()['content-type'] || '';
    if (contentType.includes('application/pdf')) {
      return { 
        success: true, 
        content: '[PDF document - content type: application/pdf]',
        error: undefined 
      };
    } else if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      // For JSON or plain text, return raw content
      const rawContent = await page.content();
      return { 
        success: true, 
        content: rawContent,
        error: undefined 
      };
    } else if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      // Unknown content type - try to get content anyway
      const rawContent = await page.content();
      return { 
        success: true, 
        content: `[Content type: ${contentType}]\n${rawContent}`,
        error: undefined 
      };
    }

    // 4. Optional: Wait for specific content to load
    if (waitSelector) {
      await page.waitForSelector(waitSelector, { timeout: timeoutMs });
    }

    // 5. Get the HTML content
    const htmlContent = await page.content();
    
    return { success: true, content: htmlContent };
  } catch (error) {
    return { 
      success: false, 
      content: '', 
      error: error instanceof Error ? error.message : String(error) 
    };
  } finally {
    // 6. Cleanup: Close context and browser to free resources
    // BUG-FIX: Close context before browser to prevent resource leaks
    if (pageContext) {
      await pageContext.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}
