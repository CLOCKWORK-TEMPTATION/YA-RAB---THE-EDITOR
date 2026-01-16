// src/systems/scoring/init.ts
// ============================================
// Scoring System Initialization
//
// This module initializes the ScoringSystem with the
// required classifier helper functions.
//
// IMPORTANT: This must be called once at application startup
// before using any ScoringSystem functions.

import { setClassifierHelpers } from "./ScoringSystem";
import { classifierHelpers } from "../../nlp/classifierHelpers";

let initialized = false;

/**
 * Initialize the ScoringSystem with classifier helpers
 * This should be called once at application startup
 *
 * @example
 * import { initScoringSystem } from '@/systems/scoring/init';
 *
 * // In your app initialization or main component:
 * initScoringSystem();
 */
export function initScoringSystem(): void {
  if (initialized) {
    // Already initialized, skip
    return;
  }

  setClassifierHelpers(classifierHelpers);
  initialized = true;
}

/**
 * Check if the ScoringSystem has been initialized
 */
export function isScoringSystemInitialized(): boolean {
  return initialized;
}

/**
 * Reset the initialization state (useful for testing)
 * WARNING: This should NOT be used in production code
 */
export function _resetScoringSystemInitialization(): void {
  initialized = false;
}

// Auto-initialize on import (for convenience)
initScoringSystem();
