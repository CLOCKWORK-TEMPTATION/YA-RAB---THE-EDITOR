// src/editor/handlers/index.ts
// ===========================
// Editor Handlers Exports
// منقول من THEEditor.tsx (المرحلة 4 - UI Glue)

// Search handlers
export { createHandleSearch } from "./searchHandlers";

// Replace handlers
export { createHandleReplace, createHandleCharacterRename } from "./replaceHandlers";

// Keyboard handlers
export { createHandleKeyDown } from "./keyboardHandlers";

// AI handlers
export { createHandleAIReview } from "./aiHandlers";

// Navigation handlers (preserved from existing)
export { createNavigationHandlers } from "./navigationHandlers";
export type { NavigationHandlers } from "./navigationHandlers";
