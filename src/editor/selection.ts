// src/editor/selection.ts
export interface SelectionRange {
  start: number;
  end: number;
}

export interface Selection {
  line: number;
  range: SelectionRange;
}

export function createSelection(line: number, start: number, end: number): Selection {
  return {
    line,
    range: { start, end }
  };
}

export function isEmptySelection(selection: Selection): boolean {
  return selection.range.start === selection.range.end;
}