// src/tests/systems/DocumentMemory.test.ts
// ============================================
// Regression Tests for DocumentMemory
//
// These tests verify that the extracted DocumentMemory class
// maintains 1:1 behavioral compatibility with the original
// implementation in THEditor.tsx (lines 5290-5384)

import { describe, it, expect, beforeEach } from "vitest";
import { DocumentMemory } from "../../systems/memory/DocumentMemory";

describe("DocumentMemory - Regression Tests", () => {
  let memory: DocumentMemory;

  beforeEach(() => {
    memory = new DocumentMemory();
  });

  describe("addCharacter", () => {
    it("should add character with high confidence (2 points)", () => {
      memory.addCharacter("أحمد", "high");
      expect(memory.isKnownCharacter("أحمد")).toEqual({ confidence: "medium" }); // 2 = medium
    });

    it("should add character with medium confidence (1 point)", () => {
      memory.addCharacter("أحمد", "medium");
      expect(memory.isKnownCharacter("أحمد")).toEqual({ confidence: "medium" }); // 1 = medium
    });

    it("should increment count for repeated additions", () => {
      memory.addCharacter("أحمد", "high");
      memory.addCharacter("أحمد", "high");
      expect(memory.isKnownCharacter("أحمد")).toEqual({ confidence: "high" }); // 4 = high
    });

    it("should normalize character name by removing trailing colons and spaces", () => {
      memory.addCharacter("أحمد:", "high");
      expect(memory.isKnownCharacter("أحمد")).not.toBeNull();
      expect(memory.isKnownCharacter("أحمد:")).not.toBeNull();
    });

    it("should reject names shorter than 2 characters", () => {
      memory.addCharacter("أ", "high");
      expect(memory.isKnownCharacter("أ")).toBeNull();
    });

    it("should reject empty names", () => {
      memory.addCharacter("", "high");
      memory.addCharacter("   ", "high");
      expect(memory.isKnownCharacter("")).toBeNull();
    });
  });

  describe("isKnownCharacter", () => {
    it("should return null for unknown character", () => {
      expect(memory.isKnownCharacter("أحمد")).toBeNull();
    });

    it("should return high confidence for count >= 3", () => {
      memory.addCharacter("أحمد", "high");
      memory.addCharacter("أحمد", "high");
      expect(memory.isKnownCharacter("أحمد")).toEqual({ confidence: "high" });
    });

    it("should return medium confidence for count >= 1", () => {
      memory.addCharacter("أحمد", "medium");
      expect(memory.isKnownCharacter("أحمد")).toEqual({ confidence: "medium" });
    });

    it("should normalize input before checking", () => {
      memory.addCharacter("أحمد:", "high");
      expect(memory.isKnownCharacter("أحمد")).not.toBeNull();
      expect(memory.isKnownCharacter("أحمد:")).not.toBeNull();
      expect(memory.isKnownCharacter("أحمد   ")).not.toBeNull();
    });
  });

  describe("addPlace", () => {
    it("should add place and increment count", () => {
      memory.addPlace("بيت أحمد");
      expect(memory.isKnownPlace("بيت أحمد")).toBe(true);
    });

    it("should normalize place by trimming", () => {
      memory.addPlace("  بيت أحمد  ");
      expect(memory.isKnownPlace("بيت أحمد")).toBe(true);
    });

    it("should reject places shorter than 2 characters", () => {
      memory.addPlace("أ");
      expect(memory.isKnownPlace("أ")).toBe(false);
    });

    it("should increment count for repeated additions", () => {
      memory.addPlace("بيت أحمد");
      memory.addPlace("بيت أحمد");
      // No direct way to check count, but isKnownPlace should still return true
      expect(memory.isKnownPlace("بيت أحمد")).toBe(true);
    });
  });

  describe("isKnownPlace", () => {
    it("should return false for unknown place", () => {
      expect(memory.isKnownPlace("بيت أحمد")).toBe(false);
    });

    it("should return true for known place", () => {
      memory.addPlace("بيت أحمد");
      expect(memory.isKnownPlace("بيت أحمد")).toBe(true);
    });

    it("should normalize input before checking", () => {
      memory.addPlace("بيت أحمد");
      expect(memory.isKnownPlace("  بيت أحمد  ")).toBe(true);
    });
  });

  describe("getAllCharacters", () => {
    it("should return empty array when no characters added", () => {
      expect(memory.getAllCharacters()).toEqual([]);
    });

    it("should return all added character names", () => {
      memory.addCharacter("أحمد", "high");
      memory.addCharacter("محمد", "high");
      memory.addCharacter("خالد", "high");
      const chars = memory.getAllCharacters();
      expect(chars).toHaveLength(3);
      expect(chars).toContain("أحمد");
      expect(chars).toContain("محمد");
      expect(chars).toContain("خالد");
    });

    it("should return normalized names without colons", () => {
      memory.addCharacter("أحمد:", "high");
      const chars = memory.getAllCharacters();
      expect(chars).toContain("أحمد");
    });
  });

  describe("clear", () => {
    it("should clear all character data", () => {
      memory.addCharacter("أحمد", "high");
      memory.clear();
      expect(memory.isKnownCharacter("أحمد")).toBeNull();
      expect(memory.getAllCharacters()).toEqual([]);
    });

    it("should clear all place data", () => {
      memory.addPlace("بيت أحمد");
      memory.clear();
      expect(memory.isKnownPlace("بيت أحمد")).toBe(false);
    });
  });

  describe("Integration with THEditor.tsx behavior", () => {
    it("should match the behavior for names starting with ي/ت (like ياسين، يوسف، تامر)", () => {
      // This is the primary use case for DocumentMemory
      // Names like ياسين، يوسف، تامر might be misclassified as action
      // DocumentMemory helps by learning these names

      // Simulating: ياسين: is seen multiple times as a character
      memory.addCharacter("ياسين:", "high");
      memory.addCharacter("ياسين:", "high");

      // Should now be recognized as a known character with high confidence
      const status = memory.isKnownCharacter("ياسين");
      expect(status).toEqual({ confidence: "high" });
    });

    it("should handle mixed confidence additions correctly", () => {
      // High + Medium + Medium = 4 points (high confidence)
      memory.addCharacter("ياسين", "high"); // +2
      memory.addCharacter("ياسين", "medium"); // +1
      memory.addCharacter("ياسين", "medium"); // +1

      expect(memory.isKnownCharacter("ياسين")).toEqual({ confidence: "high" });
    });
  });
});
