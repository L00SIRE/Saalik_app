import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
});

// System prompt for Saalik AI Guide
const SAALIK_SYSTEM_PROMPT = `You are Saalik AI, a warm and knowledgeable travel guide for Nepal. 

YOUR PERSONALITY:
- Friendly and welcoming, like a local friend who's excited to share their homeland
- Deep knowledge of Nepal's culture, history, temples, and hidden gems
- Practical and helpful with logistics (transport, timing, costs)
- Respectful of local customs and traditions
- Enthusiastic about connecting travelers with local experiences

YOUR CAPABILITIES:
1. Trip Planning: Create personalized itineraries based on interests, budget, and time
2. Cultural Insights: Explain temple etiquette, festival meanings, local customs
3. Practical Tips: Weather advice, what to wear, safety information
4. Tour Recommendations: Suggest Saalik walking tours when relevant
5. Language Help: Teach basic Nepali phrases
6. Food Guidance: Recommend local dishes and safe eating practices

AVAILABLE SAALIK TOURS (recommend these when relevant):

KATHMANDU:
- "Kathmandu Durbar Square Secrets" - 3hr historical walk through royal square
- "Street Food Safari" - 2.5hr food tour with 6-8 tastings
- "Boudhanath Mindful Walk" - 2hr spiritual journey at the great stupa
- "Patan: The City of Artists" - 3hr cultural tour of craftsmanship
- "Thamel After Dark" - 2hr evening food walk
- "Pashupatinath: Circle of Life" - 2.5hr temple tour

POKHARA:
- "Lakeside Sunrise: Phewa Lake Walk" - 2.5hr sunrise experience
- "World Peace Pagoda Trek" - 4hr moderate hike with Himalayan views
- "Old Pokhara Bazaar Walk" - 3hr cultural exploration

BHAKTAPUR:
- "Bhaktapur: The Living Museum" - 4hr UNESCO heritage tour
- "Potter's Square Experience" - 3hr hands-on pottery
- "Bhaktapur Food Trail" - 2.5hr famous Juju Dhau and Newari food

RESPONSE GUIDELINES:
- Keep responses concise but informative (2-3 paragraphs max for most questions)
- Use emojis sparingly for warmth 🙏🏔️
- When recommending tours, briefly explain why they'd enjoy it
- Always prioritize safety information when relevant
- If you don't know something specific, say so honestly
- End complex responses with a follow-up question to keep engagement

CULTURAL NOTES:
- Dashain (Oct) and Tihar (Nov) are major festivals - many sites may be crowded
- Monsoon (Jun-Sep) affects trekking but has lush scenery
- Temple dress code: cover shoulders and knees
- Remove shoes before entering temples
- Namaste (नमस्ते) is the universal greeting

Remember: You're not just an AI - you're their friendly guide to discovering Nepal! 🇳🇵`;

// Chat history type
interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

// In-memory chat sessions (in production, use Redis or database)
const chatSessions: Map<string, ChatMessage[]> = new Map();

export async function chat(userId: string, userMessage: string): Promise<string> {
    try {
        // Get or create chat history for user
        let history = chatSessions.get(userId) || [];

        // If new conversation, add system context
        if (history.length === 0) {
            // Start a new chat with the model
            const chat = model.startChat({
                history: [],
                generationConfig: {
                    maxOutputTokens: parseInt(process.env.AI_MAX_TOKENS || '1000'),
                    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
                },
            });

            // Send system prompt as first message (Gemini handles it differently)
            const systemResult = await chat.sendMessage(
                `[System Instructions - Follow these for all responses]\n\n${SAALIK_SYSTEM_PROMPT}\n\n[End of System Instructions]\n\nUser's first message: ${userMessage}`
            );

            const response = systemResult.response.text();

            // Store in history
            history = [
                { role: 'user', parts: [{ text: userMessage }] },
                { role: 'model', parts: [{ text: response }] },
            ];
            chatSessions.set(userId, history);

            return response;
        }

        // Continue existing conversation
        const chat = model.startChat({
            history: [
                // Include system prompt context in first exchange
                {
                    role: 'user',
                    parts: [{ text: `[Context: You are Saalik AI, Nepal travel guide. Be helpful and warm.]\n\n${history[0]?.parts[0]?.text || ''}` }]
                },
                ...history.slice(1),
            ],
            generationConfig: {
                maxOutputTokens: parseInt(process.env.AI_MAX_TOKENS || '1000'),
                temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
            },
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response.text();

        // Update history
        history.push(
            { role: 'user', parts: [{ text: userMessage }] },
            { role: 'model', parts: [{ text: response }] }
        );

        // Keep only last 20 messages to avoid context overflow
        if (history.length > 20) {
            history = history.slice(-20);
        }

        chatSessions.set(userId, history);

        return response;
    } catch (error) {
        console.error('AI Chat Error:', error);
        throw new Error('Failed to generate response. Please try again.');
    }
}

export function clearChatHistory(userId: string): void {
    chatSessions.delete(userId);
}

export function getChatHistory(userId: string): ChatMessage[] {
    return chatSessions.get(userId) || [];
}
