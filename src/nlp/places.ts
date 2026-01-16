// src/nlp/places.ts
export const KNOWN_PLACES_RE =
/(?:^|\b)(مسجد|بيت|منزل|شارع|حديقة|مدرسة|جامعة|مكتب|محل|مستشفى|مطعم|فندق|غرفة|ساحة|ممر|سطح|مقبرة|مكتبة|نهر|بحر|جبل|غابة|سوق|مصنع|بنك|محكمة|سجن|موقف|محطة|مطار|ميناء|نفق|مبنى|قصر|نادي|ملعب|متحف|مسرح|سينما|مزرعة|مختبر|مستودع|مقهى)(?:\b|$)/i;

export const LOCATION_PREFIX_RE =
/^(داخل|في|أمام|خلف|بجوار|على|تحت|فوق|عند)\b/i;

export function isPlaceLike(text: string): boolean {
  return (
    KNOWN_PLACES_RE.test(text) ||
    LOCATION_PREFIX_RE.test(text)
  );
}