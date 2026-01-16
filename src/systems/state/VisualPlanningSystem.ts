// src/systems/state/VisualPlanningSystem.ts
// ===========================================
// Visual Planning System
//
// Responsibilities:
// - Manage visual story planning
// - Track scene cards and structure
// - Handle timeline visualization
//
// NO document logic
// NO UI logic

export interface SceneCard {
  id: string;
  sceneNumber: number;
  title?: string;
  description?: string;
  type: 'action' | 'dialogue' | 'montage';
  location?: string;
  time?: string;
  characters?: string[];
  duration?: number;  // in minutes
  color?: string;
  notes?: string;
  position: {
    x: number;
    y: number;
  };
}

export interface TimelineTrack {
  id: string;
  name: string;
  scenes: string[];  // Scene IDs
  color: string;
}

export interface PlanningBoard {
  scenes: Map<string, SceneCard>;
  tracks: Map<string, TimelineTrack>;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  selectedScenes: Set<string>;
}

export interface PlanningOptions {
  gridSnap?: boolean;
  gridSize?: number;
  autoLayout?: boolean;
  colorScheme?: 'default' | 'by-location' | 'by-character' | 'by-time';
}

export interface Listener {
  event: string;
  callback: Function;
}

export class VisualPlanningSystem {
  private board: PlanningBoard;
  private options: PlanningOptions;
  private listeners: Map<string, Listener> = new Map();

  constructor(options: Partial<PlanningOptions> = {}) {
    this.options = {
      gridSnap: true,
      gridSize: 20,
      autoLayout: false,
      colorScheme: 'default',
      ...options
    };

    this.board = {
      scenes: new Map(),
      tracks: new Map(),
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedScenes: new Set()
    };
  }

  /**
   * Add scene card
   */
  addScene(scene: Omit<SceneCard, 'id'>): string {
    const id = this.generateId();
    const sceneCard: SceneCard = { ...scene, id };

    // Apply grid snap if enabled
    if (this.options.gridSnap) {
      sceneCard.position = this.snapToGrid(sceneCard.position);
    }

    // Apply auto-color if not set
    if (!sceneCard.color) {
      sceneCard.color = this.getAutoColor(sceneCard);
    }

    this.board.scenes.set(id, sceneCard);
    this.emit('scene-added', sceneCard);

    return id;
  }

  /**
   * Update scene card
   */
  updateScene(sceneId: string, updates: Partial<SceneCard>): boolean {
    const scene = this.board.scenes.get(sceneId);
    if (!scene) return false;

    // Apply position updates with grid snap
    if (updates.position && this.options.gridSnap) {
      updates.position = this.snapToGrid(updates.position);
    }

    Object.assign(scene, updates);
    this.emit('scene-updated', scene);

    return true;
  }

  /**
   * Remove scene card
   */
  removeScene(sceneId: string): boolean {
    const scene = this.board.scenes.get(sceneId);
    if (!scene) return false;

    this.board.scenes.delete(sceneId);
    
    // Remove from all tracks
    for (const track of Array.from(this.board.tracks.values())) {
      track.scenes = track.scenes.filter(id => id !== sceneId);
    }

    // Remove from selection
    this.board.selectedScenes.delete(sceneId);

    this.emit('scene-removed', scene);
    return true;
  }

  /**
   * Get scene card
   */
  getScene(sceneId: string): SceneCard | undefined {
    return this.board.scenes.get(sceneId);
  }

  /**
   * Get all scenes
   */
  getScenes(): SceneCard[] {
    return Array.from(this.board.scenes.values());
  }

  /**
   * Select scene
   */
  selectScene(sceneId: string, multiSelect?: boolean): void {
    if (!multiSelect) {
      this.board.selectedScenes.clear();
    }
    this.board.selectedScenes.add(sceneId);
    this.emit('selection-changed', Array.from(this.board.selectedScenes));
  }

  /**
   * Deselect scene
   */
  deselectScene(sceneId: string): void {
    this.board.selectedScenes.delete(sceneId);
    this.emit('selection-changed', Array.from(this.board.selectedScenes));
  }

  /**
   * Get selected scenes
   */
  getSelectedScenes(): SceneCard[] {
    return Array.from(this.board.selectedScenes)
      .map(id => this.board.scenes.get(id))
      .filter((scene): scene is SceneCard => scene !== undefined);
  }

  /**
   * Create timeline track
   */
  createTrack(name: string, color?: string): string {
    const id = this.generateId();
    const track: TimelineTrack = {
      id,
      name,
      scenes: [],
      color: color || this.generateTrackColor()
    };

    this.board.tracks.set(id, track);
    this.emit('track-created', track);

    return id;
  }

  /**
   * Add scene to track
   */
  addSceneToTrack(sceneId: string, trackId: string, index?: number): boolean {
    const track = this.board.tracks.get(trackId);
    if (!track || !this.board.scenes.has(sceneId)) return false;

    if (index !== undefined) {
      track.scenes.splice(index, 0, sceneId);
    } else {
      track.scenes.push(sceneId);
    }

    this.emit('track-updated', track);
    return true;
  }

  /**
   * Remove scene from track
   */
  removeSceneFromTrack(sceneId: string, trackId: string): boolean {
    const track = this.board.tracks.get(trackId);
    if (!track) return false;

    const index = track.scenes.indexOf(sceneId);
    if (index > -1) {
      track.scenes.splice(index, 1);
      this.emit('track-updated', track);
      return true;
    }

    return false;
  }

  /**
   * Get timeline tracks
   */
  getTracks(): TimelineTrack[] {
    return Array.from(this.board.tracks.values());
  }

  /**
   * Auto-layout scenes
   */
  autoLayout(): void {
    const scenes = this.getScenes();
    const gridSize = this.options.gridSize || 20;
    
    // Simple grid layout
    scenes.forEach((scene, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;
      
      scene.position = {
        x: col * (200 + gridSize),
        y: row * (150 + gridSize)
      };
    });

    this.emit('layout-changed');
  }

  /**
   * Update viewport
   */
  updateViewport(viewport: Partial<typeof this.board.viewport>): void {
    Object.assign(this.board.viewport, viewport);
    this.emit('viewport-changed', this.board.viewport);
  }

  /**
   * Get viewport
   */
  getViewport() {
    return { ...this.board.viewport };
  }

  /**
   * Export planning data
   */
  export(): string {
    return JSON.stringify({
      scenes: Array.from(this.board.scenes.entries()),
      tracks: Array.from(this.board.tracks.entries()),
      viewport: this.board.viewport
    }, null, 2);
  }

  /**
   * Import planning data
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.scenes) {
        this.board.scenes = new Map(parsed.scenes);
      }
      
      if (parsed.tracks) {
        this.board.tracks = new Map(parsed.tracks);
      }
      
      if (parsed.viewport) {
        this.board.viewport = parsed.viewport;
      }

      this.emit('data-imported');
    } catch (e) {
      throw new Error('Invalid planning data');
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): string {
    const id = this.generateId();
    this.listeners.set(id, { event, callback });
    return id;
  }

  /**
   * Remove event listener
   */
  off(listenerId: string): void {
    this.listeners.delete(listenerId);
  }

  private emit(event: string, data?: any): void {
    for (const listener of Array.from(this.listeners.values())) {
      if (listener.event === event) {
        listener.callback(data);
      }
    }
  }

  private snapToGrid(position: { x: number; y: number }): { x: number; y: number } {
    const size = this.options.gridSize || 20;
    return {
      x: Math.round(position.x / size) * size,
      y: Math.round(position.y / size) * size
    };
  }

  private getAutoColor(scene: SceneCard): string {
    switch (this.options.colorScheme) {
      case 'by-location':
        return this.getLocationColor(scene.location);
      case 'by-character':
        return this.getCharacterColor(scene.characters);
      case 'by-time':
        return this.getTimeColor(scene.time);
      default:
        return this.getDefaultColor(scene.type);
    }
  }

  private getLocationColor(location?: string): string {
    // Hash location to color
    if (!location) return '#666666';
    let hash = 0;
    for (let i = 0; i < location.length; i++) {
      hash = location.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `#${((hash & 0x00FFFFFF).toString(16).padStart(6, '0'))}`;
  }

  private getCharacterColor(characters?: string[]): string {
    if (!characters || characters.length === 0) return '#666666';
    return this.getLocationColor(characters[0]);
  }

  private getTimeColor(time?: string): string {
    if (!time) return '#666666';
    if (time.includes('ليل') || time.includes('night')) return '#1a237e';
    if (time.includes('نهار') || time.includes('day')) return '#fdd835';
    return '#666666';
  }

  private getDefaultColor(type?: string): string {
    switch (type) {
      case 'action': return '#4caf50';
      case 'dialogue': return '#2196f3';
      case 'montage': return '#ff9800';
      default: return '#666666';
    }
  }

  private generateTrackColor(): string {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private generateId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all planning data
   */
  clear(): void {
    this.board.scenes.clear();
    this.board.tracks.clear();
    this.board.selectedScenes.clear();
    this.board.viewport = { x: 0, y: 0, zoom: 1 };
    this.emit('cleared');
  }
}
