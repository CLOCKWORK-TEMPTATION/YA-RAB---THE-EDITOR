// src/systems/review/AdvancedAutoReviewer.ts
// ==========================================
// Advanced Auto Reviewer (Rule-based)
//
// Responsibilities:
// - Review classification results
// - Apply rule-based corrections
// - Ensure consistency
//
// NO LLM logic
// NO classification logic

export interface ReviewRule {
  id: string;
  name: string;
  description: string;
  condition: (context: ReviewContext) => boolean;
  action: (context: ReviewContext) => ReviewAction;
  priority: number;
}

export interface ReviewContext {
  line: string;
  currentType: string;
  previousTypes: string[];
  nextTypes: string[];
  index: number;
  confidence: number;
}

export interface ReviewAction {
  type: 'replace' | 'flag' | 'suggest';
  newType?: string;
  message?: string;
  confidence?: number;
}

export interface ReviewResult {
  originalType: string;
  reviewedType: string;
  actions: ReviewAction[];
  confidence: number;
  issues: string[];
}

export class AdvancedAutoReviewer {
  private rules: ReviewRule[] = [];
  private enabledRules: Set<string> = new Set();

  constructor() {
    this.initializeDefaultRules();
    this.enableAllRules();
  }

  /**
   * Review a single classification
   */
  review(context: ReviewContext): ReviewResult {
    const actions: ReviewAction[] = [];
    const issues: string[] = [];
    let finalType = context.currentType;
    let finalConfidence = context.confidence;

    // Apply enabled rules in priority order
    const sortedRules = this.rules
      .filter(rule => this.enabledRules.has(rule.id))
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (rule.condition(context)) {
        const action = rule.action(context);
        actions.push(action);

        switch (action.type) {
          case 'replace':
            if (action.newType) {
              finalType = action.newType;
              finalConfidence = action.confidence || finalConfidence;
            }
            break;
          case 'flag':
            issues.push(action.message || 'Flagged by rule: ' + rule.name);
            break;
          case 'suggest':
            issues.push('Suggestion: ' + (action.message || rule.name));
            break;
        }
      }
    }

    return {
      originalType: context.currentType,
      reviewedType: finalType,
      actions,
      confidence: finalConfidence,
      issues
    };
  }

  /**
   * Review multiple classifications
   */
  reviewBatch(contexts: ReviewContext[]): ReviewResult[] {
    return contexts.map(context => this.review(context));
  }

  /**
   * Add custom rule
   */
  addRule(rule: ReviewRule): void {
    this.rules.push(rule);
  }

  /**
   * Enable/disable rules
   */
  enableRule(ruleId: string): void {
    this.enabledRules.add(ruleId);
  }

  disableRule(ruleId: string): void {
    this.enabledRules.delete(ruleId);
  }

  enableAllRules(): void {
    this.rules.forEach(rule => this.enabledRules.add(rule.id));
  }

  disableAllRules(): void {
    this.enabledRules.clear();
  }

  /**
   * Get rule statistics
   */
  getRuleStats(): { total: number; enabled: number; disabled: number } {
    return {
      total: this.rules.length,
      enabled: this.enabledRules.size,
      disabled: this.rules.length - this.enabledRules.size
    };
  }

  private initializeDefaultRules(): void {
    // Rule: Character lines should have colons or be short
    this.rules.push({
      id: 'character-format',
      name: 'Character Format Check',
      description: 'Character lines should have colons or be short Arabic names',
      priority: 10,
      condition: (ctx) => {
        if (ctx.currentType !== 'character') return false;
        const line = ctx.line.trim();
        const hasColon = line.includes(':') || line.includes('：');
        const wordCount = line.split(/\s+/).length;
        const hasArabicLetters = /[\u0600-\u06FF]/.test(line);
        return !hasColon && (wordCount > 3 || !hasArabicLetters);
      },
      action: (ctx) => ({
        type: 'suggest',
        message: 'Character lines should have colons or be short Arabic names'
      })
    });

    // Rule: Dialogue should not start with dash outside dialogue block
    this.rules.push({
      id: 'dialogue-dash-check',
      name: 'Dialogue Dash Check',
      description: 'Dialogue starting with dash outside dialogue block might be action',
      priority: 9,
      condition: (ctx) => {
        if (ctx.currentType !== 'dialogue') return false;
        const startsWithDash = /^[\s]*[-–—]/.test(ctx.line);
        const inDialogueBlock = ctx.previousTypes.slice(-3).some(t => 
          ['character', 'dialogue', 'parenthetical'].includes(t)
        );
        return startsWithDash && !inDialogueBlock;
      },
      action: (ctx) => ({
        type: 'replace',
        newType: 'action',
        message: 'Line starting with dash outside dialogue block should be action',
        confidence: 0.9
      })
    });

    // Rule: Action lines with verbs should be prioritized
    this.rules.push({
      id: 'action-verb-check',
      name: 'Action Verb Check',
      description: 'Lines with action verbs should be classified as action',
      priority: 8,
      condition: (ctx) => {
        if (ctx.currentType === 'action') return false;
        const actionVerbs = [
          'يدخل', 'يخرج', 'يقف', 'يجلس', 'ينظر', 'يتحرك', 
          'يقترب', 'يبتعد', 'يركض', 'يمشي', 'يتحدث', 'يصرخ',
          'تدخل', 'تخرج', 'تقف', 'تجلس', 'تنظر', 'تتحرك'
        ];
        const line = ctx.line.trim();
        const firstWord = line.split(/\s+/)[0];
        return actionVerbs.includes(firstWord);
      },
      action: (ctx) => ({
        type: 'replace',
        newType: 'action',
        message: 'Line starting with action verb should be action',
        confidence: 0.85
      })
    });

    // Rule: Parenthetical should be within dialogue block
    this.rules.push({
      id: 'parenthetical-context',
      name: 'Parenthetical Context Check',
      description: 'Parenthetical should be within dialogue block',
      priority: 7,
      condition: (ctx) => {
        if (ctx.currentType !== 'parenthetical') return false;
        const inDialogueBlock = ctx.previousTypes.slice(-3).some(t => 
          ['character', 'dialogue', 'parenthetical'].includes(t)
        );
        return !inDialogueBlock;
      },
      action: (ctx) => ({
        type: 'suggest',
        message: 'Parenthetical outside dialogue block might be incorrect'
      })
    });

    // Rule: Scene headers should be at document start or after transition
    this.rules.push({
      id: 'scene-header-position',
      name: 'Scene Header Position Check',
      description: 'Scene headers should be at start or after transitions',
      priority: 6,
      condition: (ctx) => {
        if (ctx.currentType !== 'scene-header') return false;
        if (ctx.index === 0) return false;
        const previousType = ctx.previousTypes[ctx.previousTypes.length - 1];
        return previousType && !['transition', 'scene-header', 'basmala'].includes(previousType);
      },
      action: (ctx) => ({
        type: 'flag',
        message: 'Scene header in unusual position'
      })
    });

    // Rule: Transition should be at end of scene
    this.rules.push({
      id: 'transition-position',
      name: 'Transition Position Check',
      description: 'Transitions should be at end of scenes',
      priority: 5,
      condition: (ctx) => {
        if (ctx.currentType !== 'transition') return false;
        // Check if next lines are scene header or end of document
        const nextIsSceneHeader = ctx.nextTypes[0] === 'scene-header';
        const isEndOfDoc = ctx.nextTypes.length === 0;
        return !(nextIsSceneHeader || isEndOfDoc);
      },
      action: (ctx) => ({
        type: 'suggest',
        message: 'Transition should be at end of scene'
      })
    });

    // Rule: Low confidence classifications should be flagged
    this.rules.push({
      id: 'low-confidence',
      name: 'Low Confidence Check',
      description: 'Flag classifications with low confidence',
      priority: 1,
      condition: (ctx) => ctx.confidence < 0.7,
      action: (ctx) => ({
        type: 'flag',
        message: 'Low confidence classification'
      })
    });
  }
}
