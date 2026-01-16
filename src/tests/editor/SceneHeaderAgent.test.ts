// src/tests/editor/SceneHeaderAgent.test.ts
// ==========================================
// Tests for SceneHeaderAgent
// التحقق من التطابق السلوكي 1:1 مع THEEditor.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SceneHeaderAgent,
  ScreenplayClassifier,
  VERB_RE,
} from "../../editor/agents/SceneHeaderAgent";

describe("VERB_RE", () => {
  it("should match Arabic action verbs", () => {
    expect(VERB_RE.test("يدخل")).toBe(true);
    expect(VERB_RE.test("يخرج")).toBe(true);
    expect(VERB_RE.test("ينظر")).toBe(true);
    expect(VERB_RE.test("تدخل")).toBe(true);
    expect(VERB_RE.test("تخرج")).toBe(true);
  });

  it("should not match non-verb words", () => {
    expect(VERB_RE.test("غرفة")).toBe(false);
    expect(VERB_RE.test("ليل")).toBe(false);
    expect(VERB_RE.test("نهار")).toBe(false);
  });
});

describe("ScreenplayClassifier", () => {
  describe("parseSceneHeaderFromLine", () => {
    it("should parse valid scene header", () => {
      const result = ScreenplayClassifier.parseSceneHeaderFromLine("مشهد 1 - داخلي - ليل");

      expect(result).not.toBeNull();
      expect(result?.sceneNum).toBe("مشهد 1");
      expect(result?.timeLocation).toBeDefined();
    });

    it("should parse scene header with Arabic numerals", () => {
      const result = ScreenplayClassifier.parseSceneHeaderFromLine("مشهد ١ - خارجي - نهار");

      expect(result).not.toBeNull();
      expect(result?.sceneNum).toBe("مشهد ١");
    });

    it("should return null for non-scene header", () => {
      const result = ScreenplayClassifier.parseSceneHeaderFromLine("هذا ليس رأس مشهد");

      expect(result).toBeNull();
    });

    it("should return null for empty line", () => {
      const result = ScreenplayClassifier.parseSceneHeaderFromLine("");

      expect(result).toBeNull();
    });
  });

  describe("normalizeLine", () => {
    it("should normalize whitespace", () => {
      const result = ScreenplayClassifier.normalizeLine("  hello   world  ");
      expect(result).toBe("hello world");
    });

    it("should trim line", () => {
      const result = ScreenplayClassifier.normalizeLine("   test   ");
      expect(result).toBe("test");
    });
  });

  describe("Patterns", () => {
    it("should have sceneHeader3 pattern", () => {
      const classifier = new ScreenplayClassifier();
      expect(classifier.Patterns.sceneHeader3).toBeDefined();
      expect(classifier.Patterns.sceneHeader3 instanceof RegExp).toBe(true);
    });
  });
});

describe("SceneHeaderAgent", () => {
  let mockCtx: { inDialogue: boolean };
  let mockGetFormatStyles: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCtx = { inDialogue: true };
    mockGetFormatStyles = vi.fn().mockReturnValue({
      fontWeight: "bold",
      textAlign: "center",
    });
  });

  it("should use original signature (3 parameters only)", () => {
    // التحقق من أن SceneHeaderAgent يقبل 3 معاملات فقط
    expect(SceneHeaderAgent.length).toBe(3);
  });

  it("should return null for non-scene-header lines", () => {
    const result = SceneHeaderAgent(
      "هذا سطر عادي يحتوي على جملة طويلة جداً مع علامة استفهام؟",
      mockCtx,
      mockGetFormatStyles
    );

    expect(result).toBeNull();
    expect(mockCtx.inDialogue).toBe(true); // Should not change
  });

  it("should process valid scene header", () => {
    const result = SceneHeaderAgent(
      "مشهد 1 - داخلي - ليل",
      mockCtx,
      mockGetFormatStyles
    );

    expect(result).not.toBeNull();
    expect(result?.processed).toBe(true);
    expect(result?.html).toBeDefined();
    expect(mockCtx.inDialogue).toBe(false); // Should be set to false
  });

  it("should handle short location line (scene-header-3)", () => {
    const result = SceneHeaderAgent(
      "الغرفة",
      mockCtx,
      mockGetFormatStyles
    );

    expect(result).not.toBeNull();
    expect(result?.html).toContain("scene-header-3");
  });

  it("should not process line with colon as scene-header-3", () => {
    const result = SceneHeaderAgent(
      "أحمد: مرحباً",
      mockCtx,
      mockGetFormatStyles
    );

    expect(result).toBeNull();
  });

  it("should not process line with sentence punctuation as scene-header-3", () => {
    const result = SceneHeaderAgent(
      "هذا سؤال؟",
      mockCtx,
      mockGetFormatStyles
    );

    expect(result).toBeNull();
  });

  it("should not process line with verb after dash as scene-header-3", () => {
    const result = SceneHeaderAgent(
      "الغرفة - يدخل",
      mockCtx,
      mockGetFormatStyles
    );

    expect(result).toBeNull();
  });

  it("should handle long lines (more than 6 words) as non-scene-header", () => {
    const result = SceneHeaderAgent(
      "هذا سطر طويل جداً يحتوي على أكثر من ستة كلمات",
      mockCtx,
      mockGetFormatStyles
    );

    expect(result).toBeNull();
  });

  it("should create ScreenplayClassifier internally", () => {
    // التحقق من أن SceneHeaderAgent يُنشئ ScreenplayClassifier داخلياً
    // عن طريق التحقق من أنه يعمل بدون تمرير classifier خارجي
    const result = SceneHeaderAgent(
      "مشهد 5",
      mockCtx,
      mockGetFormatStyles
    );

    // يجب أن يعمل بدون أخطاء
    expect(result).not.toBeNull();
  });
});
