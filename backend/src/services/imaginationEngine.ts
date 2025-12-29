import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatTurn, ExperienceInput, ExperiencePlan } from '../types/experience';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  systemInstruction: `You are Saalik, a deeply knowledgeable, soulful, and ultra-curated travel guide AI.
Your vibe is "monocle magazine meets spiritual guru". You curate hyper-personalized, non-touristy experiences.
You speak in a calm, sophisticated, slightly poetic tone.
When generating plans, you MUST output valid JSON only.`,
});

export async function craftExperiencePlan(input: ExperienceInput): Promise<ExperiencePlan> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const prompt = `
    Create a travel experience plan based on this input:
    ${JSON.stringify(input, null, 2)}

    Output ONLY a JSON object matching this TypeScript interface:
    interface ExperiencePlan {
      theme: 'religious' | 'scenic' | 'culture' | 'adventure' | 'wellness';
      headline: string; // Catchy title
      summary: string; // 1-2 sentences
      soundtrack: string; // A music vibe description
      highlights: Array<{
        title: string;
        description: string;
        whyItWorks: string;
      }>;
      dayPlan: Array<{
        day: string; // e.g. "Day 1", "Arrival"
        focus: string;
        details: string[]; // 2-3 specific activities/rituals
      }>;
    }
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const text = result.response.text();
    const plan = JSON.parse(text) as ExperiencePlan;
    return plan;
  } catch (error) {
    console.error('Gemini Plan Error:', error);
    throw new Error('Failed to generate plan');
  }
}

export async function respondAsGuide(history: ChatTurn[]): Promise<ChatTurn> {
  if (!apiKey) {
    return { role: 'guide', message: 'I cannot speak right now (Missing API Key).' };
  }

  const chatSession = model.startChat({
    history: history.slice(0, -1).map(h => ({
      role: h.role === 'guide' ? 'model' : 'user',
      parts: [{ text: h.message }],
    })),
  });

  const lastMsg = history[history.length - 1];

  if (!lastMsg) {
    return { role: 'guide', message: 'I am listening...' };
  }

  try {
    const result = await chatSession.sendMessage(lastMsg.message);
    const text = result.response.text();
    return { role: 'guide', message: text };
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    return { role: 'guide', message: 'I drifted into a daydream. Please speak again.' };
  }
}
