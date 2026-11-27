export type LessonId = 'w00-overview' | 'w01-p1' | 'w01-p2' | 'w01-p3' | 'w01-p4';

export type InspectorTabId = 'quiz' | 'step' | 'deepdive' | 'lab';

export type GlossaryCategoryId =
  | 'basics'
  | 'w01-p1'
  | 'w01-p2'
  | 'w01-p3'
  | 'w01-p4'
  | 'overview';

export interface GlossaryTerm {
  id: string;
  term: string;
  subtitle?: string;
  category: GlossaryCategoryId;
  lessons: LessonId[];
  aliases?: string[];
  summary: string;
  analogy: string;
  examPoint: string;
  relatedIds?: string[];
}

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

export interface ConsoleScreenAnnotation {
  label: string;
  detail: string;
}

export interface ConsoleScreenRef {
  id: string;
  title: string;
  menuPath: string;
  consoleUrl: string;
  /** Relative path served from app/public (set once captured and masked). */
  imagePath?: string;
  /** Target output file path inside the repository for /browser capture. */
  expectedFile: string;
  width?: number;
  height?: number;
  caption: string;
  lookFor: ConsoleScreenAnnotation[];
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

export interface LessonStoryBridge {
  nextLessonId?: LessonId;
  nextLabel: string;
  teaser: string;
}

export interface LessonStory {
  episodeLabel: string;
  hookTitle: string;
  request: string;
  goal: string;
  challenge: string;
  nextBridge?: LessonStoryBridge;
}

export interface LessonData {
  id: LessonId;
  week: number;
  part: number;
  domain: '全体像' | 'IAM' | 'Auth' | 'Hierarchy' | 'FinOps';
  shortTitle: string;
  title: string;
  tagline: string;
  story: LessonStory;
  visualTypeLabel: string;
  estimatedMinutes: number;
  examQuiz: QuizQuestion;
  thinkingChart: { label: string; detail: string }[];
  deepDiveParagraphs: { heading: string; body: string; callout?: string }[];
  miniQuiz: MiniQuiz;
  flipCondition: string;
  docLinks: DocLink[];
  consoleScreens?: ConsoleScreenRef[];
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
