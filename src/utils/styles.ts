// src/utils/styles.ts
// ====================
// Format Styles Utilities
//
// Responsibilities:
// - Provide CSS styles for different screenplay format types
// - Centralized style definitions for consistency

import type React from "react";

/**
 * Default screenplay formatting styles
 * Based on standard industry screenplay format (Courier 12pt)
 */
const FORMAT_STYLES: Record<string, React.CSSProperties> = {
  "scene-header-top-line": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: "12pt",
    marginBottom: "6pt",
    textTransform: "uppercase",
  },
  "scene-header-1": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  "scene-header-2": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    fontWeight: "normal",
  },
  "scene-header-3": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    textAlign: "center",
    marginTop: "6pt",
    marginBottom: "6pt",
    textTransform: "uppercase",
  },
  "action": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    maxWidth: "60ch",
    marginTop: "6pt",
    marginBottom: "6pt",
  },
  "character": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    textAlign: "center",
    marginTop: "12pt",
    marginBottom: "0pt",
    textTransform: "uppercase",
  },
  "dialogue": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    maxWidth: "35ch",
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: "0pt",
    marginBottom: "6pt",
  },
  "parenthetical": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    maxWidth: "25ch",
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: "0pt",
    marginBottom: "0pt",
  },
  "transition": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    textAlign: "right",
    marginTop: "6pt",
    marginBottom: "6pt",
    textTransform: "uppercase",
  },
  "basmala": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    textAlign: "center",
    marginTop: "12pt",
    marginBottom: "6pt",
  },
  "blank": {
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "12pt",
    marginTop: "6pt",
    marginBottom: "6pt",
  },
};

/**
 * Get format styles for a specific type
 * @param formatType - The format type to get styles for
 * @returns CSS properties for the format type
 */
export function getFormatStyles(formatType: string): React.CSSProperties {
  return FORMAT_STYLES[formatType] || FORMAT_STYLES["action"];
}

/**
 * Get all format styles
 * @returns All format styles
 */
export function getAllFormatStyles(): Record<string, React.CSSProperties> {
  return { ...FORMAT_STYLES };
}

/**
 * Set custom format styles for a specific type
 * @param formatType - The format type to set styles for
 * @param styles - The CSS properties to set
 */
export function setFormatStyles(formatType: string, styles: React.CSSProperties): void {
  FORMAT_STYLES[formatType] = styles;
}
