// src/editor/cursor.ts
export interface CursorPosition {
  line: number;
  column: number;
}

export function createCursor(line: number, column: number): CursorPosition {
  return { line, column };
}

export function moveCursor(cursor: CursorPosition, deltaLine: number, deltaColumn: number): CursorPosition {
  return {
    line: Math.max(0, cursor.line + deltaLine),
    column: Math.max(0, cursor.column + deltaColumn)
  };
}

export function isSamePosition(a: CursorPosition, b: CursorPosition): boolean {
  return a.line === b.line && a.column === b.column;
}