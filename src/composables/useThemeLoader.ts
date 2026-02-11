/**
 * Dynamic theme loading composable
 * Manages CSS injection for slide themes
 */
import { ref, watch, type Ref } from 'vue';
import { type SlidevTheme, getThemeByValue } from '@/utils/slidevMarkdown';

// Theme CSS imports - these will be dynamically loaded
const themeCssModules = {
  'venmail-pitch': () => import('@/themes/slidev-theme-venmail-pitch/styles/index.css?inline'),
  // Add other themes as needed
};

export function useThemeLoader(theme: Ref<string>) {
  const loadedThemes = ref<Set<string>>(new Set());
  const currentThemePath = ref<string>('');

  // Load theme CSS dynamically
  async function loadTheme(themeValue: string): Promise<void> {
    const themeObj = getThemeByValue(themeValue);
    
    if (!themeObj) {
      console.warn(`Theme not found: ${themeValue}`);
      return;
    }

    // If theme is already loaded, do nothing
    if (loadedThemes.value.has(themeValue)) {
      return;
    }

    try {
      // Remove previous theme CSS if exists
      if (currentThemePath.value) {
        const existingStyle = document.querySelector(`style[data-theme="${currentThemePath.value}"]`);
        if (existingStyle) {
          existingStyle.remove();
        }
      }

      // Load theme CSS using dynamic import if available
      if (themeCssModules[themeValue as keyof typeof themeCssModules]) {
        const cssModule = await themeCssModules[themeValue as keyof typeof themeCssModules]();
        
        // Create style element with the CSS content
        const style = document.createElement('style');
        style.setAttribute('data-theme', themeValue);
        style.textContent = cssModule.default || '';
        document.head.appendChild(style);

        // Mark as loaded
        loadedThemes.value.add(themeValue);
        currentThemePath.value = themeValue;

        console.log(`Loaded theme CSS: ${themeValue}`);
      } else if (themeObj.cssPath) {
        // Fallback to link element for themes not in the dynamic import map
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        
        // Handle different CSS path formats
        if (themeObj.cssPath.startsWith('@/')) {
          // Convert alias to actual path
          const cssPath = themeObj.cssPath.replace('@/', '/src/');
          link.href = cssPath;
        } else {
          link.href = themeObj.cssPath;
        }
        
        link.setAttribute('data-theme', themeValue);
        document.head.appendChild(link);

        // Mark as loaded
        loadedThemes.value.add(themeValue);
        currentThemePath.value = themeValue;

        console.log(`Loaded theme CSS via link: ${themeObj.cssPath}`);
      } else {
        // No CSS path, just mark as loaded
        loadedThemes.value.add(themeValue);
        currentThemePath.value = themeValue;
        console.log(`Theme ${themeValue} has no CSS path, marked as loaded`);
      }
    } catch (error) {
      console.error(`Failed to load theme CSS for ${themeValue}:`, error);
    }
  }

  // Remove theme CSS
  function unloadTheme(themeValue: string): void {
    // Try to remove style element first
    const style = document.querySelector(`style[data-theme="${themeValue}"]`);
    if (style) {
      style.remove();
    }
    
    // Try to remove link element as fallback
    const link = document.querySelector(`link[data-theme="${themeValue}"]`);
    if (link) {
      link.remove();
    }
    
    loadedThemes.value.delete(themeValue);
    
    if (currentThemePath.value === themeValue) {
      currentThemePath.value = '';
    }
  }

  // Watch for theme changes
  watch(theme, (newTheme, oldTheme) => {
    if (newTheme !== oldTheme) {
      loadTheme(newTheme);
    }
  }, { immediate: true });

  // Generate CSS variables for a theme
  function generateThemeCss(theme: SlidevTheme): string {
    const { colors, fontFamily } = theme;
    return `
      --slidev-primary: ${colors.primary};
      --slidev-secondary: ${colors.secondary};
      --slidev-background: ${colors.background};
      --slidev-surface: ${colors.surface};
      --slidev-text: ${colors.text};
      --slidev-text-muted: ${colors.textMuted};
      --slidev-accent: ${colors.accent};
      ${colors.gradient ? `--slidev-gradient: ${colors.gradient};` : ''}
      ${fontFamily ? `--slidev-font-family: ${fontFamily};` : ''}
    `;
  }

  // Apply theme CSS variables to an element
  function applyThemeToElement(element: HTMLElement, themeValue: string): void {
    const theme = getThemeByValue(themeValue);
    if (!theme) return;

    const cssVars = generateThemeCss(theme);
    element.style.cssText += cssVars;
  }

  return {
    loadedThemes,
    currentThemePath,
    loadTheme,
    unloadTheme,
    generateThemeCss,
    applyThemeToElement
  };
}
