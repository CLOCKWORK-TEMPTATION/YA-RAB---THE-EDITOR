// engine/parser/lineParser.ts
// ===========================
// Line Parser (Parser-only)
//
// Responsibilities:
// - Split text into lines
// - Detect blank lines
// - Consume Scene Header blocks via sceneHeaderParser
// - Detect inline Character: Dialogue
// - Detect bullet Character: Dialogue
// - Emit raw parsed units without classification or state
//
// NO classification
// NO flow control
// NO state management
// NO orchestration

// ===========================
// Parsed Unit Types
// ===========================

export type ParsedLineUnit =
  | {
      kind: "blank";
      index: number;
      raw: string;
    }
  | {
      kind: "scene-header";
      startIndex: number;
      consumedLines: number;
      rawLines: string[];
      sceneNum: string;
      timeLocation: string;
      place: string;
      remainingAction?: string;
    }
  | {
      kind: "character";
      index: number;
      raw: string;
      name: string;
    }
  | {
      kind: "dialogue";
      index: number;
      raw: string;
      text: string;
      characterName?: string;
    }
  | {
      kind: "line";
      index: number;
      raw: string;
      text: string;
    };

// ===========================
// Public API
// ===========================

export function parseLines(
  text: string,
): ParsedLineUnit[] {
  const lines = splitLines(text);
  const units: ParsedLineUnit[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";

    // 1. Blank line
    if (isBlank(raw)) {
      units.push({
        kind: "blank",
        index: i,
        raw,
      });
      continue;
    }

    // 2. Scene Header (multi-line consumption)
    const sceneHeader = extractSceneHeaderParts(lines, i);
    if (sceneHeader) {
      units.push({
        kind: "scene-header",
        startIndex: i,
        consumedLines: sceneHeader.consumedLines,
        rawLines: lines.slice(i, i + sceneHeader.consumedLines),
        sceneNum: sceneHeader.sceneNum,
        timeLocation: sceneHeader.timeLocation,
        place: sceneHeader.place,
        ...(sceneHeader.remainingAction
          ? { remainingAction: sceneHeader.remainingAction }
          : {}),
      });

      i += sceneHeader.consumedLines - 1;
      continue;
    }

    // 3. Inline Character: Dialogue
    const inline = parseInlineCharacterDialogue(raw);
    if (inline) {
      units.push({
        kind: "character",
        index: i,
        raw,
        name: inline.characterName,
      });

      units.push({
        kind: "dialogue",
        index: i,
        raw,
        text: inline.dialogueText,
        characterName: inline.characterName,
      });

      continue;
    }

    // 4. Bullet Character: Dialogue
    const bullet = parseBulletCharacterDialogue(raw);
    if (bullet) {
      units.push({
        kind: "character",
        index: i,
        raw,
        name: bullet.characterName,
      });

      if (bullet.dialogueText) {
        units.push({
          kind: "dialogue",
          index: i,
          raw,
          text: bullet.dialogueText,
          characterName: bullet.characterName,
        });
      }

      continue;
    }

    // 5. Fallback raw line
    units.push({
      kind: "line",
      index: i,
      raw,
      text: raw.trim(),
    });
  }

  return units;
}

// ===========================
// Inline Parsing Helpers
// ===========================

function parseInlineCharacterDialogue(
  line: string,
): { characterName: string; dialogueText: string } | null {
  const trimmed = line.trim();
  const match = trimmed.match(/^([^:：]{1,60})\s*[:：]\s*(.+)$/);
  if (!match) return null;

  const characterName = match[1].trim();
  const dialogueText = match[2].trim();

  if (!characterName || !dialogueText) return null;
  if (wordCount(characterName) > 7) return null;

  return { characterName, dialogueText };
}

function parseBulletCharacterDialogue(
  line: string,
): { characterName: string; dialogueText: string } | null {
  const trimmed = line.trim();
  const match = trimmed.match(
    /^[\u200E\u200F\u061C\uFEFF\s]*[•●\-\*\+☒☐]\s*([^:：]+?)\s*[:：]\s*(.*)$/u,
  );
  if (!match) return null;

  const characterName = match[1].trim();
  const dialogueText = match[2].trim();

  if (!characterName) return null;

  return { characterName, dialogueText };
}

// ===========================
// Scene Header Parser Hook
// ===========================
// NOTE: This function is expected to exist in the same layer.
// No imports by design.

declare function extractSceneHeaderParts(
  lines: string[],
  startIndex: number,
): {
  sceneNum: string;
  timeLocation: string;
  place: string;
  consumedLines: number;
  remainingAction?: string;
} | null;

// ===========================
// Utilities (Local Only)
// ===========================

function splitLines(text: string): string[] {
  return (text ?? "").split(/\r?\n/);
}

function isBlank(line: string): boolean {
  return !line || line.trim() === "";
}

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}
