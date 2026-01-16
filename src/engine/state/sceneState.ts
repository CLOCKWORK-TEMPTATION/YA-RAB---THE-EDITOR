// src/engine/state/sceneState.ts
// ==============================
// Scene State Management
//
// Responsibilities:
// - Open new scenes on scene headers
// - Close scenes on transitions or EOF
// - Track scene metadata
//
// NO parsing
// NO classification
// NO flow logic
// NO dialogue management

export interface SceneBlock {
  type: "scene";
  start: number;
  end: number | null;
  number: string | null;
  location: string | null;
  time: string | null;
  photomontage: boolean;
  remainingAction: string | null;
}

export interface SceneState {
  currentScene: SceneBlock | null;
  sceneHeaderContinues: boolean;
}

export function createInitialSceneState(): SceneState {
  return {
    currentScene: null,
    sceneHeaderContinues: false,
  };
}

/**
 * Opens a new scene when a scene header is detected.
 * Closes any previously open scene.
 */
export function openScene(
  state: SceneState,
  sceneHeader: {
    number: string | null;
    location: string | null;
    time: string | null;
    photomontage: boolean;
    remainder?: string | null;
  },
  index: number,
  scenes: SceneBlock[],
): void {
  if (state.currentScene) {
    if (!state.currentScene.end) {
      state.currentScene.end = index - 1;
    }
    scenes.push(state.currentScene);
  }

  state.currentScene = {
    type: "scene",
    start: index,
    end: null,
    number: sceneHeader.number,
    location: sceneHeader.location,
    time: sceneHeader.time,
    photomontage: sceneHeader.photomontage,
    remainingAction: sceneHeader.remainder?.trim() || null,
  };

  state.sceneHeaderContinues = false;
}

/**
 * Continues scene header remainder across lines.
 */
export function continueSceneHeader(
  state: SceneState,
  rawLine: string,
): void {
  if (state.currentScene && state.currentScene.remainingAction !== null) {
    state.currentScene.remainingAction += " " + rawLine.trim();
  }
}

/**
 * Closes the current scene when a transition is encountered.
 */
export function closeSceneOnTransition(
  state: SceneState,
  index: number,
  scenes: SceneBlock[],
): void {
  if (state.currentScene) {
    if (!state.currentScene.end) {
      state.currentScene.end = index - 1;
    }
    scenes.push(state.currentScene);
    state.currentScene = null;
  }
}

/**
 * Finalizes any open scene at end of file.
 */
export function finalizeSceneAtEOF(
  state: SceneState,
  lastIndex: number,
  scenes: SceneBlock[],
): void {
  if (state.currentScene) {
    if (!state.currentScene.end) {
      state.currentScene.end = lastIndex;
    }
    scenes.push(state.currentScene);
    state.currentScene = null;
  }
}
