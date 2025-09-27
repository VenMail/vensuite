<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Trash Toolbar -->
    <TrashToolbar
      v-model:searchQuery="searchQuery"
      :filters="filters"
      @update:filters="updateFilters"
      v-model:sortValue="sortValue"
      v-model:viewMode="viewMode"
      :hasSelection="hasSelection"
      :selectedCount="selectedItems.size"
      :allTypes="allTypes"
      :allSources="allSources"
      :loading="loading"
      :deletedItemsLength="deletedItems.length"
      @clearSelection="clearSelection"
      @bulkAction="handleBulkAction"
      @emptyBin="emptyBin"
    />

    <!-- Stats Bar -->
    <div class="px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center gap-6 text-gray-600 dark:text-gray-400">
          <span>{{ filteredAndSortedItems.length }} items</span>
          <span v-if="selectedItems.size > 0">{{ selectedItems.size }} selected</span>
        </div>
        <div class="flex items-center gap-2">
          <Badge v-if="filters.type && filters.type !== 'all'" variant="secondary">
            {{ filters.type.charAt(0).toUpperCase() + filters.type.slice(1) }}
          </Badge>
          <Badge v-if="filters.source && filters.source !== 'all'" variant="secondary">
            {{ filters.source }}
          </Badge>
          <Button
            v-if="selectedItems.size > 0"
            variant="ghost"
            size="sm"
            @click="clearSelection"
          >
            Clear selection
          </Button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading && deletedItems.length === 0" class="flex flex-col items-center justify-center h-full p-8">
        <Loader2 class="h-8 w-8 animate-spin mb-4 text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400">Loading trash items...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error && deletedItems.length === 0" class="flex flex-col items-center justify-center h-full p-8 text-center">
        <div class="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-6">
          <AlertCircle class="h-12 w-12 text-red-500" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Failed to load trash items
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          {{ error }}
        </p>
        <Button @click="fetchTrashedItems">
          Try Again
        </Button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!loading && filteredAndSortedItems.length === 0"
        class="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <div class="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <Trash2 class="h-12 w-12 text-gray-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {{ deletedItems.length === 0 ? 'Trash is empty' : 'No items found' }}
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          {{ deletedItems.length === 0 
            ? 'Deleted files will appear here.' 
            : 'Try adjusting your search or filters.' 
          }}
        </p>
        <Button v-if="deletedItems.length > 0" variant="outline" @click="clearFilters">
          Clear Filters
        </Button>
      </div>

      <!-- Content Views -->
      <div v-else class="h-full overflow-auto">
        <!-- Thumbnail View -->
        <div v-if="viewMode === 'thumbnail'" class="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div
            v-for="item in filteredAndSortedItems"
            :key="item.id"
            class="relative group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer"
            @click="openDetails(item)"
          >
            <!-- Top Controls -->
            <div class="flex items-center justify-between mb-3">
              <Checkbox
                :checked="selectedItems.has(item.id)"
                @update:checked="() => toggleSelection(item.id)"
                @click.stop
                class="bg-white/80 backdrop-blur-sm"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 bg-white/90 backdrop-blur-sm"
                    @click.stop
                  >
                    <MoreVertical class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click.stop="restoreItem(item.id)" :disabled="loading">
                    <RefreshCw class="h-4 w-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem v-if="!item.is_folder && item.file_url" @click.stop="previewItem(item)">
                    <Eye class="h-4 w-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem v-if="!item.is_folder && item.file_url" @click.stop="downloadItem(item)">
                    <Download class="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    @click.stop="deletePermanently(item.id)"
                    class="text-destructive focus:text-destructive"
                    :disabled="loading"
                  >
                    <AlertCircle class="h-4 w-4 mr-2" />
                    Delete Permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <!-- File Icon and Title -->
            <div class="flex flex-col items-center text-center mb-4">
              <div class="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center mb-3">
                <FolderIcon v-if="item.is_folder" class="h-8 w-8 text-blue-500" />
                <FileIcon v-else class="h-8 w-8 text-gray-500" />
              </div>
              <h3 class="font-medium text-gray-900 dark:text-gray-100 text-sm truncate w-full" :title="item.title">
                {{ item.title }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ getFileType(item) }}
              </p>
            </div>

            <!-- File Info -->
            <div class="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex justify-between items-center">
                <span>Size:</span>
                <span class="font-medium">{{ formatFileSize(item.file_size) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Deleted:</span>
                <span class="font-medium">{{ formatDate(item.updated_at) }}</span>
              </div>
              <div class="flex justify-center">
                <Badge variant="outline" class="text-xs">
                  {{ item.source || 'Files' }}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <!-- Grid View -->
        <div v-else-if="viewMode === 'grid'" class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div
            v-for="item in filteredAndSortedItems"
            :key="item.id"
            class="relative group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            @click="openDetails(item)"
          >
            <div class="flex items-start justify-between mb-3">
              <Checkbox
                :checked="selectedItems.has(item.id)"
                @update:checked="() => toggleSelection(item.id)"
                @click.stop
                class="mt-0.5"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    @click.stop
                  >
                    <MoreVertical class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click.stop="restoreItem(item.id)" :disabled="loading">
                    <RefreshCw class="h-4 w-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem v-if="!item.is_folder && item.file_url" @click.stop="previewItem(item)">
                    <Eye class="h-4 w-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem v-if="!item.is_folder && item.file_url" @click.stop="downloadItem(item)">
                    <Download class="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    @click.stop="deletePermanently(item.id)"
                    class="text-destructive focus:text-destructive"
                    :disabled="loading"
                  >
                    <AlertCircle class="h-4 w-4 mr-2" />
                    Delete Permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div class="flex items-center mb-2">
              <FolderIcon v-if="item.is_folder" class="h-8 w-8 text-gray-400 mr-3 flex-shrink-0" />
              <FileIcon v-else class="h-8 w-8 text-gray-400 mr-3 flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <h3 class="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {{ item.title }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {{ getFileType(item) }}
                </p>
              </div>
            </div>

            <div class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex justify-between">
                <span>Source:</span>
                <span>{{ item.source || 'Files' }}</span>
              </div>
              <div class="flex justify-between">
                <span>Size:</span>
                <span>{{ formatFileSize(item.file_size) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Deleted:</span>
                <span>{{ formatDate(item.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- List View (Table) -->
        <div v-else-if="viewMode === 'list'" class="overflow-x-auto">
          <table class="w-full">
            <thead class="sticky top-0 bg-white dark:bg-gray-900 z-10">
              <tr class="border-b border-gray-200 dark:border-gray-800">
                <th class="px-4 py-3 text-left">
                  <Checkbox
                    :checked="selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0"
                    @update:checked="(checked: boolean) => checked ? selectAll() : clearSelection()"
                  />
                </th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Name</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Source</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Size</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Deleted</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredAndSortedItems"
                :key="item.id"
                class="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="px-4 py-3">
                  <Checkbox
                    :checked="selectedItems.has(item.id)"
                    @update:checked="() => toggleSelection(item.id)"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center">
                    <FolderIcon v-if="item.is_folder" class="h-4 w-4 mr-3 text-gray-500 flex-shrink-0" />
                    <FileIcon v-else class="h-4 w-4 mr-3 text-gray-500 flex-shrink-0" />
                    <span class="text-gray-900 dark:text-gray-100 cursor-pointer hover:underline" @click="openDetails(item)">
                      {{ item.title }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <Badge variant="secondary">
                    {{ getFileType(item) }}
                  </Badge>
                </td>
                <td class="px-4 py-3">
                  <Badge :variant="(item.source || 'Files') === 'Files' ? 'default' : 'outline'">
                    {{ item.source || 'Files' }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {{ formatFileSize(item.file_size) }}
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {{ formatDate(item.updated_at) }}
                </td>
                <td class="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
                        <MoreVertical class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="restoreItem(item.id)" :disabled="loading">
                        <RefreshCw class="h-4 w-4 mr-2" />
                        Restore
                      </DropdownMenuItem>
                      <DropdownMenuItem v-if="!item.is_folder && item.file_url" @click="previewItem(item)">
                        <Eye class="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem v-if="!item.is_folder && item.file_url" @click="downloadItem(item)">
                        <Download class="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        @click="deletePermanently(item.id)"
                        class="text-destructive focus:text-destructive"
                        :disabled="loading"
                      >
                        <AlertCircle class="h-4 w-4 mr-2" />
                        Delete Permanently
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <Dialog v-model:open="showDetailsDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Details: {{ selectedItemForDetails?.title }}</DialogTitle>
        </DialogHeader>
        <div v-if="selectedItemForDetails" class="space-y-4">
          <div>
            <h4 class="font-medium text-gray-900 dark:text-gray-100">Type</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ getFileType(selectedItemForDetails) }}</p>
          </div>
          <div>
            <h4 class="font-medium text-gray-900 dark:text-gray-100">Source</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ selectedItemForDetails.source || 'Files' }}</p>
          </div>
          <div v-if="selectedItemForDetails.file_name">
            <h4 class="font-medium text-gray-900 dark:text-gray-100">Original Filename</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ selectedItemForDetails.file_name }}</p>
          </div>
          <div>
            <h4 class="font-medium text-gray-900 dark:text-gray-100">Size</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ formatFileSize(selectedItemForDetails.file_size) }}</p>
          </div>
          <div>
            <h4 class="font-medium text-gray-900 dark:text-gray-100">Deleted At</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ formatDate(selectedItemForDetails.updated_at) }}</p>
          </div>
          <div v-if="selectedItemForDetails.mime_type">
            <h4 class="font-medium text-gray-900 dark:text-gray-100">MIME Type</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ selectedItemForDetails.mime_type }}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDetailsDialog = false">Close</Button>
          <Button @click="restoreItem(selectedItemForDetails!.id); showDetailsDialog = false" :disabled="loading">
            <RefreshCw class="h-4 w-4 mr-2" />
            Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Empty Bin Confirm -->
    <Dialog v-model:open="showEmptyConfirm">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Empty Bin?</DialogTitle>
        </DialogHeader>
        <p class="text-gray-600 dark:text-gray-400">This will permanently delete all {{ deletedItems.length }} items in the trash. This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" @click="showEmptyConfirm = false" :disabled="loading">Cancel</Button>
          <Button variant="destructive" @click="confirmEmptyBin" :disabled="loading">
            <Loader2 v-if="loading" class="h-4 w-4 mr-2 animate-spin" />
            Empty Bin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Bulk Action Confirm -->
    <Dialog v-model:open="showBulkConfirm">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{
            bulkAction === "restore"
              ? "Restore Selected Items?"
              : "Delete Selected Items Permanently?"
          }}</DialogTitle>
        </DialogHeader>
        <p class="text-gray-600 dark:text-gray-400" v-if="bulkAction === 'restore'">
          This will restore {{ selectedItems.size }} item(s) to their original location.
        </p>
        <p class="text-gray-600 dark:text-gray-400" v-else>
          This will permanently delete {{ selectedItems.size }} item(s). This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" @click="showBulkConfirm = false" :disabled="loading">Cancel</Button>
          <Button
            :variant="bulkAction === 'restore' ? 'default' : 'destructive'"
            @click="performBulkAction"
            :disabled="loading"
          >
            <Loader2 v-if="loading" class="h-4 w-4 mr-2 animate-spin" />
            {{ bulkAction === "restore" ? "Restore" : "Delete" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import TrashToolbar from "@/components/trash/TrashToolbar.vue";
import {
  Trash2,
  RefreshCw,
  AlertCircle,
  MoreVertical,
  Download,
  Eye,
  Loader2,
  FileIcon,
  FolderIcon,
} from "lucide-vue-next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Button from "@/components/ui/button/Button.vue";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "vue-sonner";

interface DeletedItem {
  id: string;
  title: string;
  file_type?: number;
  file_name?: string;
  source?: string;
  file_size?: number;
  updated_at: string;
  is_folder: boolean;
  folder_id?: string;
  mime_type?: string;
  file_url?: string;
}

// State
const deletedItems = ref<DeletedItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const viewMode = ref<"thumbnail" | "list" | "grid">("thumbnail");
const selectedItems = ref<Set<string>>(new Set());
const searchQuery = ref("");
const filters = ref<{ type: string; source: string }>({ type: "all", source: "all" });
const sortBy = ref<"title" | "file_type" | "updated_at">("updated_at");
const sortDir = ref<"asc" | "desc">("desc");
const showDetailsDialog = ref(false);
const selectedItemForDetails = ref<DeletedItem | null>(null);
const showEmptyConfirm = ref(false);
const showBulkConfirm = ref(false);
const bulkAction = ref<"restore" | "delete">("restore");

// API Base URL
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/v1/app-files`;

// API Helper
async function apiCall(url: string, options: RequestInit = {}): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers,
      },
      credentials: 'same-origin',
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // Use default error message if parsing fails
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (err) {
    console.error('API call failed:', err);
    throw err;
  }
}

// Computed properties
const sortValue = computed({
  get: () => `${sortBy.value}-${sortDir.value}`,
  set: (val: string) => {
    const [by, dir] = val.split("-");
    if (by && dir) {
      sortBy.value = by as "title" | "file_type" | "updated_at";
      sortDir.value = dir as "asc" | "desc";
    }
  },
});

const filteredAndSortedItems = computed(() => {
  let items = [...deletedItems.value];

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.file_name || "").toLowerCase().includes(query) ||
        getFileType(item).toLowerCase().includes(query)
    );
  }

  // Type filter
  if (filters.value.type && filters.value.type !== "all") {
    items = items.filter((item) => {
      const fileType = getFileType(item).toLowerCase();
      return fileType.includes(filters.value.type.toLowerCase());
    });
  }

  // Source filter
  if (filters.value.source && filters.value.source !== "all") {
    items = items.filter((item) => (item.source || "Files") === filters.value.source);
  }

  // Sorting
  items.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    
    switch (sortBy.value) {
      case "title":
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case "file_type":
        aVal = getFileType(a).toLowerCase();
        bVal = getFileType(b).toLowerCase();
        break;
      case "updated_at":
        aVal = new Date(a.updated_at).getTime();
        bVal = new Date(b.updated_at).getTime();
        break;
      default:
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
    }
    
    if (aVal < bVal) return sortDir.value === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir.value === "asc" ? 1 : -1;
    return 0;
  });

  return items;
});

const hasSelection = computed(() => selectedItems.value.size > 0);

const allSources = computed(() => {
  const sources = [...new Set(deletedItems.value.map((i) => i.source || 'Files'))];
  return sources;
});

const allTypes = computed(() => {
  const types = [...new Set(deletedItems.value.map((i) => getFileType(i)))];
  return types.filter(type => type && type !== 'Unknown');
});

// Utility functions
function getFileType(item: DeletedItem): string {
  if (item.is_folder) return "Folder";
  
  if (item.file_name) {
    const ext = item.file_name.split('.').pop()?.toLowerCase();
    if (ext) return ext.toUpperCase();
  }
  
  if (item.mime_type) {
    const mimeMap: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/json': 'JSON',
      'text/plain': 'TXT',
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'application/zip': 'ZIP',
      'application/vnd.folder': 'Folder',
    };
    return mimeMap[item.mime_type] || 'Unknown';
  }
  
  return 'Unknown';
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Unknown';
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return 'N/A';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(1);
  
  return `${size} ${sizes[i]}`;
}

// Selection functions
function toggleSelection(id: string) {
  if (selectedItems.value.has(id)) {
    selectedItems.value.delete(id);
  } else {
    selectedItems.value.add(id);
  }
}

function selectAll() {
  filteredAndSortedItems.value.forEach((item) => selectedItems.value.add(item.id));
}

function clearSelection() {
  selectedItems.value.clear();
}

function clearFilters() {
  searchQuery.value = "";
  filters.value = { type: "all", source: "all" };
}

function updateFilters(newFilters: { type: string; source: string }) {
  filters.value = newFilters;
}

function openDetails(item: DeletedItem) {
  selectedItemForDetails.value = item;
  showDetailsDialog.value = true;
}

// API functions
async function fetchTrashedItems() {
  try {
    loading.value = true;
    error.value = null;
    
    const response = await apiCall(`${API_BASE_URL}/trash`);
    
    if (response.success && Array.isArray(response.data)) {
      deletedItems.value = response.data;
    } else {
      throw new Error(response.message || 'Failed to fetch trash items');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trash items';
    error.value = errorMessage;
    toast.error(errorMessage);
  } finally {
    loading.value = false;
  }
}

async function restoreItem(id: string) {
  try {
    loading.value = true;
    
    const response = await apiCall(`${API_BASE_URL}/${id}/restore`, {
      method: 'PATCH',
    });
    
    if (response.success) {
      const item = deletedItems.value.find((i) => i.id === id);
      toast.success(`Restored "${item?.title || 'item'}"`);
      
      // Remove from local state
      deletedItems.value = deletedItems.value.filter((i) => i.id !== id);
      selectedItems.value.delete(id);
    } else {
      throw new Error(response.message || 'Failed to restore item');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to restore item';
    toast.error(errorMessage);
  } finally {
    loading.value = false;
  }
}

async function deletePermanently(id: string) {
  try {
    loading.value = true;
    
    const response = await apiCall(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });
    
    if (response.success) {
      const item = deletedItems.value.find((i) => i.id === id);
      toast.success(`Permanently deleted "${item?.title || 'item'}"`);
      
      // Remove from local state
      deletedItems.value = deletedItems.value.filter((i) => i.id !== id);
      selectedItems.value.delete(id);
    } else {
      throw new Error(response.message || 'Failed to delete item permanently');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete item permanently';
    toast.error(errorMessage);
  } finally {
    loading.value = false;
  }
}

function emptyBin() {
  if (deletedItems.value.length === 0) {
    toast.info('Trash is already empty');
    return;
  }
  showEmptyConfirm.value = true;
}

async function confirmEmptyBin() {
  try {
    loading.value = true;
    
    // Get all item IDs to delete permanently
    const itemIds = deletedItems.value.map(item => item.id);
    
    if (itemIds.length === 0) {
      showEmptyConfirm.value = false;
      return;
    }

    // Delete each item permanently (parallel requests)
    const deletePromises = itemIds.map(id => 
      apiCall(`${API_BASE_URL}/${id}`, { method: 'DELETE' })
    );
    
    const results = await Promise.allSettled(deletePromises);
    
    // Count successful deletions
    let deletedCount = 0;
    let errors = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        deletedCount++;
      } else {
        errors++;
        console.error(`Failed to delete item ${itemIds[index]}:`, 
          result.status === 'rejected' ? result.reason : result.value);
      }
    });
    
    // Update UI
    deletedItems.value = [];
    selectedItems.value.clear();
    showEmptyConfirm.value = false;
    
    if (errors === 0) {
      toast.success(`Bin emptied successfully - ${deletedCount} items deleted`);
    } else {
      toast.warning(`Bin partially emptied - ${deletedCount} items deleted, ${errors} failed`);
    }
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to empty bin';
    toast.error(errorMessage);
  } finally {
    loading.value = false;
  }
}

function handleBulkAction(action: "restore" | "delete") {
  if (selectedItems.value.size === 0) {
    toast.info('No items selected');
    return;
  }
  
  bulkAction.value = action;
  showBulkConfirm.value = true;
}

async function performBulkAction() {
  try {
    loading.value = true;
    
    const itemIds = Array.from(selectedItems.value);
    if (itemIds.length === 0) {
      showBulkConfirm.value = false;
      return;
    }
    
    let promises: Promise<any>[];
    
    if (bulkAction.value === "restore") {
      promises = itemIds.map(id => 
        apiCall(`${API_BASE_URL}/${id}/restore`, { method: 'PATCH' })
      );
    } else {
      promises = itemIds.map(id => 
        apiCall(`${API_BASE_URL}/${id}`, { method: 'DELETE' })
      );
    }
    
    const results = await Promise.allSettled(promises);
    
    // Count successful operations
    let successCount = 0;
    let errors = 0;
    const successfulIds: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
        successfulIds.push(itemIds[index]);
      } else {
        errors++;
        console.error(`Failed to ${bulkAction.value} item ${itemIds[index]}:`, 
          result.status === 'rejected' ? result.reason : result.value);
      }
    });
    
    // Update UI - remove successful items from local state
    deletedItems.value = deletedItems.value.filter(item => !successfulIds.includes(item.id));
    selectedItems.value.clear();
    showBulkConfirm.value = false;
    
    const actionText = bulkAction.value === "restore" ? "restored" : "permanently deleted";
    
    if (errors === 0) {
      toast.success(`Successfully ${actionText} ${successCount} items`);
    } else {
      toast.warning(`${successCount} items ${actionText}, ${errors} failed`);
    }
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : `Failed to perform bulk ${bulkAction.value}`;
    toast.error(errorMessage);
  } finally {
    loading.value = false;
  }
}

function downloadItem(item: DeletedItem) {
  if (!item.file_url || item.is_folder) {
    toast.error('Cannot download this item');
    return;
  }
  
  try {
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/${item.id}/download`;
    link.download = item.file_name || item.title;
    link.target = '_blank';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Downloading "${item.title}"`);
  } catch (err) {
    toast.error('Failed to download file');
  }
}

function previewItem(item: DeletedItem) {
  if (!item.file_url || item.is_folder) {
    toast.info('Preview not available for this item');
    return;
  }
  
  try {
    // Open file URL in new tab for preview
    window.open(`${API_BASE_URL}/${item.id}/download`, '_blank');
  } catch (err) {
    toast.error('Failed to preview file');
  }
}

// Lifecycle
onMounted(() => {
  fetchTrashedItems();
});
</script>