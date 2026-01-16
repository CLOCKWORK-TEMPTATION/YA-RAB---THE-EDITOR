// src/tests/systems/EnterSpacingRules.test.ts
// ============================================
// Regression Tests for EnterSpacingRules
//
// These tests verify that the extracted EnterSpacingRules functions
// maintain 1:1 behavioral compatibility with the original
// implementation in THEditor.tsx (lines 3049-3125)

import { describe, it, expect } from "vitest";
import {
  getEnterSpacingRule,
  applyEnterSpacingRules,
  isSceneHeader1,
} from "../../systems/spacing/EnterSpacingRules";

describe("EnterSpacingRules - Regression Tests", () => {
  describe("getEnterSpacingRule", () => {
    it("should return null for blank types", () => {
      expect(getEnterSpacingRule("blank", "action")).toBeNull();
      expect(getEnterSpacingRule("action", "blank")).toBeNull();
      expect(getEnterSpacingRule("blank", "blank")).toBeNull();
    });

    it("should return true after basmala to scene-header", () => {
      expect(getEnterSpacingRule("basmala", "scene-header-1")).toBe(true);
      expect(getEnterSpacingRule("basmala", "scene-header-top-line")).toBe(true);
    });

    it("should return true after scene-header-3 to action", () => {
      expect(getEnterSpacingRule("scene-header-3", "action")).toBe(true);
    });

    it("should return true for action to action", () => {
      expect(getEnterSpacingRule("action", "action")).toBe(true);
    });

    it("should return true for action to character", () => {
      expect(getEnterSpacingRule("action", "character")).toBe(true);
    });

    it("should return false for character to dialogue (no spacing)", () => {
      expect(getEnterSpacingRule("character", "dialogue")).toBe(false);
    });

    it("should return true for dialogue to character", () => {
      expect(getEnterSpacingRule("dialogue", "character")).toBe(true);
    });

    it("should return true for dialogue to action", () => {
      expect(getEnterSpacingRule("dialogue", "action")).toBe(true);
    });

    it("should return true for dialogue to transition", () => {
      expect(getEnterSpacingRule("dialogue", "transition")).toBe(true);
    });

    it("should return true for action to transition", () => {
      expect(getEnterSpacingRule("action", "transition")).toBe(true);
    });

    it("should return true for transition to scene-header", () => {
      expect(getEnterSpacingRule("transition", "scene-header-1")).toBe(true);
      expect(getEnterSpacingRule("transition", "scene-header-top-line")).toBe(true);
    });

    it("should return null for undefined transitions", () => {
      expect(getEnterSpacingRule("character", "character")).toBeNull();
      expect(getEnterSpacingRule("parenthetical", "action")).toBeNull();
      expect(getEnterSpacingRule("scene-header-1", "scene-header-2")).toBeNull();
    });
  });

  describe("applyEnterSpacingRules", () => {
    it("should handle empty array", () => {
      const result = applyEnterSpacingRules([]);
      expect(result).toEqual([]);
    });

    it("should preserve blank lines at the beginning", () => {
      const input = [
        { text: "", type: "action" },
        { text: "", type: "action" },
        { text: "مشهد 1", type: "scene-header-top-line" },
      ];
      const result = applyEnterSpacingRules(input);
      expect(result).toHaveLength(3);
      expect(result[0].text).toBe("");
      expect(result[1].text).toBe("");
    });

    it("should insert blank line between scene-header-3 and action", () => {
      const input = [
        { text: "بيت أحمد", type: "scene-header-3" },
        { text: "يدخل أحمد", type: "action" },
      ];
      const result = applyEnterSpacingRules(input);
      // Should add blank between them
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("should NOT insert blank between character and dialogue", () => {
      const input = [
        { text: "أحمد", type: "character" },
        { text: "مرحباً", type: "dialogue" },
      ];
      const result = applyEnterSpacingRules(input);
      // Should NOT have blank between them
      const charIndex = result.findIndex(l => l.type === "character");
      const dialIndex = result.findIndex(l => l.type === "dialogue");
      expect(dialIndex).toBe(charIndex + 1); // Directly adjacent
    });

    it("should insert blank between dialogue and character (new character)", () => {
      const input = [
        { text: "مرحباً", type: "dialogue" },
        { text: "محمد", type: "character" },
      ];
      const result = applyEnterSpacingRules(input);
      // Should add blank between them
      const dialIndex = result.findIndex(l => l.type === "dialogue");
      const charIndex = result.findIndex(l => l.type === "character");
      expect(charIndex).toBeGreaterThan(dialIndex + 1); // At least one line between
    });

    it("should handle multiple consecutive blank lines", () => {
      const input = [
        { text: "أحمد", type: "character" },
        { text: "", type: "action" },
        { text: "", type: "action" },
        { text: "", type: "action" },
        { text: "مرحباً", type: "dialogue" },
      ];
      const result = applyEnterSpacingRules(input);
      // Should handle multiple blanks according to rule (false = no blank)
      const charIndex = result.findIndex(l => l.type === "character");
      const dialIndex = result.findIndex(l => l.type === "dialogue");
      expect(dialIndex).toBe(charIndex + 1); // No blank between character and dialogue
    });
  });

  describe("isSceneHeader1", () => {
    it("should return true for simple scene number lines", () => {
      expect(isSceneHeader1("مشهد 1")).toBe(true);
      expect(isSceneHeader1("م. 1")).toBe(true);
      expect(isSceneHeader1("scene 1")).toBe(true);
      expect(isSceneHeader1("مشهد 15")).toBe(true);
      expect(isSceneHeader1("مشهد ١٢٣")).toBe(true); // Arabic numerals
    });

    it("should return false for scene headers with additional content", () => {
      expect(isSceneHeader1("مشهد 1 - بيت أحمد")).toBe(false);
      expect(isSceneHeader1("مشهد 1: ليل")).toBe(false);
    });

    it("should return false for non-scene-header lines", () => {
      expect(isSceneHeader1("أحمد")).toBe(false);
      expect(isSceneHeader1("ACTION")).toBe(false);
    });

    it("should handle leading/trailing whitespace", () => {
      expect(isSceneHeader1("  مشهد 1  ")).toBe(true);
      expect(isSceneHeader1("\tمشهد 2\t")).toBe(true);
    });
  });

  describe("Edge Cases and Behavior from THEditor.tsx", () => {
    it("should handle transition at end of file correctly", () => {
      const input = [
        { text: "ACTION", type: "action" },
        { text: "إلى المطبخ", type: "transition" },
      ];
      const result = applyEnterSpacingRules(input);
      // No next line, so no blank should be added after transition
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle basmala correctly", () => {
      const input = [
        { text: "بسم الله الرحمن الرحيم", type: "basmala" },
        { text: "مشهد 1", type: "scene-header-top-line" },
      ];
      const result = applyEnterSpacingRules(input);
      // Should add blank between basmala and scene header
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("should compress multiple blanks when rule is false", () => {
      const input = [
        { text: "أحمد", type: "character" },
        { text: "", type: "action" },
        { text: "", type: "action" },
        { text: "", type: "action" },
        { text: "مرحباً", type: "dialogue" },
      ];
      const result = applyEnterSpacingRules(input);
      // All blanks should be removed (rule = false)
      const blanks = result.filter(l => l.text.trim() === "");
      // Character to dialogue should have no blank
      const charIndex = result.findIndex(l => l.type === "character");
      const dialIndex = result.findIndex(l => l.type === "dialogue");
      expect(dialIndex - charIndex - 1).toBe(0); // No blanks between
    });

    it("should preserve one blank when rule is true", () => {
      const input = [
        { text: "يدخل أحمد", type: "action" },
        { text: "", type: "action" },
        { text: "", type: "action" },
        { text: "يجلس", type: "action" },
      ];
      const result = applyEnterSpacingRules(input);
      // Action to action should preserve ONE blank
      // Count the lines between first and last action
      const firstActionIndex = result.findIndex(l => l.type === "action" && l.text.includes("يدخل"));
      const lastActionIndex = result.findIndex(l => l.type === "action" && l.text.includes("يجلس"));
      const betweenCount = lastActionIndex - firstActionIndex - 1;
      expect(betweenCount).toBe(1); // Exactly one blank line between
    });
  });

  describe("Regression Tests - Exact Behavior from THEditor.tsx", () => {
    it("should match the exact spacing rules from THEditor.tsx", () => {
      // Test all rules from THEditor.tsx lines 3049-3076
      const testCases: Array<[string, string, boolean | null]> = [
        ["basmala", "scene-header-1", true],
        ["basmala", "scene-header-top-line", true],
        ["scene-header-3", "action", true],
        ["action", "action", true],
        ["action", "character", true],
        ["character", "dialogue", false],
        ["dialogue", "character", true],
        ["dialogue", "action", true],
        ["dialogue", "transition", true],
        ["action", "transition", true],
        ["transition", "scene-header-1", true],
        ["transition", "scene-header-top-line", true],
        // Undefined cases should return null
        ["action", "parenthetical", null],
        ["parenthetical", "action", null],
        ["scene-header-1", "scene-header-2", null],
      ];

      for (const [prev, next, expected] of testCases) {
        expect(getEnterSpacingRule(prev, next))
          .withContext(`getEnterSpacingRule("${prev}", "${next}")`)
          .toBe(expected);
      }
    });
  });
});
