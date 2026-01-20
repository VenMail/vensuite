<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
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
import SlideThumbnailRenderer from "@/components/slides/SlideThumbnailRenderer.vue";
import { vIntersection } from "@/directives/intersection";

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
  slug: string;
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
    subtitle: "Clean and minimalist default theme",
    badge: "Default",
    icon: Presentation,
    previewStyle: "background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);",
    description: "The default Slidev theme with clean, minimalist design"
  },
  {
    name: "Seriph Theme",
    slug: "seriph",
    subtitle: "Professional serif fonts theme",
    badge: "Serif",
    icon: FileText,
    previewStyle: "background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);",
    description: "An official theme using serif fonts for professional presentations"
  },
  {
    name: "Apple Basic",
    slug: "apple-basic",
    subtitle: "Apple Keynote inspired theme",
    badge: "Apple",
    icon: Image,
    previewStyle: "background: linear-gradient(135deg, #10b981 0%, #34d399 100%);",
    description: "Inspired by the Basic Black/White theme on Apple Keynote"
  },
  {
    name: "Bricks Theme",
    slug: "bricks",
    subtitle: "Modern brick-based design",
    badge: "Bricks",
    icon: BarChart,
    previewStyle: "background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);",
    description: "Modern theme with brick-based design elements"
  },
  {
    name: "Shibainu Theme",
    slug: "shibainu",
    subtitle: "Playful dog-inspired theme",
    badge: "Shibainu",
    icon: Users,
    previewStyle: "background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);",
    description: "Playful theme inspired by the Shiba Inu dog breed"
  },
  {
    name: "Academic Theme",
    slug: "academic",
    subtitle: "Academic presentations made simple",
    badge: "Academic",
    icon: TrendingUp,
    previewStyle: "background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);",
    description: "Simplifies creating academic presentations with necessary components and layouts"
  },
  {
    name: "Purplin Theme",
    slug: "purplin",
    subtitle: "Modern purple gradient theme",
    badge: "Purplin",
    icon: PieChart,
    previewStyle: "background: linear-gradient(135deg, #a855f7 0%, #c084fc 100%);",
    description: "A modern theme with purple gradients and clean design"
  },
  {
    name: "Neversink Theme",
    slug: "neversink",
    subtitle: "Education/academic oriented theme",
    badge: "Neversink",
    icon: Settings,
    previewStyle: "background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);",
    description: "An education/academia oriented Slidev theme with whimsical elements"
  },
  {
    name: "Vuetiful Theme",
    slug: "vuetiful",
    subtitle: "Vue-inspired modern theme",
    badge: "Vue",
    icon: Presentation,
    previewStyle: "background: linear-gradient(135deg, #10b981 0%, #34d399 100%);",
    description: "A modern theme inspired by Vue.js design principles"
  },
  {
    name: "Envek Theme",
    slug: "envek",
    subtitle: "Personal presentation theme",
    badge: "Personal",
    icon: FileText,
    previewStyle: "background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);",
    description: "A personal theme for Slidev with unique styling"
  },
  {
    name: "Vuestorefront Theme",
    slug: "vuestorefront",
    subtitle: "E-commerce focused theme",
    badge: "Commerce",
    icon: BarChart,
    previewStyle: "background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);",
    description: "Theme designed for e-commerce and business presentations"
  },
  {
    name: "Nearform Theme",
    slug: "nearform",
    subtitle: "Nearform company theme",
    badge: "Nearform",
    icon: TrendingUp,
    previewStyle: "background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);",
    description: "Professional theme for Nearform presentations and workshops"
  },
  {
    name: "IODigital Theme",
    slug: "iodigital",
    subtitle: "Digital agency theme",
    badge: "Digital",
    icon: PieChart,
    previewStyle: "background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);",
    description: "Modern theme for digital agencies and tech presentations"
  },
  {
    name: "Foamscience Theme",
    slug: "foamscience",
    subtitle: "Scientific research theme",
    badge: "Science",
    icon: Settings,
    previewStyle: "background: linear-gradient(135deg, #10b981 0%, #34d399 100%);",
    description: "Theme designed for scientific and research presentations"
  },
  {
    name: "Blank Canvas",
    slug: "blank",
    subtitle: "Start from scratch",
    badge: "Blank",
    icon: FileText,
    previewStyle: "background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);",
    description: "A blank canvas to create your presentation from scratch"
  }
];

// Mock slide decks data - in real app this would come from a store
// Now using the slideDecks service
const thumbnailUrls = ref<Record<string, string>>({});
const loadingThumbnails = ref<Set<string>>(new Set());

const filteredSlideDecks = computed(() => {
  console.log('🔄 filteredSlideDecks computed, slideDecks.value:', slideDecks.value);
  console.log('🔄 slideDecks.value length:', slideDecks.value.length);
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
  return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
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
  console.log('Filter:', filter);
  selectedSlideDeck.value = null;
};

const handleViewChange = (mode: "grid" | "list") => {
  viewMode.value = mode;
};

// Load slide decks on mount
onMounted(async () => {
  console.log('🚀 Slides.vue mounted, calling fetchSlideDecks()');
  const fetchedDecks = await fetchSlideDecks();
  console.log('📊 fetchSlideDecks returned:', fetchedDecks.length, 'decks');
  console.log('📊 slideDecks.value after fetch:', slideDecks.value.length);
  
  // Preload thumbnails for first few decks
  const decksToPreload = slideDecks.value.slice(0, 5);
  console.log('🖼️ Preloading thumbnails for', decksToPreload.length, 'decks');
  await Promise.allSettled(
    decksToPreload.map(deck => loadThumbnail(deck.id))
  );
});

// Load thumbnail for a specific deck
async function loadThumbnail(deckId: string) {
  if (thumbnailUrls.value[deckId] || loadingThumbnails.value.has(deckId)) {
    return thumbnailUrls.value[deckId];
  }

  loadingThumbnails.value.add(deckId);
  
  try {
    const deck = slideDecks.value.find(d => d.id === deckId);
    if (deck) {
      const thumbnail = await getDeckThumbnail(deck);
      thumbnailUrls.value[deckId] = thumbnail;
    }
  } catch (error) {
    console.warn('Failed to load thumbnail for deck:', deckId, error);
  } finally {
    loadingThumbnails.value.delete(deckId);
  }
}

// Create new presentation with template
async function createNewPresentation(template?: SlideTemplate) {
  const title = template ? `${template.name} Presentation` : 'New Presentation';
  const theme = template?.slug || 'default';
  
  const newDeck = await createSlideDeck(title, theme);
  if (newDeck) {
    router.push(`/slides/${newDeck.id}`);
  } else {
    // Fallback to router navigation
    if (template?.slug && template.slug !== 'blank') {
      router.push(`/slides/t/${template.slug}`);
    } else {
      router.push('/slides/new');
    }
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
  console.log('🔄 Manual refresh triggered');
  const fetchedDecks = await fetchSlideDecks();
  console.log('📊 Manual refresh result:', fetchedDecks.length, 'decks');
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
              'rounded-lg shadow-2xl border',
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
                Create New Presentation
              </DialogTitle>
            </DialogHeader>
            <div class="grid grid-cols-2 gap-4 p-2">
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
    <div class="flex-1 flex flex-col gap-6 p-4 sm:p-6 overflow-hidden">
      <!-- Template previews -->
      <div
        class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 backdrop-blur shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300"
      >
        <div class="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200/70 dark:border-gray-700/70">
          <div>
            <p class="text-xs uppercase tracking-wide text-primary-600 dark:text-primary-400 font-semibold">
              Start a New Presentation
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300">Modern slide decks</p>
          </div>
          <Button variant="ghost" size="sm" class="text-primary-600" @click="createNewPresentation()">
            <Plus class="h-4 w-4 mr-1" /> Blank
          </Button>
        </div>
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-gray-50/90 via-white/70 to-gray-50/90 dark:from-gray-900/80 dark:via-gray-900/40 dark:to-gray-900/80 blur-xl opacity-70 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none"></div>
          <div class="template-preview-scroll overflow-x-auto px-3 sm:px-5 py-4 space-x-4 flex">
            <div
              v-for="template in slideTemplates"
              :key="template.slug"
              class="w-44 min-w-[11rem] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
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
                  Slidev
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
              {{ selectedSlideDeck ? 'Selected Presentation' : 'Select All' }}
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
                {{ selectedSlideDeck ? 'Selected Presentation' : 'Select All' }}
              </span>
            </Button>

            <!-- Optional: Show count of total presentations -->
            <span
              :class="['text-xs text-gray-500 dark:text-gray-400']"
            >
              {{ sortedSlideDecks.length }} presentation{{ sortedSlideDecks.length !== 1 ? "s" : "" }}
            </span>
          </div>

          <div class="p-2 sm:p-4">
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
                    <SlideThumbnailRenderer
                      v-else-if="deck.slides.length > 0"
                      :slide="deck.slides[0]"
                      :width="400"
                      :height="225"
                      :scale="0.6"
                      class="w-full h-full"
                      v-intersection="() => loadThumbnail(deck.id)"
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
          <h3 class="empty-title">No Presentations Found</h3>
          <p class="empty-description">
            Get started by creating your first presentation
          </p>
          <div class="empty-actions">
            <Button
              @click="createNewPresentation()"
              class="bg-primary-600 hover:bg-primary-700"
            >
              <Plus class="mr-2 h-4 w-4" />
              New Presentation
            </Button>
            <Button
              variant="outline"
              class="border-gray-300 hover:border-gray-400"
              @click="createNewPresentationFromTemplate(slideTemplates[1])"
            >
              <FileText class="mr-2 h-4 w-4" />
              Serif Theme
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
