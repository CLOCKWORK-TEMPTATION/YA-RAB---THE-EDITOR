// src/editor/agents/index.ts
// =========================
// Editor Agents Exports
// منقول من THEEditor.tsx (المرحلة 4 - UI Glue)

export {
  SceneHeaderAgent,
  buildSceneHeaderDOM,
  ScreenplayClassifier,
  VERB_RE,
} from "./SceneHeaderAgent";

export type {
  ParsedSceneHeader,
  SceneHeaderContext,
  SceneHeaderAgentResult,
} from "./SceneHeaderAgent";
