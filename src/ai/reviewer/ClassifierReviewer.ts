// src/ai/reviewer/ClassifierReviewer.ts
// ================================================
// LLM-based Classifier Reviewer
//
// Extracted from THEditor.tsx lines 6033-6507
// 1:1 migration - exact behavior preserved
//
// Responsibilities:
// - Review classifications using LLM
// - Build review prompts
// - Parse LLM responses
// - Calculate doubt scores
// - Handle retry logic with backoff

import type { ViterbiState } from "../../types";

export interface ClassifiedLine {
  lineNumber: number;
  text: string;
  currentType: string;
  doubtScore?: number;
  emissionScore?: number;
  type: string;
}

export interface ReviewPerformanceStats {
  totalLines: number;
  reviewedLines: number;
  changedLines: number;
  totalTimeMs: number;
  averageTimePerLine: number;
  apiCalls: number;
}

export interface ReviewResult {
  originalIndex: number;
  originalType: string;
  suggestedType: ViterbiState;
  confidence: number;
  reason: string;
}

export interface ReviewLineWithContext {
  index: number;
  line: ClassifiedLine;
  before: ClassifiedLine[];
  after: ClassifiedLine[];
}

/**
 * @class ClassifierReviewer
 * @description مراجع التصنيف باستخدام LLM
 *
 * يستخدم نموذج لغوي لمراجعة التصنيفات المشكوك فيها
 * ويقترح تصحيحات بناءً على فهمه العميق للسيناريو العربي
 */
export class ClassifierReviewer {
  private static readonly API_ENDPOINT =
    typeof window !== "undefined" ? "/api/ai/chat" : "http://localhost:5000/api/ai/chat";

  // النماذج المتاحة - يمكن تغييرها حسب الحاجة
  private static readonly AVAILABLE_MODELS = {
    "gemini-1.5-flash": "gemini-1.5-flash",
    "gemini-1.5-pro": "gemini-1.5-pro",
    "gemini-3-flash-preview": "gemini-3-flash-preview",
  } as const;

  // النموذج - يُقرأ من متغيرات البيئة أو يستخدم القيمة الافتراضية
  private static MODEL =
    (typeof window !== "undefined"
      ? (process?.env?.NEXT_PUBLIC_GEMINI_MODEL as string)
      : (process?.env?.GEMINI_MODEL as string)) || "gemini-1.5-flash";

  private static readonly DOUBT_THRESHOLD = 30; // مستوى الشك الذي يستدعي المراجعة

  // Retry constants
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 1000;
  private static readonly MAX_TIMEOUT_MS = 30000;

  /**
   * تغيير النموذج المستخدم
   */
  static setModel(model: keyof typeof ClassifierReviewer.AVAILABLE_MODELS): void {
    this.MODEL = this.AVAILABLE_MODELS[model];
  }

  /**
   * الحصول على النموذج الحالي
   */
  static getModel(): string {
    return this.MODEL;
  }

  /**
   * مراجعة التصنيف باستخدام LLM
   */
  static async reviewClassification(
    lines: ClassifiedLine[],
    options: {
      reviewAll?: boolean; // مراجعة كل الأسطر أم فقط المشكوك فيها
      doubtThreshold?: number; // حد الشك (0-100)
      enablePerformanceTracking?: boolean;
    } = {},
  ): Promise<{
    reviewed: ClassifiedLine[];
    stats: ReviewPerformanceStats;
  }> {
    const startTime = performance.now();
    const {
      reviewAll = false,
      doubtThreshold = this.DOUBT_THRESHOLD,
      enablePerformanceTracking = true,
    } = options;

    // تحديد الأسطر التي تحتاج مراجعة
    const linesToReview = reviewAll
      ? lines
      : lines.filter((line) => {
          const doubt = (line as { doubtScore?: number }).doubtScore || 0;

          // الخطوة 7: تخفيض استدعاء AI - تخطي scene-header-3 ذات الدرجة العالية
          if (line.type === "scene-header-3") {
            const emissionScore = (line as { emissionScore?: number }).emissionScore || 0;
            // VERB_RE is imported from the main file, checking inline here
            const VERB_RE = /(يدخل|يخرج|يقف|يجلس|ينظر|يتحرك|يقترب|يبتعد|يركض|يمشي|يتحدث|يصرخ)/;
            if (emissionScore >= 70 && !VERB_RE.test(line.text)) {
              return false; // تخطي المراجعة
            }
          }

          return doubt >= doubtThreshold;
        });

    if (linesToReview.length === 0) {
      return {
        reviewed: lines,
        stats: {
          totalLines: lines.length,
          reviewedLines: 0,
          changedLines: 0,
          totalTimeMs: 0,
          averageTimePerLine: 0,
          apiCalls: 0,
        },
      };
    }

    // تقسيم إلى دفعات (batch) لتقليل عدد الطلبات
    const batchSize = 20;
    const batches: ClassifiedLine[][] = [];
    for (let i = 0; i < linesToReview.length; i += batchSize) {
      batches.push(linesToReview.slice(i, i + batchSize));
    }

    let apiCalls = 0;
    let changedLines = 0;
    const reviewedMap = new Map<number, ClassifiedLine>();

    // معالجة كل دفعة
    for (const batch of batches) {
      try {
        const batchResults = await this.reviewBatch(batch, lines);
        apiCalls++;

        // تطبيق التغييرات
        for (const result of batchResults) {
          if (result.suggestedType !== result.originalType) {
            const originalLine = lines[result.originalIndex];
            reviewedMap.set(result.originalIndex, {
              ...originalLine,
              type: result.suggestedType,
              // حفظ معلومات المراجعة
            } as ClassifiedLine & { _reviewInfo: unknown });
            changedLines++;
          }
        }
      } catch (error) {
        console.error("خطأ في مراجعة الدفعة:", error);
      }
    }

    // دمج النتائج
    const reviewed = lines.map((line, index) => {
      return reviewedMap.get(index) || line;
    });

    const endTime = performance.now();
    const totalTimeMs = endTime - startTime;

    const stats: ReviewPerformanceStats = {
      totalLines: lines.length,
      reviewedLines: linesToReview.length,
      changedLines,
      totalTimeMs,
      averageTimePerLine: linesToReview.length > 0 ? totalTimeMs / linesToReview.length : 0,
      apiCalls,
    };

    if (enablePerformanceTracking) {
      console.log("📊 إحصائيات مراجعة التصنيف:", {
        ...stats,
        changeRate: `${((changedLines / linesToReview.length) * 100).toFixed(1)}%`,
      });
    }

    return { reviewed, stats };
  }

  /**
   * مراجعة دفعة من الأسطر
   */
  private static async reviewBatch(
    batch: ClassifiedLine[],
    allLines: ClassifiedLine[],
  ): Promise<ReviewResult[]> {
    // بناء السياق (3 أسطر قبل وبعد كل سطر)
    const contextWindow = 3;
    const batchWithContext = batch.map((line) => {
      const index = allLines.indexOf(line);
      const before = allLines.slice(Math.max(0, index - contextWindow), index);
      const after = allLines.slice(index + 1, index + 1 + contextWindow);

      return {
        index,
        line,
        before,
        after,
      };
    });

    const prompt = this.buildReviewPrompt(batchWithContext);

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          model: this.MODEL,
          temperature: 0.1, // نريد إجابات دقيقة وثابتة
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content || data.message || "";

      return this.parseReviewResponse(content, batch, allLines);
    } catch (error) {
      console.error("خطأ في استدعاء API:", error);
      return [];
    }
  }

  /**
   * بناء prompt للمراجعة - نسخة محسّنة وشاملة
   */
  private static buildReviewPrompt(
    batchWithContext: ReviewLineWithContext[],
  ): string {
    return `أنت خبير متخصص في تصنيف نصوص السيناريو العربية باستخدام نظام تصنيف متقدم. مهمتك مراجعة التصنيف الأولي بدقة عالية وتصحيح أي أخطاء.

## 📋 أنواع التصنيف المتاحة (11 نوع):

### 1️⃣ رؤوس المشاهد (Scene Headers)
- **scene-header-top-line**: السطر الأول الكامل من رأس المشهد
  - مثال: "مشهد 1: منزل عبد العزيز نواف"
  - يحتوي على: رقم المشهد + وصف اختياري

- **scene-header-1**: رقم المشهد فقط (سطر منفصل)
  - مثال: "مشهد 1" أو "م. 5"
  - قصير جداً (2-3 كلمات)

- **scene-header-2**: وصف المكان/الزمن (داخلي/خارجي - ليل/نهار)
  - مثال: "داخلي - نهار" أو "خارجي - ليل"
  - يحتوي على كلمات: داخلي، خارجي، ليل، نهار، صباح، مساء

- **scene-header-3**: سطر المكان الكامل (أساسي أو فرعي)
  - مثال: "منزل عبد العزيز - غرفة المكتب" (سطر واحد) أو "الشارع الرئيسي" أو "غرفة النوم"
  - **مهم جداً**: إذا كان السطر يحتوي على شرطة (–) بعد اسم مكان، فالجزء بعد الشرطة هو **استكمال للمكان** وليس action
  - يبدأ عادة بكلمات: منزل، بيت، شارع، غرفة، مكتب، مطعم، مقهى، حديقة، مدرسة، جامعة، مستشفى، داخل، في، أمام

### 2️⃣ الشخصيات والحوار
- **character**: اسم الشخصية
  - مثال: "عبد العزيز:" أو "نواف" أو "صوت رجل:"
  - قصير (1-4 كلمات)
  - قد ينتهي بـ : أو بدونها
  - يأتي **قبل** dialogue مباشرة
  - لا يبدأ بفعل حركي

- **dialogue**: حوار الشخصية
  - مثال: "أين وضعت الملفات؟"
  - يأتي **بعد** character مباشرة
  - قد يكون سؤال أو جملة عادية
  - لا يبدأ عادة بفعل حركي (إلا في حالات نادرة)

- **parenthetical**: ملاحظة إخراجية (بين قوسين)
  - مثال: "(بصوت منخفض)" أو "(يبتسم)"
  - **دائماً** بين قوسين
  - يأتي بين character و dialogue أو داخل dialogue

### 3️⃣ الوصف والحركة
- **action**: وصف الحركة/المشهد
  - مثال: "يدخل عبد العزيز إلى الغرفة ببطء."
  - يبدأ عادة بفعل حركي: يدخل، يخرج، ينظر، يجلس، تقف، يمشي
  - أو وصف المشهد: "الغرفة مظلمة والستائر مغلقة"
  - **ليس** اسم مكان (إذا كان اسم مكان → scene-header-3)

### 4️⃣ أخرى
- **transition**: انتقال مشهدي
  - مثال: "قطع إلى" أو "يتلاشى" أو "CUT TO:"
  - قصير جداً (1-3 كلمات)
  - كلمات محددة: قطع، مزج، ذوبان، يتلاشى

- **blank**: سطر فارغ
  - لا يحتوي على أي نص
  - يستخدم للفصل بين العناصر

## 🎯 قواعد التصنيف الذكية:

### قاعدة 1: التسلسل المنطقي
- scene-header-top-line → (blank) → scene-header-2 → (blank) → scene-header-3 → (blank) → action
- أو: scene-header-1 → scene-header-2 → scene-header-3 → action
- character → dialogue (أو parenthetical → dialogue)
- action → action (يمكن تكرار action)

### قاعدة 2: الشرطة في أسماء الأماكن ⚠️
**مهم جداً**: إذا رأيت سطراً مثل:
- "منزل عبد العزيز – غرفة المكتب"
- "الشارع الرئيسي - أمام المحل"
- "المدرسة – الفصل الأول"

هذا **scene-header-3** وليس action! الجزء بعد الشرطة هو تفصيل للمكان.

### قاعدة 3: الأفعال الحركية
إذا بدأ السطر بفعل حركي (يدخل، يخرج، ينظر، يجلس، تقف...):
- إذا كان بعد character → قد يكون parenthetical (إذا بين قوسين) أو action
- إذا لم يكن بعد character → action

### قاعدة 4: السياق
- إذا كان السطر بعد scene-header-2 وقصير ويحتوي على اسم مكان → scene-header-3
- إذا كان السطر قصير (1-3 كلمات) ولا يحتوي على فعل → قد يكون character أو scene-header-3
- إذا كان السطر بعد character مباشرة → dialogue (إلا إذا كان بين قوسين → parenthetical)

### قاعدة 5: علامات الترقيم
- character: قد ينتهي بـ : أو بدونها
- dialogue: قد ينتهي بـ . أو ؟ أو ! أو بدون علامة
- action: عادة ينتهي بـ .
- scene-header-3: **لا** ينتهي بعلامة ترقيم


## 📊 الأسطر المطلوب مراجعتها:

${batchWithContext
  .map(({ index, line, before, after }) => {
    // تحليل السطر
    const wordCount = line.text.trim().split(/\s+/).length;
    const hasDash = /[-–—]/.test(line.text);
    const hasColon = /[:：]/.test(line.text);
    const hasParentheses = /[\(\)]/.test(line.text);
    const startsWithVerb =
      /^(يدخل|يخرج|ينظر|يرفع|تبتسم|ترقد|تقف|يبسم|يضع|يقول|تنظر|تربت|تقوم|يشق|تشق|تضرب|يسحب|يلتفت|يقف|يجلس|تجلس|يجري|تجري|يمشي|تمشي)/.test(
        line.text.trim(),
      );
    const hasPlaceWord =
      /(منزل|بيت|شارع|غرفة|مكتب|مطعم|مقهى|حديقة|مدرسة|جامعة|مستشفى|محل|شقة|قاعة|ممر|سطح|ساحة)/.test(
        line.text,
      );

    // تحليل السياق
    const prevType = before.length > 0 ? before[before.length - 1].type : "none";
    const nextType = after.length > 0 ? after[0].type : "none";

    return `
### 📝 السطر #${index}
**التصنيف الحالي:** ${line.type}
**النص:** "${line.text}"
**التحليل السريع:**
  • عدد الكلمات: ${wordCount}
  • يحتوي على شرطة: ${hasDash ? "نعم ⚠️" : "لا"}
  • يحتوي على نقطتين: ${hasColon ? "نعم" : "لا"}
  • يحتوي على أقواس: ${hasParentheses ? "نعم" : "لا"}
  • يبدأ بفعل حركي: ${startsWithVerb ? "نعم" : "لا"}
  • يحتوي على كلمة مكان: ${hasPlaceWord ? "نعم ⚠️" : "لا"}

**السياق:**
  • النوع السابق: ${prevType}
  • النوع اللاحق: ${nextType}

**الأسطر السابقة:**
${before.map((l, i) => `  ${i + 1}. [${l.type}] "${l.text}"`).join("\n") || "  (بداية المستند)"}

**الأسطر اللاحقة:**
${after.map((l, i) => `  ${i + 1}. [${l.type}] "${l.text}"`).join("\n") || "  (نهاية المستند)"}
`;
  })
  .join("\n" + "=".repeat(60) + "\n")}

## المطلوب:
أرجع JSON فقط بهذا الشكل (بدون أي نص إضافي):
\`\`\`json
[
  {
    "index": رقم_السطر,
    "suggestedType": "النوع_المقترح",
    "confidence": نسبة_الثقة_من_0_إلى_100,
    "reason": "سبب_التغيير_أو_keep_if_correct"
  }
]
\`\`\`

**ملاحظة:** إذا كان التصنيف الحالي صحيح، ضع نفس النوع في suggestedType.`;
  }

  /**
   * تحليل استجابة LLM
   */
  private static parseReviewResponse(
    content: string,
    batch: ClassifiedLine[],
    allLines: ClassifiedLine[],
  ): ReviewResult[] {
    try {
      // استخراج JSON من الاستجابة
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : content;

      const parsed = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        throw new Error("الاستجابة ليست مصفوفة");
      }

      return parsed
        .map((item: {
          index: number;
          originalText: string;
          suggestion: string;
          suggestedType?: string;
          confidence: number;
          reason: string;
          severity: string;
        }) => {
          const originalLine = allLines[item.index];
          if (!originalLine) return null;

          return {
            originalIndex: item.index,
            originalType: originalLine.type,
            suggestedType: (item.suggestedType || item.suggestion) as ViterbiState,
            confidence: item.confidence || 50,
            reason: item.reason || "no reason provided",
          };
        })
        .filter((r): r is ReviewResult => r !== null);
    } catch (error) {
      console.error("خطأ في تحليل استجابة LLM:", error);
      console.log("المحتوى المستلم:", content);
      return [];
    }
  }

  /**
   * حساب درجة الشك بناءً على السطر والسياق
   */
  static calculateDoubtScore(
    line: ClassifiedLine,
    context: {
      prevLine?: ClassifiedLine;
      nextLine?: ClassifiedLine;
      emissions?: { [state in ViterbiState]?: number };
    },
  ): number {
    let doubtScore = 0;

    // 1. فحص الانبعاثات إذا كانت متاحة
    if (context.emissions) {
      const sortedEmissions = Object.entries(context.emissions).sort(
        (a, b) => (b[1] || 0) - (a[1] || 0),
      );

      if (sortedEmissions.length >= 2) {
        const diff = (sortedEmissions[0][1] || 0) - (sortedEmissions[1][1] || 0);
        if (diff < 0.15) doubtScore += 40;
        else if (diff < 0.25) doubtScore += 25;
      }
    }

    // 2. فحص السياق
    if (context.prevLine && context.nextLine) {
      const isInDialogue =
        context.prevLine.type === "character" && context.nextLine.type === "dialogue";
      if (isInDialogue && line.type !== "parenthetical" && line.type !== "dialogue") {
        doubtScore += 30;
      }
    }

    // 3. فحص طول النص
    const wordCount = line.text.trim().split(/\s+/).length;
    if (wordCount <= 2) doubtScore += 20;

    return Math.min(doubtScore, 100);
  }

  /**
   * الخيار 2: حساب doubtScore هجين (قواعد + AI)
   */
  static async calculateDoubtScoreHybrid(
    line: ClassifiedLine,
    context: {
      prevLine?: ClassifiedLine;
      nextLine?: ClassifiedLine;
      emissions?: { [state in ViterbiState]?: number };
    },
  ): Promise<number> {
    // 1. حساب الشك بالقواعد فقط (AI معطل مؤقتاً لتجنب أخطاء 502)
    const ruleBasedDoubt = this.calculateDoubtScore(line, context);

    // TODO: إعادة تفعيل AI doubt calculation بعد حل مشكلة 502
    // if (ruleBasedDoubt >= 20 && ruleBasedDoubt <= 60) {
    //   try {
    //     const aiDoubt = await this.calculateDoubtScoreWithAI(line, context);
    //     return Math.round(ruleBasedDoubt * 0.4 + aiDoubt * 0.6);
    //   } catch (error) {
    //     console.error('خطأ في حساب AI doubt:', error);
    //     return ruleBasedDoubt;
    //   }
    // }

    return ruleBasedDoubt;
  }
}
