<script setup lang="ts">
import { computed } from 'vue';
import type { StoryShapeContent } from '@/types/story';

const props = defineProps<{
  content: StoryShapeContent;
}>();

defineEmits<{
  'update:content': [payload: Partial<StoryShapeContent>];
}>();

const fill = computed(() => props.content.fill ?? '#e5e7eb');
const stroke = computed(() => props.content.stroke ?? 'transparent');
const strokeWidth = computed(() => props.content.strokeWidth ?? 0);

/** Five-point star polygon centered at (50, 50) with outer radius 48, inner 20 */
const starPoints = computed(() => {
  const cx = 50;
  const cy = 50;
  const outerR = 48;
  const innerR = 20;
  const points: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI / 2) + (2 * Math.PI * i) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    points.push(`${cx - outerR * Math.cos(outerAngle)},${cy - outerR * Math.sin(outerAngle)}`);
    points.push(`${cx - innerR * Math.cos(innerAngle)},${cy - innerR * Math.sin(innerAngle)}`);
  }
  return points.join(' ');
});

const trianglePoints = computed(() => '50,4 96,96 4,96');
</script>

<template>
  <svg
    class="w-full h-full block"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Arrowhead marker definition -->
    <defs>
      <marker
        id="story-arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          :fill="stroke"
        />
      </marker>
    </defs>

    <!-- Rectangle -->
    <rect
      v-if="content.shape === 'rectangle'"
      x="2"
      y="2"
      width="96"
      height="96"
      rx="4"
      ry="4"
      :fill="fill"
      :stroke="stroke"
      :stroke-width="strokeWidth"
    />

    <!-- Circle -->
    <circle
      v-else-if="content.shape === 'circle'"
      cx="50"
      cy="50"
      r="48"
      :fill="fill"
      :stroke="stroke"
      :stroke-width="strokeWidth"
    />

    <!-- Ellipse -->
    <ellipse
      v-else-if="content.shape === 'ellipse'"
      cx="50"
      cy="50"
      rx="48"
      ry="32"
      :fill="fill"
      :stroke="stroke"
      :stroke-width="strokeWidth"
    />

    <!-- Triangle -->
    <polygon
      v-else-if="content.shape === 'triangle'"
      :points="trianglePoints"
      :fill="fill"
      :stroke="stroke"
      :stroke-width="strokeWidth"
    />

    <!-- Line -->
    <line
      v-else-if="content.shape === 'line'"
      x1="4"
      y1="50"
      x2="96"
      y2="50"
      :stroke="stroke || fill"
      :stroke-width="strokeWidth || 2"
      stroke-linecap="round"
    />

    <!-- Arrow -->
    <line
      v-else-if="content.shape === 'arrow'"
      x1="4"
      y1="50"
      x2="88"
      y2="50"
      :stroke="stroke || fill"
      :stroke-width="strokeWidth || 2"
      stroke-linecap="round"
      marker-end="url(#story-arrowhead)"
    />

    <!-- Star -->
    <polygon
      v-else-if="content.shape === 'star'"
      :points="starPoints"
      :fill="fill"
      :stroke="stroke"
      :stroke-width="strokeWidth"
    />

    <!-- Custom SVG path -->
    <path
      v-else-if="content.shape === 'custom' && content.svgPath"
      :d="content.svgPath"
      :fill="fill"
      :stroke="stroke"
      :stroke-width="strokeWidth"
    />
  </svg>
</template>
