<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import WorkspaceTopBar from '@/components/layout/WorkspaceTopBar.vue';
import { ScrollArea } from '@/components/ui/scroll-area';
import Button from '@/components/ui/button/Button.vue';
import {
  Plus,
  BookOpen,
  Grid,
  List,
  RefreshCw,
  Clock,
  Users,
  Trash2,
  MoreVertical,
} from 'lucide-vue-next';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { toast } from 'vue-sonner';
import {
  fetchStories,
  createStory,
  deleteStory,
  type StoryListItem,
} from '@/services/stories';

interface BreadcrumbItem {
  id?: string | null;
  title: string;
}
interface ActionItem {
  key?: string;
  label?: string;
  icon?: unknown;
  component?: unknown;
  props?: Record<string, unknown>;
  onClick?: () => void;
  slot?: string;
}
interface StatItem {
  label: string;
  value: string | number;
}
interface FilterItem {
  key?: string;
  label: string;
  value: string;
  icon?: unknown;
  active?: boolean;
}
interface ViewOption {
  label?: string;
  value: string;
  icon?: unknown;
  active?: boolean;
}
type GlobalSearchPayload = {
  query?: string;
  filters?: string[];
  context?: string;
};

const router = useRouter();
const viewMode = ref<'grid' | 'list'>('grid');
const activeFilter = ref<string>('all');
const searchQuery = ref('');
const storyList = ref<StoryListItem[]>([]);
const isLoading = ref(false);
const isCreating = ref(false);

// ── Fetch ────────────────────────────────────────────────────────────
async function loadStories() {
  isLoading.value = true;
  try {
    storyList.value = await fetchStories();
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  document.title = currentTitle.value;
  window.addEventListener('global-search', handleGlobalSearch);
  loadStories();
});

onUnmounted(() => {
  window.removeEventListener('global-search', handleGlobalSearch);
});

// ── Sorted & filtered ────────────────────────────────────────────────
const sortedStories = computed(() => {
  let filtered = [...storyList.value];

  if (activeFilter.value === 'shared') {
    filtered = filtered.filter(s => s.shared);
  } else if (activeFilter.value === 'recent') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    filtered = filtered.filter(s => new Date(s.lastModified) >= sevenDaysAgo);
  }

  const query = searchQuery.value.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(s => s.title.toLowerCase().includes(query));
  }

  return filtered.sort(
    (a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
  );
});

// ── Actions ──────────────────────────────────────────────────────────
async function handleCreateStory() {
  if (isCreating.value) return;
  isCreating.value = true;
  try {
    const story = await createStory('Untitled Story');
    if (story) {
      router.push(`/stories/${story.id}`);
    }
  } finally {
    isCreating.value = false;
  }
}

function openStory(id: string) {
  router.push(`/stories/${id}`);
}

async function handleDeleteStory(storyId: string) {
  const success = await deleteStory(storyId);
  if (success) {
    storyList.value = storyList.value.filter(s => s.id !== storyId);
    toast.success('Story moved to trash');
  } else {
    toast.error('Failed to delete story');
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Generate a deterministic pastel gradient from a string id */
function placeholderGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 70%, 85%) 0%, hsl(${h2}, 60%, 78%) 100%)`;
}

// ── WorkspaceTopBar config ───────────────────────────────────────────
const cardsContainerClass = computed(() =>
  viewMode.value === 'list'
    ? 'flex flex-col gap-3 sm:gap-4'
    : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4',
);

const currentTitle = computed(() => 'Stories');
const storiesSubtitle = computed(() => 'All stories');
const breadcrumbs = computed<BreadcrumbItem[]>(() => []);
const canNavigateUp = computed(() => false);

const stats = computed<StatItem[]>(() => [
  { value: sortedStories.value.length, label: 'stories' },
]);

const filterOptions = computed<FilterItem[]>(() => [
  { key: 'all', label: 'All', value: 'all', icon: BookOpen, active: activeFilter.value === 'all' },
  { key: 'shared', label: 'Shared', value: 'shared', icon: Users, active: activeFilter.value === 'shared' },
  { key: 'recent', label: 'Recent', value: 'recent', icon: Clock, active: activeFilter.value === 'recent' },
]);

const viewOptions = computed<ViewOption[]>(() => [
  { value: 'grid', icon: Grid, label: 'Grid', active: viewMode.value === 'grid' },
  { value: 'list', icon: List, label: 'List', active: viewMode.value === 'list' },
]);

const actionIconClass =
  'relative group rounded-full transition-all duration-200 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700';

function iconActionProps(label: string) {
  return {
    variant: 'ghost' as const,
    size: 'icon' as const,
    class: actionIconClass,
    title: label,
    'aria-label': label,
  };
}

const topBarActions = computed<ActionItem[]>(() => [
  {
    key: 'new-story',
    icon: Plus,
    component: Button,
    props: iconActionProps('Create story'),
    onClick: handleCreateStory,
  },
  {
    key: 'refresh',
    icon: RefreshCw,
    component: Button,
    props: iconActionProps('Refresh stories'),
    onClick: loadStories,
  },
]);

const handleFilter = (filter: string) => {
  activeFilter.value = filter;
};
const handleViewChange = (mode: 'grid' | 'list') => {
  viewMode.value = mode;
};

function handleGlobalSearch(event: Event) {
  const detail = (event as CustomEvent<GlobalSearchPayload>).detail || {};
  const filter = detail.filters?.[0] || 'all';
  const validFilters = new Set(['shared', 'recent']);

  searchQuery.value = detail.query || '';
  activeFilter.value = validFilters.has(filter) ? filter : 'all';
}
</script>

<template>
  <div
    :class="[
      'h-full min-h-0 flex flex-col overflow-hidden text-gray-900 transition-colors duration-200',
      'bg-gradient-to-br from-gray-50 to-gray-100',
      'dark:bg-gradient-to-br dark:from-gray-900 to-gray-800',
    ]"
  >
    <WorkspaceTopBar
      :title="currentTitle"
      :subtitle="storiesSubtitle"
      :breadcrumbs="breadcrumbs"
      :can-navigate-up="canNavigateUp"
      :actions="topBarActions"
      :stats="stats"
      :filters="filterOptions"
      :view-options="viewOptions"
      @filter-select="handleFilter"
      @view-change="handleViewChange"
    />

    <!-- Main content -->
    <div class="flex-1 min-h-0 flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 md:p-6 overflow-hidden">
      <ScrollArea
        :class="[
          'flex-1 min-h-0 rounded-lg shadow-sm border',
          'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        ]"
      >
        <!-- Loading state -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>

        <!-- Stories grid / list -->
        <div v-else-if="sortedStories.length > 0">
          <div
            :class="[
              'flex items-center justify-between px-4 py-3 border-b',
              'border-gray-200 dark:border-gray-700',
            ]"
          >
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ sortedStories.length }} {{ sortedStories.length === 1 ? 'story' : 'stories' }}
            </span>
          </div>

          <div class="p-2 sm:p-4 lg:p-6">
            <div :class="cardsContainerClass">
              <!-- Create new story card (grid only) -->
              <div
                v-if="viewMode === 'grid'"
                class="relative rounded-lg border-2 border-dashed
                       border-gray-300 dark:border-gray-600 cursor-pointer
                       overflow-hidden group transition-all duration-200
                       hover:border-primary-400 hover:shadow-md hover:-translate-y-0.5"
                @click="handleCreateStory"
              >
                <div class="aspect-video flex flex-col items-center justify-center gap-3
                            bg-gray-50 dark:bg-gray-800/60">
                  <div
                    class="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/30
                           flex items-center justify-center
                           group-hover:scale-110 transition-transform duration-200"
                  >
                    <Plus class="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span class="text-sm font-semibold text-gray-600 dark:text-gray-400
                               group-hover:text-primary-600 dark:group-hover:text-primary-400
                               transition-colors">
                    Create New Story
                  </span>
                </div>
              </div>

              <!-- Story cards -->
              <div
                v-for="story in sortedStories"
                :key="story.id"
                :class="[
                  'relative rounded-lg border cursor-pointer transition-all duration-200',
                  viewMode === 'grid'
                    ? 'overflow-hidden group hover:shadow-lg hover:-translate-y-1'
                    : 'flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800',
                  'border-gray-200 dark:border-gray-700',
                ]"
                @click="openStory(story.id)"
              >
                <!-- Grid view -->
                <template v-if="viewMode === 'grid'">
                  <div
                    class="aspect-video relative overflow-hidden"
                    :style="{ background: placeholderGradient(story.id) }"
                  >
                    <img
                      v-if="story.thumbnail"
                      :src="story.thumbnail"
                      :alt="story.title"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center"
                    >
                      <BookOpen class="w-12 h-12 text-white/50" />
                    </div>
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                    <!-- Scene count badge -->
                    <div
                      class="absolute top-2 right-2 px-2 py-0.5 text-[10px]
                             font-semibold bg-black/40 backdrop-blur-sm
                             text-white rounded-full"
                    >
                      {{ story.sceneCount }} {{ story.sceneCount === 1 ? 'scene' : 'scenes' }}
                    </div>
                  </div>
                  <div class="p-4 flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                        {{ story.title }}
                      </h3>
                      <p class="text-xs text-gray-400 dark:text-gray-500">
                        {{ formatDate(story.lastModified) }}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child @click.stop>
                        <button
                          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
                        >
                          <MoreVertical class="w-4 h-4 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" @click.stop>
                        <DropdownMenuItem
                          class="text-red-600 dark:text-red-400"
                          @click.stop="handleDeleteStory(story.id)"
                        >
                          <Trash2 class="w-4 h-4 mr-2" />
                          Move to Trash
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </template>

                <!-- List view -->
                <template v-else>
                  <div
                    class="flex-shrink-0 w-20 h-12 rounded overflow-hidden"
                    :style="{ background: placeholderGradient(story.id) }"
                  >
                    <img
                      v-if="story.thumbnail"
                      :src="story.thumbnail"
                      :alt="story.title"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center"
                    >
                      <BookOpen class="w-5 h-5 text-white/50" />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {{ story.title }}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ story.sceneCount }} {{ story.sceneCount === 1 ? 'scene' : 'scenes' }}
                      &middot; {{ formatDate(story.lastModified) }}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child @click.stop>
                      <button
                        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
                      >
                        <MoreVertical class="w-4 h-4 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" @click.stop>
                      <DropdownMenuItem
                        class="text-red-600 dark:text-red-400"
                        @click.stop="handleDeleteStory(story.id)"
                      >
                        <Trash2 class="w-4 h-4 mr-2" />
                        Move to Trash
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center">
          <div
            class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100
                   dark:bg-gray-700 flex items-center justify-center mb-6"
          >
            <BookOpen class="w-8 h-8 sm:w-10 sm:h-10 text-primary-500" />
          </div>
          <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            No stories yet
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Create your first story to start building interactive visual narratives
            with drag-and-drop blocks and animations.
          </p>
          <Button
            class="bg-primary-600 hover:bg-primary-700 text-white"
            :disabled="isCreating"
            @click="handleCreateStory"
          >
            <Plus class="mr-2 h-4 w-4" />
            Create your first story
          </Button>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
