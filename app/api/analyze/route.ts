import axios from 'axios';
import * as cheerio from 'cheerio';
import { Groq } from 'groq-sdk';

// Helper function to extract main article content intelligently
function extractMainContent($: cheerio.CheerioAPI, html: string): string {
    // Remove script, style, nav, footer, ads, and form elements
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    $('[data-ad-slot]').remove();
    $('[data-ad]').remove();
    $('form').remove();
    $('[role="navigation"]').remove();
    $('[role="complementary"]').remove();
    $('.ad').remove();
    $('.advertisement').remove();
    $('.ads').remove();

    // Try to find article content using semantic HTML
    let content = '';
    
    // Strategy 1: Look for <article> tag
    const article = $('article').text().trim();
    if (article.length > 500) {
        content = article;
    }
    
    // Strategy 2: Look for main content container (common patterns)
    if (!content) {
        const mainContent = $('main').text().trim();
        if (mainContent.length > 500) {
            content = mainContent;
        }
    }
    
    // Strategy 3: Look for common article container classes
    if (!content) {
        const contentSelectors = [
            '[data-testid="article"]',
            '.article-body',
            '.post-content',
            '.entry-content',
            '[data-article-body-container]',
            '.story-body',
            '.article-content',
            '.content-body'
        ];
        
        for (const selector of contentSelectors) {
            const found = $(selector).text().trim();
            if (found.length > 500) {
                content = found;
                break;
            }
        }
    }
    
    // Strategy 4: Extract all paragraphs and headings with good content density
    if (!content) {
        const elements: string[] = [];
        $('h1, h2, h3, p, article').each((_, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 20 && !isLikelyBoilerplate(text)) {
                elements.push(text);
            }
        });
        content = elements.join('\n\n');
    }
    
    // Fallback: Get body text but with better filtering
    if (!content) {
        const bodyText = $('body').text().trim();
        content = bodyText;
    }
    
    return content.slice(0, 5000);
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
                    content: `Please summarize the following website content in 3-4 paragraphs in detail, explaining what exactly the content is trying to convey:\n\n${mainContent}`
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
