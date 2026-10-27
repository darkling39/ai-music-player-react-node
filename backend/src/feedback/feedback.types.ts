import type { AnalysisResult } from '../analysis/analysis.types.js';

export interface Recommendation {
  title: string;
  detail: string;
  /** Measures the advice is about, if it is tied to specific places. */
  measures: number[];
}

export interface PracticeStep {
  title: string;
  detail: string;
  measures?: { from: number; to: number };
  tempoBpm?: number;
}

export interface Feedback {
  summary: string;
  /** One plain-language explanation per entry of `analysis.errors`, in the same order. */
  errorMessages: string[];
  recommendations: Recommendation[];
  practicePlan: PracticeStep[];
}

/**
 * Turns a structured analysis into text for the learner. An abstract class doubles as the Nest
 * injection token, so another implementation (e.g. a local LLM) can be swapped in by changing
 * one provider.
 */
export abstract class FeedbackGenerator {
  abstract generate(analysis: AnalysisResult): Feedback;
}
