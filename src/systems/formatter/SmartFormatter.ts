// src/systems/formatter/SmartFormatter.ts
// ========================================
// Smart Formatter
//
// Responsibilities:
// - Format screenplay text
// - Apply spacing rules
// - Maintain consistency
//
// NO classification logic
// NO parsing logic

export interface FormattingRule {
  name: string;
  description: string;
  apply: (line: string, type: string, context: FormattingContext) => string;
  priority: number;
}

export interface FormattingContext {
  previousLine?: string;
  previousType?: string;
  nextLine?: string;
  nextType?: string;
  isInDialogueBlock: boolean;
  lineNumber: number;
}

export interface FormattingResult {
  original: string;
  formatted: string;
  changes: string[];
  appliedRules: string[];
}

export class SmartFormatter {
  private rules: FormattingRule[] = [];
  private enabledRules: Set<string> = new Set();

  constructor() {
    this.initializeDefaultRules();
    this.enableAllRules();
  }

  /**
   * Format a single line
   */
  formatLine(
    line: string,
    type: string,
    context: FormattingContext
  ): FormattingResult {
    const changes: string[] = [];
    const appliedRules: string[] = [];
    let formatted = line;

    // Apply enabled rules in priority order
    const sortedRules = this.rules
      .filter(rule => this.enabledRules.has(rule.name))
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      const previous = formatted;
      formatted = rule.apply(formatted, type, context);
      
      if (previous !== formatted) {
        changes.push(`Applied ${rule.name}`);
        appliedRules.push(rule.name);
      }
    }

    return {
      original: line,
      formatted,
      changes,
      appliedRules
    };
  }

  /**
   * Format multiple lines
   */
  formatLines(
    lines: string[],
    types: string[]
  ): { formatted: string[]; results: FormattingResult[] } {
    const results: FormattingResult[] = [];
    const formatted: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const context: FormattingContext = {
        previousLine: lines[i - 1],
        previousType: types[i - 1],
        nextLine: lines[i + 1],
        nextType: types[i + 1],
        isInDialogueBlock: this.isInDialogueBlock(types, i),
        lineNumber: i
      };

      const result = this.formatLine(lines[i], types[i], context);
      results.push(result);
      formatted.push(result.formatted);
    }

    return { formatted, results };
  }

  /**
   * Add custom formatting rule
   */
  addRule(rule: FormattingRule): void {
    this.rules.push(rule);
  }

  /**
   * Enable/disable rules
   */
  enableRule(ruleName: string): void {
    this.enabledRules.add(ruleName);
  }

  disableRule(ruleName: string): void {
    this.enabledRules.delete(ruleName);
  }

  enableAllRules(): void {
    this.rules.forEach(rule => this.enabledRules.add(rule.name));
  }

  disableAllRules(): void {
    this.enabledRules.clear();
  }

  private initializeDefaultRules(): void {
    // Rule: Center scene headers
    this.rules.push({
      name: 'center-scene-headers',
      description: 'Center scene headers',
      priority: 10,
      apply: (line, type) => {
        if (type === 'scene-header') {
          return line.trim();
        }
        return line;
      }
    });

    // Rule: Left-align character names
    this.rules.push({
      name: 'left-align-characters',
      description: 'Left-align character names',
      priority: 9,
      apply: (line, type) => {
        if (type === 'character') {
          return line.trim();
        }
        return line;
      }
    });

    // Rule: Indent dialogue and parenthetical
    this.rules.push({
      name: 'indent-dialogue',
      description: 'Indent dialogue and parenthetical',
      priority: 8,
      apply: (line, type) => {
        if (type === 'dialogue' || type === 'parenthetical') {
          return '  ' + line.trim();
        }
        return line;
      }
    });

    // Rule: Add blank lines before scene headers
    this.rules.push({
      name: 'scene-header-spacing',
      description: 'Add blank lines before scene headers',
      priority: 7,
      apply: (line, type, context) => {
        if (type === 'scene-header' && context.previousType !== 'blank') {
          return '\n' + line;
        }
        return line;
      }
    });

    // Rule: Add blank lines after transitions
    this.rules.push({
      name: 'transition-spacing',
      description: 'Add blank lines after transitions',
      priority: 6,
      apply: (line, type, context) => {
        if (type === 'transition' && context.nextType !== 'blank') {
          return line + '\n';
        }
        return line;
      }
    });

    // Rule: Normalize Arabic numbers
    this.rules.push({
      name: 'normalize-arabic-numbers',
      description: 'Convert Western numbers to Arabic',
      priority: 5,
      apply: (line) => {
        return line.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
      }
    });

    // Rule: Fix common Arabic spacing issues
    this.rules.push({
      name: 'fix-arabic-spacing',
      description: 'Fix Arabic punctuation spacing',
      priority: 4,
      apply: (line) => {
        // Add space before Arabic commas
        line = line.replace(/([^\s])،/g, '$1 ،');
        // Remove space before Arabic question mark
        line = line.replace(/\s؟/g, '؟');
        // Fix parentheses spacing
        line = line.replace(/\s*\(\s*/g, ' (');
        line = line.replace(/\s*\)\s*/g, ') ');
        return line.trim();
      }
    });

    // Rule: Capitalize scene headers properly
    this.rules.push({
      name: 'capitalize-scene-headers',
      description: 'Capitalize scene header prefixes',
      priority: 3,
      apply: (line, type) => {
        if (type === 'scene-header') {
          return line.replace(/^(مشهد|م\.|scene)/i, (match) => {
            if (match.toLowerCase() === 'scene') return 'SCENE';
            return match.charAt(0).toUpperCase() + match.slice(1);
          });
        }
        return line;
      }
    });

    // Rule: Remove extra whitespace
    this.rules.push({
      name: 'remove-extra-whitespace',
      description: 'Remove extra spaces and tabs',
      priority: 2,
      apply: (line) => {
        return line.replace(/\s+/g, ' ').trim();
      }
    });

    // Rule: Ensure proper colon spacing in character lines
    this.rules.push({
      name: 'character-colon-spacing',
      description: 'Fix character line colon spacing',
      priority: 1,
      apply: (line, type) => {
        if (type === 'character') {
          // Ensure colon is at the end with no space before it
          line = line.replace(/\s*[:：]\s*$/, ':');
          // If no colon, add one (optional - can be disabled)
          // if (!line.includes(':')) {
          //   line = line + ':';
          // }
        }
        return line;
      }
    });
  }

  private isInDialogueBlock(types: string[], index: number): boolean {
    // Look back for character
    for (let i = index - 1; i >= Math.max(0, index - 3); i--) {
      if (types[i] === 'character') return true;
      if (['scene-header', 'transition', 'action'].includes(types[i])) return false;
    }
    return false;
  }
}
