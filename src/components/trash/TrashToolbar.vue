<!-- TrashToolbar.vue -->
<template>
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
    <!-- Left Side: Search and Filters -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
      <!-- Search Input -->
      <div class="relative flex-1 min-w-0 max-w-sm">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          :modelValue="searchQuery"
          @update:modelValue="handleSearchUpdate"
          placeholder="Search trash items..."
          class="pl-10 pr-4"
        />
      </div>

      <!-- Type Filter -->
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" class="shrink-0">
            <Filter class="h-4 w-4 mr-2" />
            {{ filters.type === 'all' || !filters.type ? 'All Types' : filters.type }}
            <ChevronDown class="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @click="updateFilters({ ...filters, type: 'all' })">
            <FileIcon class="h-4 w-4 mr-2" />
            All Types
          </DropdownMenuItem>
          <DropdownMenuItem v-for="type in allTypes" :key="type" @click="updateFilters({ ...filters, type })">
            <FileType class="h-4 w-4 mr-2" />
            {{ type }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Source Filter -->
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" class="shrink-0">
            <Filter class="h-4 w-4 mr-2" />
            {{ filters.source === 'all' || !filters.source ? 'All Sources' : filters.source }}
            <ChevronDown class="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @click="updateFilters({ ...filters, source: 'all' })">
            <FileIcon class="h-4 w-4 mr-2" />
            All Sources
          </DropdownMenuItem>
          <DropdownMenuItem v-for="source in allSources" :key="source" @click="updateFilters({ ...filters, source })">
            <FolderIcon class="h-4 w-4 mr-2" />
            {{ source }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Sort Options -->
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" class="shrink-0">
            <ArrowUpDown class="h-4 w-4 mr-2" />
            Sort
            <ChevronDown class="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @click="updateSortValue('title-asc')">
            <AlphabetAsc class="h-4 w-4 mr-2" />
            Name (A-Z)
          </DropdownMenuItem>
          <DropdownMenuItem @click="updateSortValue('title-desc')">
            <AlphabetDesc class="h-4 w-4 mr-2" />
            Name (Z-A)
          </DropdownMenuItem>
          <DropdownMenuItem @click="updateSortValue('updated_at-desc')">
            <Calendar class="h-4 w-4 mr-2" />
            Deleted (Newest)
          </DropdownMenuItem>
          <DropdownMenuItem @click="updateSortValue('updated_at-asc')">
            <Calendar class="h-4 w-4 mr-2" />
            Deleted (Oldest)
          </DropdownMenuItem>
          <DropdownMenuItem @click="updateSortValue('file_type-asc')">
            <FileType class="h-4 w-4 mr-2" />
            Type
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Right Side: View Controls and Actions -->
    <div class="flex items-center gap-3">
      <!-- View Mode Toggle -->
      <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'px-3 py-2',
            viewMode === 'thumbnail' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
          )"
          @click="$emit('update:viewMode', 'thumbnail')"
        >
          <Grid class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'px-3 py-2',
            viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
          )"
          @click="$emit('update:viewMode', 'grid')"
        >
          <LayoutGrid class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'px-3 py-2',
            viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
          )"
          @click="$emit('update:viewMode', 'list')"
        >
          <LayoutList class="h-4 w-4" />
        </Button>
      </div>

      <!-- Bulk Actions (shown when items are selected) -->
      <div v-if="hasSelection" class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="$emit('clearSelection')">
          Clear
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {{ selectedCount }} selected
              <ChevronDown class="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem @click="$emit('bulkAction', 'restore')">
              <RefreshCw class="h-4 w-4 mr-2" />
              Restore Selected
            </DropdownMenuItem>
            <DropdownMenuItem 
              @click="$emit('bulkAction', 'delete')"
              class="text-destructive focus:text-destructive"
            >
              <Trash2 class="h-4 w-4 mr-2" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- Empty Bin Button -->
      <Button
        variant="outline"
        class="shrink-0 text-white bg-red-600 hover:bg-red-700 dark:text-white dark:bg-red-600 dark:hover:bg-red-700"
        @click="$emit('emptyBin')"
        :disabled="loading || deletedItemsLength === 0"
      >
        <Trash2 class="h-4 w-4 mr-2" />
        Empty Bin
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";
import {
  Filter,
  Search,
  ChevronDown,
  FileIcon,
  FileType,
  FolderIcon,
  ArrowUpDown,
  Grid,
  LayoutGrid,
  LayoutList,
  RefreshCw,
  Trash2,
  Calendar,
} from "lucide-vue-next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import { cn } from "@/lib/utils";

// Create simple icons for alphabetical sorting
const AlphabetAsc = FileType;
const AlphabetDesc = FileType;

const props = defineProps<{
  searchQuery: string;
  filters: { type: string; source: string };
  sortValue: string;
  viewMode: "thumbnail" | "list" | "grid";
  hasSelection: boolean;
  selectedCount: number;
  allTypes: string[];
  allSources: string[];
  loading: boolean;
  deletedItemsLength: number;
}>();

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'update:filters': [value: { type: string; source: string }]
  'update:sortValue': [value: string]
  'update:viewMode': [value: "thumbnail" | "list" | "grid"]
  clearSelection: []
  bulkAction: [action: "restore" | "delete"]
  emptyBin: []
}>();

const handleSearchUpdate = (payload: string | number) => {
  emit('update:searchQuery', String(payload));
};

const updateFilters = (newFilters: { type: string; source: string }) => {
  emit('update:filters', newFilters);
};

const updateSortValue = (value: string) => {
  emit('update:sortValue', value);
};
</script>