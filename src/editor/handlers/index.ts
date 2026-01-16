// src/editor/handlers/index.ts
// ===========================
// Editor Handlers Exports
// منقول من THEEditor.tsx (المرحلة 4 - UI Glue)

// Search handlers (سطر 8481-8503)
export { createHandleSearch } from "./searchHandlers";

// Replace handlers (سطر 8309-8476)
export { createHandleReplace, createHandleCharacterRename } from "./replaceHandlers";

// Keyboard handlers (سطر 8357-8431)
export { createHandleKeyDown } from "./keyboardHandlers";

// AI handlers (سطر 8246-8307)
export { createHandleAIReview } from "./aiHandlers";
