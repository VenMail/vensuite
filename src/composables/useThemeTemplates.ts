import { ref, computed } from 'vue';

export interface ThemeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  theme: string;
  content: string;
  frontmatter?: Record<string, any>;
  icon?: string;
}

// Cache for loaded templates
const themeTemplatesCache = ref<Map<string, ThemeTemplate[]>>(new Map());
const loading = ref(false);

/**
 * Load theme-specific templates from assets directory
 */
export async function loadThemeTemplates(theme: string): Promise<ThemeTemplate[]> {
  // Check cache first
  if (themeTemplatesCache.value.has(theme)) {
    return themeTemplatesCache.value.get(theme)!;
  }

  loading.value = true;
  
  try {
    // Import all template files for this theme
    const templateModules = import.meta.glob('@/assets/templates/*.md', { as: 'raw' });
    const templates: ThemeTemplate[] = [];
    
    for (const [path, moduleLoader] of Object.entries(templateModules)) {
      // Only load templates that match the theme
      const fileName = path.split('/').pop()?.toLowerCase() || '';
      if (!fileName.includes(theme.toLowerCase())) continue;
      
      try {
        const content = await moduleLoader();
        const template = parseTemplateFile(content, fileName);
        if (template) {
          templates.push(template);
        }
      } catch (error) {
        console.warn(`Failed to load template ${path}:`, error);
      }
    }
    
    // Cache the results
    themeTemplatesCache.value.set(theme, templates);
    return templates;
  } finally {
    loading.value = false;
  }
}

/**
 * Parse a template markdown file into ThemeTemplate format
 */
function parseTemplateFile(content: string, fileName: string): ThemeTemplate | null {
  try {
    // Extract frontmatter
    let slideContent = content;
    let frontmatter: Record<string, any> = {};
    
    if (content.startsWith('---')) {
      const endIndex = content.indexOf('---', 3);
      if (endIndex > 0) {
        const yamlContent = content.substring(3, endIndex).trim();
        frontmatter = parseYamlFrontmatter(yamlContent);
        slideContent = content.substring(endIndex + 3).trim();
      }
    }
    
    // Extract title from content for template name
    const titleMatch = slideContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Untitled';
    
    // Generate template ID from filename
    const templateId = fileName.replace('.md', '');
    
    // Determine category based on content and filename
    const category = determineTemplateCategory(templateId, title);
    
    // Extract presenter notes
    const notesMatch = slideContent.match(/<!--[\s\S]*?-->$/);
    const cleanContent = notesMatch 
      ? slideContent.substring(0, slideContent.lastIndexOf('<!--')).trim()
      : slideContent;
    
    return {
      id: templateId,
      name: title,
      description: generateDescription(templateId, cleanContent),
      category,
      theme: frontmatter.theme || 'venmail-pitch',
      content: cleanContent,
      frontmatter,
      icon: getTemplateIcon(templateId)
    };
  } catch (error) {
    console.error(`Failed to parse template file ${fileName}:`, error);
    return null;
  }
}

/**
 * Simple YAML frontmatter parser (basic implementation)
 */
function parseYamlFrontmatter(yamlContent: string): Record<string, any> {
  const result: Record<string, string | number | boolean> = {};
  const lines = yamlContent.split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value: string | number | boolean = line.substring(colonIndex + 1).trim();
      
      // Handle basic YAML types
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (!isNaN(Number(value))) {
        value = Number(value);
      }
      
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Determine template category based on content and filename
 */
function determineTemplateCategory(templateId: string, title: string): string {
  const id = templateId.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // Cover slides
  if (id.includes('cover') || titleLower.includes('cover') || titleLower.includes('title')) {
    return 'title';
  }
  
  // Mission/Vision/Problem slides
  if (id.includes('mission') || id.includes('vision') || id.includes('problem') || id.includes('solution')) {
    return 'content';
  }
  
  // Pricing/Market slides
  if (id.includes('pricing') || id.includes('market')) {
    return 'data';
  }
  
  // Thank you slides
  if (id.includes('thank') || titleLower.includes('thank')) {
    return 'end';
  }
  
  // Default to content
  return 'content';
}

/**
 * Generate template description
 */
function generateDescription(templateId: string, content: string): string {
  const id = templateId.toLowerCase();
  
  if (id.includes('cover')) {
    return 'Professional cover slide with branding';
  }
  if (id.includes('mission')) {
    return 'Mission statement with vision and targets';
  }
  if (id.includes('problem')) {
    return 'Problem statement with market analysis';
  }
  if (id.includes('solution')) {
    return 'Solution overview with key features';
  }
  if (id.includes('pricing')) {
    return 'Pricing tiers and value proposition';
  }
  if (id.includes('market')) {
    return 'Market opportunity and target audience';
  }
  if (id.includes('thank')) {
    return 'Thank you slide with contact info';
  }
  
  // Extract first line of content as fallback
  const firstLine = content.split('\n')[0].replace(/^#\s+/, '');
  return firstLine || 'Themed template slide';
}

/**
 * Get icon for template
 */
function getTemplateIcon(templateId: string): string {
  const id = templateId.toLowerCase();
  
  if (id.includes('cover')) return '🎯';
  if (id.includes('mission')) return '🚀';
  if (id.includes('problem')) return '⚠️';
  if (id.includes('solution')) return '💡';
  if (id.includes('pricing')) return '💰';
  if (id.includes('market')) return '📊';
  if (id.includes('thank')) return '🙏';
  
  return '📄';
}

/**
 * Get theme-specific templates
 */
export function useThemeTemplates() {
  const getTemplatesForTheme = computed(() => (theme: string) => {
    return themeTemplatesCache.value.get(theme) || [];
  });
  
  const getTemplatesForThemeAndCategory = computed(() => (theme: string, category: string) => {
    const templates = themeTemplatesCache.value.get(theme) || [];
    return templates.filter(t => t.category === category);
  });
  
  const isThemeTemplateLoaded = computed(() => (theme: string) => {
    return themeTemplatesCache.value.has(theme);
  });
  
  return {
    loadThemeTemplates,
    getTemplatesForTheme,
    getTemplatesForThemeAndCategory,
    isThemeTemplateLoaded,
    loading: computed(() => loading.value)
  };
}
