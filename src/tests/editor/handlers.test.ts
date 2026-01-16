// src/tests/editor/handlers.test.ts
// ==================================
// Tests for editor handlers
// التحقق من التطابق السلوكي 1:1 مع THEEditor.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHandleKeyDown } from "../../editor/handlers/keyboardHandlers";
import { AdvancedSearchEngine } from "../../systems/state/AdvancedSearchEngine";

describe("Keyboard Handlers", () => {
  describe("createHandleKeyDown", () => {
    let mockApplyFormat: ReturnType<typeof vi.fn>;
    let mockFormatText: ReturnType<typeof vi.fn>;
    let mockSetShowSearchDialog: ReturnType<typeof vi.fn>;
    let mockSetShowReplaceDialog: ReturnType<typeof vi.fn>;
    let mockUpdateContent: ReturnType<typeof vi.fn>;
    let mockGetNextFormatOnTab: ReturnType<typeof vi.fn>;
    let mockGetNextFormatOnEnter: ReturnType<typeof vi.fn>;
    let handleKeyDown: (e: React.KeyboardEvent) => void;

    beforeEach(() => {
      mockApplyFormat = vi.fn();
      mockFormatText = vi.fn();
      mockSetShowSearchDialog = vi.fn();
      mockSetShowReplaceDialog = vi.fn();
      mockUpdateContent = vi.fn();
      mockGetNextFormatOnTab = vi.fn().mockReturnValue("dialogue");
      mockGetNextFormatOnEnter = vi.fn().mockReturnValue("action");

      handleKeyDown = createHandleKeyDown(
        "character",
        mockGetNextFormatOnTab,
        mockGetNextFormatOnEnter,
        mockApplyFormat,
        mockFormatText,
        mockSetShowSearchDialog,
        mockSetShowReplaceDialog,
        mockUpdateContent
      );
    });

    it("should handle Tab key", () => {
      const mockEvent = {
        key: "Tab",
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockGetNextFormatOnTab).toHaveBeenCalledWith("character", false);
      expect(mockApplyFormat).toHaveBeenCalledWith("dialogue", false);
    });

    it("should handle Shift+Tab key", () => {
      const mockEvent = {
        key: "Tab",
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockGetNextFormatOnTab).toHaveBeenCalledWith("character", true);
    });

    it("should handle Enter key", () => {
      const mockEvent = {
        key: "Enter",
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockGetNextFormatOnEnter).toHaveBeenCalledWith("character");
      expect(mockApplyFormat).toHaveBeenCalledWith("action", true);
    });

    it("should handle Ctrl+B for bold", () => {
      const mockEvent = {
        key: "b",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockFormatText).toHaveBeenCalledWith("bold");
    });

    it("should handle Ctrl+I for italic", () => {
      const mockEvent = {
        key: "i",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockFormatText).toHaveBeenCalledWith("italic");
    });

    it("should handle Ctrl+U for underline", () => {
      const mockEvent = {
        key: "u",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockFormatText).toHaveBeenCalledWith("underline");
    });

    it("should handle Ctrl+1 for scene-header-top-line", () => {
      const mockEvent = {
        key: "1",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockApplyFormat).toHaveBeenCalledWith("scene-header-top-line");
    });

    it("should handle Ctrl+2 for character", () => {
      const mockEvent = {
        key: "2",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockApplyFormat).toHaveBeenCalledWith("character");
    });

    it("should handle Ctrl+3 for dialogue", () => {
      const mockEvent = {
        key: "3",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockApplyFormat).toHaveBeenCalledWith("dialogue");
    });

    it("should handle Ctrl+4 for action", () => {
      const mockEvent = {
        key: "4",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockApplyFormat).toHaveBeenCalledWith("action");
    });

    it("should handle Ctrl+6 for transition", () => {
      const mockEvent = {
        key: "6",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockApplyFormat).toHaveBeenCalledWith("transition");
    });

    it("should handle Ctrl+F for search dialog", () => {
      const mockEvent = {
        key: "f",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockSetShowSearchDialog).toHaveBeenCalledWith(true);
    });

    it("should handle Ctrl+H for replace dialog", () => {
      const mockEvent = {
        key: "h",
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyDown(mockEvent);

      expect(mockSetShowReplaceDialog).toHaveBeenCalledWith(true);
    });
  });
});

describe("AdvancedSearchEngine - searchInContent", () => {
  let searchEngine: AdvancedSearchEngine;

  beforeEach(() => {
    searchEngine = new AdvancedSearchEngine();
  });

  it("should find matches in content", async () => {
    const content = "هذا نص عربي يحتوي على كلمة البحث";
    const result = await searchEngine.searchInContent(content, "البحث");

    expect(result.success).toBe(true);
    expect(result.totalMatches).toBe(1);
  });

  it("should return 0 matches when term not found", async () => {
    const content = "هذا نص عربي";
    const result = await searchEngine.searchInContent(content, "غير موجود");

    expect(result.success).toBe(true);
    expect(result.totalMatches).toBe(0);
  });

  it("should handle empty search term", async () => {
    const content = "هذا نص عربي";
    const result = await searchEngine.searchInContent(content, "   ");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should find multiple matches", async () => {
    const content = "كلمة ثم كلمة ثم كلمة";
    const result = await searchEngine.searchInContent(content, "كلمة");

    expect(result.success).toBe(true);
    expect(result.totalMatches).toBe(3);
  });
});

describe("AdvancedSearchEngine - replaceInContent", () => {
  let searchEngine: AdvancedSearchEngine;

  beforeEach(() => {
    searchEngine = new AdvancedSearchEngine();
  });

  it("should return replace pattern info", async () => {
    const content = "النص الأصلي";
    const result = await searchEngine.replaceInContent(content, "الأصلي", "الجديد");

    expect(result.success).toBe(true);
    expect(result.patternSource).toBeDefined();
    expect(result.patternFlags).toBe("gi");
    expect(result.replaceText).toBe("الجديد");
    expect(result.replaceAll).toBe(true);
  });

  it("should handle empty search term", async () => {
    const content = "النص";
    const result = await searchEngine.replaceInContent(content, "  ", "بديل");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should escape special regex characters", async () => {
    const content = "test (parenthesis)";
    const result = await searchEngine.replaceInContent(content, "(parenthesis)", "replaced");

    expect(result.success).toBe(true);
    // Pattern should be escaped
    expect(result.patternSource).toContain("\\(");
    expect(result.patternSource).toContain("\\)");
  });
});
