// src/systems/state/CollaborationSystem.ts
// ==========================================
// Collaboration System
//
// Responsibilities:
// - Manage collaborative editing
// - Track user changes
// - Handle conflict resolution
//
// NO document logic
// NO UI logic

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
}

export interface Change {
  id: string;
  userId: string;
  type: 'insert' | 'delete' | 'replace';
  position: {
    line: number;
    column: number;
  };
  content?: string;
  length?: number;
  timestamp: number;
}

export interface Conflict {
  change1: Change;
  change2: Change;
  resolution?: 'accept-1' | 'accept-2' | 'merge';
}

export interface CollaborationOptions {
  maxHistory?: number;
  conflictResolution?: 'manual' | 'last-wins' | 'first-wins';
  onChange?: (change: Change) => void;
  onConflict?: (conflict: Conflict) => void;
}

export class CollaborationSystem {
  private users: Map<string, User> = new Map();
  private changes: Change[] = [];
  private conflicts: Conflict[] = [];
  private options: CollaborationOptions;

  constructor(options: Partial<CollaborationOptions> = {}) {
    this.options = {
      maxHistory: 1000,
      conflictResolution: 'manual',
      ...options
    };
  }

  /**
   * Add user to collaboration session
   */
  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  /**
   * Remove user from collaboration session
   */
  removeUser(userId: string): void {
    this.users.delete(userId);
  }

  /**
   * Update user cursor
   */
  updateCursor(userId: string, line: number, column: number): void {
    const user = this.users.get(userId);
    if (user) {
      user.cursor = { line, column };
    }
  }

  /**
   * Apply change from user
   */
  applyChange(change: Omit<Change, 'id' | 'timestamp'>): Conflict | null {
    const fullChange: Change = {
      ...change,
      id: this.generateId(),
      timestamp: Date.now()
    };

    // Check for conflicts
    const conflict = this.detectConflict(fullChange);
    
    if (conflict) {
      this.handleConflict(conflict);
      return conflict;
    }

    // No conflict, apply change
    this.changes.push(fullChange);
    this.trimHistory();
    this.options.onChange?.(fullChange);

    return null;
  }

  /**
   * Get all active users
   */
  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Get change history
   */
  getChanges(): Change[] {
    return [...this.changes];
  }

  /**
   * Get active conflicts
   */
  getConflicts(): Conflict[] {
    return [...this.conflicts];
  }

  /**
   * Resolve conflict
   */
  resolveConflict(conflictId: string, resolution: 'accept-1' | 'accept-2' | 'merge'): void {
    const conflict = this.conflicts.find(c => `${c.change1.id}-${c.change2.id}` === conflictId);
    if (!conflict) return;

    conflict.resolution = resolution;

    // Apply resolution
    switch (resolution) {
      case 'accept-1':
        this.changes.push(conflict.change1);
        break;
      case 'accept-2':
        this.changes.push(conflict.change2);
        break;
      case 'merge':
        // Implement merge logic
        const merged = this.mergeChanges(conflict.change1, conflict.change2);
        if (merged) {
          this.changes.push(merged);
        }
        break;
    }

    // Remove from active conflicts
    this.conflicts = this.conflicts.filter(c => c !== conflict);
  }

  /**
   * Get user statistics
   */
  getUserStats(userId: string): {
    changesMade: number;
    conflictsInvolved: number;
    lastActivity: number | null;
  } {
    const userChanges = this.changes.filter(c => c.userId === userId);
    const userConflicts = this.conflicts.filter(c => 
      c.change1.userId === userId || c.change2.userId === userId
    );
    const lastActivity = userChanges.length > 0 
      ? Math.max(...userChanges.map(c => c.timestamp))
      : null;

    return {
      changesMade: userChanges.length,
      conflictsInvolved: userConflicts.length,
      lastActivity
    };
  }

  private detectConflict(newChange: Change): Conflict | null {
    // Check if new change conflicts with any recent change
    const recentChanges = this.changes.slice(-10); // Check last 10 changes

    for (const existingChange of recentChanges) {
      if (this.changesConflict(newChange, existingChange)) {
        return {
          change1: existingChange,
          change2: newChange
        };
      }
    }

    return null;
  }

  private changesConflict(change1: Change, change2: Change): boolean {
    // Same user can't conflict with themselves
    if (change1.userId === change2.userId) return false;

    // Check if changes are at same position
    if (change1.position.line === change2.position.line) {
      // Same line, check for overlap
      const start1 = change1.position.column;
      const end1 = start1 + (change1.length || change1.content?.length || 0);
      const start2 = change2.position.column;
      const end2 = start2 + (change2.length || change2.content?.length || 0);

      return !(end1 <= start2 || end2 <= start1);
    }

    return false;
  }

  private handleConflict(conflict: Conflict): void {
    this.conflicts.push(conflict);

    // Auto-resolve if configured
    if (this.options.conflictResolution !== 'manual') {
      let resolution: 'accept-1' | 'accept-2' | 'merge';

      switch (this.options.conflictResolution) {
        case 'last-wins':
          resolution = conflict.change2.timestamp > conflict.change1.timestamp ? 'accept-2' : 'accept-1';
          break;
        case 'first-wins':
          resolution = 'accept-1';
          break;
        default:
          resolution = 'accept-1';
          break;
      }

      this.resolveConflict(
        `${conflict.change1.id}-${conflict.change2.id}`,
        resolution
      );
    } else {
      this.options.onConflict?.(conflict);
    }
  }

  private mergeChanges(change1: Change, change2: Change): Change | null {
    // Simple merge logic - can be enhanced
    if (change1.type === 'insert' && change2.type === 'insert') {
      // Both inserts at same position - order by timestamp
      const first = change1.timestamp < change2.timestamp ? change1 : change2;
      const second = change1.timestamp < change2.timestamp ? change2 : change1;

      return {
        ...first,
        id: this.generateId(),
        content: (first.content || '') + (second.content || ''),
        timestamp: Date.now()
      };
    }

    // Can't merge other types automatically
    return null;
  }

  private trimHistory(): void {
    if (this.changes.length > (this.options.maxHistory || 1000)) {
      this.changes = this.changes.slice(-this.options.maxHistory);
    }
  }

  private generateId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.users.clear();
    this.changes = [];
    this.conflicts = [];
  }
}
