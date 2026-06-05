<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ScrollArea } from '@/components/ui/scroll-area';
import Button from '@/components/ui/button/Button.vue';
import QuickViewCard from '@/components/forms/QuickView.vue';
import { Plus, FileText, MessageSquare } from 'lucide-vue-next';
import { t } from '@/i18n';
import type { AppForm } from '@/types';

interface Props {
  forms: AppForm[];
  viewMode: 'grid' | 'list';
  loading: boolean;
  hasMore: boolean;
  computeFieldCount: (form: AppForm) => number | null;
  computeResponseCount: (form: AppForm) => number | null;
}

interface Emits {
  (e: 'view-responses', form: AppForm): void;
  (e: 'share', form: AppForm): void;
  (e: 'create-blank'): void;
  (e: 'create-template'): void;
  (e: 'load-more'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const loadMoreSentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

const cardsContainerClass = computed(() => {
  if (props.viewMode === 'list') {
    return 'flex flex-col gap-3 sm:gap-4';
  }
  return 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
});

const handleQuickViewResponses = (form: AppForm) => {
  emit('view-responses', form);
};

const handleQuickViewShare = (form: AppForm) => {
  emit('share', form);
};

const handleCreateBlank = () => {
  emit('create-blank');
};

const handleCreateTemplate = () => {
  emit('create-template');
};

const disconnectObserver = () => {
  observer?.disconnect();
  observer = null;
};

const setupLoadMoreObserver = async () => {
  await nextTick();
  disconnectObserver();

  const sentinel = loadMoreSentinel.value;
  if (!sentinel || !props.hasMore) return;

  const scrollRoot = sentinel.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting && props.hasMore && !props.loading) {
        emit('load-more');
      }
    },
    {
      root: scrollRoot,
      rootMargin: '180px 0px',
      threshold: 0,
    },
  );
  observer.observe(sentinel);
};

onMounted(setupLoadMoreObserver);
onBeforeUnmount(disconnectObserver);
watch(() => [props.hasMore, props.loading, props.forms.length, props.viewMode], setupLoadMoreObserver);
</script>

<template>
  <ScrollArea
    :class="[
      'flex-1 min-h-0 rounded-lg shadow-sm border',
      'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    ]"
  >
    <div v-if="forms.length > 0">
      <div
        :class="[
          'flex items-center justify-between px-4 py-3 border-b',
          'border-gray-200 dark:border-gray-700'
        ]"
      >
        <span
          :class="['text-sm font-medium text-gray-700 dark:text-gray-300']"
        >
          {{ forms.length }} form{{ forms.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <div class="p-2 sm:p-4">
        <div :class="cardsContainerClass">
          <QuickViewCard
            v-for="form in forms"
            :key="form.id"
            :form="form"
            :view-mode="viewMode"
            :field-count="computeFieldCount(form) ?? undefined"
            :response-count="computeResponseCount(form) ?? undefined"
            @view-responses="handleQuickViewResponses"
            @share="handleQuickViewShare"
          />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <div class="empty-icon-wrapper">
        <FileText class="empty-icon" />
      </div>
      <h3 class="empty-title">{{$t('Components.Forms.heading.no_forms_found')}}</h3>
      <p class="empty-description">
        {{$t('Components.Forms.text.get_started_by_creating')}}
      </p>
      <div class="empty-actions">
        <Button
          @click="handleCreateBlank"
          class="bg-primary-600 hover:bg-primary-700"
        >
          <Plus class="mr-2 h-4 w-4" />
          {{ t('Commons.button.new') }}
        </Button>
        <Button
          variant="outline"
          class="border-gray-300 hover:border-gray-400"
          @click="handleCreateTemplate"
        >
          <MessageSquare class="mr-2 h-4 w-4" />
          {{$t('Commons.button.contact_form')}}
        </Button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading && hasMore" class="text-center mt-6 sm:mt-8 p-4">
      <div class="inline-block w-8 h-8 rounded-full border-4 border-gray-300 dark:border-gray-600 border-r-transparent animate-spin" role="status"></div>
      <span class="ml-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base" v-if="forms.length > 0">{{ t('Views.Forms.text.loading_more_forms') }}</span>
      <span class="ml-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base" v-else>{{ t('Views.Forms.text.loading') }}</span>
    </div>

    <div v-if="hasMore" ref="loadMoreSentinel" class="h-px" aria-hidden="true"></div>
  </ScrollArea>
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
