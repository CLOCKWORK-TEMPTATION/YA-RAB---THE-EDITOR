// src/engine/engine.ts
// ====================
// Engine Orchestrator
//
// Responsibilities:
// - Coordinate parser → flow → classifier → state → finalizer
//
// NO parsing logic
// NO classification logic
// NO state logic
// NO flow logic
// NO side effects

import { parseLines } from "./parser/lineParser";
import { classifyLine } from "./flow/classificationFlow";
import { createInitialFlowState, appendType } from "./state/flowState";
import { closeOpenBlocks } from "./finalizer/closeOpenBlocks";

// ====================
// Types
// ====================

export interface EngineLine {
  text: string;
  type: string;
}

// ====================
// Public API
// ====================

export function runEngine(text: string): EngineLine[] {
  const parsedUnits = parseLines(text);

  const flowState = createInitialFlowState();

  const result: EngineLine[] = [];
  const pendingBlanks: EngineLine[] = [];

  for (let i = 0; i < parsedUnits.length; i++) {
    const unit = parsedUnits[i];

    // 1) Blank lines are buffered
    if (unit.kind === "blank") {
      pendingBlanks.push({
        text: unit.raw,
        type: "blank",
      });
      appendType(flowState, "blank");
      continue;
    }

    // Flush pending blanks before any non-blank
    if (pendingBlanks.length > 0) {
      result.push(...pendingBlanks);
      pendingBlanks.length = 0;
    }

    // 2) Scene Header (already parsed & consumed)
    if (unit.kind === "scene-header") {
      result.push({
        text: unit.rawLines.join("\n"),
        type: "scene-header",
      });

      appendType(flowState, "scene-header-top-line");
      continue;
    }

    // 3) Character / Dialogue / Raw line
    const type = classifyLine(
      unit.raw,
      flowState.previousTypes,
      i,
    );

    result.push({
      text: unit.raw,
      type,
    });

    appendType(flowState, type);
  }

  // 4) End-of-file finalization
  return closeOpenBlocks(result, pendingBlanks);
}
