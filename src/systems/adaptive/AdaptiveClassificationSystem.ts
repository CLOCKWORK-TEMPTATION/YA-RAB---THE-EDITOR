// src/systems/adaptive/AdaptiveClassificationSystem.ts
// =====================================================
// Adaptive Classification System
//
// Responsibilities:
// - Learn from classification patterns
// - Adapt to user preferences
// - Improve accuracy over time
//
// NO direct classification
// NO state persistence

export interface AdaptivePattern {
  id: string;
  pattern: string;
  type: string;
  frequency: number;
  accuracy: number;
  lastUsed: number;
}

export interface UserPreference {
  type: string;
  context: string;
  preferredType: string;
  confidence: number;
}

export interface AdaptiveMetrics {
  totalClassifications: number;
  correctClassifications: number;
  accuracy: number;
  adaptationCount: number;
}

export class AdaptiveClassificationSystem {
  private patterns: Map<string, AdaptivePattern> = new Map();
  private preferences: UserPreference[] = [];
  private metrics: AdaptiveMetrics;
  private adaptationThreshold: number;
  private maxPatterns: number;

  constructor(options?: {
    adaptationThreshold?: number;
    maxPatterns?: number;
  }) {
    this.adaptationThreshold = options?.adaptationThreshold || 0.8;
    this.maxPatterns = options?.maxPatterns || 1000;
    this.metrics = {
      totalClassifications: 0,
      correctClassifications: 0,
      accuracy: 0,
      adaptationCount: 0
    };
  }

  /**
   * Learn from a classification result
   */
  learn(
    input: string,
    predictedType: string,
    actualType: string,
    context?: string
  ): void {
    this.metrics.totalClassifications++;
    
    if (predictedType === actualType) {
      this.metrics.correctClassifications++;
    }

    this.metrics.accuracy = this.metrics.correctClassifications / this.metrics.totalClassifications;

    // Update patterns
    this.updatePatterns(input, actualType, predictedType === actualType);

    // Update preferences
    if (context) {
      this.updatePreferences(context, predictedType, actualType);
    }

    // Trigger adaptation if needed
    if (this.shouldAdapt()) {
      this.adapt();
    }
  }

  /**
   * Get adaptive suggestion for classification
   */
  getSuggestion(input: string, context?: string): string | null {
    // Check for exact pattern matches
    for (const pattern of this.patterns.values()) {
      if (this.matchesPattern(input, pattern.pattern) && 
          pattern.accuracy >= this.adaptationThreshold) {
        return pattern.type;
      }
    }

    // Check contextual preferences
    if (context) {
      const pref = this.preferences.find(p => 
        p.context === context && 
        p.confidence >= this.adaptationThreshold
      );
      if (pref) {
        return pref.preferredType;
      }
    }

    return null;
  }

  /**
   * Get adaptive metrics
   */
  getMetrics(): AdaptiveMetrics {
    return { ...this.metrics };
  }

  /**
   * Get learned patterns
   */
  getPatterns(): AdaptivePattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Reset learning
   */
  reset(): void {
    this.patterns.clear();
    this.preferences = [];
    this.metrics = {
      totalClassifications: 0,
      correctClassifications: 0,
      accuracy: 0,
      adaptationCount: 0
    };
  }

  private updatePatterns(input: string, type: string, wasCorrect: boolean): void {
    // Generate pattern key from input
    const patternKey = this.generatePatternKey(input);
    
    let pattern = this.patterns.get(patternKey);
    
    if (!pattern) {
      // Create new pattern
      pattern = {
        id: this.generateId(),
        pattern: patternKey,
        type,
        frequency: 1,
        accuracy: wasCorrect ? 1 : 0,
        lastUsed: Date.now()
      };
      
      // Check if we have too many patterns
      if (this.patterns.size >= this.maxPatterns) {
        this.evictOldestPattern();
      }
      
      this.patterns.set(patternKey, pattern);
    } else {
      // Update existing pattern
      pattern.frequency++;
      pattern.accuracy = (pattern.accuracy * (pattern.frequency - 1) + (wasCorrect ? 1 : 0)) / pattern.frequency;
      pattern.lastUsed = Date.now();
      
      // Update type if accuracy improves with new type
      if (wasCorrect && pattern.type !== type) {
        pattern.type = type;
      }
    }
  }

  private updatePreferences(context: string, predictedType: string, actualType: string): void {
    const existingPref = this.preferences.find(p => 
      p.type === predictedType && 
      p.context === context
    );

    if (existingPref) {
      // Update existing preference
      const wasCorrect = predictedType === actualType;
      const newConfidence = (existingPref.confidence + (wasCorrect ? 0.1 : -0.1)) / 2;
      existingPref.confidence = Math.max(0, Math.min(1, newConfidence));
      
      if (wasCorrect) {
        existingPref.preferredType = actualType;
      }
    } else {
      // Create new preference
      this.preferences.push({
        type: predictedType,
        context,
        preferredType: actualType,
        confidence: predictedType === actualType ? 0.8 : 0.2
      });
    }

    // Clean up low confidence preferences
    this.preferences = this.preferences.filter(p => p.confidence > 0.1);
  }

  private shouldAdapt(): boolean {
    return this.metrics.totalClassifications > 0 && 
           this.metrics.totalClassifications % 100 === 0;
  }

  private adapt(): void {
    // Remove low accuracy patterns
    for (const [key, pattern] of Array.from(this.patterns.entries())) {
      if (pattern.accuracy < 0.5 && pattern.frequency > 10) {
        this.patterns.delete(key);
      }
    }

    // Merge similar patterns
    this.mergeSimilarPatterns();

    this.metrics.adaptationCount++;
  }

  private mergeSimilarPatterns(): void {
    const patterns = Array.from(this.patterns.values());
    const toMerge = new Map<string, AdaptivePattern[]>();

    // Group similar patterns
    patterns.forEach(pattern => {
      const group = this.findSimilarPatternGroup(pattern, toMerge);
      if (group) {
        group.push(pattern);
      } else {
        toMerge.set(pattern.id, [pattern]);
      }
    });

    // Merge groups
    Array.from(toMerge.values()).forEach(group => {
      if (group.length > 1) {
        const merged = this.mergePatternGroup(group);
        group.forEach(p => this.patterns.delete(p.id));
        this.patterns.set(merged.id, merged);
      }
    });
  }

  private findSimilarPatternGroup(
    pattern: AdaptivePattern, 
    groups: Map<string, AdaptivePattern[]>
  ): AdaptivePattern[] | null {
    for (const [key, group] of Array.from(groups.entries())) {
      if (this.arePatternsSimilar(pattern, group[0])) {
        return group;
      }
    }
    return null;
  }

  private arePatternsSimilar(p1: AdaptivePattern, p2: AdaptivePattern): boolean {
    // Simple similarity check - can be enhanced
    return p1.type === p2.type && 
           Math.abs(p1.accuracy - p2.accuracy) < 0.2;
  }

  private mergePatternGroup(group: AdaptivePattern[]): AdaptivePattern {
    const totalFreq = group.reduce((sum, p) => sum + p.frequency, 0);
    const avgAccuracy = group.reduce((sum, p) => sum + p.accuracy * p.frequency, 0) / totalFreq;
    
    return {
      id: this.generateId(),
      pattern: group[0].pattern, // Keep first pattern
      type: group[0].type,
      frequency: totalFreq,
      accuracy: avgAccuracy,
      lastUsed: Math.max(...group.map(p => p.lastUsed))
    };
  }

  private evictOldestPattern(): void {
    let oldest: AdaptivePattern | null = null;
    let oldestTime = Date.now();

    for (const pattern of this.patterns.values()) {
      if (pattern.lastUsed < oldestTime) {
        oldest = pattern;
        oldestTime = pattern.lastUsed;
      }
    }

    if (oldest) {
      this.patterns.delete(oldest.id);
    }
  }

  private generatePatternKey(input: string): string {
    // Normalize input to create pattern key
    return input
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private matchesPattern(input: string, pattern: string): boolean {
    const inputKey = this.generatePatternKey(input);
    return inputKey === pattern || inputKey.includes(pattern);
  }

  private generateId(): string {
    return `adapt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
