// src/systems/context/ContextAwareClassifier.ts
// ==============================================
// Context-Aware Classifier
//
// Responsibilities:
// - Provide context for classification
// - Track document structure
// - Maintain classification context
//
// NO classification logic
// NO state persistence

export interface DocumentContext {
  currentScene?: {
    number: string;
    location?: string;
    time?: string;
  };
  dialogueBlock?: {
    isActive: boolean;
    character?: string;
    lineCount: number;
  };
  sectionStructure: {
    hasBasmala: boolean;
    sceneCount: number;
    transitionCount: number;
  };
  recentClassifications: Array<{
    type: string;
    position: number;
    confidence: number;
  }>;
}

export interface ContextFeatures {
  isInDialogueBlock: boolean;
  distanceFromCharacter: number;
  isAtSceneStart: boolean;
  isAtSceneEnd: boolean;
  previousTypePattern: string[];
  nextTypeHint?: string;
  documentPosition: 'beginning' | 'middle' | 'end';
}

export class ContextAwareClassifier {
  private context: DocumentContext;
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 50) {
    this.context = {
      sectionStructure: {
        hasBasmala: false,
        sceneCount: 0,
        transitionCount: 0
      },
      recentClassifications: []
    };
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Update context with new classification
   */
  updateContext(
    line: string,
    type: string,
    position: number,
    confidence: number,
    totalLines: number
  ): void {
    // Update recent classifications
    this.context.recentClassifications.push({
      type,
      position,
      confidence
    });

    // Trim history if needed
    if (this.context.recentClassifications.length > this.maxHistorySize) {
      this.context.recentClassifications = this.context.recentClassifications.slice(-this.maxHistorySize);
    }

    // Update dialogue block
    this.updateDialogueBlock(type, line);

    // Update scene context
    this.updateSceneContext(type, line);

    // Update section structure
    this.updateSectionStructure(type);
  }

  /**
   * Get context features for classification
   */
  getContextFeatures(position: number, totalLines: number): ContextFeatures {
    const recentTypes = this.context.recentClassifications.map(c => c.type);
    
    return {
      isInDialogueBlock: this.context.dialogueBlock?.isActive || false,
      distanceFromCharacter: this.calculateDistanceFromCharacter(position),
      isAtSceneStart: this.isAtSceneStart(position),
      isAtSceneEnd: this.isAtSceneEnd(position),
      previousTypePattern: this.getPreviousTypePattern(recentTypes),
      documentPosition: this.getDocumentPosition(position, totalLines)
    };
  }

  /**
   * Get full document context
   */
  getDocumentContext(): DocumentContext {
    return { ...this.context };
  }

  /**
   * Reset context
   */
  reset(): void {
    this.context = {
      sectionStructure: {
        hasBasmala: false,
        sceneCount: 0,
        transitionCount: 0
      },
      recentClassifications: []
    };
  }

  /**
   * Predict next likely type based on context
   */
  predictNextType(): string | null {
    const recent = this.context.recentClassifications.slice(-5);
    if (recent.length === 0) return null;

    const lastType = recent[recent.length - 1].type;

    // Simple pattern-based prediction
    switch (lastType) {
      case 'character':
        return 'dialogue';
      case 'dialogue':
        return this.context.dialogueBlock?.isActive ? 'dialogue' : 'action';
      case 'scene-header':
        return 'action';
      case 'transition':
        return 'scene-header';
      case 'parenthetical':
        return 'dialogue';
      default:
        return null;
    }
  }

  private updateDialogueBlock(type: string, line: string): void {
    if (type === 'character') {
      this.context.dialogueBlock = {
        isActive: true,
        character: line.trim(),
        lineCount: 1
      };
    } else if (type === 'dialogue') {
      if (this.context.dialogueBlock?.isActive) {
        this.context.dialogueBlock.lineCount++;
      }
    } else if (['scene-header', 'transition', 'basmala', 'action'].includes(type)) {
      // These types break dialogue blocks
      this.context.dialogueBlock = undefined;
    }
  }

  private updateSceneContext(type: string, line: string): void {
    if (type === 'scene-header') {
      // Extract scene info from header
      const sceneMatch = line.match(/(?:مشهد|م\.|scene)\s*([0-9٠-٩]+)/i);
      if (sceneMatch) {
        this.context.currentScene = {
          number: sceneMatch[1]
        };
      }
    }
  }

  private updateSectionStructure(type: string): void {
    if (type === 'basmala') {
      this.context.sectionStructure.hasBasmala = true;
    } else if (type === 'scene-header') {
      this.context.sectionStructure.sceneCount++;
    } else if (type === 'transition') {
      this.context.sectionStructure.transitionCount++;
    }
  }

  private calculateDistanceFromCharacter(position: number): number {
    for (let i = this.context.recentClassifications.length - 1; i >= 0; i--) {
      const classification = this.context.recentClassifications[i];
      if (classification.type === 'character') {
        return position - classification.position;
      }
    }
    return -1;
  }

  private isAtSceneStart(position: number): boolean {
    if (this.context.recentClassifications.length === 0) return position === 0;
    
    const recent = this.context.recentClassifications.slice(-5);
    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i].type === 'scene-header') {
        return (position - recent[i].position) <= 3;
      }
    }
    return false;
  }

  private isAtSceneEnd(position: number): boolean {
    const recent = this.context.recentClassifications.slice(-5);
    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i].type === 'transition') {
        return (position - recent[i].position) <= 2;
      }
    }
    return false;
  }

  private getPreviousTypePattern(types: string[]): string[] {
    return types.slice(-5).reverse(); // Last 5 types, most recent first
  }

  private getDocumentPosition(position: number, totalLines: number): 'beginning' | 'middle' | 'end' {
    const ratio = position / totalLines;
    if (ratio < 0.1) return 'beginning';
    if (ratio > 0.9) return 'end';
    return 'middle';
  }
}
