import { Groq } from 'groq-sdk';

export async function POST(req: Request) {
    try {
        const { question, content, summary } = await req.json();

        if (!question) {
            return Response.json({ error: 'Question is required' }, { status: 400 });
        }

        if (!process.env.GROQ_API_KEY) {
            return Response.json(
                { error: 'GROQ_API_KEY environment variable is not set' },
                { status: 500 }
            );
        }

        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        console.log(`\n❓ User Question: ${question}`);

        // Use the content as context for answering the question
        const contextContent = content || summary;

        const message = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: `Based on the following website content, please answer this question: "${question}"\n\nWebsite Content:\n${contextContent}\n\nProvide a clear and direct answer based on the content provided.`
                }
            ]
        });

        const answer = message.choices[0].message.content;

        console.log(`\n✨ AI Answer:\n${answer}`);
        console.log(`\n` + '='.repeat(80) + '\n');

        return Response.json({
            success: true,
            question,
            answer
        });

    } catch (error) {
        console.error('❌ Error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to process question';
        return Response.json(
            { error: errorMsg },
            { status: 500 }
        );
    }
}
