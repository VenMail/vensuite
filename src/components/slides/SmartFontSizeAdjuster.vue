<template>
  <div
    v-if="show"
    class="smart-font-adjuster"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @click.stop
  >
    <!-- Header -->
    <div class="adjuster-header">
      <div class="header-content">
        <Type class="icon" />
        <span class="title">Smart Font Sizing</span>
        <button class="close-button" @click="emit('close')">
          <X class="close-icon" />
        </button>
      </div>
      
      <!-- Template indicator -->
      <div class="template-indicator">
        <span class="template-label">Template:</span>
        <span class="template-name">{{ currentTemplateName }}</span>
      </div>
    </div>

    <!-- Content Analysis -->
    <div v-if="contentMetrics" class="content-analysis">
      <div class="analysis-item">
        <span class="label">Text Length:</span>
        <span class="value">{{ contentMetrics.textLength }} chars</span>
      </div>
      <div class="analysis-item">
        <span class="label">Lines:</span>
        <span class="value">{{ contentMetrics.lineCount }}</span>
      </div>
      <div class="analysis-item">
        <span class="label">Has Diagrams:</span>
        <span class="value">{{ contentMetrics.hasDiagrams ? 'Yes' : 'No' }}</span>
      </div>
      <div v-if="overflowDetected" class="analysis-item warning">
        <AlertTriangle class="warning-icon" />
        <span class="label">Overflow:</span>
        <span class="value">Detected</span>
      </div>
    </div>

    <!-- Smart Recommendations -->
    <div v-if="hasRecommendations" class="smart-recommendations">
      <div class="recommendations-header">
        <Sparkles class="icon" />
        <span>AI Recommendations</span>
        <button 
          class="apply-all-button"
          @click="applyAllRecommendations"
        >
          Apply All
        </button>
      </div>
      <div class="recommendations-list">
        <div 
          v-for="(size, element) in sizingRecommendations"
          :key="element"
          class="recommendation-item"
        >
          <div class="element-info">
            <span class="element-label">{{ capitalizeFirst(element) }}</span>
            <span class="recommended-size">{{ size }}</span>
          </div>
          <div class="recommendation-actions">
            <button 
              class="apply-button"
              @click="applyRecommendation(element, size)"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Manual Controls -->
    <div class="manual-controls">
      <div class="controls-header">
        <Settings class="icon" />
        <span>Manual Adjustment</span>
      </div>
      
      <!-- Element Type Selector -->
      <div class="element-selector">
        <label class="selector-label">Element:</label>
        <select 
          :value="selectedElement"
          class="element-select"
          @change="handleElementChange"
        >
          <option value="title">Title (H1)</option>
          <option value="subtitle">Subtitle (H2-H3)</option>
          <option value="body">Body Text (P, LI)</option>
          <option value="caption">Caption (Small)</option>
        </select>
      </div>

      <!-- Size Presets -->
      <div class="size-presets">
        <div class="presets-header">
          <span class="presets-title">Quick Presets</span>
        </div>
        <div class="presets-grid">
          <button
            v-for="preset in currentPresets"
            :key="preset.value"
            class="preset-button"
            :class="{ active: currentSize === preset.value }"
            @click="applyPreset(preset.value)"
          >
            <span class="preset-label">{{ preset.label }}</span>
            <span class="preset-value">{{ preset.value }}</span>
          </button>
        </div>
      </div>

      <!-- Custom Input -->
      <div class="custom-input">
        <div class="input-group">
          <input
            ref="inputRef"
            v-model="customSize"
            type="number"
            :min="currentConstraints.minFontSize"
            :max="currentConstraints.maxFontSize"
            class="size-input"
            placeholder="Custom size"
            @keydown.enter="applyCustomSize"
            @keydown.esc="emit('close')"
          />
          <span class="unit">px</span>
          <button
            class="apply-button"
            @click="applyCustomSize"
            :disabled="!customSize"
          >
            Apply
          </button>
        </div>
        
        <!-- Size Range Indicator -->
        <div class="size-range">
          <div class="range-bar">
            <div 
              class="range-fill"
              :style="{ width: rangePercentage + '%' }"
            ></div>
          </div>
          <div class="range-labels">
            <span class="min-label">{{ currentConstraints.minFontSize }}px</span>
            <span class="ideal-label">{{ currentConstraints.idealFontSize }}px</span>
            <span class="max-label">{{ currentConstraints.maxFontSize }}px</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Advanced Options -->
    <div class="advanced-options">
      <div class="options-header">
        <ChevronDown 
          class="toggle-icon"
          :class="{ expanded: showAdvanced }"
          @click="showAdvanced = !showAdvanced"
        />
        <span>Advanced Options</span>
      </div>
      
      <div v-show="showAdvanced" class="options-content">
        <!-- Line Height -->
        <div class="option-item">
          <label class="option-label">Line Height:</label>
          <input
            v-model="lineHeight"
            type="number"
            min="1"
            max="3"
            step="0.1"
            class="option-input"
            @change="applyLineHeight"
          />
        </div>
        
        <!-- Letter Spacing -->
        <div class="option-item">
          <label class="option-label">Letter Spacing:</label>
          <input
            v-model="letterSpacing"
            type="number"
            min="-2"
            max="5"
            step="0.1"
            class="option-input"
            @change="applyLetterSpacing"
          />
        </div>
        
        <!-- Font Weight -->
        <div class="option-item">
          <label class="option-label">Font Weight:</label>
          <select 
            v-model="fontWeight"
            class="option-select"
            @change="applyFontWeight"
          >
            <option value="100">Thin (100)</option>
            <option value="300">Light (300)</option>
            <option value="400">Normal (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semibold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extrabold (800)</option>
            <option value="900">Black (900)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="adjuster-actions">
      <button 
        class="action-button secondary"
        @click="resetToDefaults"
      >
        <RotateCcw class="icon" />
        Reset to Default
      </button>
      <button 
        class="action-button primary"
        @click="applyToAllSlides"
      >
        <Copy class="icon" />
        Apply to All Slides
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { 
  Type, 
  X, 
  Sparkles, 
  Settings, 
  ChevronDown, 
  RotateCcw, 
  Copy,
  AlertTriangle
} from 'lucide-vue-next';
import type { FontSizingConstraints, TemplateProfile } from '@/composables/useSmartFontSizing';

interface Props {
  show: boolean;
  position: { x: number; y: number };
  currentSize?: string;
  selectedElement?: 'title' | 'subtitle' | 'body' | 'caption';
  templateProfile?: TemplateProfile;
  contentMetrics?: any;
  sizingRecommendations?: Record<string, string>;
  overflowDetected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  currentSize: '16px',
  selectedElement: 'body',
  overflowDetected: false
});

const emit = defineEmits<{
  (e: 'apply', size: string, element: string): void;
  (e: 'apply-recommendation', element: string, size: string): void;
  (e: 'apply-all-recommendations'): void;
  (e: 'apply-to-all-slides'): void;
  (e: 'reset-to-defaults'): void;
  (e: 'close'): void;
}>();

// Refs
const inputRef = ref<HTMLInputElement | null>(null);
const customSize = ref('');
const selectedElement = ref(props.selectedElement);
const showAdvanced = ref(false);
const lineHeight = ref('1.6');
const letterSpacing = ref('0');
const fontWeight = ref('400');

// Computed
const currentTemplateName = computed(() => 
  props.templateProfile?.name || 'Default'
);

const currentConstraints = computed<FontSizingConstraints>(() => {
  if (!props.templateProfile) {
    return {
      minFontSize: 12,
      maxFontSize: 48,
      idealFontSize: 16,
      lineHeight: 1.6
    };
  }
  
  switch (selectedElement.value) {
    case 'title':
      return props.templateProfile.constraints.title;
    case 'subtitle':
      return props.templateProfile.constraints.subtitle;
    case 'body':
      return props.templateProfile.constraints.body;
    case 'caption':
      return props.templateProfile.constraints.caption;
    default:
      return props.templateProfile.constraints.body;
  }
});

const currentPresets = computed(() => {
  const constraints = currentConstraints.value;
  const presets = [];
  
  // Generate smart presets based on constraints
  const minSize = constraints.minFontSize;
  const maxSize = constraints.maxFontSize;
  const idealSize = constraints.idealFontSize;
  
  // Add small, medium, large presets
  if (minSize < 16) presets.push({ label: 'Small', value: `${minSize}px` });
  presets.push({ label: 'Medium', value: `${idealSize}px` });
  if (maxSize > 20) presets.push({ label: 'Large', value: `${Math.min(maxSize, idealSize * 1.5)}px` });
  if (maxSize > 24) presets.push({ label: 'XLarge', value: `${maxSize}px` });
  
  return presets;
});

const rangePercentage = computed(() => {
  if (!customSize.value) return 50;
  
  const size = parseFloat(customSize.value);
  const { minFontSize, maxFontSize } = currentConstraints.value;
  
  return Math.max(0, Math.min(100, ((size - minFontSize) / (maxFontSize - minFontSize)) * 100));
});

const hasRecommendations = computed(() => 
  props.sizingRecommendations && Object.keys(props.sizingRecommendations).length > 0
);

// Methods
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function handleElementChange(event: Event) {
  selectedElement.value = (event.target as HTMLSelectElement).value as 'title' | 'subtitle' | 'body' | 'caption';
}

function applyPreset(size: string) {
  emit('apply', size, selectedElement.value);
  customSize.value = size.replace('px', '');
}

function applyCustomSize() {
  if (customSize.value) {
    const size = `${customSize.value}px`;
    emit('apply', size, selectedElement.value);
  }
}

function applyRecommendation(element: string, size: string) {
  emit('apply-recommendation', element, size);
}

function applyAllRecommendations() {
  emit('apply-all-recommendations');
}

function applyLineHeight() {
  // This would need to be handled by the parent component
  console.log('Apply line height:', lineHeight.value);
}

function applyLetterSpacing() {
  // This would need to be handled by the parent component
  console.log('Apply letter spacing:', letterSpacing.value);
}

function applyFontWeight() {
  // This would need to be handled by the parent component
  console.log('Apply font weight:', fontWeight.value);
}

function resetToDefaults() {
  emit('reset-to-defaults');
}

function applyToAllSlides() {
  emit('apply-to-all-slides');
}

// Watchers
watch(() => props.show, async (show) => {
  if (show) {
    await nextTick();
    inputRef.value?.focus();
    
    // Extract number from current size if available
    if (props.currentSize) {
      const match = props.currentSize.match(/(\d+)/);
      if (match) {
        customSize.value = match[1];
      }
    }
    
    // Reset selected element to prop value
    selectedElement.value = props.selectedElement;
  }
});

watch(() => props.selectedElement, (newElement) => {
  selectedElement.value = newElement;
});

watch(() => props.currentSize, (newSize) => {
  if (newSize) {
    const match = newSize.match(/(\d+)/);
    if (match) {
      customSize.value = match[1];
    }
  }
});
</script>

<style scoped>
.smart-font-adjuster {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  z-index: 1000;
  width: 320px;
  max-height: 80vh;
  overflow-y: auto;
}

.adjuster-header {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.header-content .icon {
  width: 16px;
  height: 16px;
  color: #6b7280;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  flex: 1;
}

.close-button {
  padding: 4px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.close-icon {
  width: 14px;
  height: 14px;
}

.template-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.template-label {
  color: #6b7280;
}

.template-name {
  font-weight: 500;
  color: #374151;
}

.content-analysis {
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
}

.analysis-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
}

.analysis-item.warning {
  color: #dc2626;
}

.warning-icon {
  width: 12px;
  height: 12px;
  margin-right: 4px;
}

.label {
  color: #6b7280;
}

.value {
  font-weight: 500;
  color: #374151;
}

.smart-recommendations {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.recommendations-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.recommendations-header .icon {
  width: 14px;
  height: 14px;
  color: #8b5cf6;
}

.apply-all-button {
  margin-left: auto;
  padding: 4px 8px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recommendation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: #f3f4f6;
  border-radius: 6px;
}

.element-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.element-label {
  font-size: 11px;
  color: #6b7280;
}

.recommended-size {
  font-size: 12px;
  font-family: monospace;
  color: #059669;
  font-weight: 500;
}

.apply-button {
  padding: 4px 8px;
  background: #059669;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
}

.manual-controls {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.controls-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.controls-header .icon {
  width: 14px;
  height: 14px;
  color: #6b7280;
}

.element-selector {
  margin-bottom: 16px;
}

.selector-label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.element-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  background: white;
}

.size-presets {
  margin-bottom: 16px;
}

.presets-header {
  margin-bottom: 8px;
}

.presets-title {
  font-size: 12px;
  color: #6b7280;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.preset-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-button:hover {
  background: #f3f4f6;
}

.preset-button.active {
  background: #dbeafe;
  border-color: #3b82f6;
}

.preset-label {
  font-size: 11px;
  color: #6b7280;
}

.preset-value {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.custom-input {
  margin-bottom: 12px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.size-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
}

.unit {
  font-size: 12px;
  color: #6b7280;
}

.size-range {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.range-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.range-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.2s ease;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #9ca3af;
}

.advanced-options {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.options-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.toggle-icon {
  width: 14px;
  height: 14px;
  color: #6b7280;
  transition: transform 0.2s ease;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.options-content {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.option-label {
  font-size: 12px;
  color: #6b7280;
  min-width: 80px;
}

.option-input,
.option-select {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
}

.adjuster-actions {
  padding: 16px;
  display: flex;
  gap: 8px;
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button.secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.action-button.secondary:hover {
  background: #e5e7eb;
}

.action-button.primary {
  background: #3b82f6;
  color: white;
}

.action-button.primary:hover {
  background: #2563eb;
}

.action-button .icon {
  width: 12px;
  height: 12px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .smart-font-adjuster {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }
  
  .adjuster-header {
    border-color: #374151;
  }
  
  .title {
    color: #f9fafb;
  }
  
  .close-button:hover {
    background: #374151;
    color: #f3f4f6;
  }
  
  .template-name {
    color: #f3f4f6;
  }
  
  .content-analysis {
    background: #111827;
    border-color: #374151;
  }
  
  .value {
    color: #f3f4f6;
  }
  
  .recommendations-header {
    color: #f3f4f6;
  }
  
  .controls-header {
    color: #f3f4f6;
  }
  
  .preset-button {
    background: #374151;
    border-color: #4b5563;
  }
  
  .preset-button:hover {
    background: #4b5563;
  }
  
  .preset-button.active {
    background: #1e3a8a;
    border-color: #3b82f6;
  }
  
  .preset-value {
    color: #f3f4f6;
  }
  
  .size-input,
  .element-select,
  .option-input,
  .option-select {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .action-button.secondary {
    background: #374151;
    color: #9ca3af;
  }
  
  .action-button.secondary:hover {
    background: #4b5563;
  }
}
</style>
