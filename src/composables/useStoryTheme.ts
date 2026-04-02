/**
 * useStoryTheme — Theme management for the StoryTeller module.
 * Provides built-in theme presets, CSS variable injection scoped
 * to the canvas container, and theme editing utilities.
 */
import { computed, watch, type Ref } from 'vue';
import type { StoryTheme } from '@/types/story';
import { createDefaultTheme } from '@/types/story';

// ─── Built-in Theme Presets ─────────────────────────────────────────────

export interface ThemePreset {
  id: string;
  name: string;
  theme: StoryTheme;
}

export const builtInThemes: ThemePreset[] = [
  {
    id: 'default',
    name: 'Default',
    theme: createDefaultTheme(),
  },
  {
    id: 'midnight',
    name: 'Midnight',
    theme: {
      id: 'midnight',
      name: 'Midnight',
      colors: {
        primary: '#818cf8',
        secondary: '#c084fc',
        accent: '#f472b6',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        border: '#334155',
      },
      typography: {
        headingFont: 'Inter, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        monoFont: 'JetBrains Mono, monospace',
        baseSize: 16,
        scaleRatio: 1.25,
      },
      spacing: { unit: 8, scenePadding: 64 },
      effects: {
        borderRadius: '16px',
        shadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        glassmorphism: true,
        darkMode: true,
      },
    },
  },
  {
    id: 'warm-earth',
    name: 'Warm Earth',
    theme: {
      id: 'warm-earth',
      name: 'Warm Earth',
      colors: {
        primary: '#d97706',
        secondary: '#92400e',
        accent: '#dc2626',
        background: '#fefce8',
        surface: '#fef3c7',
        text: '#451a03',
        textSecondary: '#78350f',
        border: '#fde68a',
      },
      typography: {
        headingFont: 'Georgia, serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        monoFont: 'JetBrains Mono, monospace',
        baseSize: 16,
        scaleRatio: 1.333,
      },
      spacing: { unit: 8, scenePadding: 72 },
      effects: {
        borderRadius: '8px',
        shadow: '0 4px 16px rgba(146, 64, 14, 0.1)',
        glassmorphism: false,
        darkMode: false,
      },
    },
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    theme: {
      id: 'ocean-breeze',
      name: 'Ocean Breeze',
      colors: {
        primary: '#0891b2',
        secondary: '#155e75',
        accent: '#06b6d4',
        background: '#ecfeff',
        surface: '#cffafe',
        text: '#164e63',
        textSecondary: '#0e7490',
        border: '#a5f3fc',
      },
      typography: {
        headingFont: 'Inter, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        monoFont: 'JetBrains Mono, monospace',
        baseSize: 16,
        scaleRatio: 1.25,
      },
      spacing: { unit: 8, scenePadding: 64 },
      effects: {
        borderRadius: '24px',
        shadow: '0 4px 24px rgba(8, 145, 178, 0.12)',
        glassmorphism: false,
        darkMode: false,
      },
    },
  },
  {
    id: 'corporate',
    name: 'Corporate',
    theme: {
      id: 'corporate',
      name: 'Corporate',
      colors: {
        primary: '#1d4ed8',
        secondary: '#1e3a5f',
        accent: '#2563eb',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#0f172a',
        textSecondary: '#475569',
        border: '#e2e8f0',
      },
      typography: {
        headingFont: 'Inter, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        monoFont: 'JetBrains Mono, monospace',
        baseSize: 16,
        scaleRatio: 1.2,
      },
      spacing: { unit: 8, scenePadding: 56 },
      effects: {
        borderRadius: '8px',
        shadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        glassmorphism: false,
        darkMode: false,
      },
    },
  },
  {
    id: 'neon-noir',
    name: 'Neon Noir',
    theme: {
      id: 'neon-noir',
      name: 'Neon Noir',
      colors: {
        primary: '#a855f7',
        secondary: '#ec4899',
        accent: '#22d3ee',
        background: '#09090b',
        surface: '#18181b',
        text: '#fafafa',
        textSecondary: '#a1a1aa',
        border: '#27272a',
      },
      typography: {
        headingFont: 'Inter, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        monoFont: 'JetBrains Mono, monospace',
        baseSize: 16,
        scaleRatio: 1.333,
      },
      spacing: { unit: 8, scenePadding: 64 },
      effects: {
        borderRadius: '12px',
        shadow: '0 0 24px rgba(168, 85, 247, 0.2)',
        glassmorphism: true,
        darkMode: true,
      },
    },
  },
  {
    id: 'minimal-serif',
    name: 'Minimal Serif',
    theme: {
      id: 'minimal-serif',
      name: 'Minimal Serif',
      colors: {
        primary: '#1a1a1a',
        secondary: '#333333',
        accent: '#c0392b',
        background: '#faf8f5',
        surface: '#f0ece4',
        text: '#1a1a1a',
        textSecondary: '#666666',
        border: '#e0dcd4',
      },
      typography: {
        headingFont: 'Georgia, "Times New Roman", serif',
        bodyFont: 'Georgia, "Times New Roman", serif',
        monoFont: 'JetBrains Mono, monospace',
        baseSize: 18,
        scaleRatio: 1.414,
      },
      spacing: { unit: 8, scenePadding: 80 },
      effects: {
        borderRadius: '4px',
        shadow: '',
        glassmorphism: false,
        darkMode: false,
      },
    },
  },
];

// ─── Composable ─────────────────────────────────────────────────────────

export interface UseStoryThemeOptions {
  /** Reactive reference to the current document theme */
  theme: Ref<StoryTheme>;
  /** Callback when theme changes (to mark dirty) */
  onThemeChange?: () => void;
}

export function useStoryTheme(options: UseStoryThemeOptions) {
  const { theme, onThemeChange } = options;

  // ── CSS variables computed from theme ──────────────────────────────
  const themeVars = computed<Record<string, string>>(() => {
    const t = theme.value;
    return {
      '--story-color-primary': t.colors.primary,
      '--story-color-secondary': t.colors.secondary,
      '--story-color-accent': t.colors.accent,
      '--story-color-bg': t.colors.background,
      '--story-color-surface': t.colors.surface,
      '--story-color-text': t.colors.text,
      '--story-color-text-secondary': t.colors.textSecondary,
      '--story-color-border': t.colors.border,
      '--story-font-heading': t.typography.headingFont,
      '--story-font-body': t.typography.bodyFont,
      '--story-font-mono': t.typography.monoFont,
      '--story-font-base-size': `${t.typography.baseSize}px`,
      '--story-font-scale': `${t.typography.scaleRatio}`,
      '--story-spacing-unit': `${t.spacing.unit}px`,
      '--story-spacing-scene-padding': `${t.spacing.scenePadding}px`,
      '--story-border-radius': t.effects.borderRadius,
      '--story-shadow': t.effects.shadow,
    };
  });

  // ── Apply a preset ────────────────────────────────────────────────
  function applyPreset(presetId: string) {
    const preset = builtInThemes.find(p => p.id === presetId);
    if (!preset) return;
    Object.assign(theme.value, JSON.parse(JSON.stringify(preset.theme)));
    onThemeChange?.();
  }

  // ── Update individual theme properties ────────────────────────────
  function updateColors(colors: Partial<StoryTheme['colors']>) {
    Object.assign(theme.value.colors, colors);
    onThemeChange?.();
  }

  function updateTypography(typography: Partial<StoryTheme['typography']>) {
    Object.assign(theme.value.typography, typography);
    onThemeChange?.();
  }

  function updateSpacing(spacing: Partial<StoryTheme['spacing']>) {
    Object.assign(theme.value.spacing, spacing);
    onThemeChange?.();
  }

  function updateEffects(effects: Partial<StoryTheme['effects']>) {
    Object.assign(theme.value.effects, effects);
    onThemeChange?.();
  }

  // ── Current preset ID (if matching) ───────────────────────────────
  const currentPresetId = computed(() => {
    const t = theme.value;
    const match = builtInThemes.find(p => p.theme.id === t.id);
    return match?.id ?? null;
  });

  return {
    themeVars,
    builtInThemes,
    currentPresetId,
    applyPreset,
    updateColors,
    updateTypography,
    updateSpacing,
    updateEffects,
  };
}

export type StoryThemeReturn = ReturnType<typeof useStoryTheme>;
