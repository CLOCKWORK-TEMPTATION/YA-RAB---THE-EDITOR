// src/engine/flow/fallbackRules.ts
// ================================
// Fallback Rules (Flow-only)
//
// Responsibilities:
// - Decide what to do when no classifier matches
//
// NO classification
// NO state mutation
// NO flow orchestration
// NO side effects

/**
 * Determines fallback type when no classifier succeeds.
 * This mirrors the monolith behavior: choose a safe default.
 */
export function getFallbackType(): string {
  // In the original logic, unresolved lines
  // tend to fall back to Action-like behavior.
  return "action";
}
