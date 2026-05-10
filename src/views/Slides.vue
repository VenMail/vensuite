<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import WorkspaceTopBar from "@/components/layout/WorkspaceTopBar.vue";
import { ScrollArea } from "@/components/ui/scroll-area";
import Button from "@/components/ui/button/Button.vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Grid,
  List,
  Plus,
  Presentation,
  FileText,
  Image,
  BarChart,
  PieChart,
  TrendingUp,
  Users,
  Settings,
  X,
  RefreshCw,
} from "lucide-vue-next";
import { fetchSlideDecks, slideDecks, getDeckThumbnail, createSlideDeck } from "@/services/slideDecks";
import { createAvnacSlidesForTheme, type AvnacDeckTheme } from "@/utils/avnacSlideTemplates";
import { t } from '@/i18n';

const SLIDES_VIEW_DEBUG = Boolean(import.meta.env.DEV);
const logSlidesViewDebug = (...args: unknown[]) => {
  if (!SLIDES_VIEW_DEBUG) return;
  console.log(...args);
};

// Define types locally since they're not exported from WorkspaceTopBar
interface BreadcrumbItem {
  id?: string | null
  title: string
}

interface ActionItem {
  key?: string
  label?: string
  icon?: any
  component?: any
  props?: Record<string, unknown>
  onClick?: () => void
  slot?: string
}

interface StatItem {
  label: string
  value: string | number
}

interface FilterItem {
  key?: string
  label: string
  value: string
  icon?: any
  active?: boolean
}

interface ViewOption {
  label?: string
  value: string
  icon?: any
  active?: boolean
}

const router = useRouter();
const viewMode = ref<"grid" | "list">("grid");
const selectedSlideDeck = ref<string | null>(null);
type SlideTemplate = {
  name: string;
  slug: AvnacDeckTheme;
  subtitle: string;
  badge: string;
  icon: any;
  previewStyle: string;
  description?: string;
};

const slideTemplates: SlideTemplate[] = [
  {
    name: "Default Theme",
    slug: "default",
    subtitle: "Clean AVNAC slide with title and content placeholders",
    badge: "Default",
    icon: Presentation,
    previewStyle: "background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);",
    description: "A clean presentation canvas that opens directly in the AVNAC editor"
  },
  {
    name: "Professional",
    slug: "professional",
    subtitle: "Business presentation with calm executive styling",
    badge: "Business",
    icon: FileText,
    previewStyle: "background: linear-gradient(135deg, #f8fafc 0%, #ccfbf1 100%);",
    description: "A polished business deck with structured content slides"
  },
  {
    name: "Pitch Deck",
    slug: "pitch",
    subtitle: "Dark, high-contrast investor presentation",
    badge: "Pitch",
    icon: TrendingUp,
    previewStyle: "background: linear-gradient(135deg, #111827 0%, #1f2937 70%, #f97316 100%);",
    description: "A focused pitch deck with strong contrast and accent color"
  },
  {
    name: "Academic",
    slug: "academic",
    subtitle: "Research presentation with warm publication styling",
    badge: "Academic",
    icon: FileText,
    previewStyle: "background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);",
    description: "A readable research deck for findings, methods, and conclusions"
  },
  {
    name: "Product Roadmap",
    slug: "product",
    subtitle: "Product planning deck for milestones and launches",
    badge: "Product",
    icon: TrendingUp,
    previewStyle: "background: linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%);",
    description: "A roadmap deck for priorities, milestones, and product direction"
  },
  {
    name: "Quarterly Report",
    slug: "report",
    subtitle: "Performance report with measured visual hierarchy",
    badge: "Report",
    icon: BarChart,
    previewStyle: "background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%);",
    description: "A report deck for highlights, metrics, and recommendations"
  },
  {
    name: "Sales Proposal",
    slug: "sales",
    subtitle: "Value, proof, pricing, and next steps",
    badge: "Sales",
    icon: Users,
    previewStyle: "background: linear-gradient(135deg, #fefce8 0%, #fef3c7 64%, #16a34a 100%);",
    description: "A client-ready sales narrative with metrics and closing slides"
  },
  {
    name: "Strategy Brief",
    slug: "strategy",
    subtitle: "Choices, trade-offs, and execution plan",
    badge: "Strategy",
    icon: Settings,
    previewStyle: "background: linear-gradient(135deg, #f7fee7 0%, #d9f99d 58%, #0284c7 100%);",
    description: "A leadership strategy deck with process and comparison layouts"
  },
  {
    name: "Training Module",
    slug: "training",
    subtitle: "Learning flow, practice, and recap",
    badge: "Training",
    icon: FileText,
    previewStyle: "background: linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 65%, #4f46e5 100%);",
    description: "A facilitator-friendly deck for classes and internal enablement"
  },
  {
    name: "Portfolio Review",
    slug: "portfolio",
    subtitle: "Case studies, decisions, and outcomes",
    badge: "Portfolio",
    icon: Image,
    previewStyle: "background: linear-gradient(135deg, #fafaf9 0%, #e7e5e4 60%, #0ea5e9 100%);",
    description: "A structured portfolio deck for showcasing work and impact"
  },
  {
    name: "Financial Review",
    slug: "financial",
    subtitle: "KPIs, forecast, risks, and decisions",
    badge: "Finance",
    icon: PieChart,
    previewStyle: "background: linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 62%, #0369a1 100%);",
    description: "A finance deck tuned for executive review and board updates"
  },
  {
    name: "Marketing Plan",
    slug: "marketing",
    subtitle: "Audience, channels, campaign, and results",
    badge: "Marketing",
    icon: TrendingUp,
    previewStyle: "background: linear-gradient(135deg, #fff1f2 0%, #fecdd3 62%, #7c3aed 100%);",
    description: "A campaign planning deck with channel and metric layouts"
  },
  {
    name: "Operations Plan",
    slug: "operations",
    subtitle: "Processes, owners, and improvement plan",
    badge: "Ops",
    icon: Settings,
    previewStyle: "background: linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 62%, #ea580c 100%);",
    description: "An operations deck for processes, cadence, and decisions"
  },
  {
    name: "Lesson Deck",
    slug: "education",
    subtitle: "Concepts, activities, and review",
    badge: "Lesson",
    icon: FileText,
    previewStyle: "background: linear-gradient(135deg, #eef2ff 0%, #c7d2fe 65%, #0891b2 100%);",
    description: "A classroom-ready deck with sections and activity prompts"
  },
  {
    name: "Minimal Deck",
    slug: "minimal",
    subtitle: "Quiet executive layouts with strong hierarchy",
    badge: "Minimal",
    icon: Presentation,
    previewStyle: "background: linear-gradient(135deg, #ffffff 0%, #f4f4f5 70%, #18181b 100%);",
    description: "A restrained template for focused internal storytelling"
  },
  {
    name: "Blank Canvas",
    slug: "blank",
    subtitle: "Start from scratch",
    badge: "Blank",
    icon: FileText,
    previewStyle: "background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);",
    description: "A blank AVNAC canvas with no pre-filled objects"
  }
];

const thumbnailUrls = ref<Record<string, string>>({});

watch(slideDecks, async (decks) => {
  const entries = await Promise.all(
    decks.map(async deck => [deck.id, await getDeckThumbnail(deck)] as const),
  );
  thumbnailUrls.value = Object.fromEntries(entries);
}, { immediate: true });

const filteredSlideDecks = computed(() => {
  logSlidesViewDebug('🔄 filteredSlideDecks computed, slideDecks.value:', slideDecks.value);
  logSlidesViewDebug('🔄 slideDecks.value length:', slideDecks.value.length);
  return slideDecks.value;
});

const sortedSlideDecks = computed(() => {
  return [...filteredSlideDecks.value].sort((a, b) => 
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
});

const cardsContainerClass = computed(() => {
  if (viewMode.value === "list") {
    return "flex flex-col gap-3 sm:gap-4";
  }
  return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4";
});

// Computed properties for WorkspaceTopBar
const currentTitle = computed(() => "Slides");
const slidesSubtitle = computed(() => "All presentations");
const breadcrumbs = computed<BreadcrumbItem[]>(() => []);
const canNavigateUp = computed(() => false);

const stats = computed<StatItem[]>(() => [
  { value: sortedSlideDecks.value.length, label: "presentations" },
  ...(selectedSlideDeck.value ? [{ value: "1", label: "selected" }] : [])
]);

const filterOptions = computed<FilterItem[]>(() => [
  { key: "all", label: "All", value: "all", icon: Presentation, active: true },
  { key: "shared", label: "Shared", value: "shared", icon: Users, active: false },
  { key: "recent", label: "Recent", value: "recent", icon: FileText, active: false },
]);

const viewOptions = computed<ViewOption[]>(() => [
  { value: "grid", icon: Grid, label: "Grid", active: viewMode.value === "grid" },
  { value: "list", icon: List, label: "List", active: viewMode.value === "list" },
]);

const actionIconClass = computed(
  () =>
    "relative group rounded-full transition-all duration-200 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700",
);

const topBarActions = computed<ActionItem[]>(() => {
  const actions: ActionItem[] = [
    {
      key: "new-presentation",
      component: "div",
      slot: "new-presentation",
    },
    {
      key: "refresh",
      icon: RefreshCw,
      component: Button,
      props: { variant: "ghost", size: "icon", class: actionIconClass.value },
      onClick: () => refreshSlideDecks(),
    },
  ];

  if (selectedSlideDeck.value) {
    actions.push(
      {
        key: "edit",
        icon: Settings,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: () => editSlideDeck(selectedSlideDeck.value!),
      },
      {
        key: "clear",
        icon: X,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: () => { selectedSlideDeck.value = null; },
      },
    );
  }

  return actions;
});

// Event handlers
const handleFilter = (filter: string) => {
  logSlidesViewDebug('Filter:', filter);
  selectedSlideDeck.value = null;
};

const handleViewChange = (mode: "grid" | "list") => {
  viewMode.value = mode;
};

// Load slide decks on mount
onMounted(async () => {
  logSlidesViewDebug('🚀 Slides.vue mounted, calling fetchSlideDecks()');
  const fetchedDecks = await fetchSlideDecks();
  logSlidesViewDebug('📊 fetchSlideDecks returned:', fetchedDecks.length, 'decks');
  logSlidesViewDebug('📊 slideDecks.value after fetch:', slideDecks.value.length);
  
  logSlidesViewDebug('Slide thumbnails queued for', slideDecks.value.length, 'decks');
});

// Create new presentation with template
async function createNewPresentation(template?: SlideTemplate) {
  const title = template ? `${template.name} Presentation` : 'New Presentation';
  const slides = createAvnacSlidesForTheme(template?.slug ?? 'default')
  
  const newDeck = await createSlideDeck(title, slides, template?.slug ?? 'default');
  if (newDeck) {
    router.push(`/slides/${newDeck.id}`);
  } else {
    router.push('/slides/new');
  }
}

function createNewPresentationFromTemplate(template: SlideTemplate) {
  createNewPresentation(template);
}

function editSlideDeck(deckId: string) {
  router.push(`/slides/${deckId}`);
}

function selectSlideDeck(deckId: string) {
  selectedSlideDeck.value = selectedSlideDeck.value === deckId ? null : deckId;
}

// Manual refresh function for debugging
async function refreshSlideDecks() {
  logSlidesViewDebug('🔄 Manual refresh triggered');
  const fetchedDecks = await fetchSlideDecks();
  logSlidesViewDebug('📊 Manual refresh result:', fetchedDecks.length, 'decks');
}
</script>

<template>
  <div
    :class="[
      'h-screen text-gray-900 transition-colors duration-200',
      'bg-gradient-to-br from-gray-50 to-gray-100',
      'dark:bg-gradient-to-br dark:from-gray-900 to-gray-800'
    ]"
  >
    <!-- Workspace Top Bar -->
    <WorkspaceTopBar
      :title="currentTitle"
      :subtitle="slidesSubtitle"
      :breadcrumbs="breadcrumbs"
      :can-navigate-up="canNavigateUp"
      :actions="topBarActions"
      :stats="stats"
      :filters="filterOptions"
      :view-options="viewOptions"
      @filter-select="handleFilter"
      @view-change="handleViewChange"
    >
      <template #action-new-presentation>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              :class="actionIconClass"
            >
              <Plus class="h-5 w-5 text-primary-600" />
            </Button>
          </DialogTrigger>
          <DialogContent
            :class="[
              'rounded-lg shadow-2xl border max-h-[82vh] overflow-y-auto',
              'bg-white border-gray-200',
              'dark:bg-gray-800 dark:border-gray-700'
            ]"
          >
            <DialogHeader>
              <DialogTitle
                :class="[
                  'text-xl font-semibold',
                  'text-gray-800 dark:text-gray-100'
                ]"
              >
                {{$t('Views.heading.create_new_presentation')}}
              </DialogTitle>
            </DialogHeader>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 p-2">
              <Button
                v-for="template in slideTemplates"
                :key="template.name"
                variant="outline"
                :class="[
                  'h-24 flex flex-col items-center justify-center transition-all',
                  'hover:bg-gray-50 hover:border-primary-400',
                  'dark:hover:bg-gray-700 dark:hover:border-primary-400'
                ]"
                @click="createNewPresentationFromTemplate(template)"
              >
                <component :is="template.icon" class="w-8 h-8 text-primary-600" />
                <span class="mt-2 text-sm font-medium">{{ template.name }}</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </template>
    </WorkspaceTopBar>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 md:p-6 overflow-hidden">
      <!-- Template previews -->
      <div
        class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 backdrop-blur shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300"
      >
        <div class="flex items-center justify-between px-3 sm:px-4 md:px-6 py-2 sm:py-3 border-b border-gray-200/70 dark:border-gray-700/70">
          <div>
            <p class="text-xs uppercase tracking-wide text-primary-600 dark:text-primary-400 font-semibold">
              {{$t('Views.text.start_a_new_presentation')}}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{$t('Views.text.modern_slide_decks')}}</p>
          </div>
          <Button variant="ghost" size="sm" class="text-primary-600" @click="createNewPresentation()">
            <Plus class="h-4 w-4 mr-1" /> {{$t('Commons.button.blank')}}
          </Button>
        </div>
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-gray-50/90 via-white/70 to-gray-50/90 dark:from-gray-900/80 dark:via-gray-900/40 dark:to-gray-900/80 blur-xl opacity-70 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none"></div>
          <div class="template-preview-scroll overflow-x-auto px-2 sm:px-3 md:px-5 py-3 sm:py-4 space-x-3 sm:space-x-4 flex">
            <div
              v-for="template in slideTemplates"
              :key="template.slug"
              class="w-40 sm:w-44 min-w-[10rem] sm:min-w-[11rem] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              @click="createNewPresentationFromTemplate(template)"
            >
              <div
                class="h-32 relative overflow-hidden"
                :style="template.previewStyle"
              >
                <div class="absolute inset-0 mix-blend-overlay opacity-70"></div>
                <div class="absolute top-3 left-3 text-xs text-white/90 font-semibold bg-black/20 px-2 py-1 rounded">
                  {{ template.badge }}
                </div>
                <div class="absolute top-3 right-3 text-xs text-white/90 font-semibold bg-primary-600/80 px-2 py-1 rounded">
                  AVNAC
                </div>
              </div>
              <div class="px-3 py-3 space-y-1">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{{ template.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ template.subtitle }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content area -->
      <ScrollArea
        :class="[
          'flex-1 min-h-0 rounded-lg shadow-sm border',
          'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        ]"
      >
        <div v-if="sortedSlideDecks.length > 0">
          <!-- Select All header for list view -->
          <div
            v-if="viewMode === 'list'"
            :class="[
              'flex items-center gap-3 px-4 py-3 border-b',
              'border-gray-200 dark:border-gray-700'
            ]"
          >
            <input
              type="checkbox"
              :checked="selectedSlideDeck !== null"
              @change="selectedSlideDeck = selectedSlideDeck ? null : sortedSlideDecks[0]?.id || null"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span
              class="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {{ selectedSlideDeck ? $t('Commons.text.selected_presentation') : $t('Commons.label.select_all') }}
            </span>
          </div>

          <!-- Select All button for grid view -->
          <div
            v-else-if="viewMode === 'grid'"
            :class="[
              'flex items-center justify-between px-4 py-3 border-b',
              'border-gray-200 dark:border-gray-700'
            ]"
          >
            <Button
              variant="ghost"
              size="sm"
              @click="selectedSlideDeck = selectedSlideDeck ? null : sortedSlideDecks[0]?.id || null"
              class="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                :checked="selectedSlideDeck !== null"
                @click.stop
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 pointer-events-none"
              />
              <span
                :class="[
                  'text-sm font-medium text-gray-700 dark:text-gray-300',
                ]"
              >
                {{ selectedSlideDeck ? $t('Commons.text.selected_presentation') : $t('Commons.label.select_all') }}
              </span>
            </Button>

            <!-- Optional: Show count of total presentations -->
            <span
              :class="['text-xs text-gray-500 dark:text-gray-400']"
            >
              {{ sortedSlideDecks.length }} presentation{{ sortedSlideDecks.length !== 1 ? "s" : "" }}
            </span>
          </div>

          <div class="p-2 sm:p-4 lg:p-6">
            <div :class="cardsContainerClass">
              <!-- Slide deck cards -->
              <div
                v-for="deck in sortedSlideDecks"
                :key="deck.id"
                :class="[
                  'relative rounded-lg border cursor-pointer transition-all duration-200',
                  viewMode === 'grid' 
                    ? 'overflow-hidden group hover:shadow-lg hover:-translate-y-1' 
                    : 'flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800',
                  selectedSlideDeck === deck.id 
                    ? 'ring-2 ring-primary-500 border-primary-500' 
                    : 'border-gray-200 dark:border-gray-700'
                ]"
                @click="selectSlideDeck(deck.id)"
                @dblclick="editSlideDeck(deck.id)"
              >
                <!-- Grid view -->
                <template v-if="viewMode === 'grid'">
                  <div class="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 relative overflow-hidden">
                    <img 
                      v-if="thumbnailUrls[deck.id]"
                      :src="thumbnailUrls[deck.id]" 
                      :alt="deck.title"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div 
                      v-else
                      class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center"
                    >
                      <Presentation class="w-12 h-12 text-gray-400" />
                    </div>
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                    <div class="absolute top-2 right-2">
                      <input
                        type="checkbox"
                        :checked="selectedSlideDeck === deck.id"
                        @click.stop
                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div class="p-4">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">{{ deck.title }}</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ deck.slideCount }} slides</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ deck.lastModified }}</p>
                  </div>
                </template>

                <!-- List view -->
                <template v-else>
                  <div class="flex-shrink-0 w-20 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded overflow-hidden">
                    <img 
                      v-if="thumbnailUrls[deck.id]"
                      :src="thumbnailUrls[deck.id]" 
                      :alt="deck.title"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div 
                      v-else
                      class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center"
                    >
                      <Presentation class="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate">{{ deck.title }}</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ deck.slideCount }} slides • {{ deck.lastModified }}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <input
                      type="checkbox"
                      :checked="selectedSlideDeck === deck.id"
                      @click.stop
                      class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="empty-state">
          <div class="empty-icon-wrapper">
            <Presentation class="empty-icon" />
          </div>
          <h3 class="empty-title">{{$t('Views.heading.no_presentations_found')}}</h3>
          <p class="empty-description">
            {{$t('Views.text.get_started_by_creating')}}
          </p>
          <div class="empty-actions">
            <Button
              @click="createNewPresentation()"
              class="bg-primary-600 hover:bg-primary-700"
            >
              <Plus class="mr-2 h-4 w-4" />
              {{$t('Commons.button.new_presentation')}}
            </Button>
            <Button
              variant="outline"
              class="border-gray-300 hover:border-gray-400"
              @click="createNewPresentationFromTemplate(slideTemplates[1])"
            >
              <FileText class="mr-2 h-4 w-4" />
              {{$t('Commons.button.serif_theme')}}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

@media (min-width: 640px) {
  .empty-state {
    padding: 4rem;
  }
}

.empty-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 9999px;
  margin-bottom: 1.5rem;
  background-color: rgb(243 244 246);
}

@media (min-width: 640px) {
  .empty-icon-wrapper {
    width: 5rem;
    height: 5rem;
  }
}

.dark .empty-icon-wrapper {
  background-color: rgb(55 65 81);
}

.empty-icon {
  width: 2rem;
  height: 2rem;
  color: rgb(37 99 235);
}

@media (min-width: 640px) {
  .empty-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
}

.dark .empty-icon {
  color: rgb(59 130 246);
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: rgb(17 24 39);
}

@media (min-width: 640px) {
  .empty-title {
    font-size: 1.25rem;
  }
}

.dark .empty-title {
  color: rgb(243 244 246);
}

.empty-description {
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  max-width: 28rem;
  color: rgb(107 114 128);
}

@media (min-width: 640px) {
  .empty-description {
    margin-bottom: 2rem;
  }
}

.dark .empty-description {
  color: rgb(156 163 175);
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: center;
  width: 100%;
}

@media (min-width: 640px) {
  .empty-actions {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1rem;
    width: auto;
  }
}
</style>
