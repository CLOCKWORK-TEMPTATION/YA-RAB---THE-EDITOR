// src/tests/systems/AdvancedAutoReviewer.test.ts
// ==================================================
// Regression Tests for AdvancedAutoReviewer
//
// These tests verify that the extracted AdvancedAutoReviewer
// maintains 1:1 behavioral compatibility with the original
// implementation in THEditor.tsx (lines 7947-8241)

import { describe, it, expect, beforeEach } from "vitest";
import { AdvancedAutoReviewer, type ClassificationInput, type CorrectionSuggestion } from "../../systems/review";

describe("AdvancedAutoReviewer - Regression Tests", () => {
  let reviewer: AdvancedAutoReviewer;

  beforeEach(() => {
    reviewer = new AdvancedAutoReviewer();
  });

  describe("autoReview", () => {
    it("should return empty array for empty classifications", () => {
      const result = reviewer.autoReview([]);
      expect(result).toEqual([]);
    });

    it("should detect basmala misclassified as action", () => {
      const classifications: ClassificationInput[] = [
        { text: "بسم الله الرحمن الرحيم", type: "action", confidence: 50 },
      ];

      const result = reviewer.autoReview(classifications);

      expect(result).toHaveLength(1);
      expect(result[0].original).toBe("action");
      expect(result[0].suggested).toBe("basmala");
      expect(result[0].reason).toContain("البسملة يجب أن تكون باسم الله دائماً");
    });

    it("should detect parenthetical misclassified as action", () => {
      const classifications: ClassificationInput[] = [
        { text: "(بصوت خافت)", type: "action", confidence: 50 },
      ];

      const result = reviewer.autoReview(classifications);

      expect(result).toHaveLength(1);
      expect(result[0].original).toBe("action");
      expect(result[0].suggested).toBe("parenthetical");
    });

    it("should detect scene header misclassified as action", () => {
      const classifications: ClassificationInput[] = [
        { text: "داخلي الغرفة", type: "action", confidence: 40 },
      ];

      const result = reviewer.autoReview(classifications);

      expect(result).toHaveLength(1);
      expect(result[0].original).toBe("action");
      expect(result[0].suggested).toBe("scene-header-3");
    });

    it("should detect transition misclassified as action", () => {
      const classifications: ClassificationInput[] = [
        { text: "قطع إلى", type: "action", confidence: 50 },
      ];

      const result = reviewer.autoReview(classifications);

      expect(result).toHaveLength(1);
      expect(result[result.length - 1].original).toBe("action");
      expect(result[result.length - 1].suggested).toBe("transition");
    });

    it("should detect invalid type transitions", () => {
      const classifications: ClassificationInput[] = [
        { text: "أحمد", type: "action", confidence: 70 },
        { text: "مرحباً", type: "parenthetical", confidence: 50 },
      ];

      const result = reviewer.autoReview(classifications);

      const transitionSuggestion = result.find((r) => r.reason.includes("غير معتاد"));
      expect(transitionSuggestion).toBeDefined();
      expect(transitionSuggestion?.original).toBe("parenthetical");
      // The suggested type should be one of the valid next types for action
      // which are ["character", "transition", "action", "blank"]
      const validNextTypes = ["character", "transition", "action", "blank"];
      expect(validNextTypes).toContain(transitionSuggestion?.suggested || "");
    });

    it("should sort results by severity (high > medium > low)", () => {
      const classifications: ClassificationInput[] = [
        { text: "بسم الله الرحمن الرحيم", type: "action", confidence: 30 },
        { text: "(يبتسم)", type: "action", confidence: 50 },
        { text: "قطع إلى", type: "character", confidence: 40 },
      ];

      const result = reviewer.autoReview(classifications);

      // Sort by severity
      const severityOrder = result.map((r) => r.severity);
      expect(severityOrder[0]).toBe("high");
      expect(severityOrder[1]).toBe("medium");
      expect(severityOrder[2]).toBe("low");
    });
  });

  describe("reviewSingleLine", () => {
    it("should return null for correctly classified basmala", () => {
      const result = reviewer.reviewSingleLine("بسم الله الرحمن الرحيم", "basmala", 99);
      expect(result).toBeNull();
    });

    it("should suggest correction for misclassified basmala", () => {
      const result = reviewer.reviewSingleLine("بسم الله الرحمن الرحيم", "action", 50);
      expect(result).not.toBeNull();
      expect(result?.suggested).toBe("basmala");
      expect(result?.severity).toBe("medium");
    });

    it("should return null for correctly classified parenthetical", () => {
      const result = reviewer.reviewSingleLine("(يبتسم)", "parenthetical", 95);
      expect(result).toBeNull();
    });

    it("should suggest parenthetical for text between parentheses", () => {
      const result = reviewer.reviewSingleLine("(يبتسم)", "action", 50);
      expect(result?.suggested).toBe("parenthetical");
    });
  });

  describe("addRule and removeRule", () => {
    it("should add new rule to knowledge base", () => {
      const initialCount = reviewer.getRuleCount();
      const newPattern = /^خطوة:/i;

      reviewer.addRule(newPattern, [
        {
          confirmType: "transition",
          rejectTypes: ["action", "dialogue"],
          minConfidence: 85,
          explanation: "كلمة خطوة تعني انتقال",
        },
      ]);

      expect(reviewer.getRuleCount()).toBe(initialCount + 1);
    });

    it("should remove rule from knowledge base", () => {
      reviewer.addRule(/^خطوة:/i, [
        {
          confirmType: "transition",
          rejectTypes: ["action", "dialogue"],
          minConfidence: 85,
          explanation: "كلمة خطوة تعني انتقال",
        },
      ]);

      const ruleCount = reviewer.getRuleCount();
      const removed = reviewer.removeRule(/^خطوة:/i);

      expect(removed).toBe(true);
      expect(reviewer.getRuleCount()).toBe(ruleCount - 1);
    });

    it("should return false when removing non-existent rule", () => {
      const removed = reviewer.removeRule(/nonexistent/i);
      expect(removed).toBe(false);
    });
  });

  describe("reset", () => {
    it("should clear all rules", () => {
      reviewer.addRule(/^اختبار/i, [
        {
          confirmType: "parenthetical",
          rejectTypes: ["action", "dialogue"],
          minConfidence: 90,
          explanation: "كلمة اختبار",
        },
      ]);

      expect(reviewer.getRuleCount()).toBeGreaterThan(0);

      reviewer.reset();

      expect(reviewer.getRuleCount()).toBe(0);
    });
  });

  describe("exportKnowledgeBase and importKnowledgeBase", () => {
    it("should export knowledge base as JSON", () => {
      const exported = reviewer.exportKnowledgeBase();
      const data = JSON.parse(exported);

      expect(data).toHaveProperty("rules");
      expect(Array.isArray(data.rules)).toBe(true);
      expect(data.rules.length).toBeGreaterThan(0);

      // Check that exported rules match the source format
      expect(data.rules[0]).toHaveProperty("pattern");
      expect(data.rules[0]).toHaveProperty("flags");
      expect(data.rules[0]).toHaveProperty("rules");
    });

    it("should import knowledge base from JSON", () => {
      const originalData = {
        rules: [
          {
            pattern: "اختبار",
            flags: "gi",
            rules: [
              {
                confirmType: "parenthetical",
                rejectTypes: ["action", "dialogue"],
                minConfidence: 90,
                explanation: "كلمة اختبار",
              },
            ],
          },
        ],
        exportedAt: new Date().toISOString(),
      };

      const imported = reviewer.importKnowledgeBase(JSON.stringify(originalData));

      expect(imported).toBe(true);
      // Note: the knowledgeBase array length will be 6 (existing 5 + new 1)
    });

    it("should handle invalid JSON", () => {
      const result = reviewer.importKnowledgeBase("invalid json");
      expect(result).toBe(false);
    });
  });
});
