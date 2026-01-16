// ===== Scene Header Regex Parts =====

export const SCENE_PREFIX_RE =
  /^\s*(?:مشهد|م\.|scene)\s*([0-9٠-٩]+)\s*(?:[-–—:،]\s*)?(.*)$/i;

export const INOUT_PART = "(?:داخلي|خارجي|د\\.|خ\\.)";

export const TIME_PART =
  "(?:ليل|نهار|ل\\.|ن\\.|صباح|مساء|فجر|ظهر|عصر|مغرب|عشاء|الغروب|الفجر)";

export const HEADER_PART_ANY = `(?:${INOUT_PART}|${TIME_PART})`;

export const TL_REGEX = new RegExp(
  `(?:${HEADER_PART_ANY}\\s*[-/&]\\s*)+${HEADER_PART_ANY}|${HEADER_PART_ANY}\\s*[-/&]\\s*${HEADER_PART_ANY}`,
  "i",
);

export const PHOTOMONTAGE_PART_RE =
  /^\s*[\(\)]*\s*(?:فوتو\s*مونتاج|Photomontage)\s*[\(\)]*/i;

// ===== Scene Header Parsing =====

export function parseSceneHeaderFromLine(rawLine: string): {
  sceneNum: string;
  timeLocation: string | null;
  placeInline: string | null;
} | null {
  const cleaned = normalizeLine(rawLine);
  const m = cleaned.match(SCENE_PREFIX_RE);
  if (!m) return null;

  const prefixMatch = cleaned.match(/^\s*(مشهد|م\.|scene)\s*/i);
  const prefix = (prefixMatch?.[1] || "مشهد").trim();
  const num = (m[1] || "").trim();
  let sceneNum = `${prefix} ${num}`.replace(/\s+/g, " ").trim();

  let rest = (m[2] || "").trim();

  const pmMatch = rest.match(PHOTOMONTAGE_PART_RE);
  if (pmMatch) {
    const inner = pmMatch[0].replace(/^[\(\)]+|[\(\)]+$/g, "").trim();
    sceneNum = `${sceneNum} (${inner})`;
    rest = rest.substring(pmMatch[0].length).trim();
  }

  if (!rest) {
    return { sceneNum, timeLocation: null, placeInline: null };
  }

  const tlMatch = rest.match(TL_REGEX);
  if (tlMatch) {
    const timeLocation = tlMatch[0].trim();
    const remainder = cleanupSceneHeaderRemainder(
      rest.replace(tlMatch[0], " "),
    );
    return {
      sceneNum,
      timeLocation,
      placeInline: remainder || null,
    };
  }

  const inOutOnlyRe = new RegExp(`^\\s*${INOUT_PART}\\s*$`, "i");
  const timeOnlyRe = new RegExp(`^\\s*${TIME_PART}\\s*$`, "i");

  if (inOutOnlyRe.test(rest) || timeOnlyRe.test(rest)) {
    return { sceneNum, timeLocation: rest.trim(), placeInline: null };
  }

  return {
    sceneNum,
    timeLocation: null,
    placeInline: cleanupSceneHeaderRemainder(rest) || null,
  };
}

export function extractSceneHeaderParts(
  lines: string[],
  startIndex: number,
): {
  sceneNum: string;
  timeLocation: string;
  place: string;
  consumedLines: number;
  remainingAction?: string;
} | null {
  const parsed = parseSceneHeaderFromLine(lines[startIndex] || "");
  if (!parsed) return null;

  let timeLocation = parsed.timeLocation || "";
  const placeParts: string[] = [];
  if (parsed.placeInline) placeParts.push(parsed.placeInline);

  let currentSceneNum = parsed.sceneNum;
  let consumedLines = 1;
  let remainingAction: string | undefined;

  for (let i = startIndex + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (isBlank(raw)) break;

    let line = normalizeLine(raw);
    if (!line) break;

    const pmMatch = line.match(PHOTOMONTAGE_PART_RE);
    if (pmMatch) {
      const inner = pmMatch[0].replace(/^[\(\)]+|[\(\)]+$/g, "").trim();
      currentSceneNum = `${currentSceneNum} (${inner})`;
      line = cleanupSceneHeaderRemainder(line.substring(pmMatch[0].length));
      if (!line) {
        consumedLines++;
        continue;
      }
    }

    const isParen = line.startsWith("(") && line.endsWith(")");
    const text = isParen ? line.slice(1, -1).trim() : line;

    const inOutOnlyRe = new RegExp(`^\\s*${INOUT_PART}\\s*$`, "i");
    const timeOnlyRe = new RegExp(`^\\s*${TIME_PART}\\s*$`, "i");

    if (!timeLocation || inOutOnlyRe.test(timeLocation) || timeOnlyRe.test(timeLocation)) {
      const tlOnlyRe = new RegExp(`^\\s*${TL_REGEX.source}\\s*$`, "i");

      if (tlOnlyRe.test(text)) {
        timeLocation = text;
        consumedLines++;
        continue;
      }

      if (!timeLocation && (inOutOnlyRe.test(text) || timeOnlyRe.test(text))) {
        timeLocation = text;
        consumedLines++;
        continue;
      }

      if (inOutOnlyRe.test(timeLocation) && timeOnlyRe.test(text)) {
        timeLocation = `${timeLocation} - ${text}`;
        consumedLines++;
        continue;
      }

      if (timeOnlyRe.test(timeLocation) && inOutOnlyRe.test(text)) {
        timeLocation = `${text} - ${timeLocation}`;
        consumedLines++;
        continue;
      }
    }

    if (SCENE_PREFIX_RE.test(line)) break;

    placeParts.push(line);
    consumedLines++;
  }

  return {
    sceneNum: normalizeLine(currentSceneNum),
    timeLocation: normalizeLine(timeLocation),
    place: placeParts.map(cleanupSceneHeaderRemainder).filter(Boolean).join(" - "),
    consumedLines,
    remainingAction,
  };
}

// ===== Helpers (Scene Header Only) =====

export function cleanupSceneHeaderRemainder(input: string): string {
  return normalizeSeparators(input)
    .replace(/^[\s\-–—:،,]+/, "")
    .replace(/[\s\-–—:،,]+$/, "")
    .trim();
}

export function splitSceneHeaderByDash(text: string): {
  mainPlace: string;
  subPlace: string | null;
  actionAfterDash: string | null;
  isActionAfterDash: boolean;
} {
  const parts = text.split(/[-–—]/).map((s) => s.trim());
  const beforeDash = parts[0] || "";
  const afterDash = parts.slice(1).join(" - ").trim() || "";

  return {
    mainPlace: beforeDash,
    subPlace: afterDash || null,
    actionAfterDash: null,
    isActionAfterDash: false,
  };
}

function normalizeLine(input: string): string {
  return normalizeSeparators(input)
    .replace(/[\u200f\u200e\ufeff\t]+/g, "")
    .trim();
}

function normalizeSeparators(s: string): string {
  return s.replace(/[-–—]/g, "-").replace(/[،,]/g, ",").replace(/\s+/g, " ");
}

function isBlank(line: string): boolean {
  return !line || line.trim() === "";
}
