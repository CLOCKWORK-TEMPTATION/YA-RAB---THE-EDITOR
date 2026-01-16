// src/editor/agents/SceneHeaderAgent.ts
// =====================================
// Scene Header Agent from THEEditor.tsx
//
// Responsibilities:
// - Parse complex Arabic scene headers
// - Handle multi-line scene headers
// - Extract scene metadata
//
// NO classification logic
// NO state management

export interface SceneHeaderParts {
  sceneNumber: string;
  interior?: boolean;
  exterior?: boolean;
  location?: string;
  time?: string;
  photomontage?: boolean;
  remainder?: string;
}

export interface SceneHeaderAgent {
  parse: (line: string) => SceneHeaderParts | null;
  parseMultiLine: (lines: string[], startIndex: number) => { parts: SceneHeaderParts; consumedLines: number } | null;
  format: (parts: SceneHeaderParts) => string;
}

export function createSceneHeaderAgent(): SceneHeaderAgent {
  const SCENE_PREFIX_RE = /^\s*(?:مشهد|م\.|scene)\s*([0-9٠-٩]+)\s*(?:[-–—:،]\s*)?(.*)$/i;
  const INTERIOR_RE = /(داخلي|د\.|interior|int\.)/i;
  const EXTERIOR_RE = /(خارجي|خ\.|exterior|ext\.)/i;
  const TIME_RE = /(ليل|نهار|ل\.|ن\.|صباح|مساء|فجر|ظهر|عصر|مغرب|عشاء|morning|evening|day|night)/i;
  const PHOTOMONTAGE_RE = /\(?\s*فوتو\s*مونتاج\s*\)?/i;

  function parse(line: string): SceneHeaderParts | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const match = trimmed.match(SCENE_PREFIX_RE);
    if (!match) return null;

    const sceneNumber = match[1];
    const remainder = match[2] || '';

    const parts: SceneHeaderParts = {
      sceneNumber: `مشهد ${sceneNumber}`
    };

    // Check for photomontage
    if (PHOTOMONTAGE_RE.test(remainder)) {
      parts.photomontage = true;
    }

    // Extract interior/exterior
    if (INTERIOR_RE.test(remainder)) {
      parts.interior = true;
    }
    if (EXTERIOR_RE.test(remainder)) {
      parts.exterior = true;
    }

    // Extract time
    const timeMatch = remainder.match(TIME_RE);
    if (timeMatch) {
      parts.time = timeMatch[0];
    }

    // Extract location (remove time, interior/exterior, photomontage)
    let location = remainder;
    location = location.replace(PHOTOMONTAGE_RE, '');
    location = location.replace(INTERIOR_RE, '');
    location = location.replace(EXTERIOR_RE, '');
    location = location.replace(TIME_RE, '');
    location = location.replace(/^[-–—:\s,]+|[-–—:\s,]+$/g, '');
    
    if (location) {
      parts.location = location.trim();
    }

    // Store any remaining text
    const cleaned = remainder.replace(/[-–—:\s,]+/g, ' ').trim();
    if (cleaned && !parts.location && !parts.time) {
      parts.remainder = cleaned;
    }

    return parts;
  }

  function parseMultiLine(lines: string[], startIndex: number): { parts: SceneHeaderParts; consumedLines: number } | null {
    const firstParse = parse(lines[startIndex]);
    if (!firstParse) return null;

    let parts = firstParse;
    let consumedLines = 1;
    let i = startIndex + 1;

    // Continue parsing if we have a remainder or incomplete parts
    while (i < lines.length && consumedLines < 5) { // Max 5 lines for scene header
      const line = lines[i].trim();
      if (!line) break;

      // If line looks like a new scene, stop
      if (SCENE_PREFIX_RE.test(line)) break;

      // Try to extract missing information
      if (!parts.location && !parts.time && !parts.remainder) {
        // This line might be the location
        parts.location = line;
        consumedLines++;
        i++;
        continue;
      }

      // If we have location but no time, check for time
      if (parts.location && !parts.time) {
        const timeMatch = line.match(TIME_RE);
        if (timeMatch) {
          parts.time = timeMatch[0];
          consumedLines++;
          i++;
          continue;
        }
      }

      // Otherwise, add to remainder
      if (parts.remainder) {
        parts.remainder += ' ' + line;
      } else {
        parts.remainder = line;
      }
      consumedLines++;
      i++;
    }

    return { parts, consumedLines };
  }

  function format(parts: SceneHeaderParts): string {
    let result = parts.sceneNumber;

    const elements: string[] = [];
    
    if (parts.interior) elements.push('داخلي');
    if (parts.exterior) elements.push('خارجي');
    if (parts.location) elements.push(parts.location);
    if (parts.time) elements.push(parts.time);

    if (elements.length > 0) {
      result += ' - ' + elements.join(' - ');
    }

    if (parts.photomontage) {
      result += ' (فوتو مونتاج)';
    }

    if (parts.remainder) {
      result += ' ' + parts.remainder;
    }

    return result;
  }

  return {
    parse,
    parseMultiLine,
    format
  };
}
