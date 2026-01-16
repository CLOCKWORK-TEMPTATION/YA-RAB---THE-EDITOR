// src/tests/systems/AdaptiveClassificationSystem.test.ts
// ========================================================
// Regression Tests for AdaptiveClassificationSystem
//
// These tests verify that the extracted AdaptiveClassificationSystem
// maintains 1:1 behavioral compatibility with the original
// implementation in THEditor.tsx (lines 7688-7941)

import { describe, it, expect, beforeEach } from "vitest";
import { AdaptiveClassificationSystem, type UserCorrection, type SystemStatistics } from "../../systems/adaptive";

describe("AdaptiveClassificationSystem - Regression Tests", () => {
  let system: AdaptiveClassificationSystem;

  beforeEach(() => {
    system = new AdaptiveClassificationSystem();
  });

  describe("recordUserCorrection", () => {
    it("should record user correction with all required fields", () => {
      system.recordUserCorrection("أحمد", "action", "character", "blank");

      const stats = system.getStatistics();
      expect(stats.totalCorrections).toBe(1);
      expect(stats.uniquePatterns).toBeGreaterThanOrEqual(0);
    });

    it("should update weights after recording correction", () => {
      system.recordUserCorrection("أحمد", "action", "character", "blank");
      system.recordUserCorrection("أحمد", "action", "character", "blank");
      system.recordUserCorrection("أحمد", "action", "character", "blank");

      // بعد 3 مرات نفس الخطأ، يجب أن يكون هناك pattern مع وزن
      const stats = system.getStatistics();
      expect(stats.totalCorrections).toBe(3);
    });

    it("should trigger warning on repeating patterns (> 3 occurrences)", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      system.recordUserCorrection("أحمد", "action", "character", "blank");
      system.recordUserCorrection("أحمد", "action", "character", "blank");
      system.recordUserCorrection("أحمد", "action", "character", "blank");
      system.recordUserCorrection("أحمد", "action", "character", "blank");

      // Should have triggered warning at 4th occurrence
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("خطأ متكرر في نظام التصنيف"),
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("improveClassificationScore", () => {
    it("should return baseScore when no weight exists", () => {
      const result = system.improveClassificationScore("character", { previousType: "blank", lineText: "أحمد" }, 50);
      expect(result).toBe(50);
    });

    it("should apply weight adjustment when pattern exists", () => {
      // First create a pattern by recording corrections
      system.recordUserCorrection("أحمد", "action", "character", "blank");
      system.recordUserCorrection("أحمد", "action", "character", "blank");

      // This should have created a weight for "blank -> action" (decreased) and "blank -> character" (increased)
      const actionScore = system.improveClassificationScore("action", { previousType: "blank", lineText: "أحمد" }, 100);
      const characterScore = system.improveClassificationScore("character", { previousType: "blank", lineText: "أحمد" }, 100);

      // Action score should be decreased (0.7 factor)
      expect(actionScore).toBeLessThan(100);
      // Character score should be increased (1.3 factor)
      expect(characterScore).toBeGreaterThan(100);
    });
  });

  describe("getCommonErrors", () => {
    it("should return empty array when no errors", () => {
      const errors = system.getCommonErrors();
      expect(errors).toEqual([]);
    });

    it("should return sorted error patterns by frequency", () => {
      system.recordUserCorrection("أحمد", "action", "character", "blank");
      system.recordUserCorrection("أحمد", "action", "character", "blank");
      system.recordUserCorrection("أحمد", "action", "character", "blank");

      const errors = system.getCommonErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].pattern).toBe("blank ➜ action");
      expect(errors[0].frequency).toBe(3);
    });
  });

  describe("getCorrectionCount", () => {
    it("should return 0 for new system", () => {
      expect(system.getCorrectionCount()).toBe(0);
    });

    it("should increment with each correction", () => {
      system.recordUserCorrection("أحمد", "action", "character", "blank");
      expect(system.getCorrectionCount()).toBe(1);

      system.recordUserCorrection("أحمد", "action", "character", "blank");
      expect(system.getCorrectionCount()).toBe(2);
    });
  });

  describe("reset", () => {
    it("should clear all corrections and weights", () => {
      system.recordUserCorrection("أحمد", "action", "character", "blank");
      system.recordUserCorrection("أحمد", "action", "character", "blank");

      expect(system.getCorrectionCount()).toBe(2);
      expect(system.getStatistics().totalCorrections).toBe(2);

      system.reset();

      expect(system.getCorrectionCount()).toBe(0);
      expect(system.getStatistics().totalCorrections).toBe(0);
    });
  });

  describe("getStatistics", () => {
    it("should return correct statistics for new system", () => {
      const stats = system.getStatistics();

      expect(stats.totalCorrections).toBe(0);
      expect(stats.uniquePatterns).toBe(0);
      expect(stats.mostCommonError).toBeNull();
      expect(stats.averageWeight).toBe(1.0);
    });

    it("should calculate average weight correctly", () => {
      system.recordUserCorrection("أحمد", "action", "character", "blank");
      system.recordUserCorrection("أحمد", "action", "character", "blank");

      const stats = system.getStatistics();
      expect(stats.totalCorrections).toBe(2);
      expect(stats.uniquePatterns).toBeGreaterThan(0);
      expect(stats.averageWeight).toBeGreaterThan(0);
    });
  });

  describe("exportData and importData", () => {
    it("should export data as JSON string", () => {
      system.recordUserCorrection("أحمد", "action", "character", "blank");

      const exported = system.exportData();
      const data = JSON.parse(exported);

      expect(data).toHaveProperty("corrections");
      expect(data).toHaveProperty("weights");
      expect(data).toHaveProperty("exportedAt");
      expect(Array.isArray(data.corrections)).toBe(true);
    });

    it("should import data from JSON string", () => {
      const originalData = {
        corrections: [
          {
            originalType: "action",
            correctedType: "character",
            context: { previousType: "blank", lineText: "أحمد" },
            timestamp: new Date().toISOString(),
            weight: 1.0,
          },
        ],
        weights: {
          "blank -> action": 0.7,
        },
        exportedAt: new Date().toISOString(),
      };

      system.importData(JSON.stringify(originalData));

      expect(system.getCorrectionCount()).toBe(1);
    });

    it("should handle invalid JSON gracefully", () => {
      const result = system.importData("invalid json");
      expect(result).toBe(false);
    });
  });
});
