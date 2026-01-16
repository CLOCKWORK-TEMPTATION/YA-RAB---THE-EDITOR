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

// ==================== getFormatStyles ====================
// منقول 1:1 من THEEditor.tsx (سطر 506-559)

/**
 * @function getFormatStyles
 * @description دالة مساعدة عامة للحصول على أنماط التنسيق - مصدرة للاستخدام في الكلاسات
 * منقول 1:1 من THEEditor.tsx
 */
export const getFormatStyles = (
  formatType: string,
  selectedSize: string = "12pt",
  selectedFont: string = "AzarMehrMonospaced-San",
): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    fontFamily: selectedFont,
    fontSize: selectedSize,
    direction: "rtl",
    lineHeight: "14pt",
    marginBottom: "2pt",
    minHeight: "14pt",
  };

  const formatStyles: { [key: string]: React.CSSProperties } = {
    basmala: { textAlign: "left", margin: "0 auto" },
    "scene-header-top-line": {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      width: "100%",
    },
    "scene-header-3": {
      textAlign: "center",
    },
    action: { textAlign: "right", width: "100%", margin: "0" },
    character: {
      textAlign: "center",
      margin: "0 auto",
    },
    parenthetical: {
      textAlign: "center",
      margin: "0 auto",
    },
    dialogue: {
      width: "2.5in",
      textAlign: "center",
      margin: "0 auto",
    },
    transition: {
      textAlign: "center",
      margin: "0 auto",
    },
    "scene-header-1": {
      flex: "0 0 auto",
    },
    "scene-header-2": {
      flex: "0 0 auto",
    },
  };

  const finalStyles = { ...formatStyles[formatType], ...baseStyles };
  return finalStyles;
};
