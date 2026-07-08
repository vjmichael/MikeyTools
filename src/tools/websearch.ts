import * as cheerio from 'cheerio';

// Use native fetch (Node.js 18+) instead of node-fetch
// This eliminates the deprecated node-fetch dependency

// ===================== WEB SEARCH =====================

export interface WebSearchOptions {
  query: string;
  engine?: string;
  maxResults?: number;
  searchType?: string;
  region?: string;
  safesearch?: string;
  language?: string;
}

export async function webSearch(options: WebSearchOptions): Promise<string> {
  const {
    query,
    engine = 'duckduckgo',
    maxResults = 10,
    searchType = 'web',
    region = 'wt-wt',
    safesearch = 'moderate',
    language = 'en'
  } = options;

  if (searchType === 'web') {
    return searchWeb(query, engine, maxResults, region, safesearch, language);
  } else if (searchType === 'news') {
    return searchNews(query, maxResults);
  } else if (searchType === 'images') {
    return searchImages(query, maxResults);
  } else {
    return `Unknown search type: '${searchType}'. Use 'web', 'news', or 'images'.`;
  }
}

async function searchWeb(
  query: string,
  engine: string,
  maxResults: number,
  region: string,
  safesearch: string,
  language: string
): Promise<string> {
  let results: SearchResult[] = [];
  let source = 'Unknown';

  try {
    // Use DuckDuckGo HTML search via native fetch + cheerio
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&region=${region}&safesearch=${safesearch}&df=${language}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    // BUG-FIX: More robust parsing with fallback for different HTML structures
    let resultElements = $('.result');
    if (resultElements.length === 0) {
      // Fallback: try alternative selectors
      resultElements = $('[data-testid="result-card"]');
      if (resultElements.length === 0) {
        resultElements = $('.result-card');
      }
    }
    
    resultElements.each((i, el) => {
      if (i >= maxResults) return;
      const $el = $(el);
      const title = $el.find('.result__title, a').first().text().trim();
      const url = $el.find('.result__url').attr('href') || 
                  $el.find('a').first().attr('href') || 
                  $el.attr('href') || 
                  'N/A';
      const snippet = $el.find('.result__snippet, .result-snippet, .snippet').text().trim();
      if (title || url !== 'N/A') {
        results.push({ title: title || 'No Title', url, snippet: snippet || '' });
      }
    });
    source = 'DuckDuckGo';
  } catch (e) {
    return `Error performing ${engine} search: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (results.length === 0) {
    return `No results found for: '${query}'`;
  }

  let output = '\n' + '='.repeat(70) + '\n';
  output += `  ${source.toUpperCase()} Search Results for: '${query}'\n`;
  output += `  Total: ${results.length} result(s)\n`;
  output += '='.repeat(70) + '\n\n';

  results.forEach((r: SearchResult, i: number) => {
    output += `  [${i + 1}] ${r.title}\n`;
    output += `      URL: ${r.url}\n`;
    output += `      Source: ${source}\n`;
    const snippet = r.snippet.trim();
    if (snippet.length > 200) {
      output += `      Snippet: ${snippet.substring(0, 197)}...\n`;
    } else {
      output += `      Snippet: ${snippet}\n`;
    }
    output += '\n';
  });

  output += '='.repeat(70) + '\n';
  return output;
}

async function searchNews(query: string, maxResults: number): Promise<string> {
  try {
    // DuckDuckGo News search via native fetch + cheerio
    const url = `https://duckduckgo.com/news/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    const newsResults: SearchResult[] = [];
    $('.news-result').each((i, el) => {
      if (i >= maxResults) return;
      const title = $(el).find('.news-result__title').text().trim();
      const url = $(el).find('.news-result__url').attr('href') || 'N/A';
      const snippet = $(el).find('.news-result__snippet').text().trim();
      if (title || url !== 'N/A') {
        newsResults.push({ title: title || 'No Title', url, snippet: snippet || '' });
      }
    });

    if (newsResults.length === 0) {
      return `No news results found for: '${query}'`;
    }

    let output = '\n' + '='.repeat(70) + '\n';
    output += `  News Results for: '${query}'\n`;
    output += `  Total: ${newsResults.length} result(s)\n`;
    output += '='.repeat(70) + '\n\n';

    newsResults.forEach((r: SearchResult, i: number) => {
      output += `  [${i + 1}] ${r.title}\n`;
      output += `      URL: ${r.url}\n`;
      const snippet = (r.snippet || '').trim();
      if (snippet.length > 200) {
        output += `      Snippet: ${snippet.substring(0, 197)}...\n\n`;
      } else {
        output += `      Snippet: ${snippet}\n\n`;
      }
    });

    output += '='.repeat(70) + '\n';
    return output;
  } catch (e) {
    return `Error searching news: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function searchImages(query: string, maxResults: number): Promise<string> {
  try {
    // DuckDuckGo Images search via native fetch + cheerio
    const url = `https://duckduckgo.com/images/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    const imageResults: SearchResult[] = [];
    $('.image-result').each((i, el) => {
      if (i >= maxResults) return;
      const title = $(el).find('.image-result__title').text().trim();
      const url = $(el).find('.image-result__url').attr('href') || 'N/A';
      const imageUrl = $(el).find('img').attr('src') || 'N/A';
      if (title || url !== 'N/A') {
        imageResults.push({ title: title || 'Image', url: imageUrl, snippet: `Source: ${url}` });
      }
    });

    if (imageResults.length === 0) {
      return `No image results found for: '${query}'`;
    }

    let output = '\n' + '='.repeat(70) + '\n';
    output += `  Image Results for: '${query}'\n`;
    output += `  Total: ${imageResults.length} result(s)\n`;
    output += '='.repeat(70) + '\n\n';

    imageResults.forEach((r: SearchResult, i: number) => {
      output += `  [${i + 1}] ${r.title}\n`;
      output += `      Image URL: ${r.url}\n`;
      output += `      Source: ${r.snippet}\n\n`;
    });

    output += '='.repeat(70) + '\n';
    return output;
  } catch (e) {
    return `Error searching images: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ===================== WEB CONTENT FETCHING =====================

export async function fetchWebContent(url: string, maxLength: number = 10000): Promise<string> {
  try {
    // BUG-11 FIX: Add timeout to prevent hanging on slow URLs
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, header, aside').remove();

    let text = $('body').text();
    text = text.replace(/\s+/g, ' ').trim();

    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '... [content truncated]';
    }

    return text;
  } catch (e) {
    return `Error fetching URL: ${e instanceof Error ? e.message : String(e)}`;
  }
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}
