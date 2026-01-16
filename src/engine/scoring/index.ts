// src/engine/scoring/index.ts
// Scoring System Module - 1:1 Migration from THEEditor.tsx
// This module contains the complete scoring logic for screenplay line classification

export {
  // Main scoring functions
  scoreAsCharacter,
  scoreAsDialogue,
  scoreAsAction,
  scoreAsParenthetical,
  scoreAsSceneHeader,

  // Helper functions
  adjustDoubtForDash,
  calculateDoubtScore,
  extractTop2Candidates,
  applySmartFallback,

  // Classification functions
  classifyWithScoring,
  classifyBatchDetailed,

  // Utility functions
  getReviewableLines,
  getDoubtStatistics,

  // Quick classification helpers
  isBasmala,
  isSceneHeader1,
  isParenShapedStatic,
  buildEmptyContext,
} from "./ScoringSystem";

export type {
  // Options interfaces
  ClassifyWithScoringOptions,
  BatchClassificationResult,
  ReviewableLineUI,

  // Adaptive system interface (for future connection)
  AdaptiveClassificationSystem,
} from "./ScoringSystem";

// Re-export types from the main types file
export type {
  LineContext,
  ClassificationScore,
  ClassificationResult,
  CandidateType,
  ViterbiState,
} from "../../types";
