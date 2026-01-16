// src/utils/css.ts
// ================
// CSS Utilities
//
// Responsibilities:
// - Convert CSS objects to strings
// - Handle CSS-in-JS utilities
// - CSS validation helpers

export interface CSSProperties {
  [key: string]: string | number | undefined;
}

/**
 * Convert CSS object to CSS string
 */
export function cssObjectToString(styles: CSSProperties): string {
  return Object.entries(styles)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([property, value]) => {
      // Convert camelCase to kebab-case
      const cssProperty = property.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      return `${cssProperty}: ${value}`;
    })
    .join('; ');
}

/**
 * Create CSS string from object with semicolon
 */
export function createCSSString(styles: CSSProperties): string {
  const cssString = cssObjectToString(styles);
  return cssString ? cssString + ';' : '';
}

/**
 * Merge multiple CSS objects
 */
export function mergeCSS(...styles: CSSProperties[]): CSSProperties {
  return Object.assign({}, ...styles);
}

/**
 * Validate CSS property name
 */
export function isValidCSSProperty(property: string): boolean {
  return /^-?[a-z-]+$/.test(property);
}

/**
 * Validate CSS value
 */
export function isValidCSSValue(value: string): boolean {
  return value.length > 0 && !/[\s{}()]/.test(value);
}
