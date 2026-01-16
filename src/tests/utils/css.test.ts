// src/tests/utils/css.test.ts
// ============================
// Tests for cssObjectToString
// التحقق من التطابق السلوكي 1:1 مع THEEditor.tsx

import { describe, it, expect } from "vitest";
import { cssObjectToString } from "../../utils/css";

describe("cssObjectToString", () => {
  describe("Basic functionality", () => {
    it("should convert simple CSS object to string", () => {
      const styles = {
        color: "red",
        fontSize: "16px",
      };
      const result = cssObjectToString(styles);
      expect(result).toBe("color: red; font-size: 16px");
    });

    it("should handle single property", () => {
      const styles = { backgroundColor: "blue" };
      const result = cssObjectToString(styles);
      expect(result).toBe("background-color: blue");
    });

    it("should handle empty object", () => {
      const styles = {};
      const result = cssObjectToString(styles);
      expect(result).toBe("");
    });
  });

  describe("CamelCase to kebab-case conversion", () => {
    it("should convert camelCase to kebab-case", () => {
      const styles = {
        marginTop: "10px",
        paddingBottom: "20px",
        borderLeftWidth: "1px",
      };
      const result = cssObjectToString(styles);
      expect(result).toContain("margin-top: 10px");
      expect(result).toContain("padding-bottom: 20px");
      expect(result).toContain("border-left-width: 1px");
    });

    it("should handle multiple uppercase letters", () => {
      const styles = {
        webkitTransform: "rotate(45deg)",
        msFlexDirection: "row",
      };
      const result = cssObjectToString(styles);
      expect(result).toContain("webkit-transform: rotate(45deg)");
      expect(result).toContain("ms-flex-direction: row");
    });
  });

  describe("Value types", () => {
    it("should handle string values", () => {
      const styles = { display: "flex" };
      const result = cssObjectToString(styles);
      expect(result).toBe("display: flex");
    });

    it("should handle numeric values", () => {
      const styles = {
        zIndex: 100,
        opacity: 0.5,
        lineHeight: 1.5,
      };
      const result = cssObjectToString(styles);
      expect(result).toContain("z-index: 100");
      expect(result).toContain("opacity: 0.5");
      expect(result).toContain("line-height: 1.5");
    });

    it("should handle undefined values (as per original behavior)", () => {
      const styles = {
        color: "red",
        fontSize: undefined,
      } as any;
      const result = cssObjectToString(styles);
      // Original doesn't filter undefined, so it includes "font-size: undefined"
      expect(result).toContain("color: red");
    });
  });

  describe("Separator format", () => {
    it("should use semicolon with space as separator", () => {
      const styles = {
        color: "red",
        fontSize: "16px",
      };
      const result = cssObjectToString(styles);
      // Original uses "; " (semicolon + space)
      expect(result).toBe("color: red; font-size: 16px");
    });
  });

  describe("Edge cases", () => {
    it("should handle properties starting with lowercase", () => {
      const styles = { color: "blue" };
      const result = cssObjectToString(styles);
      expect(result).toBe("color: blue");
    });

    it("should handle CSS custom properties (CSS variables)", () => {
      // Note: CSS variables typically use -- prefix
      const styles = { "--customColor": "red" };
      const result = cssObjectToString(styles);
      expect(result).toBe("--custom-color: red");
    });
  });
});
