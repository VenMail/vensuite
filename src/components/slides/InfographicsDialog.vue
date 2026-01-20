<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <BarChart3 class="h-5 w-5 text-blue-500" />
          Insert Infographic
        </DialogTitle>
        <DialogDescription>
          Choose from professionally designed infographic templates. Click to preview, then insert into your slide.
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 flex gap-4 overflow-hidden">
        <!-- Categories Sidebar -->
        <div class="w-48 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 pr-4 overflow-y-auto">
          <div class="space-y-1">
            <button
              v-for="category in categories"
              :key="category.id"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left"
              :class="{
                'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300': selectedCategory === category.id,
                'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300': selectedCategory !== category.id
              }"
              @click="selectedCategory = category.id"
            >
              <component :is="category.icon" class="h-4 w-4" />
              {{ category.name }}
              <span class="ml-auto text-xs text-gray-400">{{ getCategoryCount(category.id) }}</span>
            </button>
          </div>
        </div>

        <!-- Templates Grid -->
        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-3 gap-4">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="group relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden"
              :class="{
                'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800': selectedTemplate?.id === template.id,
                'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600': selectedTemplate?.id !== template.id
              }"
              @click="selectTemplate(template)"
            >
              <!-- Template Preview -->
              <div 
                class="aspect-[4/3] p-3 text-[8px] leading-tight overflow-hidden"
                :style="{ background: template.previewBg || '#ffffff' }"
                v-html="template.preview"
              />
              
              <!-- Template Info -->
              <div class="p-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div class="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                  {{ template.name }}
                </div>
                <div class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {{ template.description }}
                </div>
              </div>

              <!-- Hover Overlay -->
              <div class="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div class="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                  <Eye class="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview Panel -->
        <div v-if="selectedTemplate" class="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 pl-4 flex flex-col">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Preview</h3>
          
          <!-- Large Preview -->
          <div 
            class="aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-4"
            :style="{ background: selectedTemplate.previewBg || '#ffffff' }"
          >
            <div 
              class="h-full p-4 text-[10px] leading-normal overflow-hidden"
              v-html="selectedTemplate.preview"
            />
          </div>

          <!-- Template Details -->
          <div class="space-y-3 flex-1 overflow-y-auto">
            <div>
              <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400">Name</h4>
              <p class="text-sm text-gray-900 dark:text-gray-100">{{ selectedTemplate.name }}</p>
            </div>
            <div>
              <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400">Description</h4>
              <p class="text-sm text-gray-700 dark:text-gray-300">{{ selectedTemplate.description }}</p>
            </div>
            <div>
              <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400">Best For</h4>
              <div class="flex flex-wrap gap-1 mt-1">
                <span 
                  v-for="tag in selectedTemplate.tags" 
                  :key="tag"
                  class="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <!-- Color Variants -->
            <div v-if="selectedTemplate.colorVariants">
              <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Color Scheme</h4>
              <div class="flex gap-2">
                <button
                  v-for="variant in selectedTemplate.colorVariants"
                  :key="variant.name"
                  class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  :class="{ 'ring-2 ring-offset-2 ring-blue-500': selectedVariant === variant.name }"
                  :style="{ background: variant.primary, borderColor: variant.secondary }"
                  :title="variant.name"
                  @click="selectedVariant = variant.name"
                />
              </div>
            </div>
          </div>

          <!-- Insert Button -->
          <Button class="w-full mt-4" @click="insertTemplate">
            <Plus class="h-4 w-4 mr-2" />
            Insert Infographic
          </Button>
        </div>
      </div>

      <DialogFooter class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <p class="text-xs text-gray-500 dark:text-gray-400 flex-1">
          Tip: After inserting, you can edit the text directly in the markdown editor
        </p>
        <Button variant="outline" @click="emit('update:open', false)">
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  BarChart3, Eye, Plus,
  TrendingUp, GitBranch, Clock, Users, Target, Layers,
  PieChart, Workflow, ListChecks, Sparkles
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ColorVariant {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

interface InfographicTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  preview: string;
  previewBg?: string;
  markdown: string;
  tags: string[];
  colorVariants?: ColorVariant[];
}

interface Props {
  open: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'insert', markdown: string): void;
}>();

const selectedCategory = ref('all');
const selectedTemplate = ref<InfographicTemplate | null>(null);
const selectedVariant = ref('default');

const categories = [
  { id: 'all', name: 'All Templates', icon: Sparkles },
  { id: 'timeline', name: 'Timelines', icon: Clock },
  { id: 'process', name: 'Process Flow', icon: Workflow },
  { id: 'comparison', name: 'Comparison', icon: Layers },
  { id: 'hierarchy', name: 'Hierarchy', icon: GitBranch },
  { id: 'statistics', name: 'Statistics', icon: TrendingUp },
  { id: 'charts', name: 'Charts', icon: PieChart },
  { id: 'lists', name: 'Lists & Steps', icon: ListChecks },
  { id: 'team', name: 'Team & Org', icon: Users },
  { id: 'goals', name: 'Goals & KPIs', icon: Target },
];

const templates: InfographicTemplate[] = [
  // Timeline Templates
  {
    id: 'timeline-horizontal',
    name: 'Horizontal Timeline',
    description: 'Show events or milestones in chronological order',
    category: 'timeline',
    tags: ['history', 'milestones', 'roadmap'],
    previewBg: '#f8fafc',
    preview: `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px;">
        <div style="text-align: center;">
          <div style="width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; margin: 0 auto 4px;"></div>
          <div style="font-weight: bold; color: #1e293b;">2021</div>
          <div style="color: #64748b; font-size: 6px;">Founded</div>
        </div>
        <div style="flex: 1; height: 2px; background: #3b82f6; margin: 0 8px;"></div>
        <div style="text-align: center;">
          <div style="width: 24px; height: 24px; background: #10b981; border-radius: 50%; margin: 0 auto 4px;"></div>
          <div style="font-weight: bold; color: #1e293b;">2022</div>
          <div style="color: #64748b; font-size: 6px;">Growth</div>
        </div>
        <div style="flex: 1; height: 2px; background: #10b981; margin: 0 8px;"></div>
        <div style="text-align: center;">
          <div style="width: 24px; height: 24px; background: #f59e0b; border-radius: 50%; margin: 0 auto 4px;"></div>
          <div style="font-weight: bold; color: #1e293b;">2023</div>
          <div style="color: #64748b; font-size: 6px;">Expansion</div>
        </div>
        <div style="flex: 1; height: 2px; background: #f59e0b; margin: 0 8px;"></div>
        <div style="text-align: center;">
          <div style="width: 24px; height: 24px; background: #8b5cf6; border-radius: 50%; margin: 0 auto 4px;"></div>
          <div style="font-weight: bold; color: #1e293b;">2024</div>
          <div style="color: #64748b; font-size: 6px;">Scale</div>
        </div>
      </div>
    `,
    markdown: `## Our Journey

<div class="timeline-horizontal">

| 2021 | 2022 | 2023 | 2024 |
|:----:|:----:|:----:|:----:|
| 🚀 **Founded** | 📈 **Growth** | 🌍 **Expansion** | ⚡ **Scale** |
| Started with a vision | 10x user growth | Global presence | Industry leader |

</div>

---

**Key Milestones:**
- **2021**: Company founded, first product launch
- **2022**: Reached 100K users, Series A funding
- **2023**: Expanded to 20 countries
- **2024**: 1M+ active users`,
    colorVariants: [
      { name: 'default', primary: '#3b82f6', secondary: '#10b981', accent: '#f59e0b' },
      { name: 'purple', primary: '#8b5cf6', secondary: '#ec4899', accent: '#06b6d4' },
      { name: 'green', primary: '#10b981', secondary: '#84cc16', accent: '#14b8a6' },
    ]
  },
  {
    id: 'timeline-vertical',
    name: 'Vertical Timeline',
    description: 'Detailed timeline with descriptions on alternating sides',
    category: 'timeline',
    tags: ['history', 'story', 'journey'],
    previewBg: '#ffffff',
    preview: `
      <div style="position: relative; padding-left: 20px;">
        <div style="position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: #e2e8f0;"></div>
        <div style="position: relative; margin-bottom: 12px;">
          <div style="position: absolute; left: -16px; width: 12px; height: 12px; background: #3b82f6; border-radius: 50%;"></div>
          <div style="font-weight: bold; color: #1e293b;">Phase 1</div>
          <div style="color: #64748b; font-size: 6px;">Research & Planning</div>
        </div>
        <div style="position: relative; margin-bottom: 12px;">
          <div style="position: absolute; left: -16px; width: 12px; height: 12px; background: #10b981; border-radius: 50%;"></div>
          <div style="font-weight: bold; color: #1e293b;">Phase 2</div>
          <div style="color: #64748b; font-size: 6px;">Development</div>
        </div>
        <div style="position: relative;">
          <div style="position: absolute; left: -16px; width: 12px; height: 12px; background: #f59e0b; border-radius: 50%;"></div>
          <div style="font-weight: bold; color: #1e293b;">Phase 3</div>
          <div style="color: #64748b; font-size: 6px;">Launch</div>
        </div>
      </div>
    `,
    markdown: `## Project Timeline

### 🔵 Phase 1: Research & Planning
*Q1 2024*
- Market research and analysis
- Define project scope
- Stakeholder interviews

---

### 🟢 Phase 2: Development
*Q2 2024*
- Design and prototyping
- Core feature development
- Internal testing

---

### 🟡 Phase 3: Launch
*Q3 2024*
- Beta release
- User feedback collection
- Full public launch`
  },

  // Process Flow Templates
  {
    id: 'process-steps',
    name: 'Step-by-Step Process',
    description: 'Show a linear process with numbered steps',
    category: 'process',
    tags: ['workflow', 'how-to', 'guide'],
    previewBg: '#f0fdf4',
    preview: `
      <div style="display: flex; gap: 8px; padding: 12px;">
        <div style="flex: 1; text-align: center; padding: 8px; background: #dcfce7; border-radius: 8px;">
          <div style="width: 20px; height: 20px; background: #22c55e; color: white; border-radius: 50%; margin: 0 auto 4px; font-size: 10px; line-height: 20px;">1</div>
          <div style="font-weight: bold; color: #166534; font-size: 7px;">Research</div>
        </div>
        <div style="display: flex; align-items: center; color: #22c55e;">→</div>
        <div style="flex: 1; text-align: center; padding: 8px; background: #dcfce7; border-radius: 8px;">
          <div style="width: 20px; height: 20px; background: #22c55e; color: white; border-radius: 50%; margin: 0 auto 4px; font-size: 10px; line-height: 20px;">2</div>
          <div style="font-weight: bold; color: #166534; font-size: 7px;">Design</div>
        </div>
        <div style="display: flex; align-items: center; color: #22c55e;">→</div>
        <div style="flex: 1; text-align: center; padding: 8px; background: #dcfce7; border-radius: 8px;">
          <div style="width: 20px; height: 20px; background: #22c55e; color: white; border-radius: 50%; margin: 0 auto 4px; font-size: 10px; line-height: 20px;">3</div>
          <div style="font-weight: bold; color: #166534; font-size: 7px;">Build</div>
        </div>
        <div style="display: flex; align-items: center; color: #22c55e;">→</div>
        <div style="flex: 1; text-align: center; padding: 8px; background: #dcfce7; border-radius: 8px;">
          <div style="width: 20px; height: 20px; background: #22c55e; color: white; border-radius: 50%; margin: 0 auto 4px; font-size: 10px; line-height: 20px;">4</div>
          <div style="font-weight: bold; color: #166534; font-size: 7px;">Launch</div>
        </div>
      </div>
    `,
    markdown: `## Our Process

<div class="process-steps">

| Step 1 | Step 2 | Step 3 | Step 4 |
|:------:|:------:|:------:|:------:|
| 🔍 | 🎨 | 🔧 | 🚀 |
| **Research** | **Design** | **Build** | **Launch** |
| Understand needs | Create solutions | Develop product | Go to market |

</div>

### Details:

1. **Research** - Deep dive into user needs and market analysis
2. **Design** - Create wireframes, prototypes, and visual designs
3. **Build** - Develop and test the solution
4. **Launch** - Deploy and monitor performance`
  },
  {
    id: 'process-flowchart',
    name: 'Flowchart Diagram',
    description: 'Decision-based process flow with branches',
    category: 'process',
    tags: ['decision', 'logic', 'workflow'],
    previewBg: '#faf5ff',
    preview: `
      <div style="text-align: center; padding: 8px;">
        <div style="display: inline-block; padding: 6px 12px; background: #a855f7; color: white; border-radius: 4px; font-size: 7px; margin-bottom: 4px;">Start</div>
        <div style="color: #a855f7;">↓</div>
        <div style="display: inline-block; padding: 6px 12px; background: #f3e8ff; border: 1px solid #a855f7; transform: rotate(45deg); margin: 8px; font-size: 6px;">
          <span style="display: block; transform: rotate(-45deg);">Decision?</span>
        </div>
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 8px;">
          <div>
            <div style="color: #22c55e; font-size: 6px;">Yes ↓</div>
            <div style="padding: 4px 8px; background: #dcfce7; border-radius: 4px; font-size: 6px;">Action A</div>
          </div>
          <div>
            <div style="color: #ef4444; font-size: 6px;">No ↓</div>
            <div style="padding: 4px 8px; background: #fee2e2; border-radius: 4px; font-size: 6px;">Action B</div>
          </div>
        </div>
      </div>
    `,
    markdown: `## Decision Flow

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Is requirement clear?}
    B -->|Yes| C[Design Solution]
    B -->|No| D[Gather Requirements]
    D --> B
    C --> E{Approved?}
    E -->|Yes| F[Implement]
    E -->|No| C
    F --> G[Test]
    G --> H{Pass?}
    H -->|Yes| I[Deploy]
    H -->|No| F
    I --> J[End]
\`\`\``
  },

  // Comparison Templates
  {
    id: 'comparison-table',
    name: 'Feature Comparison',
    description: 'Compare features across products or options',
    category: 'comparison',
    tags: ['features', 'products', 'options'],
    previewBg: '#ffffff',
    preview: `
      <table style="width: 100%; font-size: 6px; border-collapse: collapse;">
        <tr style="background: #3b82f6; color: white;">
          <th style="padding: 4px;">Feature</th>
          <th style="padding: 4px;">Basic</th>
          <th style="padding: 4px;">Pro</th>
          <th style="padding: 4px;">Enterprise</th>
        </tr>
        <tr>
          <td style="padding: 4px; border-bottom: 1px solid #e2e8f0;">Users</td>
          <td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: center;">5</td>
          <td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: center;">25</td>
          <td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: center;">∞</td>
        </tr>
        <tr>
          <td style="padding: 4px; border-bottom: 1px solid #e2e8f0;">Storage</td>
          <td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: center;">10GB</td>
          <td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: center;">100GB</td>
          <td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: center;">1TB</td>
        </tr>
        <tr>
          <td style="padding: 4px;">Support</td>
          <td style="padding: 4px; text-align: center;">Email</td>
          <td style="padding: 4px; text-align: center;">Priority</td>
          <td style="padding: 4px; text-align: center;">24/7</td>
        </tr>
      </table>
    `,
    markdown: `## Plan Comparison

| Feature | Basic | Pro | Enterprise |
|---------|:-----:|:---:|:----------:|
| **Users** | 5 | 25 | Unlimited |
| **Storage** | 10 GB | 100 GB | 1 TB |
| **API Access** | ❌ | ✅ | ✅ |
| **Analytics** | Basic | Advanced | Custom |
| **Support** | Email | Priority | 24/7 Dedicated |
| **SSO** | ❌ | ❌ | ✅ |
| **Price** | $9/mo | $29/mo | Custom |

> 💡 **Recommended**: Pro plan offers the best value for growing teams`
  },
  {
    id: 'comparison-pros-cons',
    name: 'Pros & Cons',
    description: 'Two-column advantages and disadvantages',
    category: 'comparison',
    tags: ['analysis', 'decision', 'evaluation'],
    previewBg: '#ffffff',
    preview: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px;">
        <div style="background: #dcfce7; padding: 8px; border-radius: 8px;">
          <div style="font-weight: bold; color: #166534; margin-bottom: 4px; font-size: 8px;">✅ Pros</div>
          <div style="color: #166534; font-size: 6px;">• Easy to use</div>
          <div style="color: #166534; font-size: 6px;">• Cost effective</div>
          <div style="color: #166534; font-size: 6px;">• Great support</div>
        </div>
        <div style="background: #fee2e2; padding: 8px; border-radius: 8px;">
          <div style="font-weight: bold; color: #991b1b; margin-bottom: 4px; font-size: 8px;">❌ Cons</div>
          <div style="color: #991b1b; font-size: 6px;">• Limited features</div>
          <div style="color: #991b1b; font-size: 6px;">• Learning curve</div>
          <div style="color: #991b1b; font-size: 6px;">• No mobile app</div>
        </div>
      </div>
    `,
    markdown: `## Analysis

::right::

### ✅ Advantages

- **Easy to implement** - Get started in minutes
- **Cost effective** - Save up to 40% compared to alternatives
- **Scalable** - Grows with your business
- **Great support** - 24/7 customer service
- **Regular updates** - New features monthly

::right::

### ❌ Disadvantages

- **Learning curve** - Initial training required
- **Limited integrations** - Some tools not supported
- **No offline mode** - Requires internet connection
- **Premium features** - Advanced tools cost extra`
  },

  // Statistics Templates
  {
    id: 'stats-cards',
    name: 'Statistics Cards',
    description: 'Highlight key metrics with large numbers',
    category: 'statistics',
    tags: ['metrics', 'KPIs', 'numbers'],
    previewBg: '#f8fafc',
    preview: `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 8px;">
        <div style="background: white; padding: 8px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size: 16px; font-weight: bold; color: #3b82f6;">98%</div>
          <div style="font-size: 6px; color: #64748b;">Satisfaction</div>
        </div>
        <div style="background: white; padding: 8px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size: 16px; font-weight: bold; color: #10b981;">2.5M</div>
          <div style="font-size: 6px; color: #64748b;">Users</div>
        </div>
        <div style="background: white; padding: 8px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size: 16px; font-weight: bold; color: #f59e0b;">150+</div>
          <div style="font-size: 6px; color: #64748b;">Countries</div>
        </div>
      </div>
    `,
    markdown: `## Key Metrics

<div class="stats-grid">

| 📊 | 👥 | 🌍 | ⭐ |
|:--:|:--:|:--:|:--:|
| **98%** | **2.5M** | **150+** | **4.9** |
| Customer Satisfaction | Active Users | Countries | App Rating |

</div>

---

### Growth Highlights

- 📈 **300%** year-over-year growth
- 💰 **$50M** in customer savings
- ⚡ **99.9%** uptime guarantee
- 🏆 **#1** rated in category`
  },
  {
    id: 'stats-progress',
    name: 'Progress Bars',
    description: 'Show progress or completion percentages',
    category: 'statistics',
    tags: ['progress', 'goals', 'completion'],
    previewBg: '#ffffff',
    preview: `
      <div style="padding: 12px;">
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 6px; margin-bottom: 2px;">
            <span>Development</span><span>85%</span>
          </div>
          <div style="height: 6px; background: #e2e8f0; border-radius: 3px;">
            <div style="width: 85%; height: 100%; background: #3b82f6; border-radius: 3px;"></div>
          </div>
        </div>
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 6px; margin-bottom: 2px;">
            <span>Design</span><span>100%</span>
          </div>
          <div style="height: 6px; background: #e2e8f0; border-radius: 3px;">
            <div style="width: 100%; height: 100%; background: #10b981; border-radius: 3px;"></div>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 6px; margin-bottom: 2px;">
            <span>Testing</span><span>60%</span>
          </div>
          <div style="height: 6px; background: #e2e8f0; border-radius: 3px;">
            <div style="width: 60%; height: 100%; background: #f59e0b; border-radius: 3px;"></div>
          </div>
        </div>
      </div>
    `,
    markdown: `## Project Status

### Development Progress

| Phase | Progress | Status |
|-------|----------|--------|
| Research | ████████████████████ 100% | ✅ Complete |
| Design | ████████████████████ 100% | ✅ Complete |
| Development | █████████████████░░░ 85% | 🔄 In Progress |
| Testing | ████████████░░░░░░░░ 60% | 🔄 In Progress |
| Deployment | ░░░░░░░░░░░░░░░░░░░░ 0% | ⏳ Pending |

**Overall: 69% Complete**`
  },

  // Charts Templates
  {
    id: 'chart-pie',
    name: 'Pie Chart',
    description: 'Show distribution or market share',
    category: 'charts',
    tags: ['distribution', 'share', 'breakdown'],
    previewBg: '#ffffff',
    preview: `
      <div style="text-align: center; padding: 8px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: conic-gradient(#3b82f6 0% 45%, #10b981 45% 75%, #f59e0b 75% 90%, #ef4444 90% 100%); margin: 0 auto 8px;"></div>
        <div style="display: flex; justify-content: center; gap: 8px; font-size: 6px;">
          <span>🔵 45%</span>
          <span>🟢 30%</span>
          <span>🟡 15%</span>
          <span>🔴 10%</span>
        </div>
      </div>
    `,
    markdown: `## Market Distribution

\`\`\`mermaid
pie title Market Share 2024
    "Product A" : 45
    "Product B" : 30
    "Product C" : 15
    "Others" : 10
\`\`\`

### Breakdown:
- 🔵 **Product A**: 45% - Market leader
- 🟢 **Product B**: 30% - Strong competitor
- 🟡 **Product C**: 15% - Growing segment
- 🔴 **Others**: 10% - Niche players`
  },
  {
    id: 'chart-bar',
    name: 'Bar Chart',
    description: 'Compare values across categories',
    category: 'charts',
    tags: ['comparison', 'values', 'categories'],
    previewBg: '#f8fafc',
    preview: `
      <div style="display: flex; align-items: flex-end; justify-content: center; gap: 8px; height: 60px; padding: 8px;">
        <div style="width: 20px; height: 80%; background: #3b82f6; border-radius: 4px 4px 0 0;"></div>
        <div style="width: 20px; height: 60%; background: #10b981; border-radius: 4px 4px 0 0;"></div>
        <div style="width: 20px; height: 100%; background: #f59e0b; border-radius: 4px 4px 0 0;"></div>
        <div style="width: 20px; height: 45%; background: #8b5cf6; border-radius: 4px 4px 0 0;"></div>
      </div>
      <div style="display: flex; justify-content: center; gap: 8px; font-size: 6px; color: #64748b;">
        <span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span>
      </div>
    `,
    markdown: `## Quarterly Revenue

\`\`\`mermaid
xychart-beta
    title "Revenue by Quarter"
    x-axis [Q1, Q2, Q3, Q4]
    y-axis "Revenue ($M)" 0 --> 100
    bar [45, 62, 78, 91]
\`\`\`

| Quarter | Revenue | Growth |
|---------|---------|--------|
| Q1 | $45M | - |
| Q2 | $62M | +38% |
| Q3 | $78M | +26% |
| Q4 | $91M | +17% |

**Total: $276M** (+45% YoY)`
  },

  // Team Templates
  {
    id: 'team-org-chart',
    name: 'Organization Chart',
    description: 'Show company or team hierarchy',
    category: 'team',
    tags: ['hierarchy', 'structure', 'organization'],
    previewBg: '#fef3c7',
    preview: `
      <div style="text-align: center; padding: 8px;">
        <div style="display: inline-block; padding: 4px 8px; background: #f59e0b; color: white; border-radius: 4px; font-size: 7px; margin-bottom: 4px;">CEO</div>
        <div style="color: #f59e0b;">│</div>
        <div style="display: flex; justify-content: center; gap: 16px;">
          <div>
            <div style="color: #f59e0b;">┌──</div>
            <div style="padding: 3px 6px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; font-size: 6px;">CTO</div>
          </div>
          <div>
            <div style="color: #f59e0b;">──┬──</div>
            <div style="padding: 3px 6px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; font-size: 6px;">COO</div>
          </div>
          <div>
            <div style="color: #f59e0b;">──┐</div>
            <div style="padding: 3px 6px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; font-size: 6px;">CFO</div>
          </div>
        </div>
      </div>
    `,
    markdown: `## Organization Structure

\`\`\`mermaid
graph TD
    A[👔 CEO<br/>John Smith] --> B[💻 CTO<br/>Jane Doe]
    A --> C[⚙️ COO<br/>Mike Johnson]
    A --> D[💰 CFO<br/>Sarah Williams]
    
    B --> E[Engineering]
    B --> F[Product]
    
    C --> G[Operations]
    C --> H[HR]
    
    D --> I[Finance]
    D --> J[Legal]
\`\`\``
  },
  {
    id: 'team-cards',
    name: 'Team Member Cards',
    description: 'Showcase team members with photos and roles',
    category: 'team',
    tags: ['people', 'profiles', 'about'],
    previewBg: '#f8fafc',
    preview: `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 8px;">
        <div style="background: white; padding: 8px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; margin: 0 auto 4px; font-size: 12px; line-height: 24px;">👤</div>
          <div style="font-weight: bold; font-size: 7px;">John Doe</div>
          <div style="font-size: 5px; color: #64748b;">CEO</div>
        </div>
        <div style="background: white; padding: 8px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="width: 24px; height: 24px; background: #10b981; border-radius: 50%; margin: 0 auto 4px; font-size: 12px; line-height: 24px;">👤</div>
          <div style="font-weight: bold; font-size: 7px;">Jane Smith</div>
          <div style="font-size: 5px; color: #64748b;">CTO</div>
        </div>
        <div style="background: white; padding: 8px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="width: 24px; height: 24px; background: #f59e0b; border-radius: 50%; margin: 0 auto 4px; font-size: 12px; line-height: 24px;">👤</div>
          <div style="font-weight: bold; font-size: 7px;">Mike Lee</div>
          <div style="font-size: 5px; color: #64748b;">COO</div>
        </div>
      </div>
    `,
    markdown: `## Meet Our Team

<div class="team-grid">

| | | |
|:---:|:---:|:---:|
| ![John](https://i.pravatar.cc/150?img=1) | ![Jane](https://i.pravatar.cc/150?img=5) | ![Mike](https://i.pravatar.cc/150?img=3) |
| **John Doe** | **Jane Smith** | **Mike Lee** |
| *CEO & Founder* | *CTO* | *COO* |
| 15+ years experience | AI/ML Expert | Operations guru |

</div>

> "Our diverse team brings together expertise from tech, finance, and operations to deliver exceptional results."`
  },

  // Goals Templates
  {
    id: 'goals-okr',
    name: 'OKR Framework',
    description: 'Objectives and Key Results format',
    category: 'goals',
    tags: ['objectives', 'results', 'planning'],
    previewBg: '#eff6ff',
    preview: `
      <div style="padding: 8px;">
        <div style="font-weight: bold; color: #1e40af; font-size: 8px; margin-bottom: 4px;">🎯 Objective: Increase Revenue</div>
        <div style="padding-left: 12px; font-size: 6px; color: #1e293b;">
          <div style="margin-bottom: 2px;">✓ KR1: Reach $10M ARR</div>
          <div style="margin-bottom: 2px;">○ KR2: 50% conversion rate</div>
          <div>○ KR3: 100 enterprise clients</div>
        </div>
      </div>
    `,
    markdown: `## Q4 2024 OKRs

### 🎯 Objective 1: Accelerate Growth
| Key Result | Target | Current | Status |
|------------|--------|---------|--------|
| Increase MRR | $500K | $420K | 🟡 84% |
| New customers | 200 | 185 | 🟡 92% |
| Reduce churn | <2% | 1.8% | 🟢 Done |

### 🎯 Objective 2: Improve Product
| Key Result | Target | Current | Status |
|------------|--------|---------|--------|
| NPS Score | 70+ | 72 | 🟢 Done |
| Feature releases | 12 | 10 | 🟡 83% |
| Bug resolution | <24h | 18h | 🟢 Done |

### 🎯 Objective 3: Build Team
| Key Result | Target | Current | Status |
|------------|--------|---------|--------|
| New hires | 15 | 12 | 🟡 80% |
| Training hours | 40h/person | 45h | 🟢 Done |
| Satisfaction | 90% | 88% | 🟡 98% |`
  },
  {
    id: 'goals-roadmap',
    name: 'Product Roadmap',
    description: 'Visual roadmap with quarters and features',
    category: 'goals',
    tags: ['roadmap', 'planning', 'features'],
    previewBg: '#faf5ff',
    preview: `
      <div style="padding: 8px;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 6px;">
          <div style="background: #a855f7; color: white; padding: 4px; border-radius: 4px; text-align: center;">Q1</div>
          <div style="background: #8b5cf6; color: white; padding: 4px; border-radius: 4px; text-align: center;">Q2</div>
          <div style="background: #7c3aed; color: white; padding: 4px; border-radius: 4px; text-align: center;">Q3</div>
          <div style="background: #6d28d9; color: white; padding: 4px; border-radius: 4px; text-align: center;">Q4</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 4px; font-size: 5px;">
          <div style="background: #f3e8ff; padding: 4px; border-radius: 4px;">Feature A</div>
          <div style="background: #f3e8ff; padding: 4px; border-radius: 4px;">Feature B</div>
          <div style="background: #f3e8ff; padding: 4px; border-radius: 4px;">Feature C</div>
          <div style="background: #f3e8ff; padding: 4px; border-radius: 4px;">Feature D</div>
        </div>
      </div>
    `,
    markdown: `## 2024 Product Roadmap

\`\`\`mermaid
gantt
    title Product Roadmap 2024
    dateFormat  YYYY-MM-DD
    section Core
    Authentication    :done, 2024-01-01, 2024-02-15
    Dashboard        :done, 2024-02-01, 2024-03-30
    API v2           :active, 2024-03-15, 2024-05-30
    section Features
    Analytics        :2024-04-01, 2024-06-30
    Integrations     :2024-06-01, 2024-08-30
    Mobile App       :2024-07-01, 2024-10-30
    section Growth
    Enterprise       :2024-09-01, 2024-12-30
    AI Features      :2024-10-01, 2024-12-30
\`\`\`

### Key Milestones:
- **Q1**: Core platform launch ✅
- **Q2**: API and Analytics
- **Q3**: Mobile app release
- **Q4**: Enterprise & AI features`
  },

  // Lists Templates
  {
    id: 'list-checklist',
    name: 'Checklist',
    description: 'Task list with checkboxes',
    category: 'lists',
    tags: ['tasks', 'todo', 'checklist'],
    previewBg: '#f0fdf4',
    preview: `
      <div style="padding: 12px; font-size: 7px;">
        <div style="margin-bottom: 4px;">✅ Complete project proposal</div>
        <div style="margin-bottom: 4px;">✅ Review with stakeholders</div>
        <div style="margin-bottom: 4px;">⬜ Finalize budget</div>
        <div style="margin-bottom: 4px;">⬜ Schedule kickoff meeting</div>
        <div>⬜ Begin implementation</div>
      </div>
    `,
    markdown: `## Project Checklist

### Phase 1: Planning ✅
- [x] Define project scope
- [x] Identify stakeholders
- [x] Create timeline
- [x] Allocate resources

### Phase 2: Design 🔄
- [x] User research
- [x] Wireframes
- [ ] High-fidelity mockups
- [ ] Design review

### Phase 3: Development ⏳
- [ ] Setup environment
- [ ] Core features
- [ ] Testing
- [ ] Documentation

### Phase 4: Launch 📅
- [ ] Beta release
- [ ] User feedback
- [ ] Final fixes
- [ ] Public launch`
  },
  {
    id: 'list-numbered',
    name: 'Numbered Steps',
    description: 'Sequential numbered list with details',
    category: 'lists',
    tags: ['steps', 'instructions', 'guide'],
    previewBg: '#fff7ed',
    preview: `
      <div style="padding: 12px; font-size: 7px;">
        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
          <div style="width: 16px; height: 16px; background: #f97316; color: white; border-radius: 50%; text-align: center; line-height: 16px; flex-shrink: 0;">1</div>
          <div><strong>Sign Up</strong><br/><span style="color: #64748b; font-size: 6px;">Create your account</span></div>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
          <div style="width: 16px; height: 16px; background: #f97316; color: white; border-radius: 50%; text-align: center; line-height: 16px; flex-shrink: 0;">2</div>
          <div><strong>Configure</strong><br/><span style="color: #64748b; font-size: 6px;">Set your preferences</span></div>
        </div>
        <div style="display: flex; gap: 8px;">
          <div style="width: 16px; height: 16px; background: #f97316; color: white; border-radius: 50%; text-align: center; line-height: 16px; flex-shrink: 0;">3</div>
          <div><strong>Launch</strong><br/><span style="color: #64748b; font-size: 6px;">Go live!</span></div>
        </div>
      </div>
    `,
    markdown: `## Getting Started

### Step 1: Create Your Account 📝
Sign up with your email or connect with Google/GitHub. Verification takes less than a minute.

---

### Step 2: Configure Your Workspace ⚙️
- Set your team name and logo
- Invite team members
- Configure integrations

---

### Step 3: Import Your Data 📥
Upload existing data or start fresh. We support CSV, JSON, and API imports.

---

### Step 4: Customize Settings 🎨
- Choose your theme
- Set notification preferences
- Configure permissions

---

### Step 5: Go Live! 🚀
You're ready to start. Our support team is here 24/7 if you need help.`
  },
];

const filteredTemplates = computed(() => {
  if (selectedCategory.value === 'all') {
    return templates;
  }
  return templates.filter(t => t.category === selectedCategory.value);
});

function getCategoryCount(categoryId: string): number {
  if (categoryId === 'all') return templates.length;
  return templates.filter(t => t.category === categoryId).length;
}

function selectTemplate(template: InfographicTemplate) {
  selectedTemplate.value = template;
  selectedVariant.value = 'default';
}

function insertTemplate() {
  if (!selectedTemplate.value) return;
  
  let markdown = selectedTemplate.value.markdown;
  
  // Apply color variant if selected
  if (selectedTemplate.value.colorVariants && selectedVariant.value !== 'default') {
    const variant = selectedTemplate.value.colorVariants.find(v => v.name === selectedVariant.value);
    if (variant) {
      // Replace default colors with variant colors in markdown
      markdown = markdown.replace(/#3b82f6/g, variant.primary);
      markdown = markdown.replace(/#10b981/g, variant.secondary);
      markdown = markdown.replace(/#f59e0b/g, variant.accent);
    }
  }
  
  emit('insert', markdown);
  emit('update:open', false);
}
</script>
