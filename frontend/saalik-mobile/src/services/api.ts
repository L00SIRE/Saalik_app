import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ChatTurn, ExperiencePlan } from '@app-types/api';

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.2.192.22:4000/api',
  timeout: 10000,
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// MOCK DATA
const MOCK_USER: User = {
  id: 'demo-user-id',
  email: 'demo@saalik.ai',
  name: 'Saalik Explorer',
};

const MOCK_AUTH_RESPONSE: AuthResponse = {
  token: 'mock-jwt-token-bypass',
  user: MOCK_USER,
};

let MOCKED_PLANS: ExperiencePlan[] = [];

// MOCK EXPERIENCE PLAN DATA
const MOCK_EXPERIENCE_PLAN: ExperiencePlan = {
  theme: 'culture',
  headline: 'The Sacred Loop: Kathmandu Valley',
  summary: 'A soulful journey through ancient temples, hidden courtyards, and sacred rituals of the Kathmandu Valley.',
  soundtrack: 'Himalayan Meditation Bowls - Deuter',
  highlights: [
    {
      title: 'Boudhanath Stupa',
      description: 'One of the largest spherical stupas in Nepal, a UNESCO World Heritage Site.',
      whyItWorks: 'Experience the morning kora ritual with pilgrims for deep spiritual connection.'
    },
    {
      title: 'Pashupatinath Temple',
      description: 'The holiest Hindu temple in Nepal, dedicated to Lord Shiva.',
      whyItWorks: 'Witness the evening aarti ceremony along the sacred Bagmati River.'
    }
  ],
  dayPlan: [
    {
      day: 'Day 1',
      focus: 'Arrival & Sacred Grounds',
      details: ['Arrive at Tribhuvan Airport', 'Check into heritage hotel in Patan', 'Evening visit to Patan Durbar Square']
    },
    {
      day: 'Day 2',
      focus: 'Boudhanath & Tibetan Culture',
      details: ['Sunrise kora at Boudhanath Stupa', 'Visit Tibetan monasteries', 'Thangka painting workshop']
    },
    {
      day: 'Day 3',
      focus: 'Pashupatinath & Hindu Rituals',
      details: ['Early morning aarti ceremony', 'Explore the temple complex', 'Evening bhajan session']
    }
  ]
};

// MOCKED API CALLS (Network Bypass - Full Mock Mode)
export const requestExperiencePlan = async (payload: PlanPayload): Promise<ExperiencePlan> => {
  console.log('API: Mock Experience Plan (Network Bypassed)', payload);
  // Simulate slight delay for UX
  await new Promise(resolve => setTimeout(resolve, 1500));
  return Promise.resolve(MOCK_EXPERIENCE_PLAN);
};

export const sendChat = async (history: ChatTurn[], message: string) => {
  console.log('API: Mock Chat (Network Bypassed)', message);
  await new Promise(resolve => setTimeout(resolve, 800));

  const reply: ChatTurn = {
    role: 'guide',
    message: `Great question about "${message}"! In the Kathmandu Valley, I'd recommend exploring the hidden courtyards of Patan for an authentic experience. The morning light at Boudhanath is particularly magical. Would you like more specific recommendations?`
  };

  return {
    history: [...history, { role: 'user', message } as ChatTurn, reply],
    reply
  };
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  console.log('API: Mock Login Bypass');
  return Promise.resolve(MOCK_AUTH_RESPONSE);
};

export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  console.log('API: Mock Register Bypass');
  return Promise.resolve(MOCK_AUTH_RESPONSE);
};

export const getMe = async (): Promise<User> => {
  console.log('API: Mock Me Bypass');
  return Promise.resolve(MOCK_USER);
};

export const savePlan = async (plan: ExperiencePlan): Promise<{ status: string; id: string }> => {
  console.log('API: Mock Save Plan');
  const newPlan = { ...plan, id: 'mock-plan-' + Date.now() };
  MOCKED_PLANS.unshift(newPlan);
  return Promise.resolve({ status: 'saved', id: newPlan.id });
};

export const getSavedPlans = async (): Promise<ExperiencePlan[]> => {
  console.log('API: Mock Get Saved Plans');
  return Promise.resolve(MOCKED_PLANS);
};
