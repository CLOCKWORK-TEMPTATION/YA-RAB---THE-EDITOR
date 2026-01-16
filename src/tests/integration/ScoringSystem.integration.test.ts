// src/tests/integration/ScoringSystem.integration.test.ts
// ===================================================
// Integration Tests for ScoringSystem (No Mocks)
//
// These tests verify that the ScoringSystem works correctly
// with the actual classifier helper functions (not mocks).

import { describe, it, expect, beforeEach } from "vitest";
import {
  scoreAsCharacter,
  scoreAsDialogue,
  scoreAsAction,
  scoreAsParenthetical,
  scoreAsSceneHeader,
  calculateDoubtScore,
  classifyWithScoring,
  buildContext,
  isScoringSystemInitialized,
} from "../../systems/scoring";
import { DocumentMemory } from "../../systems/memory/DocumentMemory";
import type { LineContext } from "../../types";

describe("ScoringSystem - Integration Tests (No Mocks)", () => {
  let documentMemory: DocumentMemory;

  beforeEach(() => {
    documentMemory = new DocumentMemory();
  });

  // Verify initialization
  it("should be initialized with real helpers", () => {
    expect(isScoringSystemInitialized()).toBe(true);
  });

  function createBasicContext(line: string): LineContext {
    return buildContext(line, 0, [line]);
  }

  describe("scoreAsCharacter - with real helpers", () => {
    it("should give high score for character ending with colon", () => {
      const result = scoreAsCharacter("أحمد:", "أحمد:", createBasicContext("أحمد:"));
      expect(result.score).toBeGreaterThan(50);
      expect(result.reasons).toContain("ينتهي بنقطتين");
    });

    it("should recognize short Arabic names as characters", () => {
      const result = scoreAsCharacter("ياسين", "ياسين", createBasicContext("ياسين"));
      // Since ياسين is not an action verb and is short, should get decent character score
      expect(result.reasons).toContain("لا يحتوي على علامات ترقيم نهائية");
    });

    it("should penalize action verb starts (with real isActionVerbStart)", () => {
      // "يدخل" IS an action verb, so should be penalized
      const result = scoreAsCharacter("يدخل", "يدخل", createBasicContext("يدخل"));
      expect(result.reasons).some(r => r.includes("يبدأ كنمط حركة") || r.includes("يبدو كسطر حركة"));
    });
  });

  describe("scoreAsAction - with real helpers", () => {
    it("should recognize action verb starts (with real isActionVerbStart)", () => {
      // "يدخل" IS an action verb
      const result = scoreAsAction("يدخل أحمد إلى الغرفة", "يدخل أحمد إلى الغرفة", createBasicContext("يدخل أحمد إلى الغرفة"));
      expect(result.reasons).toContain("يبدأ بفعل حركي");
    });

    it("should recognize multiple action verbs", () => {
      const actionVerbs = ["يخرج", "يقف", "يجلس", "ينظر", "يركض"];
      for (const verb of actionVerbs) {
        const result = scoreAsAction(`${verb} الرجل`, `${verb} الرجل`, createBasicContext(`${verb} الرجل`));
        expect(result.reasons).toContain("يبدأ بفعل حركي");
      }
    });

    it("should give bonus for dash-prefixed action lines", () => {
      const result = scoreAsAction("- يقف الرجل", "- يقف الرجل", createBasicContext("- يقف الرجل"));
      expect(result.reasons).toContain("يبدأ بشرطة خارج بلوك الحوار");
    });
  });

  describe("scoreAsSceneHeader - with real helpers", () => {
    it("should recognize scene number patterns", () => {
      const patterns = ["مشهد 1", "م. ١", "scene 5"];
      for (const pattern of patterns) {
        const result = scoreAsSceneHeader(pattern, createBasicContext(pattern));
        expect(result.reasons).toContain("يبدأ بكلمة مشهد");
      }
    });

    it("should recognize interior/exterior patterns", () => {
      const patterns = ["داخلي بيت أحمد", "خارجي الشارع", "د. الغرفة"];
      for (const pattern of patterns) {
        const result = scoreAsSceneHeader(pattern, createBasicContext(pattern));
        expect(result.score).toBeGreaterThan(10);
      }
    });

    it("should recognize time words", () => {
      const patterns = ["ليل في الشارع", "صباحاً في الغرفة", "مساءً على السطح"];
      for (const pattern of patterns) {
        const result = scoreAsSceneHeader(pattern, createBasicContext(pattern));
        expect(result.reasons).toContain("يحتوي على كلمة وقت");
      }
    });
  });

  describe("scoreAsDialogue - with real helpers", () => {
    it("should NOT penalize non-action-verb dialogue", () => {
      const ctx: LineContext = {
        ...createBasicContext("مرحباً كيف حالك؟"),
        previousLines: [{ text: "أحمد", type: "character" }],
      };
      const result = scoreAsDialogue("مرحباً كيف حالك؟", "مرحباً كيف حالك؟", ctx);
      // "مرحباً" is not an action verb, so no penalty for action verb start
      expect(result.score).toBeGreaterThan(40);
    });

    it("should penalize action verb starts even with dialogue context", () => {
      const ctx: LineContext = {
        ...createBasicContext("يدخل الرجل"),
        previousLines: [{ text: "أحمد", type: "character" }],
      };
      const result = scoreAsDialogue("يدخل الرجل", "يدخل الرجل", ctx);
      // "يدخل" IS an action verb, so should be penalized
      expect(result.reasons).some(r => r.includes("يبدأ كنمط حركة"));
    });
  });

  describe("classifyWithScoring - end-to-end tests", () => {
    it("should classify a simple dialogue block correctly", () => {
      const lines = [
        "أحمد",
        "مرحباً كيف حالك؟",
        "بخير، الحمد لله",
      ];

      const results = [];
      const previousTypes: (string | null)[] = [];

      for (let i = 0; i < lines.length; i++) {
        const result = classifyWithScoring(lines[i], i, lines, previousTypes);
        results.push(result);
        previousTypes.push(result.type);
      }

      // First line should be character (short, no punctuation)
      expect(results[0].type).toBe("character");

      // Second line should be dialogue (follows character, has punctuation)
      expect(results[1].type).toBe("dialogue");

      // Third line should be dialogue (follows dialogue, has punctuation)
      expect(results[2].type).toBe("dialogue");
    });

    it("should classify action scene correctly", () => {
      const lines = [
        "مشهد 1",
        "بيت أحمد - ليل",
        "يدخل أحمد إلى الغرفة",
        "ينظر حوله",
      ];

      const results = [];
      const previousTypes: (string | null)[] = [];

      for (let i = 0; i < lines.length; i++) {
        const result = classifyWithScoring(lines[i], i, lines, previousTypes);
        results.push(result);
        previousTypes.push(result.type);
      }

      // First line should be scene-header-1
      expect(results[0].type).toBe("scene-header-1");

      // Second line should be scene-header-3 or action
      expect(["scene-header-3", "action"]).toContain(results[1].type);

      // Third line should be action (starts with action verb "يدخل")
      expect(results[2].type).toBe("action");

      // Fourth line should be action (starts with action verb "ينظر")
      expect(results[3].type).toBe("action");
    });

    it("should handle ambiguous names vs action verbs with DocumentMemory", () => {
      // First pass: "ياسين" is not known
      let result1 = classifyWithScoring("ياسين:", 0, ["ياسين:"], [], { documentMemory });
      const initialType = result1.type;

      // Add "ياسين" to memory
      documentMemory.addCharacter("ياسين:", "high");
      documentMemory.addCharacter("ياسين:", "high");

      // Second pass: "ياسين" is now known
      let result2 = classifyWithScoring("ياسين:", 0, ["ياسين:"], [], { documentMemory });
      const secondType = result2.type;
      const secondScore = result2.scores["character"]?.score || 0;

      // After adding to memory, character score should be higher
      expect(secondScore).toBeGreaterThan(40);
    });
  });

  describe("Real classifier helpers behavior", () => {
    it("should correctly identify action verbs", () => {
      const actionVerbs = ["يدخل", "يخرج", "يقف", "يجلس", "ينظر", "يصرخ", "يركض"];
      const nonActionVerbs = ["مرحباً", "شكراً", "أهلاً", "الله", "الحمد"];

      for (const verb of actionVerbs) {
        const result = scoreAsAction(`${verb} الرجل`, `${verb} الرجل`, createBasicContext(`${verb} الرجل`));
        expect(result.reasons).toContain("يبدأ بفعل حركي");
      }

      for (const nonVerb of nonActionVerbs) {
        const result = scoreAsAction(`${nonVerb} لله`, `${nonVerb} لله`, createBasicContext(`${nonVerb} لله`));
        expect(result.reasons).not.toContain("يبدأ بفعل حركي");
      }
    });

    it("should correctly identify scene headers", () => {
      const sceneHeaders = [
        "مشهد 1",
        "بيت أحمد - ليل",
        "داخلي الغرفة",
        "خارجي الشارع - مساء",
      ];

      for (const header of sceneHeaders) {
        const result = scoreAsSceneHeader(header, createBasicContext(header));
        expect(result.score).toBeGreaterThan(20);
      }
    });

    it("should correctly identify transitions", () => {
      const transitions = ["إلى الغرفة", "من المطبخ", "متابعة", "CUT TO", "FADE IN"];

      // Transition detection happens in quickClassify inside classifyWithScoring
      // Let's verify through full classification
      for (const trans of transitions) {
        const result = classifyWithScoring(trans, 0, [trans], []);
        expect(result.type).toBe("transition");
      }
    });
  });

  describe("Integration edge cases", () => {
    it("should handle parenthetical lines correctly", () => {
      const parentheticals = ["(بصوت خافت)", "(همساً)", "(بحزن)", "(مبتسماً)"];

      for (const paren of parentheticals) {
        const result = scoreAsParenthetical(paren, paren, createBasicContext(paren));
        expect(result.reasons).toContain("يبدأ وينتهي بأقواس");
        expect(result.score).toBeGreaterThan(50);
      }
    });

    it("should NOT identify non-parenthetical as parenthetical", () => {
      const result = scoreAsParenthetical("بصوت خافت", "بصوت خافت", createBasicContext("بصوت خافت"));
      expect(result.reasons).toContain("ليس بين أقواس (سالب)");
    });

    it("should handle basmala correctly", () => {
      const basmalaVariants = [
        "بسم الله الرحمن الرحيم",
        "{بسم الله الرحمن الرحيم}",
        "  بسم الله الرحمن الرحيم  ",
      ];

      for (const basmala of basmalaVariants) {
        const result = classifyWithScoring(basmala, 0, [basmala], []);
        expect(result.type).toBe("basmala");
      }
    });
  });

  describe("Doubt calculation integration", () => {
    it("should mark for review when scores are close", () => {
      const scores = {
        action: { score: 45, confidence: "medium", reasons: [] },
        character: { score: 42, confidence: "medium", reasons: [] },
        dialogue: { score: 30, confidence: "low", reasons: [] },
      };

      const { doubtScore, needsReview } = calculateDoubtScore(scores);
      expect(doubtScore).toBeGreaterThanOrEqual(30);
      expect(needsReview).toBe(true);
    });

    it("should NOT mark for review when one type clearly wins", () => {
      const scores = {
        action: { score: 85, confidence: "high", reasons: [] },
        character: { score: 25, confidence: "low", reasons: [] },
        dialogue: { score: 20, confidence: "low", reasons: [] },
      };

      const { doubtScore, needsReview } = calculateDoubtScore(scores);
      expect(doubtScore).toBeLessThan(60);
      expect(needsReview).toBe(false);
    });
  });
});
