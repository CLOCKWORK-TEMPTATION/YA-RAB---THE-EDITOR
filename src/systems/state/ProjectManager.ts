// src/systems/state/ProjectManager.ts
// ====================================
// Project Manager
//
// Responsibilities:
// - Manage screenplay projects
// - Track project metadata
// - Handle project operations
//
// NO document logic
// NO UI logic

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  author?: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  status: 'draft' | 'review' | 'final';
  statistics: {
    scenes: number;
    pages: number;
    words: number;
    characters: number;
  };
}

export interface ProjectOptions {
  autoSave?: boolean;
  backupCount?: number;
  exportFormats?: string[];
}

export interface ProjectTemplate {
  name: string;
  description: string;
  content: string;
  metadata: Partial<ProjectMetadata>;
}

export class ProjectManager {
  private projects: Map<string, ProjectMetadata> = new Map();
  private currentProjectId: string | null = null;
  private options: ProjectOptions;
  private templates: ProjectTemplate[] = [];

  constructor(options: Partial<ProjectOptions> = {}) {
    this.options = {
      autoSave: true,
      backupCount: 5,
      exportFormats: ['pdf', 'fdx', 'fountain'],
      ...options
    };

    this.initializeTemplates();
  }

  /**
   * Create new project
   */
  createProject(name: string, template?: string): ProjectMetadata {
    const project: ProjectMetadata = {
      id: this.generateId(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      status: 'draft',
      statistics: {
        scenes: 0,
        pages: 0,
        words: 0,
        characters: 0
      }
    };

    // Apply template if provided
    if (template) {
      const templateData = this.templates.find(t => t.name === template);
      if (templateData) {
        Object.assign(project, templateData.metadata);
      }
    }

    this.projects.set(project.id, project);
    this.currentProjectId = project.id;

    return project;
  }

  /**
   * Open existing project
   */
  openProject(projectId: string): ProjectMetadata | null {
    const project = this.projects.get(projectId);
    if (project) {
      this.currentProjectId = projectId;
      return project;
    }
    return null;
  }

  /**
   * Close current project
   */
  closeProject(): void {
    this.currentProjectId = null;
  }

  /**
   * Update project metadata
   */
  updateProject(projectId: string, updates: Partial<ProjectMetadata>): ProjectMetadata | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    Object.assign(project, updates, { updatedAt: Date.now() });
    this.projects.set(projectId, project);

    return project;
  }

  /**
   * Delete project
   */
  deleteProject(projectId: string): boolean {
    return this.projects.delete(projectId);
  }

  /**
   * Get current project
   */
  getCurrentProject(): ProjectMetadata | null {
    if (!this.currentProjectId) return null;
    return this.projects.get(this.currentProjectId) || null;
  }

  /**
   * Get all projects
   */
  getProjects(): ProjectMetadata[] {
    return Array.from(this.projects.values());
  }

  /**
   * Search projects
   */
  searchProjects(query: string): ProjectMetadata[] {
    const lowerQuery = query.toLowerCase();
    
    return this.getProjects().filter(project => 
      project.name.toLowerCase().includes(lowerQuery) ||
      project.description?.toLowerCase().includes(lowerQuery) ||
      project.author?.toLowerCase().includes(lowerQuery) ||
      project.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Update project statistics
   */
  updateStatistics(projectId: string, content: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    // Calculate statistics
    const lines = content.split('\n');
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const characters = content.length;
    const scenes = lines.filter(line => 
      /^\s*(?:مشهد|م\.|scene)\s*[0-9٠-٩]/i.test(line)
    ).length;
    
    // Estimate pages (standard screenplay: ~1 page per minute)
    const pages = Math.ceil(words / 150);

    project.statistics = {
      scenes,
      pages,
      words,
      characters
    };

    project.updatedAt = Date.now();
  }

  /**
   * Add tag to project
   */
  addTag(projectId: string, tag: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    if (!project.tags.includes(tag)) {
      project.tags.push(tag);
      project.updatedAt = Date.now();
    }
  }

  /**
   * Remove tag from project
   */
  removeTag(projectId: string, tag: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    const index = project.tags.indexOf(tag);
    if (index > -1) {
      project.tags.splice(index, 1);
      project.updatedAt = Date.now();
    }
  }

  /**
   * Get available templates
   */
  getTemplates(): ProjectTemplate[] {
    return [...this.templates];
  }

  /**
   * Add custom template
   */
  addTemplate(template: ProjectTemplate): void {
    this.templates.push(template);
  }

  /**
   * Export project list
   */
  exportProjects(): string {
    return JSON.stringify(this.getProjects(), null, 2);
  }

  /**
   * Import project list
   */
  importProjects(data: string): number {
    try {
      const projects = JSON.parse(data) as ProjectMetadata[];
      let imported = 0;

      for (const project of projects) {
        if (!this.projects.has(project.id)) {
          this.projects.set(project.id, project);
          imported++;
        }
      }

      return imported;
    } catch (e) {
      throw new Error('Invalid project data');
    }
  }

  private initializeTemplates(): void {
    this.templates = [
      {
        name: 'Blank Screenplay',
        description: 'Empty screenplay template',
        content: '',
        metadata: {
          description: 'New screenplay project'
        }
      },
      {
        name: 'Arabic Feature Film',
        description: 'Standard Arabic feature film template',
        content: `بسم الله الرحمن الرحيم

مشهد 1

داخلي. بيت - نهار

`,
        metadata: {
          description: 'Arabic feature film screenplay',
          tags: ['arabic', 'feature']
        }
      },
      {
        name: 'Short Film',
        description: 'Short film template',
        content: `مشهد 1

`,
        metadata: {
          description: 'Short film screenplay',
          tags: ['short']
        }
      }
    ];
  }

  private generateId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all projects
   */
  clear(): void {
    this.projects.clear();
    this.currentProjectId = null;
  }
}
