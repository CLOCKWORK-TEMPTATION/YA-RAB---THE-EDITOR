// src/editor/handlers/replaceHandlers.ts
// ======================================
// Replace Handlers from THEEditor.tsx (Lines 8309-8352, 8433-8476)
//
// Responsibilities:
// - Handle replace operations
// - Handle character rename operations
//
// منقول 1:1 من THEEditor.tsx
// NO search logic
// NO state persistence

import type React from "react";
import type { AdvancedSearchEngine } from "../../systems/state/AdvancedSearchEngine";
import { applyRegexReplacementToTextNodes } from "../../../modules/domTextReplacement";

/**
 * @function createHandleCharacterRename
 * @description معالج إعادة تسمية الشخصيات
 * منقول 1:1 من THEEditor.tsx (سطر 8312-8352)
 */
export const createHandleCharacterRename = (
  oldCharacterName: string,
  newCharacterName: string,
  editorRef: React.RefObject<HTMLDivElement | null>,
  updateContent: () => void,
  setShowCharacterRename: (show: boolean) => void,
  setOldCharacterName: (name: string) => void,
  setNewCharacterName: (name: string) => void,
) => {
  return () => {
    if (!oldCharacterName.trim() || !newCharacterName.trim() || !editorRef.current) return;

    const regex = new RegExp(`^\\s*${oldCharacterName}\\s*$`, "gmi");

    if (editorRef.current) {
      const replacementsApplied = applyRegexReplacementToTextNodes(
        editorRef.current,
        regex.source,
        regex.flags,
        newCharacterName.toUpperCase(),
        true,
      );

      if (replacementsApplied > 0) {
        updateContent();
        alert(
          `تم إعادة تسمية الشخصية "${oldCharacterName}" إلى "${newCharacterName}" (${replacementsApplied} حالة)`,
        );
        setShowCharacterRename(false);
        setOldCharacterName("");
        setNewCharacterName("");
      } else {
        alert(`لم يتم العثور على الشخصية "${oldCharacterName}" لإعادة تسميتها.`);
        setShowCharacterRename(false);
      }
    }
  };
};

/**
 * @function createHandleReplace
 * @description معالج الاستبدال في المحتوى
 * منقول 1:1 من THEEditor.tsx (سطر 8436-8476)
 */
export const createHandleReplace = (
  searchTerm: string,
  replaceTerm: string,
  editorRef: React.RefObject<HTMLDivElement | null>,
  searchEngine: React.MutableRefObject<AdvancedSearchEngine>,
  updateContent: () => void,
  setShowReplaceDialog: (show: boolean) => void,
  setSearchTerm: (term: string) => void,
  setReplaceTerm: (term: string) => void,
) => {
  return async () => {
    if (!searchTerm.trim() || !editorRef.current) return;

    const content = editorRef.current.innerText;
    const result = await searchEngine.current.replaceInContent(content, searchTerm, replaceTerm);

    if (result.success && editorRef.current) {
      const replacementsApplied = applyRegexReplacementToTextNodes(
        editorRef.current,
        result.patternSource as string,
        result.patternFlags as string,
        result.replaceText as string,
        result.replaceAll !== false,
      );

      if (replacementsApplied > 0) {
        updateContent();
      }

      alert(`تم استبدال ${replacementsApplied} حالة من "${searchTerm}" بـ "${replaceTerm}"`);
      setShowReplaceDialog(false);
      setSearchTerm("");
      setReplaceTerm("");
    } else {
      alert(`فشل الاستبدال: ${result.error}`);
    }
  };
};
