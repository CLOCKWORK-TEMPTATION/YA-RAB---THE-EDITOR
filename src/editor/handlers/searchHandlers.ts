// src/editor/handlers/searchHandlers.ts
// =====================================
// Search Handlers from THEEditor.tsx (Lines 8478-8503)
//
// Responsibilities:
// - Handle search operations
// - Navigate search results
//
// منقول 1:1 من THEEditor.tsx
// NO classification logic
// NO state persistence

import type React from "react";
import type { AdvancedSearchEngine } from "../../systems/state/AdvancedSearchEngine";

/**
 * @function createHandleSearch
 * @description معالج البحث في المحتوى
 * منقول 1:1 من THEEditor.tsx (سطر 8481-8503)
 */
export const createHandleSearch = (
  searchTerm: string,
  editorRef: React.RefObject<HTMLDivElement | null>,
  searchEngine: React.MutableRefObject<AdvancedSearchEngine>,
  setShowSearchDialog: (show: boolean) => void,
) => {
  return async () => {
    if (!searchTerm.trim() || !editorRef.current) return;

    const content = editorRef.current.innerText;
    const result = await searchEngine.current.searchInContent(content, searchTerm);

    if (result.success) {
      alert(`تم العثور على ${result.totalMatches} نتيجة لـ "${searchTerm}"`);
      setShowSearchDialog(false);
    } else {
      alert(`فشل البحث: ${result.error}`);
    }
  };
};
