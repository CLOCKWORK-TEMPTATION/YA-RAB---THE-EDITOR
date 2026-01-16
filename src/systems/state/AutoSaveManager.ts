// src/systems/state/AutoSaveManager.ts
// ======================================
// Auto Save Manager
//
// Responsibilities:
// - Manage automatic saving
// - Track save history
// - Handle save conflicts
//
// NO document logic
// NO UI logic

export interface SavePoint {
  id: string;
  timestamp: number;
  content: string;
  description?: string;
  isAutoSave: boolean;
}

export interface AutoSaveOptions {
  interval: number;        // Save interval in ms
  maxHistory: number;      // Maximum save points to keep
  debounceMs: number;      // Debounce time for rapid changes
  onSave?: (savePoint: SavePoint) => void;
  onConflict?: (local: SavePoint, remote: SavePoint) => void;
}

export class AutoSaveManager {
  private saveHistory: SavePoint[] = [];
  private options: AutoSaveOptions;
  private timer: any = null;
  private debounceTimer: any = null;
  private lastContent: string = '';
  private isEnabled: boolean = true;

  constructor(options: Partial<AutoSaveOptions> = {}) {
    this.options = {
      interval: 30000,        // 30 seconds
      maxHistory: 50,
      debounceMs: 1000,       // 1 second
      ...options
    };
  }

  /**
   * Enable auto-save
   */
  enable(): void {
    this.isEnabled = true;
    this.startTimer();
  }

  /**
   * Disable auto-save
   */
  disable(): void {
    this.isEnabled = false;
    this.stopTimer();
  }

  /**
   * Update content (triggers auto-save)
   */
  updateContent(content: string, description?: string): void {
    if (!this.isEnabled) return;

    // Skip if content hasn't changed
    if (content === this.lastContent) return;

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set debounce timer
    this.debounceTimer = setTimeout(() => {
      this.performAutoSave(content, description);
    }, this.options.debounceMs);
  }

  /**
   * Force immediate save
   */
  forceSave(content: string, description?: string): SavePoint {
    return this.createSavePoint(content, description, false);
  }

  /**
   * Get save history
   */
  getHistory(): SavePoint[] {
    return [...this.saveHistory].reverse(); // Most recent first
  }

  /**
   * Restore from save point
   */
  restore(savePointId: string): SavePoint | null {
    const savePoint = this.saveHistory.find(sp => sp.id === savePointId);
    if (!savePoint) return null;

    this.lastContent = savePoint.content;
    return savePoint;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.saveHistory = [];
  }

  /**
   * Get save statistics
   */
  getStats(): {
    totalSaves: number;
    autoSaves: number;
    manualSaves: number;
    oldestSave: number | null;
    newestSave: number | null;
  } {
    const autoSaves = this.saveHistory.filter(sp => sp.isAutoSave).length;
    const manualSaves = this.saveHistory.length - autoSaves;
    const timestamps = this.saveHistory.map(sp => sp.timestamp);
    
    return {
      totalSaves: this.saveHistory.length,
      autoSaves,
      manualSaves,
      oldestSave: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestSave: timestamps.length > 0 ? Math.max(...timestamps) : null
    };
  }

  private startTimer(): void {
    if (this.timer) return;
    
    this.timer = setInterval(() => {
      if (this.lastContent) {
        this.performAutoSave(this.lastContent, 'Scheduled auto-save');
      }
    }, this.options.interval);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private performAutoSave(content: string, description?: string): void {
    this.createSavePoint(content, description, true);
  }

  private createSavePoint(content: string, description?: string, isAutoSave: boolean): SavePoint {
    const savePoint: SavePoint = {
      id: this.generateId(),
      timestamp: Date.now(),
      content,
      description,
      isAutoSave
    };

    // Add to history
    this.saveHistory.push(savePoint);
    this.lastContent = content;

    // Trim history if needed
    if (this.saveHistory.length > this.options.maxHistory) {
      this.saveHistory = this.saveHistory.slice(-this.options.maxHistory);
    }

    // Trigger callback
    this.options.onSave?.(savePoint);

    return savePoint;
  }

  private generateId(): string {
    return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy manager (cleanup)
   */
  destroy(): void {
    this.disable();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
