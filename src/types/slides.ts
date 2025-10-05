export interface SlideScene {
  elements: any[];
  appState?: Record<string, any>;
  files?: Record<string, any>;
}

export interface SlidePage {
  id: string;
  name: string;
  scene: SlideScene;
  thumbnail?: string;
}

export interface SnapSettings {
  showGrid: boolean;
  gridSize: number;
  showGuides: boolean;
  smartSnapping: boolean;
}

export interface SlideDeckTemplatePage {
  name?: string;
  scene?: SlideScene;
}

export interface SlideTemplateSummary {
  slug: string;
  title: string;
  description?: string;
  isDefault: boolean;
}

export interface SlideTemplateManifest extends Partial<SlideTemplateSummary> {
  default?: boolean;
  pages?: SlideDeckTemplatePage[];
}

export interface SlideDeckTemplate {
  title?: string;
  pages: SlideDeckTemplatePage[];
}

export interface SlideDeckData {
  id?: string;
  title: string;
  pages: SlidePage[];
  snapSettings: SnapSettings;
  version: number;
}

export interface SlideImportStatus {
  isImporting: boolean;
  lastError: string | null;
  source?: 'pptx' | 'html';
}
