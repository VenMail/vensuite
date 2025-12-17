<template>
  <div class="page-ruler" :class="{ 'page-ruler--vertical': orientation === 'vertical' }">
    <!-- Horizontal Ruler -->
    <div v-if="orientation === 'horizontal'" class="page-ruler__horizontal">
      <div class="page-ruler__track" :style="trackStyle">
        <!-- Left margin handle -->
        <div
          class="page-ruler__margin page-ruler__margin--left"
          :style="{ left: `${marginLeftPx}px` }"
          @mousedown="startDrag('marginLeft', $event)"
        >
          <div class="page-ruler__handle page-ruler__handle--margin" :title="`Left margin: ${marginLeft}px`">
            <ChevronRight class="h-3 w-3" />
          </div>
        </div>

        <!-- Right margin handle -->
        <div
          class="page-ruler__margin page-ruler__margin--right"
          :style="{ right: `${marginRightPx}px` }"
          @mousedown="startDrag('marginRight', $event)"
        >
          <div class="page-ruler__handle page-ruler__handle--margin" :title="`Right margin: ${marginRight}px`">
            <ChevronLeft class="h-3 w-3" />
          </div>
        </div>

        <!-- First line indent handle -->
        <div
          v-if="showIndentHandles"
          class="page-ruler__indent page-ruler__indent--first"
          :style="{ left: `${marginLeftPx + firstLineIndentPx}px` }"
          @mousedown="startDrag('firstLineIndent', $event)"
        >
          <div class="page-ruler__handle page-ruler__handle--indent" :title="`First line indent: ${firstLineIndent}px`">
            <div class="page-ruler__triangle page-ruler__triangle--down"></div>
          </div>
        </div>

        <!-- Left indent (hanging) handle -->
        <div
          v-if="showIndentHandles"
          class="page-ruler__indent page-ruler__indent--left"
          :style="{ left: `${marginLeftPx + leftIndentPx}px` }"
          @mousedown="startDrag('leftIndent', $event)"
        >
          <div class="page-ruler__handle page-ruler__handle--indent" :title="`Left indent: ${leftIndent}px`">
            <div class="page-ruler__triangle page-ruler__triangle--up"></div>
          </div>
        </div>

        <!-- Ruler ticks -->
        <div class="page-ruler__ticks">
          <template v-for="tick in horizontalTicks" :key="tick.position">
            <div
              class="page-ruler__tick"
              :class="[`page-ruler__tick--${tick.type}`]"
              :style="{ left: `${tick.position}px` }"
            >
              <span v-if="tick.label" class="page-ruler__label">{{ tick.label }}</span>
            </div>
          </template>
        </div>

        <!-- Content area indicator -->
        <div
          class="page-ruler__content-area"
          :style="{
            left: `${marginLeftPx}px`,
            right: `${marginRightPx}px`,
          }"
        ></div>
      </div>
    </div>

    <!-- Vertical Ruler -->
    <div v-if="orientation === 'vertical'" class="page-ruler__vertical">
      <div class="page-ruler__track page-ruler__track--vertical" :style="verticalTrackStyle">
        <!-- Top margin handle -->
        <div
          class="page-ruler__margin page-ruler__margin--top"
          :style="{ top: `${marginTopPx}px` }"
          @mousedown="startDrag('marginTop', $event)"
        >
          <div class="page-ruler__handle page-ruler__handle--margin" :title="`Top margin: ${marginTop}px`">
            <ChevronDown class="h-3 w-3" />
          </div>
        </div>

        <!-- Bottom margin handle -->
        <div
          class="page-ruler__margin page-ruler__margin--bottom"
          :style="{ bottom: `${marginBottomPx}px` }"
          @mousedown="startDrag('marginBottom', $event)"
        >
          <div class="page-ruler__handle page-ruler__handle--margin" :title="`Bottom margin: ${marginBottom}px`">
            <ChevronUp class="h-3 w-3" />
          </div>
        </div>

        <!-- Ruler ticks -->
        <div class="page-ruler__ticks page-ruler__ticks--vertical">
          <template v-for="tick in verticalTicks" :key="tick.position">
            <div
              class="page-ruler__tick page-ruler__tick--vertical"
              :class="[`page-ruler__tick--${tick.type}`]"
              :style="{ top: `${tick.position}px` }"
            >
              <span v-if="tick.label" class="page-ruler__label">{{ tick.label }}</span>
            </div>
          </template>
        </div>

        <!-- Content area indicator -->
        <div
          class="page-ruler__content-area page-ruler__content-area--vertical"
          :style="{
            top: `${marginTopPx}px`,
            bottom: `${marginBottomPx}px`,
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-vue-next';

interface Props {
  orientation?: 'horizontal' | 'vertical';
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  firstLineIndent?: number;
  leftIndent?: number;
  showIndentHandles?: boolean;
  unit?: 'px' | 'mm' | 'in' | 'cm';
  scale?: number;
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  firstLineIndent: 0,
  leftIndent: 0,
  showIndentHandles: true,
  unit: 'px',
  scale: 1,
});

const emit = defineEmits<{
  (e: 'update:marginTop', value: number): void;
  (e: 'update:marginBottom', value: number): void;
  (e: 'update:marginLeft', value: number): void;
  (e: 'update:marginRight', value: number): void;
  (e: 'update:firstLineIndent', value: number): void;
  (e: 'update:leftIndent', value: number): void;
}>();

// Drag state
const isDragging = ref(false);
const dragType = ref<string | null>(null);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartValue = ref(0);

// Conversion constants
const MM_TO_PX = 96 / 25.4;
const IN_TO_PX = 96;
const CM_TO_PX = 96 / 2.54;

// Computed scaled values
const marginLeftPx = computed(() => props.marginLeft * props.scale);
const marginRightPx = computed(() => props.marginRight * props.scale);
const marginTopPx = computed(() => props.marginTop * props.scale);
const marginBottomPx = computed(() => props.marginBottom * props.scale);
const firstLineIndentPx = computed(() => props.firstLineIndent * props.scale);
const leftIndentPx = computed(() => props.leftIndent * props.scale);

// Track styles
const trackStyle = computed(() => ({
  width: `${props.pageWidth * props.scale}px`,
  height: '20px',
}));

const verticalTrackStyle = computed(() => ({
  width: '20px',
  height: `${props.pageHeight * props.scale}px`,
}));

// Generate ruler ticks
interface Tick {
  position: number;
  type: 'major' | 'minor' | 'micro';
  label?: string;
}

const horizontalTicks = computed<Tick[]>(() => {
  const ticks: Tick[] = [];
  const width = props.pageWidth * props.scale;
  const tickSpacing = getTickSpacing();
  
  for (let i = 0; i <= width; i += tickSpacing.micro) {
    const isMajor = i % tickSpacing.major === 0;
    const isMinor = !isMajor && i % tickSpacing.minor === 0;
    
    ticks.push({
      position: i,
      type: isMajor ? 'major' : isMinor ? 'minor' : 'micro',
      label: isMajor ? formatTickLabel(i / props.scale) : undefined,
    });
  }
  
  return ticks;
});

const verticalTicks = computed<Tick[]>(() => {
  const ticks: Tick[] = [];
  const height = props.pageHeight * props.scale;
  const tickSpacing = getTickSpacing();
  
  for (let i = 0; i <= height; i += tickSpacing.micro) {
    const isMajor = i % tickSpacing.major === 0;
    const isMinor = !isMajor && i % tickSpacing.minor === 0;
    
    ticks.push({
      position: i,
      type: isMajor ? 'major' : isMinor ? 'minor' : 'micro',
      label: isMajor ? formatTickLabel(i / props.scale) : undefined,
    });
  }
  
  return ticks;
});

function getTickSpacing() {
  // Spacing based on unit
  switch (props.unit) {
    case 'mm':
      return { major: 10 * MM_TO_PX * props.scale, minor: 5 * MM_TO_PX * props.scale, micro: MM_TO_PX * props.scale };
    case 'cm':
      return { major: CM_TO_PX * props.scale, minor: 0.5 * CM_TO_PX * props.scale, micro: 0.1 * CM_TO_PX * props.scale };
    case 'in':
      return { major: IN_TO_PX * props.scale, minor: 0.5 * IN_TO_PX * props.scale, micro: 0.125 * IN_TO_PX * props.scale };
    default: // px
      return { major: 100 * props.scale, minor: 50 * props.scale, micro: 10 * props.scale };
  }
}

function formatTickLabel(valuePx: number): string {
  switch (props.unit) {
    case 'mm':
      return `${Math.round(valuePx / MM_TO_PX)}`;
    case 'cm':
      return `${(valuePx / CM_TO_PX).toFixed(1)}`;
    case 'in':
      return `${(valuePx / IN_TO_PX).toFixed(1)}`;
    default:
      return `${Math.round(valuePx)}`;
  }
}

// Drag handling
function startDrag(type: string, event: MouseEvent) {
  event.preventDefault();
  isDragging.value = true;
  dragType.value = type;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  
  // Store starting value
  switch (type) {
    case 'marginLeft':
      dragStartValue.value = props.marginLeft;
      break;
    case 'marginRight':
      dragStartValue.value = props.marginRight;
      break;
    case 'marginTop':
      dragStartValue.value = props.marginTop;
      break;
    case 'marginBottom':
      dragStartValue.value = props.marginBottom;
      break;
    case 'firstLineIndent':
      dragStartValue.value = props.firstLineIndent;
      break;
    case 'leftIndent':
      dragStartValue.value = props.leftIndent;
      break;
  }
  
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = props.orientation === 'horizontal' ? 'ew-resize' : 'ns-resize';
  document.body.style.userSelect = 'none';
}

function handleDrag(event: MouseEvent) {
  if (!isDragging.value || !dragType.value) return;
  
  const isHorizontal = ['marginLeft', 'marginRight', 'firstLineIndent', 'leftIndent'].includes(dragType.value);
  const delta = isHorizontal
    ? (event.clientX - dragStartX.value) / props.scale
    : (event.clientY - dragStartY.value) / props.scale;
  
  let newValue: number;
  
  switch (dragType.value) {
    case 'marginLeft':
      newValue = Math.max(0, Math.min(props.pageWidth - props.marginRight - 50, dragStartValue.value + delta));
      emit('update:marginLeft', Math.round(newValue));
      break;
    case 'marginRight':
      newValue = Math.max(0, Math.min(props.pageWidth - props.marginLeft - 50, dragStartValue.value - delta));
      emit('update:marginRight', Math.round(newValue));
      break;
    case 'marginTop':
      newValue = Math.max(0, Math.min(props.pageHeight - props.marginBottom - 50, dragStartValue.value + delta));
      emit('update:marginTop', Math.round(newValue));
      break;
    case 'marginBottom':
      newValue = Math.max(0, Math.min(props.pageHeight - props.marginTop - 50, dragStartValue.value - delta));
      emit('update:marginBottom', Math.round(newValue));
      break;
    case 'firstLineIndent':
      newValue = Math.max(-props.marginLeft, Math.min(props.pageWidth - props.marginLeft - props.marginRight, dragStartValue.value + delta));
      emit('update:firstLineIndent', Math.round(newValue));
      break;
    case 'leftIndent':
      newValue = Math.max(0, Math.min(props.pageWidth - props.marginLeft - props.marginRight, dragStartValue.value + delta));
      emit('update:leftIndent', Math.round(newValue));
      break;
  }
}

function stopDrag() {
  isDragging.value = false;
  dragType.value = null;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

onMounted(() => {
  // Cleanup on unmount
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
});
</script>

<style scoped>
.page-ruler {
  position: relative;
  user-select: none;
  font-family: system-ui, -apple-system, sans-serif;
}

.page-ruler__horizontal {
  height: 20px;
  background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
  border-bottom: 1px solid #dee2e6;
}

.page-ruler__vertical {
  width: 20px;
  background: linear-gradient(to right, #f8f9fa, #e9ecef);
  border-right: 1px solid #dee2e6;
}

.page-ruler__track {
  position: relative;
  height: 100%;
  margin: 0 auto;
}

.page-ruler__track--vertical {
  width: 100%;
}

/* Ticks */
.page-ruler__ticks {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.page-ruler__ticks--vertical {
  writing-mode: vertical-lr;
}

.page-ruler__tick {
  position: absolute;
  bottom: 0;
  width: 1px;
  background: #6c757d;
}

.page-ruler__tick--vertical {
  left: 0;
  right: auto;
  bottom: auto;
  width: auto;
  height: 1px;
}

.page-ruler__tick--major {
  height: 12px;
}

.page-ruler__tick--minor {
  height: 8px;
}

.page-ruler__tick--micro {
  height: 4px;
  background: #adb5bd;
}

.page-ruler__tick--vertical.page-ruler__tick--major {
  width: 12px;
  height: 1px;
}

.page-ruler__tick--vertical.page-ruler__tick--minor {
  width: 8px;
  height: 1px;
}

.page-ruler__tick--vertical.page-ruler__tick--micro {
  width: 4px;
  height: 1px;
}

.page-ruler__label {
  position: absolute;
  top: 1px;
  left: 2px;
  font-size: 8px;
  color: #495057;
  white-space: nowrap;
}

.page-ruler__tick--vertical .page-ruler__label {
  top: 2px;
  left: auto;
  right: 14px;
  writing-mode: horizontal-tb;
}

/* Content area indicator */
.page-ruler__content-area {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(59, 130, 246, 0.1);
  border-left: 1px dashed rgba(59, 130, 246, 0.3);
  border-right: 1px dashed rgba(59, 130, 246, 0.3);
  pointer-events: none;
}

.page-ruler__content-area--vertical {
  left: 0;
  right: 0;
  border-left: none;
  border-right: none;
  border-top: 1px dashed rgba(59, 130, 246, 0.3);
  border-bottom: 1px dashed rgba(59, 130, 246, 0.3);
}

/* Margin handles */
.page-ruler__margin {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 10;
}

.page-ruler__margin--left {
  transform: translateX(-4px);
}

.page-ruler__margin--right {
  transform: translateX(4px);
}

.page-ruler__margin--top,
.page-ruler__margin--bottom {
  left: 0;
  right: 0;
  width: auto;
  height: 8px;
  cursor: ns-resize;
}

.page-ruler__margin--top {
  top: auto;
  transform: translateY(-4px);
}

.page-ruler__margin--bottom {
  bottom: auto;
  transform: translateY(4px);
}

.page-ruler__handle {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #3b82f6;
  color: white;
  border-radius: 2px;
  transition: background-color 0.15s, transform 0.15s;
}

.page-ruler__handle--margin {
  width: 12px;
  height: 16px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.page-ruler__margin--top .page-ruler__handle--margin,
.page-ruler__margin--bottom .page-ruler__handle--margin {
  width: 16px;
  height: 12px;
}

.page-ruler__handle:hover {
  background: #2563eb;
  transform: translate(-50%, -50%) scale(1.1);
}

/* Indent handles */
.page-ruler__indent {
  position: absolute;
  top: 0;
  width: 12px;
  height: 100%;
  cursor: ew-resize;
  z-index: 11;
  transform: translateX(-6px);
}

.page-ruler__handle--indent {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.page-ruler__triangle {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
}

.page-ruler__triangle--down {
  border-top: 8px solid #10b981;
}

.page-ruler__triangle--up {
  border-bottom: 8px solid #f59e0b;
}

.page-ruler__indent:hover .page-ruler__triangle--down {
  border-top-color: #059669;
}

.page-ruler__indent:hover .page-ruler__triangle--up {
  border-bottom-color: #d97706;
}

/* Dark mode */
:root.dark .page-ruler__horizontal,
.dark .page-ruler__horizontal {
  background: linear-gradient(to bottom, #374151, #1f2937);
  border-bottom-color: #4b5563;
}

:root.dark .page-ruler__vertical,
.dark .page-ruler__vertical {
  background: linear-gradient(to right, #374151, #1f2937);
  border-right-color: #4b5563;
}

:root.dark .page-ruler__tick,
.dark .page-ruler__tick {
  background: #9ca3af;
}

:root.dark .page-ruler__tick--micro,
.dark .page-ruler__tick--micro {
  background: #6b7280;
}

:root.dark .page-ruler__label,
.dark .page-ruler__label {
  color: #d1d5db;
}

:root.dark .page-ruler__content-area,
.dark .page-ruler__content-area {
  background: rgba(59, 130, 246, 0.15);
}
</style>
