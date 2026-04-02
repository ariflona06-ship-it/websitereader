import axios from 'axios';
import * as cheerio from 'cheerio';
import { Groq } from 'groq-sdk';

// Helper function to extract main article content intelligently
function extractMainContent($: cheerio.CheerioAPI): string {
    // Remove known unwanted elements to avoid ads and navigational boilerplate
    const removeSelectors = [
        'script', 'style', 'nav', 'footer', 'aside', 'form',
        '[data-ad-slot]', '[data-ad]', '[id*="ad"]', '[class*="ad"]',
        '[class*="sponsor"]', '[class*="promo"]', '[class*="newsletter"]',
        '[role="navigation"]', '[role="complementary"]',
        '.ad', '.advertisement', '.ads', '.promo', '.sponsored'
    ];
    $(removeSelectors.join(',')).remove();

    // Collect candidate content sources and score them by length
    const contentCandidates: string[] = [];
    const addCandidate = (text: string) => {
        const trimmed = text.replace(/\s+/g, ' ').trim();
        if (trimmed.length > 200 && !isLikelyBoilerplate(trimmed)) {
            contentCandidates.push(trimmed);
        }
    };

    addCandidate($('article').text());
    addCandidate($('main').text());

    const contentSelectors = [
        '[data-testid="article"]',
        '.article-body',
        '.post-content',
        '.entry-content',
        '[data-article-body-container]',
        '.story-body',
        '.article-content',
        '.content-body',
        '#main-content',
        '.bbc-1wj2q5f-ArticleWrapper'
    ];

    for (const selector of contentSelectors) {
        addCandidate($(selector).text());
    }

    // Add all text from strong content tags as a broad fallback
    const paragraphElements: string[] = [];
    $('h1, h2, h3, h4, h5, p, li').each((_, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 20 && !isLikelyBoilerplate(text)) {
            paragraphElements.push(text);
        }
    });

    if (paragraphElements.length > 0) {
        addCandidate(paragraphElements.join('\n\n'));
    }

    // Choose the largest candidate to keep as complete content
    let content = contentCandidates.sort((a, b) => b.length - a.length)[0] || '';

    // Fallback to cleaned body text if no candidates found
    if (!content) {
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        content = bodyText;
    }

    // Reduce in length to avoid sending too huge payload but keep as much as reasonably possible
    const maxLength = 16000;
    if (content.length > maxLength) {
        content = content.slice(0, maxLength);
    }

    return content;
}

// Helper to detect boilerplate content
function isLikelyBoilerplate(text: string): boolean {
    const boilerplatePatterns = [
        /feedback.*advertisement/i,
        /how relevant.*ad/i,
        /video.*load/i,
        /ad.*experience/i,
        /did you encounter.*issue/i,
        /cookie.*preference/i,
        /subscribe.*newsletter/i,
        /©.*copyright/i,
        /about.*us|contact.*us|privacy.*policy/i
    ];
    
    return boilerplatePatterns.some(pattern => pattern.test(text));
}

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        
        if (!url) {
            return Response.json({ error: 'URL is required' }, { status: 400 });
        }

        if (!process.env.GROQ_API_KEY) {
            return Response.json({ 
                error: 'GROQ_API_KEY environment variable is not set. Please add it to .env.local' 
            }, { status: 500 });
        }

        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        console.log(`\n📍 Fetching content from: ${url}`);

        // Fetch the website with browser-like headers
        const { data: html } = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log(`✅ Successfully fetched ${html.length} bytes of content`);

        // Parse HTML and extract text intelligently
        const $ = cheerio.load(html);
        const mainContent = extractMainContent($, html);
        
        console.log(`\n📄 Extracted content (first 500 chars):\n${mainContent.slice(0, 500)}`);
        
        if (!mainContent) {
            return Response.json({ error: 'No content found on page' }, { status: 400 });
        }

        // Send to Groq AI for analysis
        console.log(`\n🤖 Sending to Groq AI for analysis...`);
        
        const message = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: `You are a precise summarization assistant. Read the content below (already cleaned, no ads, no boilerplate) and create one detailed summary that includes all important ideas, events, and named entities (including lists of items when present).
- Do NOT invent content not in the text.
- For "list" articles (like top shows), include each item with its key detail.
- Keep the summary complete and faithful.
- Avoid skipping minor yet meaningful points.
\nContent:\n\n${mainContent}`
                }
            ]
        });

        const summary = message.choices[0].message.content;
        
        console.log(`\n✨ Groq AI Summary:\n${summary}`);
        console.log(`\n` + '='.repeat(80) + '\n');

        return Response.json({
            success: true,
            url,
            contentLength: mainContent.length,
            summary,
            rawContent: mainContent
        });

    } catch (error) {
        console.error('❌ Error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to fetch URL';
        return Response.json(
            { error: errorMsg },
            { status: 500 }
        );
    }
}
