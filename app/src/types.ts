export type LessonId = 'w00-overview' | 'w01-p1' | 'w01-p2' | 'w01-p3' | 'w01-p4';

export type InspectorTabId = 'quiz' | 'step' | 'deepdive' | 'lab';

export interface QuizChoice {
  id: string;
  label: string;
  text: string;
  correct: boolean;
  rationale: string;
}

export interface QuizQuestion {
  title: string;
  scenario: string;
  choices: QuizChoice[];
  summary: string;
}

export interface MiniQuiz {
  prompt: string;
  answer: string;
}

export interface DocLink {
  label: string;
  url: string;
}

export interface StepInsight {
  stepNumber: number;
  totalSteps: number;
  badge: string;
  title: string;
  subtitle: string;
  explanation: string;
  kvPairs: { label: string; value: string; tone?: 'neutral' | 'allow' | 'deny' | 'warn' | 'info' }[];
  payloadTitle?: string;
  payloadJson?: string;
}

export interface LessonData {
  id: LessonId;
  week: number;
  part: number;
  domain: '全体像' | 'IAM' | 'Auth' | 'Hierarchy' | 'FinOps';
  shortTitle: string;
  title: string;
  tagline: string;
  visualTypeLabel: string;
  estimatedMinutes: number;
  examQuiz: QuizQuestion;
  thinkingChart: { label: string; detail: string }[];
  deepDiveParagraphs: { heading: string; body: string; callout?: string }[];
  miniQuiz: MiniQuiz;
  flipCondition: string;
  docLinks: DocLink[];
  ankiCardIds: string[];
  labPredictionPrompt: string;
}

export interface RoadmapPreviewWeek {
  week: number;
  stage: string;
  title: string;
  topics: string;
  status: 'active' | 'upcoming';
}
