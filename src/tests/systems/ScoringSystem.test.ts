// src/tests/systems/ScoringSystem.test.ts
// ============================================
// Regression Tests for ScoringSystem
//
// These tests verify that the extracted ScoringSystem functions
// maintain 1:1 behavioral compatibility with the original
// implementation in THEditor.tsx
//
// NOTE: These tests use the REAL classifier helpers (not mocks)
// through the auto-initialization in init.ts

import { describe, it, expect, beforeEach } from "vitest";
import {
  scoreAsCharacter,
  scoreAsDialogue,
  scoreAsAction,
  scoreAsParenthetical,
  scoreAsSceneHeader,
  calculateDoubtScore,
  extractTop2Candidates,
  applySmartFallback,
  buildContext,
} from "../../systems/scoring";
import { DocumentMemory } from "../../systems/memory/DocumentMemory";
import type { ClassificationScore, LineContext } from "../../types";

// The classifier helpers are auto-initialized when importing from systems/scoring
// These tests use the REAL implementations, not mocks

describe("ScoringSystem - Regression Tests", () => {
  let documentMemory: DocumentMemory;

  beforeEach(() => {
    documentMemory = new DocumentMemory();
  });

  function createBasicContext(line: string): LineContext {
    return buildContext(line, 0, [line]);
  }

  describe("scoreAsCharacter", () => {
    it("should give high score for line ending with colon", () => {
      const result = scoreAsCharacter("أحمد:", "أحمد:", createBasicContext("أحمد:"));
      expect(result.score).toBeGreaterThan(50);
      expect(result.reasons).toContain("ينتهي بنقطتين");
    });

    it("should give bonus for known characters from document memory", () => {
      documentMemory.addCharacter("ياسين:", "high");
      documentMemory.addCharacter("ياسين:", "high");

      const result = scoreAsCharacter("ياسين:", "ياسين:", createBasicContext("ياسين:"));
      expect(result.reasons).toContain("شخصية معروفة من المستند (ثقة عالية)");
    });

    it("should penalize looking like action verb start (with real helpers)", () => {
      const result = scoreAsCharacter("يدخل:", "يدخل:", createBasicContext("يدخل:"));
      expect(result.reasons).some(r => r.includes("يبدأ كنمط حركة"));
    });

    it("should reduce penalty for action-like known characters", () => {
      documentMemory.addCharacter("يدخل:", "high");

      const result = scoreAsCharacter("يدخل:", "يدخل:", createBasicContext("يدخل:"));
      expect(result.reasons).toContain("يشبه نمط حركة لكنه شخصية معروفة (سالب مخفف)");
    });
  });

  describe("scoreAsDialogue", () => {
    it("should give high score when previous line is character", () => {
      const ctx: LineContext = {
        ...createBasicContext("مرحباً"),
        previousLines: [{ text: "أحمد", type: "character" }],
      };
      const result = scoreAsDialogue("مرحباً", "مرحباً", ctx);
      expect(result.score).toBeGreaterThan(40);
      expect(result.reasons).toContain("السطر السابق شخصية");
    });

    it("should penalize when no dialogue context exists", () => {
      const result = scoreAsDialogue("مرحباً", "مرحباً", createBasicContext("مرحباً"));
      expect(result.reasons).toContain("لا يوجد سياق حوار (سالب)");
    });

    it("should give bonus for dash inside dialogue block", () => {
      const ctx: LineContext = {
        ...createBasicContext("- مرحباً"),
        previousLines: [{ text: "أحمد", type: "character" }],
      };
      const result = scoreAsDialogue("- مرحباً", "- مرحباً", ctx, undefined, {
        isInDialogueBlock: true,
        distanceFromCharacter: 1,
      });
      expect(result.reasons).toContain("يبدأ بشرطة داخل بلوك حوار (استكمال/نبرة)");
    });
  });

  describe("scoreAsAction", () => {
    it("should give high score for action verb start (with real helpers)", () => {
      const result = scoreAsAction("يدخل أحمد إلى الغرفة", "يدخل أحمد إلى الغرفة", createBasicContext("يدخل أحمد إلى الغرفة"));
      expect(result.reasons).toContain("يبدأ بفعل حركي");
    });

    it("should penalize known character names", () => {
      documentMemory.addCharacter("أحمد:", "high");

      const result = scoreAsAction("أحمد", "أحمد", createBasicContext("أحمد"));
      expect(result.reasons).toContain("اسم شخصية معروف (سالب قوي)");
    });

    it("should give bonus after scene header", () => {
      const ctx: LineContext = {
        ...createBasicContext("الغرفة مظلمة"),
        previousLines: [{ text: "مشهد 1", type: "scene-header-1" }],
      };
      const result = scoreAsAction("الغرفة مظلمة", "الغرفة مظلمة", ctx);
      expect(result.reasons).toContain("يأتي بعد رأس مشهد");
    });

    it("should give bonus for dash outside dialogue block", () => {
      const result = scoreAsAction("- يمشي ببطء", "- يمشي ببطء", createBasicContext("- يمشي ببطء"), undefined, {
        isInDialogueBlock: false,
        distanceFromCharacter: -1,
      });
      expect(result.reasons).toContain("يبدأ بشرطة خارج بلوك الحوار");
    });
  });

  describe("scoreAsParenthetical", () => {
    it("should give high score for parenthetical shape", () => {
      const result = scoreAsParenthetical("(بصوت خافت)", "(بصوت خافت)", createBasicContext("(بصوت خافت)"));
      expect(result.reasons).toContain("يبدأ وينتهي بأقواس");
      expect(result.score).toBeGreaterThan(50);
    });

    it("should heavily penalize non-parenthetical lines", () => {
      const result = scoreAsParenthetical("بصوت خافت", "بصوت خافت", createBasicContext("بصوت خافت"));
      expect(result.reasons).toContain("ليس بين أقواس (سالب)");
    });

    it("should give bonus for parenthetical words", () => {
      const result = scoreAsParenthetical("(همساً)", "(همساً)", createBasicContext("(همساً)"));
      expect(result.reasons).toContain("يحتوي على كلمة ملاحظة شائعة");
    });
  });

  describe("scoreAsSceneHeader", () => {
    it("should give high score for scene prefix (with real helpers)", () => {
      const result = scoreAsSceneHeader("مشهد 1 - بيت أحمد - ليل", createBasicContext("مشهد 1 - بيت أحمد - ليل"));
      expect(result.reasons).toContain("يبدأ بكلمة مشهد");
      expect(result.score).toBeGreaterThan(50);
    });

    it("should recognize known places", () => {
      const result = scoreAsSceneHeader("بيت أحمد", createBasicContext("بيت أحمد"));
      expect(result.reasons).toContain("يحتوي على مكان معروف");
    });

    it("should recognize time words", () => {
      const result = scoreAsSceneHeader("مساءً في الشارع", createBasicContext("مساءً في الشارع"));
      expect(result.reasons).toContain("يحتوي على كلمة وقت");
    });
  });

  describe("calculateDoubtScore", () => {
    it("should return high doubt when top scores are close", () => {
      const scores: { [type: string]: ClassificationScore } = {
        action: { score: 45, confidence: "medium", reasons: [] },
        dialogue: { score: 42, confidence: "medium", reasons: [] },
      };
      const result = calculateDoubtScore(scores);
      expect(result.doubtScore).toBeGreaterThanOrEqual(30);
    });

    it("should return low doubt when top score is clear winner", () => {
      const scores: { [type: string]: ClassificationScore } = {
        action: { score: 85, confidence: "high", reasons: [] },
        dialogue: { score: 30, confidence: "low", reasons: [] },
      };
      const result = calculateDoubtScore(scores);
      expect(result.doubtScore).toBeLessThan(60);
      expect(result.needsReview).toBe(false);
    });

    it("should mark for review when doubt >= 60", () => {
      const scores: { [type: string]: ClassificationScore } = {
        action: { score: 40, confidence: "low", reasons: [] },
        dialogue: { score: 38, confidence: "low", reasons: [] },
      };
      const result = calculateDoubtScore(scores);
      expect(result.needsReview).toBe(true);
    });
  });

  describe("extractTop2Candidates", () => {
    it("should extract top 2 scoring types", () => {
      const scores: { [type: string]: ClassificationScore } = {
        action: { score: 70, confidence: "high", reasons: [] },
        dialogue: { score: 50, confidence: "medium", reasons: [] },
        character: { score: 30, confidence: "low", reasons: [] },
      };
      const result = extractTop2Candidates(scores);
      expect(result).not.toBeNull();
      expect(result![0].type).toBe("action");
      expect(result![0].score).toBe(70);
      expect(result![1].type).toBe("dialogue");
      expect(result![1].score).toBe(50);
    });

    it("should return null when less than 2 scores", () => {
      const scores: { [type: string]: ClassificationScore } = {
        action: { score: 70, confidence: "high", reasons: [] },
      };
      const result = extractTop2Candidates(scores);
      expect(result).toBeNull();
    });
  });

  describe("applySmartFallback", () => {
    it("should return character when next line looks like dialogue", () => {
      const top2 = [
        { type: "action", score: 45, confidence: "medium", reasons: [] },
        { type: "character", score: 42, confidence: "medium", reasons: [] },
      ];
      const result = applySmartFallback(top2, createBasicContext("أحمد"), "action", "مرحباً بكيفك", "أحمد");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("character");
      expect(result!.reason).toBe("السطر التالي يبدو كحوار");
    });

    it("should return action when no dialogue follows", () => {
      const top2 = [
        { type: "action", score: 45, confidence: "medium", reasons: [] },
        { type: "character", score: 42, confidence: "medium", reasons: [] },
      ];
      const result = applySmartFallback(top2, createBasicContext("يدخل"), null, null, "يدخل");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("action");
    });

    it("should return dialogue when previous is character", () => {
      const top2 = [
        { type: "action", score: 45, confidence: "medium", reasons: [] },
        { type: "dialogue", score: 42, confidence: "medium", reasons: [] },
      ];
      const result = applySmartFallback(top2, createBasicContext("مرحباً"), "character", null, "مرحباً");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("dialogue");
    });

    it("should return null when score difference is too large", () => {
      const top2 = [
        { type: "action", score: 80, confidence: "high", reasons: [] },
        { type: "character", score: 30, confidence: "low", reasons: [] },
      ];
      const result = applySmartFallback(top2, createBasicContext("يدخل"), null, null, "يدخل");
      expect(result).toBeNull();
    });
  });

  describe("Integration Tests - Scoring Scenarios", () => {
    it("should correctly score character with colon and dialogue after", () => {
      const characterLine = "أحمد:";
      const dialogueLine = "كيف حالك؟";

      const charScore = scoreAsCharacter(characterLine, characterLine, createBasicContext(characterLine));
      const ctxWithChar: LineContext = {
        ...createBasicContext(dialogueLine),
        previousLines: [{ text: characterLine, type: "character" }],
      };
      const dialScore = scoreAsDialogue(dialogueLine, dialogueLine, ctxWithChar);

      expect(charScore.score).toBeGreaterThan(50);
      expect(dialScore.score).toBeGreaterThan(60);
    });

    it("should handle ambiguous action vs character with DocumentMemory", () => {
      // First time seeing "ياسين" - might look like action
      const firstScore = scoreAsCharacter("ياسين", "ياسين", createBasicContext("ياسين"));

      // Add to memory
      documentMemory.addCharacter("ياسين:", "high");
      documentMemory.addCharacter("ياسين:", "high");

      // Second time - should recognize as character
      const secondScore = scoreAsCharacter("ياسين:", "ياسين:", createBasicContext("ياسين:"));

      expect(secondScore.score).toBeGreaterThan(firstScore.score);
      expect(secondScore.reasons).toContain("شخصية معروفة من المستند (ثقة عالية)");
    });
  });
});
