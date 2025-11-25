export type ExperienceTheme = 'religious' | 'scenic' | 'culture' | 'adventure' | 'wellness';

export interface ExperienceInput {
  name?: string;
  intent: string;
  mood?: string[];
  partySize?: number;
  travelMonth?: string;
  pace?: 'slow' | 'balanced' | 'fast';
  mustSee?: string[];
  avoid?: string[];
}

export interface ExperienceHighlight {
  title: string;
  description: string;
  whyItWorks: string;
}

export interface DayPlan {
  day: string;
  focus: string;
  details: string[];
}

export interface ExperiencePlan {
  headline: string;
  summary: string;
  soundtrack: string;
  highlights: ExperienceHighlight[];
  dayPlan: DayPlan[];
  theme: ExperienceTheme;
}

export interface ChatTurn {
  role: 'user' | 'guide';
  message: string;
}
