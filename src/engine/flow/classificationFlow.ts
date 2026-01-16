// src/engine/flow/classificationFlow.ts
// ====================================
// Classification Flow (Coordinator-only)
//
// Responsibilities:
// - Call classifiers in fixed order
// - Pass context (DialogueBlockInfo, lastNonBlankType)
// - Stop at first valid classification
// - Apply break rules
// - Apply fallback when needed
//
// NO parsing
// NO state mutation
// NO scoring
// NO side effects

import { isBasmala } from "../classifier/basmala";
import { isTransition } from "../classifier/transition";
import { isParenthetical } from "../classifier/parenthetical";
import { isCharacter } from "../classifier/character";
import { isDialogue } from "../classifier/dialogue";
import { isAction } from "../classifier/action";
import { isSceneHeader } from "../classifier/sceneHeader";

import {
  getDialogueBlockInfo,
  shouldBreakClassification,
} from "./breakRules";

import { getFallbackType } from "./fallbackRules";

// =============================
// Public API
// =============================

export function classifyLine(
  rawLine: string,
  previousTypes: (string | null)[],
  index: number,
): string {
  const dialogueBlockInfo = getDialogueBlockInfo(previousTypes, index);

  const lastNonBlankType =
    [...previousTypes].reverse().find((t) => t && t !== "blank") || null;

  // 1) Basmala
  if (isBasmala(rawLine)) {
    return "basmala";
  }

  // 2) Scene Header (classification only)
  if (isSceneHeader(rawLine)) {
    return "scene-header-top-line";
  }

  // 3) Transition
  if (isTransition(rawLine)) {
    return "transition";
  }

  // 4) Parenthetical
  if (isParenthetical(rawLine)) {
    return "parenthetical";
  }

  // 5) Character
  if (
    isCharacter(rawLine, {
      isInDialogueBlock: dialogueBlockInfo.isInDialogueBlock,
      lastNonBlankType,
    })
  ) {
    return "character";
  }

  // 6) Dialogue
  if (isDialogue(rawLine, dialogueBlockInfo)) {
    return "dialogue";
  }

  // 7) Action
  if (isAction(rawLine, dialogueBlockInfo)) {
    return "action";
  }

  // 8) Fallback
  return getFallbackType();
}
