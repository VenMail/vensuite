/**
 * Preset Styling System
 * Handles parsing and application of preset styles like {.presets.styling.vignette{options}}
 */

export interface PresetOptions {
  [key: string]: string | number | boolean;
}

export interface ParsedPreset {
  type: string; // e.g., 'styling'
  name: string; // e.g., 'vignette'
  options: PresetOptions;
  cssClass: string; // Generated CSS class name
}

/**
 * Parse preset syntax from class attributes
 * Supports formats:
 * - {.presets.styling.vignette}
 * - {.presets.styling.vignette{intensity=0.8}}
 * - {.presets.styling.vignette{intensity=0.8,color=#000}}
 */
export function parsePresetSyntax(classString: string): ParsedPreset[] {
  const presets: ParsedPreset[] = [];
  
  // Match preset patterns: .presets.category.name{options}
  const presetRegex = /\.presets\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)(?:\{([^}]+)\})?/g;
  let match;
  
  while ((match = presetRegex.exec(classString)) !== null) {
    const [, category, name, optionsString] = match;
    
    // Parse options if present
    const options: PresetOptions = {};
    if (optionsString) {
      // Parse key=value pairs separated by commas
      const optionPairs = optionsString.split(',');
      for (const pair of optionPairs) {
        const [key, value] = pair.split('=').map(s => s.trim());
        if (key && value) {
          // Try to parse as number, boolean, or keep as string
          if (value === 'true') {
            options[key] = true;
          } else if (value === 'false') {
            options[key] = false;
          } else if (/^\d+$/.test(value)) {
            options[key] = parseInt(value, 10);
          } else if (/^\d+\.\d+$/.test(value)) {
            options[key] = parseFloat(value);
          } else {
            options[key] = value;
          }
        }
      }
    }
    
    // Generate CSS class name
    const cssClass = `preset-${category}-${name}`;
    
    presets.push({
      type: category,
      name,
      options,
      cssClass
    });
  }
  
  return presets;
}

/**
 * Apply preset styles to an element
 */
export function applyPresetStyles(element: HTMLElement, presets: ParsedPreset[]): void {
  for (const preset of presets) {
    // Add CSS class
    element.classList.add(preset.cssClass);
    
    // Add data attributes for options
    for (const [key, value] of Object.entries(preset.options)) {
      element.setAttribute(`data-preset-${key}`, String(value));
    }
    
    // Apply specific preset logic
    switch (preset.type) {
      case 'styling':
        applyStylingPreset(element, preset);
        break;
      // Add other preset types as needed
    }
  }
}

/**
 * Apply styling-specific presets
 */
function applyStylingPreset(element: HTMLElement, preset: ParsedPreset): void {
  switch (preset.name) {
    case 'vignette':
      applyVignettePreset(element, preset.options);
      break;
    // Add other styling presets as needed
  }
}

/**
 * Apply vignette effect preset
 */
function applyVignettePreset(element: HTMLElement, options: PresetOptions): void {
  const intensity = (options.intensity as number) || 0.7;
  const color = (options.color as string) || '#000000';
  const size = (options.size as string) || 'medium';
  
  // Set CSS variables for the vignette effect
  element.style.setProperty('--vignette-intensity', String(intensity));
  element.style.setProperty('--vignette-color', color);
  element.style.setProperty('--vignette-size', size);
}

/**
 * Generate CSS for preset effects
 */
export function generatePresetCSS(): string {
  return `
/* Preset Styling - Vignette Effect */
.preset-styling-vignette {
  position: relative;
  overflow: hidden;
}

.preset-styling-vignette::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
  background: radial-gradient(
    ellipse at center,
    transparent 0%,
    rgba(var(--vignette-color-rgb, 0, 0, 0), 0) var(--vignette-stop, 40%),
    rgba(var(--vignette-color-rgb, 0, 0, 0), var(--vignette-intensity, 0.7)) 100%
  );
}

/* Size variations */
.preset-styling-vignette[data-preset-size="small"]::before {
  --vignette-stop: 60%;
}

.preset-styling-vignette[data-preset-size="medium"]::before {
  --vignette-stop: 40%;
}

.preset-styling-vignette[data-preset-size="large"]::before {
  --vignette-stop: 20%;
}

/* Color variations - convert hex to RGB */
.preset-styling-vignette[data-preset-color="#000000"]::before {
  --vignette-color-rgb: 0, 0, 0;
}

.preset-styling-vignette[data-preset-color="#ffffff"]::before {
  --vignette-color-rgb: 255, 255, 255;
}

.preset-styling-vignette[data-preset-color="#ff0000"]::before {
  --vignette-color-rgb: 255, 0, 0;
}

.preset-styling-vignette[data-preset-color="#00ff00"]::before {
  --vignette-color-rgb: 0, 255, 0;
}

.preset-styling-vignette[data-preset-color="#0000ff"]::before {
  --vignette-color-rgb: 0, 0, 255;
}

/* Ensure content stays above vignette */
.preset-styling-vignette img,
.preset-styling-vignette video,
.preset-styling-vignette .content {
  position: relative;
  z-index: 0;
}

/* Additional preset styles can be added here */
.preset-styling-glow {
  position: relative;
}

.preset-styling-glow::before {
  content: '';
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  background: radial-gradient(circle, var(--glow-color, #3b82f6), transparent 70%);
  opacity: var(--glow-intensity, 0.5);
  filter: blur(var(--glow-blur, 10px));
  z-index: -1;
}

.preset-styling-shadow {
  box-shadow: var(--shadow-size, 0 10px 30px) var(--shadow-color, rgba(0, 0, 0, 0.3));
}

.preset-styling-border {
  border: var(--border-width, 2px) solid var(--border-color, #3b82f6);
  border-radius: var(--border-radius, 8px);
}
`;
}

/**
 * Convert hex color to RGB for CSS variables
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Get all available presets
 */
export function getAvailablePresets(): { category: string; name: string; description: string; options: string[] }[] {
  return [
    {
      category: 'styling',
      name: 'vignette',
      description: 'Apply a vignette effect with customizable intensity and color',
      options: ['intensity (0-1)', 'color (hex)', 'size (small|medium|large)']
    },
    {
      category: 'styling',
      name: 'glow',
      description: 'Add a glowing effect around the element',
      options: ['color (hex)', 'intensity (0-1)', 'blur (px)']
    },
    {
      category: 'styling',
      name: 'shadow',
      description: 'Apply a customizable shadow effect',
      options: ['color (hex)', 'size (css shadow)']
    },
    {
      category: 'styling',
      name: 'border',
      description: 'Add a customizable border',
      options: ['color (hex)', 'width (px)', 'radius (px)']
    }
  ];
}
