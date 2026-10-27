// Mirrors the backend API (backend/src/common/domain, analysis, attempts, scores).

export interface NoteEvent {
  pitch: number
  onset: number
  duration: number
  velocity?: number
}

export interface ScoreNote extends NoteEvent {
  measure: number
  beat: number
}

export type ErrorType = 'missed' | 'extra' | 'wrong_pitch' | 'early' | 'late'

export interface PerformanceError {
  type: ErrorType
  measure: number
  beat: number
  expectedPitch?: number
  playedPitch?: number
  deviationMs?: number
}

export interface MeasureReport {
  measure: number
  notes: number
  accuracy: number
  errors: number
}

export interface AnalysisResult {
  accuracy: number
  pitchAccuracy: number
  timingAccuracy: number
  counts: {
    referenceNotes: number
    correct: number
    wrongPitch: number
    missed: number
    extra: number
    early: number
    late: number
    ignoredNoise: number
  }
  tempo: { referenceBpm: number; playedBpm: number }
  errors: PerformanceError[]
  measures: MeasureReport[]
  problemMeasures: number[]
}

export interface ScoreSummary {
  id: string
  title: string
  composer: string | null
  tempoBpm: number
  measures: number
}

export interface ScoreDetails extends ScoreSummary {
  beatsPerMeasure: number
  notes: ScoreNote[]
}

export interface AttemptSummary {
  id: string
  scoreId: string
  scoreTitle: string
  createdAt: string
  accuracy: number
  errorCount: number
}

export interface Recommendation {
  title: string
  detail: string
  measures: number[]
}

export interface PracticeStep {
  title: string
  detail: string
  measures?: { from: number; to: number }
  tempoBpm?: number
}

export interface Feedback {
  summary: string
  /** One explanation per entry of analysis.errors, same order. */
  errorMessages: string[]
  recommendations: Recommendation[]
  practicePlan: PracticeStep[]
}

export interface AttemptDetails extends AttemptSummary {
  analysis: AnalysisResult
  feedback: Feedback
  performed: NoteEvent[]
}
