// src/engine/classifier/action.ts
// ===============================
// Action Classifier (Pure)
//
// Determines whether a line can be Action.
// Stateless. No flow. No state mutation.
// Dialogue block info is passed in, not computed here.

export interface DialogueBlockInfo {
  isInDialogueBlock: boolean;
  blockStartType: string | null;
  distanceFromCharacter: number;
}

const DASH_START_RE = /^[\s]*[-–—−‒―]/;

// نسخة مصغّرة من VERB_RE (كما في المونوليث)
const ACTION_VERB_RE =
  /(يدخل|يخرج|يقف|يجلس|ينظر|يتحرك|يقترب|يبتعد|يركض|يمشي|يتحدث|يصرخ|تدخل|تخرج|تقف|تجلس|تنظر|تتحرك|تقترب|تبتعد|تركض|تمشي|تتحدث|تصرخ)/;

/**
 * Checks whether a line can be Action.
 * @param rawLine Original line text
 * @param dialogueBlockInfo Dialogue block context
 */
export function isAction(
  rawLine: string,
  dialogueBlockInfo: DialogueBlockInfo,
): boolean {
  if (!rawLine) return false;

  const trimmed = rawLine.trim();
  if (!trimmed) return false;

  // 1) يبدأ بشرطة
  if (DASH_START_RE.test(rawLine)) {
    // داخل بلوك الحوار → ليست Action
    if (dialogueBlockInfo.isInDialogueBlock) {
      return false;
    }

    // خارج بلوك الحوار → Action محتمل
    const withoutDash = rawLine.replace(DASH_START_RE, "").trim();

    // فعل بعد الشرطة = Action قوي
    if (ACTION_VERB_RE.test(withoutDash)) {
      return true;
    }

    // حتى بدون فعل صريح، الشرطة خارج الحوار تميل للأكشن
    return true;
  }

  // 2) بدون شرطة: لا نقرر Action هنا
  // (المنطق اللغوي الكامل ييجي لاحقًا في flow/scoring)
  return false;
}
