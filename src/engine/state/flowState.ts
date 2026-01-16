// src/engine/state/flowState.ts
// =============================
// Flow State (Minimal)
//
// Responsibilities:
// - Track previous classified types
// - Expose last non-blank type
//
// NO dialogue management
// NO scene management
// NO parsing
// NO flow logic
// NO side effects

export interface FlowState {
  previousTypes: (string | null)[];
}

export function createInitialFlowState(): FlowState {
  return {
    previousTypes: [],
  };
}

/**
 * Appends a classified type to the flow state.
 */
export function appendType(
  state: FlowState,
  type: string | null,
): void {
  state.previousTypes.push(type);
}

/**
 * Returns the last non-blank type from the flow state.
 */
export function getLastNonBlankType(
  state: FlowState,
): string | null {
  for (let i = state.previousTypes.length - 1; i >= 0; i--) {
    const t = state.previousTypes[i];
    if (t && t !== "blank") {
      return t;
    }
  }
  return null;
}