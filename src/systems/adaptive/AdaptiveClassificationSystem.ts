// src/systems/adaptive/AdaptiveClassificationSystem.ts
// ===========================================================
// Adaptive Classification System (نظام التعلم التكيفي)
//
// Extracted from THEditor.tsx lines 7688-7941
// 1:1 migration - exact behavior preserved
//
// Responsibilities:
// - Record user corrections and learn from them
// - Update pattern weights based on discovered errors
// - Improve classification scores based on previous corrections
// - Alert on repeating error patterns
// - Analyze common error patterns

export interface UserCorrection {
  originalType: string;
  correctedType: string;
  context: {
    previousType: string;
    lineText: string;
  };
  timestamp: Date;
  weight: number;
}

export interface ErrorPattern {
  transition: string;
  wrongType: string;
  correctType: string;
  frequency: number;
}

export interface CommonError {
  pattern: string;
  frequency: number;
  suggestion: string;
}

export interface SystemStatistics {
  totalCorrections: number;
  uniquePatterns: number;
  mostCommonError: { pattern: string; frequency: number } | null;
  averageWeight: number;
}

export interface ExportData {
  corrections: UserCorrection[];
  weights: { [pattern: string]: number };
  exportedAt: string;
}

/**
 * @class AdaptiveClassificationSystem
 * @description نظام التعلم التكيفي - يتعلم من تصحيحات المستخدم ويحسّن دقة التصنيف تدريجياً
 *
 * المميزات:
 * ✅ تسجيل تصحيحات المستخدم وتحليل الأخطاء المتكررة
 * ✅ تعديل أوزان الأنماط بناءً على الأخطاء المكتشفة
 * ✅ تحسين درجات التصنيف بناءً على التعليقات السابقة
 * ✅ تنبيهات عند الأخطاء المتكررة
 * ✅ تحليل الأنماط الخاطئة الشائعة
 */
export class AdaptiveClassificationSystem {
  private userCorrections: UserCorrection[] = [];
  private patternWeights: { [pattern: string]: number } = {};

  /**
   * تسجيل تصحيحات المستخدم والتعلم منها
   * @param lineText نص السطر المصحح
   * @param originalClassification التصنيف الأصلي قبل التصحيح
   * @param userCorrectedClassification التصنيف الصحيح من قبل المستخدم
   * @param previousType نوع السطر السابق (للسياق)
   */
  recordUserCorrection(
    lineText: string,
    originalClassification: string,
    userCorrectedClassification: string,
    previousType: string,
  ): void {
    const correction: UserCorrection = {
      originalType: originalClassification,
      correctedType: userCorrectedClassification,
      context: {
        previousType,
        lineText,
      },
      timestamp: new Date(),
      weight: 1.0, // سيزداد إذا تكررت نفس الخطأ
    };

    this.userCorrections.push(correction);

    // تحديث الأوزان
    this.updateWeights();

    // إذا تكررت نفس الخطأ، زد الوزن
    this.checkForRepeatingPatterns();
  }

  /**
   * تحديث أوزان النمط بناءً على الأخطاء
   * تقليل وزن الأخطاء المتكررة وزيادة وزن التصنيفات الصحيحة
   */
  private updateWeights(): void {
    // تحليل الأخطاء المتكررة
    const errorPatterns = this.identifyErrorPatterns();

    // حساب الأوزان الجديدة
    errorPatterns.forEach((pattern) => {
      const patternKey = `${pattern.transition} -> ${pattern.wrongType}`;
      const correctKey = `${pattern.transition} -> ${pattern.correctType}`;

      // تقليل وزن الخطأ بمعدل 30%
      this.patternWeights[patternKey] = (this.patternWeights[patternKey] || 1) * 0.7;

      // زيادة وزن الصحيح بمعدل 30%
      this.patternWeights[correctKey] = (this.patternWeights[correctKey] || 1) * 1.3;
    });
  }

  /**
   * تحديد الأنماط المتكررة من التصحيحات
   * @returns قائمة الأنماط المتكررة مع تكرارها
   */
  private identifyErrorPatterns(): ErrorPattern[] {
    const patterns: Record<
      string,
      { transition: string; wrongType: string; correctType: string; frequency: number; weight?: number }
    > = {};

    this.userCorrections.forEach((correction) => {
      const key = `${correction.context.previousType}|${correction.originalType}`;

      if (!patterns[key]) {
        patterns[key] = {
          transition: correction.context.previousType,
          wrongType: correction.originalType,
          correctType: correction.correctedType,
          frequency: 0,
        };
      }

      patterns[key].frequency++;
      patterns[key].weight = correction.weight;
    });

    // إرجاع الأنماط المتكررة (أكثر من مرة واحدة)
    return Object.values(patterns).filter((p) => p.frequency > 1);
  }

  /**
   * فحص الأخطاء المتكررة وإصدار تنبيهات عند الحاجة
   * يرسل تنبيهاً عند تكرار الخطأ أكثر من 3 مرات
   */
  private checkForRepeatingPatterns(): void {
    const errorPatterns = this.identifyErrorPatterns();

    errorPatterns.forEach((pattern) => {
      if (pattern.frequency > 3) {
        // إذا تكرر الخطأ أكثر من 3 مرات
        // أرسل تنبيهاً للمطور للتحقق من النموذج
        console.warn(
          `⚠️ خطأ متكرر في نظام التصنيف:\n` +
            `التحول: ${pattern.transition} ➜ ${pattern.wrongType}\n` +
            `التكرار: ${pattern.frequency} مرات\n` +
            `الصحيح: ${pattern.correctType}`,
        );
      }
    });
  }

  /**
   * تحسين درجات التصنيف بناءً على التعليقات السابقة
   * @param type نوع التصنيف الحالي
   * @param context السياق (النوع السابق والنص)
   * @param baseScore الدرجة الأساسية
   * @returns الدرجة المحسّنة بناءً على الأوزان
   */
  improveClassificationScore(
    type: string,
    context: { previousType: string; lineText: string },
    baseScore: number,
  ): number {
    const patternKey = `${context.previousType} -> ${type}`;
    const weight = this.patternWeights[patternKey] || 1.0;

    // تطبيق الوزن على الدرجة الأساسية
    return baseScore * weight;
  }

  /**
   * الحصول على الأنماط الخاطئة الأكثر تكراراً
   * مفيد للتحليل والإبلاغ عن المشاكل
   * @returns قائمة الأخطاء الشائعة مع اقتراحات الإصلاح
   */
  getCommonErrors(): CommonError[] {
    return this.identifyErrorPatterns()
      .sort((a, b) => b.frequency - a.frequency)
      .map((pattern) => ({
        pattern: `${pattern.transition} ➜ ${pattern.wrongType}`,
        frequency: pattern.frequency,
        suggestion: `يجب أن يكون: ${pattern.correctType}`,
      }));
  }

  /**
   * مسح جميع التصحيحات والأوزان (إعادة تعيين النظام)
   */
  reset(): void {
    this.userCorrections = [];
    this.patternWeights = {};
  }

  /**
   * الحصول على عدد التصحيحات المسجلة
   * @returns عدد التصحيحات
   */
  getCorrectionCount(): number {
    return this.userCorrections.length;
  }

  /**
   * الحصول على إحصائيات النظام
   * @returns إحصائيات الأداء والأخطاء
   */
  getStatistics(): SystemStatistics {
    const commonErrors = this.getCommonErrors();
    const weights = Object.values(this.patternWeights);

    return {
      totalCorrections: this.userCorrections.length,
      uniquePatterns: Object.keys(this.patternWeights).length,
      mostCommonError:
        commonErrors.length > 0
          ? {
              pattern: commonErrors[0].pattern,
              frequency: commonErrors[0].frequency,
            }
          : null,
      averageWeight: weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 1.0,
    };
  }

  /**
   * تصدير التصحيحات كـ JSON (للنسخ الاحتياطي)
   * @returns JSON string للتصحيحات والأوزان
   */
  exportData(): string {
    const data: ExportData = {
      corrections: this.userCorrections,
      weights: this.patternWeights,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * استيراد التصحيحات من JSON (استعادة النسخة الاحتياطية)
   * @param jsonData JSON string تحتوي على التصحيحات والأوزان
   * @returns true إذا نجح الاستيراد
   */
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.corrections && Array.isArray(data.corrections)) {
        this.userCorrections = data.corrections.map(
          (c: { from: string; to: string; context: string; timestamp?: string }) => ({
            ...c,
            timestamp: new Date(c.timestamp || new Date()),
          }),
        );
      }
      if (data.weights && typeof data.weights === "object") {
        this.patternWeights = data.weights;
      }
      return true;
    } catch (error) {
      console.error("فشل استيراد البيانات:", error);
      return false;
    }
  }
}
