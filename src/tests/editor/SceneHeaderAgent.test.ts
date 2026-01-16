// src/tests/editor/SceneHeaderAgent.test.ts
// ==========================================
// Tests for SceneHeaderAgent
// التحقق من التطابق السلوكي 1:1 مع THEEditor.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SceneHeaderAgent,
  createSceneHeaderAgent,
  VERB_RE,
  type SceneHeaderContext,
  type ScreenplayClassifierInterface,
  type ScreenplayClassifierStatic,
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

describe("SceneHeaderAgent", () => {
  let mockCtx: SceneHeaderContext;
  let mockGetFormatStyles: ReturnType<typeof vi.fn>;
  let mockClassifier: ScreenplayClassifierInterface;
  let mockClassifierStatic: ScreenplayClassifierStatic;

  beforeEach(() => {
    mockCtx = { inDialogue: true };
    mockGetFormatStyles = vi.fn().mockReturnValue({
      fontWeight: "bold",
      textAlign: "center",
    });
    mockClassifier = {
      Patterns: {
        sceneHeader3: /^[\u0600-\u06FF\s]+$/,
      },
    };
    mockClassifierStatic = {
      parseSceneHeaderFromLine: vi.fn(),
      normalizeLine: vi.fn((line) => line.trim()),
    };
  });

  it("should return null for non-scene-header lines", () => {
    (mockClassifierStatic.parseSceneHeaderFromLine as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = SceneHeaderAgent(
      "هذا سطر عادي يحتوي على جملة طويلة جداً",
      mockCtx,
      mockGetFormatStyles,
      mockClassifier,
      mockClassifierStatic
    );

    expect(result).toBeNull();
    expect(mockCtx.inDialogue).toBe(true); // Should not change
  });

  it("should process valid scene header", () => {
    (mockClassifierStatic.parseSceneHeaderFromLine as ReturnType<typeof vi.fn>).mockReturnValue({
      sceneNum: "مشهد 1",
      timeLocation: "داخلي - ليل",
    });

    const result = SceneHeaderAgent(
      "مشهد 1 - داخلي - ليل",
      mockCtx,
      mockGetFormatStyles,
      mockClassifier,
      mockClassifierStatic
    );

    expect(result).not.toBeNull();
    expect(result?.processed).toBe(true);
    expect(result?.html).toBeDefined();
    expect(mockCtx.inDialogue).toBe(false); // Should be set to false
  });

  it("should handle placeInline", () => {
    (mockClassifierStatic.parseSceneHeaderFromLine as ReturnType<typeof vi.fn>).mockReturnValue({
      sceneNum: "مشهد 2",
      timeLocation: "خارجي - نهار",
      placeInline: "الحديقة",
    });

    const result = SceneHeaderAgent(
      "مشهد 2 - خارجي - نهار - الحديقة",
      mockCtx,
      mockGetFormatStyles,
      mockClassifier,
      mockClassifierStatic
    );

    expect(result).not.toBeNull();
    expect(result?.html).toContain("scene-header-3");
  });

  it("should handle short location line (scene-header-3)", () => {
    (mockClassifierStatic.parseSceneHeaderFromLine as ReturnType<typeof vi.fn>).mockReturnValue(null);

    mockClassifier.Patterns.sceneHeader3 = /^[\u0600-\u06FF\s]+$/;

    const result = SceneHeaderAgent(
      "الغرفة",
      mockCtx,
      mockGetFormatStyles,
      mockClassifier,
      mockClassifierStatic
    );

    expect(result).not.toBeNull();
    expect(result?.html).toContain("scene-header-3");
  });

  it("should not process line with colon as scene-header-3", () => {
    (mockClassifierStatic.parseSceneHeaderFromLine as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = SceneHeaderAgent(
      "أحمد: مرحباً",
      mockCtx,
      mockGetFormatStyles,
      mockClassifier,
      mockClassifierStatic
    );

    expect(result).toBeNull();
  });

  it("should not process line with sentence punctuation as scene-header-3", () => {
    (mockClassifierStatic.parseSceneHeaderFromLine as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = SceneHeaderAgent(
      "هذا سؤال؟",
      mockCtx,
      mockGetFormatStyles,
      mockClassifier,
      mockClassifierStatic
    );

    expect(result).toBeNull();
  });

  it("should not process line with verb after dash as scene-header-3", () => {
    (mockClassifierStatic.parseSceneHeaderFromLine as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = SceneHeaderAgent(
      "الغرفة - يدخل",
      mockCtx,
      mockGetFormatStyles,
      mockClassifier,
      mockClassifierStatic
    );

    expect(result).toBeNull();
  });
});

describe("createSceneHeaderAgent (Legacy Factory)", () => {
  let agent: ReturnType<typeof createSceneHeaderAgent>;

  beforeEach(() => {
    agent = createSceneHeaderAgent();
  });

  describe("parse", () => {
    it("should parse valid scene header", () => {
      const result = agent.parse("مشهد 1 - داخلي - ليل");

      expect(result).not.toBeNull();
      expect(result?.sceneNum).toBe("مشهد 1");
    });

    it("should parse scene header with Arabic numerals", () => {
      const result = agent.parse("مشهد ١ - خارجي - نهار");

      expect(result).not.toBeNull();
      expect(result?.sceneNum).toBe("مشهد ١");
    });

    it("should return null for non-scene header", () => {
      const result = agent.parse("هذا ليس رأس مشهد");

      expect(result).toBeNull();
    });

    it("should return null for empty line", () => {
      const result = agent.parse("");

      expect(result).toBeNull();
    });

    it("should handle whitespace-only line", () => {
      const result = agent.parse("   ");

      expect(result).toBeNull();
    });

    it("should extract timeLocation", () => {
      const result = agent.parse("مشهد 5 - داخلي - ليل - غرفة النوم");

      expect(result).not.toBeNull();
      expect(result?.timeLocation).toBeDefined();
    });
  });

  describe("parseMultiLine", () => {
    it("should parse first line as scene header", () => {
      const lines = [
        "مشهد 1 - داخلي - ليل",
        "الغرفة مظلمة",
      ];

      const result = agent.parseMultiLine(lines, 0);

      expect(result).not.toBeNull();
      expect(result?.consumedLines).toBe(1);
    });

    it("should return null when start line is not scene header", () => {
      const lines = [
        "هذا ليس رأس مشهد",
        "مشهد 1",
      ];

      const result = agent.parseMultiLine(lines, 0);

      expect(result).toBeNull();
    });
  });

  describe("format", () => {
    it("should format scene header parts", () => {
      const parts = {
        sceneNum: "مشهد 1",
        timeLocation: "داخلي - ليل",
      };

      const result = agent.format(parts);

      expect(result).toBe("مشهد 1 - داخلي - ليل");
    });

    it("should format scene number only", () => {
      const parts = {
        sceneNum: "مشهد 3",
      };

      const result = agent.format(parts);

      expect(result).toBe("مشهد 3");
    });
  });
});
