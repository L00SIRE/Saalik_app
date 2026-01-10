import { Router, Request, Response } from 'express';
import { chat, clearChatHistory, getChatHistory } from '../services/ai';

const router = Router();

// POST /api/ai/chat - Send a message to AI
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        const userId = (req as any).userId || 'anonymous';

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (message.length > 2000) {
            return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
        }

        const response = await chat(userId, message);

        return res.json({
            message: response,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('AI Chat Error:', error);
        return res.status(500).json({
            error: 'Failed to get AI response. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/ai/history - Get chat history
router.get('/history', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId || 'anonymous';
        const history = getChatHistory(userId);

        return res.json({
            history: history.map(msg => ({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.parts[0]?.text || ''
            }))
        });
    } catch (error) {
        console.error('History Error:', error);
        return res.status(500).json({ error: 'Failed to get chat history' });
    }
});

// DELETE /api/ai/history - Clear chat history (start new conversation)
router.delete('/history', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId || 'anonymous';
        clearChatHistory(userId);

        return res.json({ message: 'Chat history cleared' });
    } catch (error) {
        console.error('Clear History Error:', error);
        return res.status(500).json({ error: 'Failed to clear chat history' });
    }
});

// GET /api/ai/suggestions - Get quick action suggestions
router.get('/suggestions', async (req: Request, res: Response) => {
    const suggestions = [
        { text: "Plan my trip", icon: "map-outline", message: "Help me plan a 5-day trip to Nepal" },
        { text: "Today's tours", icon: "calendar-outline", message: "What tours are available today?" },
        { text: "Food spots", icon: "restaurant-outline", message: "Best local food near Thamel?" },
        { text: "Temple tips", icon: "home-outline", message: "What should I know before visiting temples?" },
        { text: "Weather", icon: "cloud-outline", message: "What's the weather like this week?" },
        { text: "Learn Nepali", icon: "language-outline", message: "Teach me basic Nepali greetings" },
    ];

    return res.json({ suggestions });
});

export default router;
