<template>
  <div class="mobile-bottom-nav">
    <!-- Floating Action Button (FAB) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-75"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-75"
    >
      <div
        v-if="showFab"
        class="fab-container"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              class="fab-button shadow-lg hover:shadow-xl transition-shadow"
              @click="$emit('fab-click')"
            >
              <Plus class="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="fab-dropdown">
            <!-- Expand Icon at Top -->
            <div class="fab-dropdown-header">
              <Button
                variant="ghost"
                size="sm"
                class="w-full justify-start h-8 px-2"
                @click="$emit('expand-all')"
              >
                <Expand class="h-4 w-4 mr-2" />
                Expand All
              </Button>
              <DropdownMenuSeparator />
            </div>
            <DropdownMenuItem @click="$emit('create-document')">
              <FileText class="h-4 w-4 mr-2" />
              Document
            </DropdownMenuItem>
            <DropdownMenuItem @click="$emit('create-spreadsheet')">
              <Grid3x3 class="h-4 w-4 mr-2" />
              Spreadsheet
            </DropdownMenuItem>
            <DropdownMenuItem @click="$emit('create-presentation')">
              <Presentation class="h-4 w-4 mr-2" />
              Presentation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="$emit('create-folder')">
              <FolderPlus class="h-4 w-4 mr-2" />
              {{$t('Commons.text.folder')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="$emit('upload-file')">
              <Upload class="h-4 w-4 mr-2" />
              Upload Files
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Transition>

    <!-- Bottom Navigation Bar -->
    <div class="bottom-nav-bar">
      <div class="nav-items">
        <!-- Files -->
        <Button
          variant="ghost"
          size="sm"
          :class="['nav-item', { 'nav-item-active': activeTab === 'files' }]"
          @click="$emit('navigate', 'files')"
        >
          <Files class="h-5 w-5" />
          <span class="nav-label">{{$t('Commons.text.files')}}</span>
        </Button>

        <!-- Recent -->
        <Button
          variant="ghost"
          size="sm"
          :class="['nav-item', { 'nav-item-active': activeTab === 'recent' }]"
          @click="$emit('navigate', 'recent')"
        >
          <Clock class="h-5 w-5" />
          <span class="nav-label">Recent</span>
        </Button>

        <!-- Search -->
        <Button
          variant="ghost"
          size="sm"
          :class="['nav-item', { 'nav-item-active': activeTab === 'search' }]"
          @click="$emit('navigate', 'search')"
        >
          <Search class="h-5 w-5" />
          <span class="nav-label">Search</span>
        </Button>

        <!-- Settings -->
        <Button
          variant="ghost"
          size="sm"
          :class="['nav-item', { 'nav-item-active': activeTab === 'settings' }]"
          @click="$emit('navigate', 'settings')"
        >
          <Settings class="h-5 w-5" />
          <span class="nav-label">{{$t('Commons.heading.settings')}}</span>
        </Button>
      </div>

      <!-- Safe Area Notch -->
      <div class="safe-area-notch"></div>
    </div>

    <!-- Selection Actions Bar (appears when items are selected) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div v-if="selectedCount > 0" class="selection-actions">
        <div class="selection-header">
          <div class="flex items-center justify-between">
            <span class="selection-count">{{ selectedCount }} selected</span>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              @click="$emit('clear-selection')"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div class="selection-actions-grid">
          <Button
            variant="ghost"
            size="sm"
            class="selection-action-btn"
            @click="$emit('open-selected')"
          >
            <FolderOpen class="h-5 w-5" />
            <span>{{$t('Commons.button.open')}}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            class="selection-action-btn"
            @click="$emit('share-selected')"
          >
            <Share2 class="h-5 w-5" />
            <span>{{$t('Commons.button.share')}}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            class="selection-action-btn"
            @click="$emit('download-selected')"
          >
            <Download class="h-5 w-5" />
            <span>{{$t('Commons.button.download')}}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            class="selection-action-btn text-destructive"
            @click="$emit('delete-selected')"
          >
            <Trash2 class="h-5 w-5" />
            <span>{{$t('Commons.button.delete')}}</span>
          </Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { Plus, FileText, Grid3x3, Presentation, FolderPlus, Upload, Files, Clock, Search, Settings, X, FolderOpen, Share2, Download, Trash2, Expand } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

defineProps<{
  showFab: boolean
  activeTab: 'files' | 'recent' | 'search' | 'settings'
  selectedCount: number
}>()

defineEmits<{
  'fab-click': []
  'create-document': []
  'create-spreadsheet': []
  'create-presentation': []
  'create-folder': []
  'upload-file': []
  'navigate': [tab: 'files' | 'recent' | 'search' | 'settings']
  'expand-all': []
  'clear-selection': []
  'open-selected': []
  'share-selected': []
  'download-selected': []
  'delete-selected': []
}>()
</script>

<style scoped>
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

/* Floating Action Button */
.fab-container {
  position: absolute;
  bottom: 5rem;
  right: 1rem;
  pointer-events: auto;
}

.fab-button {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  transition: background-color 0.2s;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.fab-button:hover {
  background-color: hsl(var(--primary) / 0.9);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.fab-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab-dropdown {
  margin-bottom: 0.5rem;
}

.fab-dropdown-header {
  padding: 0.25rem 0;
}

/* Bottom Navigation Bar */
.bottom-nav-bar {
  background-color: hsl(var(--background));
  border-top: 1px solid hsl(var(--border));
  pointer-events: auto;
  /* Safe area support for iPhone X+ */
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-items {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0.5rem;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  transition: color 0.2s, background-color 0.2s;
  min-width: 60px;
  height: 4rem;
}

.nav-item-active {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.nav-label {
  font-size: 0.75rem;
  font-weight: 500;
}

/* Safe Area Notch for iPhone X+ */
.safe-area-notch {
  height: 1rem;
  background-color: hsl(var(--background));
}

/* Selection Actions */
.selection-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: hsl(var(--background));
  border-top: 1px solid hsl(var(--border));
  pointer-events: auto;
  /* Safe area support for iPhone X+ */
  padding-bottom: env(safe-area-inset-bottom);
}

.selection-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid hsl(var(--border));
}

.selection-count {
  font-size: 0.875rem;
  font-weight: 500;
}

.selection-actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.25rem;
  padding: 0.5rem;
}

.selection-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  border-radius: 0.5rem;
  height: auto;
  min-height: 60px;
}

.selection-action-btn span {
  font-size: 0.75rem;
}

/* Safe area inset support */
@supports (padding: max(0px)) {
  .bottom-nav-bar {
    padding-bottom: max(0px, env(safe-area-inset-bottom));
  }
  
  .selection-actions {
    padding-bottom: max(0px, env(safe-area-inset-bottom));
  }
}

/* Haptic feedback styles */
.nav-item:active,
.selection-action-btn:active,
.fab-button:active {
  transform: scale(0.95);
  transition: transform 0.1s;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .bottom-nav-bar {
    border-color: rgb(55 65 81);
  }
  
  .selection-actions {
    border-color: rgb(55 65 81);
  }
}
</style>
