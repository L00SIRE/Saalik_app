export type ExperienceTheme = 'religious' | 'scenic' | 'culture' | 'adventure' | 'wellness';

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
  theme: ExperienceTheme;
  headline: string;
  summary: string;
  soundtrack: string;
  highlights: ExperienceHighlight[];
  dayPlan: DayPlan[];
}

export interface ChatTurn {
  role: 'user' | 'guide';
  message: string;
}
