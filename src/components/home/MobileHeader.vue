<template>
  <div class="mobile-header">
    <!-- Mobile Top Bar -->
    <div class="mobile-top-bar">
      <!-- Left: Back Navigation (if not root) -->
      <div class="flex items-center gap-3">
        <Button
          v-if="showBackButton"
          variant="ghost"
          size="sm"
          class="h-10 w-10 p-0 rounded-lg"
          @click="$emit('navigate-back')"
        >
          <ArrowLeft class="h-5 w-5" />
        </Button>
      </div>

      <!-- Center: Title -->
      <div class="flex-1 min-w-0 px-2">
        <h1 class="text-lg font-semibold truncate text-center">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-xs text-muted-foreground text-center truncate">
          {{ subtitle }}
        </p>
      </div>

      <!-- Right: Search and Actions -->
      <div class="flex items-center gap-2">
        <!-- Search Toggle -->
        <Button
          variant="ghost"
          size="sm"
          class="h-10 w-10 p-0 rounded-lg"
          @click="$emit('toggle-search')"
        >
          <Search class="h-5 w-5" />
        </Button>
        
        <!-- More Actions -->
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              class="h-10 w-10 p-0 rounded-lg"
            >
              <MoreVertical class="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="$emit('create-folder')">
              <FolderPlus class="h-4 w-4 mr-2" />
              {{$t('Commons.text.new_folder')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="$emit('upload-file')">
              <Upload class="h-4 w-4 mr-2" />
              {{$t('Commons.button.upload_file')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="$emit('create-document')">
              <FileText class="h-4 w-4 mr-2" />
              {{$t('Commons.button.new_document')}}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="$emit('toggle-view-mode')">
              <Grid class="h-4 w-4 mr-2" />
              Change View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Collapsible Search Bar -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showSearch" class="mobile-search-bar">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            :value="searchQuery"
            @input="$emit('update:search-query', $event.target.value)"
            placeholder="Search files and folders..."
            class="pl-10 pr-4 h-12 text-base"
            ref="searchInput"
          />
          <Button
            v-if="searchQuery"
            variant="ghost"
            size="sm"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            @click="$emit('clear-search')"
          >
            <X class="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Transition>

    <!-- Breadcrumb Trail (Mobile Optimized) -->
    <div v-if="breadcrumbs.length > 1" class="mobile-breadcrumbs">
      <div class="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          variant="ghost"
          size="sm"
          class="flex-shrink-0 h-8 px-2 text-xs"
          @click="$emit('navigate-to-breadcrumb', 0)"
        >
          <Home class="h-3 w-3 mr-1" />
          {{$t('Commons.button.root')}}
        </Button>
        <ChevronRight class="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        
        <template v-for="(crumb, index) in breadcrumbs.slice(1, -1)" :key="crumb.id">
          <Button
            variant="ghost"
            size="sm"
            class="flex-shrink-0 h-8 px-2 text-xs"
            @click="$emit('navigate-to-breadcrumb', index + 1)"
          >
            {{ crumb.title }}
          </Button>
          <ChevronRight class="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        </template>
        
        <span class="flex-shrink-0 text-xs font-medium text-foreground px-2">
          {{ currentFolder }}
        </span>
      </div>
    </div>

    <!-- Selection Bar (appears when files are selected) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-full"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-full"
    >
      <div v-if="selectedCount > 0" class="mobile-selection-bar">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">
              {{ selectedCount }} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              @click="$emit('clear-selection')"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
          
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              @click="$emit('open-selected')"
            >
              <FolderOpen class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              @click="$emit('rename-selected')"
            >
              <Edit class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              @click="$emit('download-selected')"
            >
              <Download class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0 text-destructive"
              @click="$emit('delete-selected')"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ArrowLeft, Search, MoreVertical, FolderPlus, Upload, FileText, Grid, X, ChevronRight, Home, FolderOpen, Download, Trash2, Edit } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

interface Breadcrumb {
  id?: string
  title: string
}

const props = defineProps<{
  title: string
  subtitle?: string
  showBackButton: boolean
  showSearch: boolean
  searchQuery: string
  breadcrumbs: Breadcrumb[]
  currentFolder: string
  selectedCount: number
}>()

defineEmits<{
  'navigate-back': []
  'toggle-search': []
  'update:search-query': [value: string]
  'clear-search': []
  'create-folder': []
  'upload-file': []
  'create-document': []
  'toggle-view-mode': []
  'navigate-to-breadcrumb': [index: number]
  'clear-selection': []
  'open-selected': []
  'rename-selected': []
  'download-selected': []
  'delete-selected': []
}>()

const searchInput = ref<HTMLInputElement>()

// Auto-focus search input when opened
watch(() => props.showSearch, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    searchInput.value?.focus()
  }
})
</script>

<style scoped>
.mobile-header {
  display: flex;
  flex-direction: column;
  background-color: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
}

.mobile-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  gap: 0.75rem;
}

.mobile-search-bar {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
}

.mobile-breadcrumbs {
  padding: 0.5rem 1rem;
  background-color: hsl(var(--muted) / 0.3);
}

.mobile-selection-bar {
  padding: 0.75rem 1rem;
  background-color: hsl(var(--primary) / 0.1);
  border-bottom: 1px solid hsl(var(--primary) / 0.2);
}

/* Custom scrollbar for breadcrumbs */
.overflow-x-auto::-webkit-scrollbar {
  height: 3px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}
</style>
