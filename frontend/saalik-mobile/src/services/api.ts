import axios from 'axios';
import { ChatTurn, ExperiencePlan } from '@types/api';

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  timeout: 6000,
});

export interface PlanPayload {
  name?: string;
  intent: string;
  mood?: string[];
  partySize?: number;
  travelMonth?: string;
  pace?: 'slow' | 'balanced' | 'fast';
  mustSee?: string[];
  avoid?: string[];
}

export const requestExperiencePlan = async (payload: PlanPayload): Promise<ExperiencePlan> => {
  const { data } = await client.post<ExperiencePlan>('/experience-plan', payload);
  return data;
};

export const sendChat = async (history: ChatTurn[], message: string) => {
  const { data } = await client.post<{ history: ChatTurn[]; reply: ChatTurn }>('/chat', {
    history,
    message,
  });

  return data;
};
