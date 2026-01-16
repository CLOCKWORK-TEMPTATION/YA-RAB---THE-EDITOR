// src/types/index.ts
// Type definitions extracted from THEEditor.tsx
// 1:1 migration - exact types preserved

/**
 * Viterbi States - all possible screenplay line types
 */
export type ViterbiState =
  | "scene-header-top-line"
  | "scene-header-1"
  | "scene-header-2"
  | "scene-header-3"
  | "action"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "transition"
  | "basmala"
  | "blank";

/**
 * All Viterbi states as an array
 */
export const ALL_STATES: ViterbiState[] = [
  "scene-header-top-line",
  "scene-header-1",
  "scene-header-2",
  "scene-header-3",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "basmala",
  "blank",
];

/**
 * Line Context - provides information about surrounding lines
 */
export interface LineContext {
  prevLine: string | null;
  nextLine: string | null;
  prevNonBlank: string | null;
  nextNonBlank: string | null;
  position: "start" | "middle" | "end";
  previousLines: { text: string; type: string }[];
  nextLines: { text: string; type: string }[];
  stats: {
    currentLineLength: number;
    currentWordCount: number;
    nextLineLength?: number;
    nextWordCount?: number;
    hasPunctuation: boolean;
    nextHasPunctuation?: boolean;
  };
}

/**
 * Classification Score - score details for a line
 */
export interface ClassificationScore {
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
}

/**
 * Classification Result - full classification result for a line
 */
export interface ClassificationResult {
  type: string;
  confidence: "high" | "medium" | "low";
  scores: { [type: string]: ClassificationScore };
  context: LineContext;
  doubtScore: number;
  needsReview: boolean;
  top2Candidates: [CandidateType, CandidateType] | null;
  fallbackApplied?: { originalType: string; fallbackType: string; reason: string } | undefined;
  multiDimensionalConfidence?: MultiDimensionalConfidence;
}

/**
 * Candidate Type - a candidate classification with details
 */
export interface CandidateType {
  type: string;
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
}

/**
 * Multi-Dimensional Confidence - advanced confidence calculation
 */
export interface MultiDimensionalConfidence {
  overall: number;
  context: number;
  pattern: number;
  history: number;
  alternatives: Array<{ type: string; score: number }>;
  isUncertain: boolean;
  explanation: string;
}

/**
 * Batch Classification Result - result for a single line in batch
 */
export interface BatchClassificationResult {
  text: string;
  type: string;
  confidence: "high" | "medium" | "low";
  doubtScore: number;
  needsReview: boolean;
  top2Candidates?: [CandidateType, CandidateType];
  fallbackApplied?: { originalType: string; fallbackType: string; reason: string };
}

/**
 * Reviewable Line UI - line that needs review
 */
export interface ReviewableLineUI {
  type: string;
  lineIndex: number;
  index: number;
  text: string;
  currentType: string;
  doubtScore: number;
  suggestedTypes: Array<{
    type: string;
    score: number;
    reasons: string[];
  }>;
  fallbackApplied?: { originalType: string; fallbackType: string; reason: string };
}

/**
 * Classified Line - a line with classification
 */
export interface ClassifiedLine {
  lineNumber: number;
  text: string;
  currentType: string;
  suggestedType?: string;
  confidence?: string;
  reasoning?: string;
  _reviewInfo?: {
    originalType: string;
    confidence: number;
    reason: string;
  };
  doubtScore?: number;
  emissionScore?: number;
}

/**
 * Script - full screenplay script
 */
export interface Script {
  id: string;
  title: string;
  scenes: Scene[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Scene - a scene in the screenplay
 */
export interface Scene {
  id: string;
  sceneNumber: number;
  lines: Array<SceneActionLine | DialogueLine>;
}

/**
 * Character - a character in the screenplay
 */
export interface Character {
  id: string;
  name: string;
  appearances: number;
}

/**
 * Dialogue Line - a dialogue line
 */
export interface DialogueLine {
  type: "dialogue";
  character: string;
  text: string;
}

/**
 * Scene Action Line - an action line
 */
export interface SceneActionLine {
  type: "action";
  text: string;
}
