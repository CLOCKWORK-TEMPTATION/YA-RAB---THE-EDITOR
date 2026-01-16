// src/systems/formatter/FormatterDependencies.ts
import { ViterbiState } from "../../types";

export interface ClassifiedLine {
    text: string;
    type: string;
}

export interface ScreenplayClassifierAdapter {
    classifyBatch(text: string, quick: boolean): ClassifiedLine[];
    applyEnterSpacingRules(lines: ClassifiedLine[]): ClassifiedLine[];
    parseSceneHeaderFromLine(text: string): { sceneNum: string; timeLocation: string } | null;
}

export interface FormatterStylesAdapter {
    getFormatStyles(type: string): Partial<CSSStyleDeclaration>;
}

// In a real application, these would be implemented by importing from the engine.
// Since we cannot modify engine/** or import THEEditor.tsx, we define the interface here.
// The consumer of SmartFormatter must ensure these are available or mocked.

// We will use a singleton or a way to inject these dependencies.
// For the purpose of this refactor, we will assume they are provided.

let classifierAdapter: ScreenplayClassifierAdapter | null = null;
let stylesAdapter: FormatterStylesAdapter | null = null;

export function setClassifierAdapter(adapter: ScreenplayClassifierAdapter) {
    classifierAdapter = adapter;
}

export function setStylesAdapter(adapter: FormatterStylesAdapter) {
    stylesAdapter = adapter;
}

export function getClassifierAdapter(): ScreenplayClassifierAdapter {
    if (!classifierAdapter) {
        throw new Error("ScreenplayClassifierAdapter not set. Call setClassifierAdapter first.");
    }
    return classifierAdapter;
}

export function getStylesAdapter(): FormatterStylesAdapter {
    if (!stylesAdapter) {
        throw new Error("FormatterStylesAdapter not set. Call setStylesAdapter first.");
    }
    return stylesAdapter;
}
