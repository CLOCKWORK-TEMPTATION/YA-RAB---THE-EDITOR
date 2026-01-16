// src/utils/css.ts
// ================
// CSS Utilities
// منقول 1:1 من THEEditor.tsx (الأسطر 489-500)
//
// Responsibilities:
// - Convert CSS objects to strings
// - Handle CSS-in-JS utilities

import type React from "react";

/**
 * @function cssObjectToString
 * @description تحويل كائن CSS styles إلى string
 * منقول 1:1 من THEEditor.tsx
 */
export const cssObjectToString = (styles: React.CSSProperties): string => {
  return Object.entries(styles)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      return `${cssKey}: ${value}`;
    })
    .join("; ");
};
