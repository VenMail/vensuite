<template>
  <div 
    ref="containerRef"
    class="responsive-slide-container"
    :class="{
      'overflow-detected': overflowDetected,
      'auto-scaling': autoScalingEnabled,
      'template-infographic': currentTemplate === 'infographic',
      'template-data-heavy': currentTemplate === 'data-heavy',
      'template-minimal': currentTemplate === 'minimal'
    }"
    :style="containerStyle"
  >
    <!-- Content Warning Banner -->
    <div 
      v-if="showWarnings && (overflowDetected || hasWarnings)"
      class="content-warning-banner"
      :class="warningType"
    >
      <div class="warning-content">
        <AlertTriangle class="warning-icon" />
        <span class="warning-text">{{ warningMessage }}</span>
        <button 
          v-if="autoScalingEnabled"
          class="auto-fix-button"
          @click="applyAutoFix"
        >
          Auto Fix
        </button>
      </div>
    </div>

    <!-- Sizing Recommendations Panel -->
    <div 
      v-if="showRecommendations && Object.keys(sizingRecommendations).length > 0"
      class="sizing-recommendations"
    >
      <div class="recommendations-header">
        <Type class="icon" />
        <span>Font Size Recommendations</span>
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
          <span class="element-label">{{ capitalizeFirst(element) }}</span>
          <span class="recommended-size">{{ size }}</span>
          <button 
            class="apply-button"
            @click="applyRecommendation(element, size)"
          >
            Apply
          </button>
        </div>
      </div>
    </div>

    <!-- Template Selector -->
    <div v-if="showTemplateSelector" class="template-selector">
      <label class="selector-label">Content Template:</label>
      <select 
        :value="currentTemplate"
        class="template-select"
        @change="handleTemplateChange"
      >
        <option 
          v-for="profile in Object.values(TEMPLATE_PROFILES)"
          :key="profile.name.toLowerCase().replace(' ', '-')"
          :value="profile.name.toLowerCase().replace(' ', '-')"
        >
          {{ profile.name }}
        </option>
      </select>
    </div>

    <!-- Main Content Slot -->
    <div 
      class="slide-content-wrapper"
      :style="contentWrapperStyle"
    >
      <slot 
        :content-metrics="contentMetrics"
        :layout-constraints="layoutConstraints"
        :template-profile="templateProfile"
        :overflow-detected="overflowDetected"
      />
    </div>

    <!-- Scaling Controls -->
    <div v-if="showScalingControls" class="scaling-controls">
      <div class="scaling-info">
        <span class="scale-label">Scale:</span>
        <span class="scale-value">{{ Math.round(currentScale * 100) }}%</span>
      </div>
      <div class="scaling-buttons">
        <button 
          class="scale-button"
          @click="scaleDown"
          :disabled="currentScale <= 0.5"
        >
          <ZoomOut class="icon" />
        </button>
        <button 
          class="scale-button"
          @click="resetScale"
          :disabled="currentScale === 1.0"
        >
          <RotateCcw class="icon" />
        </button>
        <button 
          class="scale-button"
          @click="scaleUp"
          :disabled="currentScale >= 1.0"
        >
          <ZoomIn class="icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { 
  AlertTriangle, 
  Type, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw 
} from 'lucide-vue-next';
import { useSmartFontSizing, type SmartFontSizingReturn } from '@/composables/useSmartFontSizing';

interface Props {
  content: string;
  slideWidth?: number;
  slideHeight?: number;
  padding?: number;
  template?: string;
  showWarnings?: boolean;
  showRecommendations?: boolean;
  showTemplateSelector?: boolean;
  showScalingControls?: boolean;
  autoScalingEnabled?: boolean;
  themeColors?: {
    warning: string;
    info: string;
    success: string;
  };
}

const props = withDefaults(defineProps<Props>(), {
  slideWidth: 560,
  slideHeight: 420,
  padding: 32,
  template: 'default',
  showWarnings: true,
  showRecommendations: true,
  showTemplateSelector: true,
  showScalingControls: true,
  autoScalingEnabled: true,
  themeColors: () => ({
    warning: '#f59e0b',
    info: '#3b82f6',
    success: '#10b981'
  })
});

const emit = defineEmits<{
  (e: 'template-change', template: string): void;
  (e: 'font-size-applied', element: string, size: string): void;
  (e: 'overflow-detected', detected: boolean): void;
  (e: 'content-analyzed', metrics: any): void;
}>();

// Refs
const containerRef = ref<HTMLElement | null>(null);
const currentScale = ref(1.0);

// Smart font sizing
const smartSizing: SmartFontSizingReturn = useSmartFontSizing(containerRef, {
  template: props.template,
  slideWidth: props.slideWidth,
  slideHeight: props.slideHeight,
  padding: props.padding
});

// Destructure smart sizing properties
const {
  currentTemplate,
  overflowDetected,
  sizingRecommendations,
  contentMetrics,
  templateProfile,
  layoutConstraints,
  TEMPLATE_PROFILES,
  analyzeAndOptimize,
  applyFontSizes,
  autoScaleContent,
  resetScaling,
  switchTemplate,
  generateClampValues
} = smartSizing;

// Computed
const hasWarnings = computed(() => {
  return contentMetrics.value.textLength > 500 || 
         contentMetrics.value.estimatedHeight > layoutConstraints.value.availableHeight;
});

const warningType = computed(() => {
  if (overflowDetected.value) return 'error';
  if (hasWarnings.value) return 'warning';
  return 'info';
});

const warningMessage = computed(() => {
  if (overflowDetected.value) return 'Content exceeds slide boundaries';
  if (contentMetrics.value.textLength > 500) return 'Content is quite long, consider reducing text';
  if (contentMetrics.value.estimatedHeight > layoutConstraints.value.availableHeight) return 'Content may not fit vertically';
  return 'Content fits well';
});

const containerStyle = computed(() => ({
  '--slide-width': `${props.slideWidth}px`,
  '--slide-height': `${props.slideHeight}px`,
  '--slide-padding': `${props.padding}px`,
  '--primary-color': props.themeColors.info,
  '--warning-color': props.themeColors.warning,
  '--success-color': props.themeColors.success,
  '--current-scale': currentScale.value,
  width: `${props.slideWidth}px`,
  height: `${props.slideHeight}px`,
  transform: `scale(${currentScale.value})`,
  transformOrigin: 'top left'
}));

const contentWrapperStyle = computed(() => ({
  padding: `${props.padding}px`,
  fontSize: generateClampValues('body'),
  lineHeight: templateProfile.value.constraints.body.lineHeight,
  maxWidth: `${layoutConstraints.value.availableWidth}px`,
  maxHeight: `${layoutConstraints.value.availableHeight}px`,
  overflow: 'auto'
}));

// Methods
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function handleTemplateChange(event: Event) {
  const template = (event.target as HTMLSelectElement).value;
  switchTemplate(template);
  emit('template-change', template);
}

function applyRecommendation(element: string, size: string) {
  applyFontSizes({ [element]: size });
  emit('font-size-applied', element, size);
}

function applyAllRecommendations() {
  applyFontSizes(sizingRecommendations.value);
  Object.entries(sizingRecommendations.value).forEach(([element, size]) => {
    emit('font-size-applied', element, size);
  });
}

function applyAutoFix() {
  if (containerRef.value && overflowDetected.value) {
    autoScaleContent(containerRef.value, 0.9);
    currentScale.value *= 0.9;
  }
}

function scaleUp() {
  if (currentScale.value < 1.0) {
    currentScale.value = Math.min(1.0, currentScale.value + 0.1);
  }
}

function scaleDown() {
  if (currentScale.value > 0.5) {
    currentScale.value = Math.max(0.5, currentScale.value - 0.1);
  }
}

function resetScale() {
  currentScale.value = 1.0;
  resetScaling();
}

// Watchers
watch(() => props.content, async (newContent) => {
  if (newContent) {
    await analyzeAndOptimize(newContent);
    emit('content-analyzed', contentMetrics.value);
  }
}, { immediate: true });

watch(() => props.template, (newTemplate) => {
  if (newTemplate !== currentTemplate.value) {
    switchTemplate(newTemplate);
  }
});

watch(overflowDetected, (detected) => {
  emit('overflow-detected', detected);
});

// Lifecycle
onMounted(async () => {
  await nextTick();
  if (props.content) {
    await analyzeAndOptimize(props.content);
  }
});

onUnmounted(() => {
  resetScaling();
});
</script>

<style scoped>
.responsive-slide-container {
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.responsive-slide-container.overflow-detected {
  border: 2px solid var(--warning-color);
}

.responsive-slide-container.auto-scaling {
  border: 2px solid var(--info-color);
}

.content-warning-banner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 12px;
  backdrop-filter: blur(4px);
}

.content-warning-banner.error {
  background: var(--warning-color);
}

.content-warning-banner.warning {
  background: var(--warning-color);
  opacity: 0.9;
}

.content-warning-banner.info {
  background: var(--info-color);
}

.warning-content {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
}

.warning-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.warning-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auto-fix-button {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.auto-fix-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.sizing-recommendations {
  position: absolute;
  top: 40px;
  right: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  z-index: 20;
  min-width: 200px;
}

.recommendations-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.recommendations-header .icon {
  width: 14px;
  height: 14px;
}

.apply-all-button {
  margin-left: auto;
  padding: 2px 6px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recommendation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 11px;
}

.element-label {
  color: #6b7280;
}

.recommended-size {
  font-family: monospace;
  color: #059669;
  font-weight: 500;
}

.apply-button {
  padding: 2px 6px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.apply-button:hover {
  background: #e5e7eb;
}

.template-selector {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
}

.selector-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.template-select {
  padding: 2px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 11px;
  background: white;
  cursor: pointer;
}

.slide-content-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
}

.scaling-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
}

.scaling-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6b7280;
}

.scale-label {
  font-weight: 500;
}

.scale-value {
  font-family: monospace;
  font-weight: 600;
  color: #374151;
}

.scaling-buttons {
  display: flex;
  gap: 2px;
}

.scale-button {
  padding: 2px;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.scale-button:hover:not(:disabled) {
  background: #f3f4f6;
}

.scale-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scale-button .icon {
  width: 12px;
  height: 12px;
}

/* Template-specific styles */
.template-infographic .slide-content-wrapper {
  font-size: clamp(12px, 14px, 18px);
}

.template-data-heavy .slide-content-wrapper {
  font-size: clamp(11px, 13px, 16px);
}

.template-minimal .slide-content-wrapper {
  font-size: clamp(16px, 20px, 24px);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .responsive-slide-container {
    background: #1f2937;
    color: #f9fafb;
  }
  
  .sizing-recommendations {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .template-selector .selector-label {
    color: #9ca3af;
  }
  
  .template-select {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .scaling-controls {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .scaling-info {
    color: #9ca3af;
  }
  
  .scale-value {
    color: #f9fafb;
  }
}
</style>
