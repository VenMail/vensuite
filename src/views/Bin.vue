<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Trash Toolbar -->
    <TrashToolbar
      v-model:searchQuery="searchQuery"
      :filters="filters"
      @update:filters="(newFilters) => (filters = newFilters)"
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
                {{ item.file_type ?? (item.is_folder ? "Folder" : "Unknown") }}
              </p>
            </div>

            <!-- File Info -->
            <div class="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex justify-between items-center">
                <span>Size:</span>
                <span class="font-medium">{{ item.file_size ? formatFileSize(item.file_size) : "N/A" }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Deleted:</span>
                <span class="font-medium">{{ formatDate(item.updated_at) }}</span>
              </div>
              <div class="flex justify-center">
                <Badge variant="outline" class="text-xs">
                  {{ item.source }}
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
                  {{ item.file_type ?? (item.is_folder ? "Folder" : "Unknown") }}
                </p>
              </div>
            </div>

            <div class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex justify-between">
                <span>Source:</span>
                <span>{{ item.source }}</span>
              </div>
              <div class="flex justify-between">
                <span>Size:</span>
                <span>{{ item.file_size ? formatFileSize(item.file_size) : "N/A" }}</span>
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
                    {{ item.file_type ?? (item.is_folder ? "Folder" : "Unknown") }}
                  </Badge>
                </td>
                <td class="px-4 py-3">
                  <Badge :variant="item.source === 'Files' ? 'default' : 'outline'">
                    {{ item.source }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {{ item.file_size ? formatFileSize(item.file_size) : "N/A" }}
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
            <p class="text-gray-600 dark:text-gray-400">{{ selectedItemForDetails.file_type ?? (selectedItemForDetails.is_folder ? "Folder" : "Unknown") }}</p>
          </div>
          <div>
            <h4 class="font-medium text-gray-900 dark:text-gray-100">Source</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ selectedItemForDetails.source }}</p>
          </div>
          <div v-if="selectedItemForDetails.file_name">
            <h4 class="font-medium text-gray-900 dark:text-gray-100">Original Filename</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ selectedItemForDetails.file_name }}</p>
          </div>
          <div>
            <h4 class="font-medium text-gray-900 dark:text-gray-100">Size</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ selectedItemForDetails.file_size ? formatFileSize(selectedItemForDetails.file_size) : "N/A" }}</p>
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
  file_type?: string;
  file_name?: string;
  source: 'Files' | 'Forms';
  file_size?: string;
  updated_at: string;
  is_folder: boolean;
  folder_id?: string;
  mime_type?: string;
  file_url?: string;
}

const deletedItems = ref<DeletedItem[]>([]);
const loading = ref(false);
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

// API configuration - adjust these based on your setup
const API_BASE_URL = '/api/v1/app-files';
const authToken = ref(''); // Set this from your auth system

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

  // Search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.file_type ?? "").toLowerCase().includes(query) ||
        (item.file_name ?? "").toLowerCase().includes(query)
    );
  }

  // Filters
  if (filters.value.type && filters.value.type !== "all") {
    items = items.filter((item) => (item.file_type ?? "") === filters.value.type);
  }
  if (filters.value.source && filters.value.source !== "all") {
    items = items.filter((item) => item.source === filters.value.source);
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
        aVal = (a.file_type ?? "").toLowerCase();
        bVal = (b.file_type ?? "").toLowerCase();
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
const allSources = computed(() => [...new Set(deletedItems.value.map((i) => i.source))]);
const allTypes = computed(() => [
  ...new Set(
    deletedItems.value.map((i) => i.file_type).filter((t): t is string => t != null)
  ),
]);

const handleBulkAction = (action: "restore" | "delete") => {
  bulkAction.value = action;
  showBulkConfirm.value = true;
};

// Utility functions
function formatDate(dateString: string): string {
  return new Date(dateString).toISOString().split('T')[0];
}

function formatFileSize(bytes: number | string): string {
  if (!bytes) return 'N/A';
  const size = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

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

function openDetails(item: DeletedItem) {
  selectedItemForDetails.value = item;
  showDetailsDialog.value = true;
}

async function fetchTrashItems() {
  try {
    loading.value = true;
    const response = await fetch(`${API_BASE_URL}/trash`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    deletedItems.value = (data.data || []).map((item: DeletedItem) => ({
      ...item,
      source: 'Files' as const,
    }));
  } catch (error) {
    console.error('Failed to fetch trash items:', error);
    toast.error('Failed to load trash items');
  } finally {
    loading.value = false;
  }
}

async function restoreItem(id: string) {
  try {
    loading.value = true;
    const response = await fetch(`${API_BASE_URL}/${id}/restore`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const item = deletedItems.value.find((i) => i.id === id);
    if (item) {
      toast.success(`Restored ${item.title}`);
      deletedItems.value = deletedItems.value.filter((i) => i.id !== id);
    }
    selectedItems.value.delete(id);
  } catch (error) {
    console.error('Failed to restore item:', error);
    toast.error('Failed to restore item');
  } finally {
    loading.value = false;
  }
}

async function deletePermanently(id: string) {
  try {
    loading.value = true;
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const item = deletedItems.value.find((i) => i.id === id);
    if (item) {
      toast.success(`Permanently deleted ${item.title}`);
      deletedItems.value = deletedItems.value.filter((i) => i.id !== id);
    }
    selectedItems.value.delete(id);
  } catch (error) {
    console.error('Failed to delete item permanently:', error);
    toast.error('Failed to delete item permanently');
  } finally {
    loading.value = false;
  }
}

function emptyBin() {
  if (deletedItems.value.length > 0) {
    showEmptyConfirm.value = true;
  } else {
    toast.info('Trash is already empty');
  }
}

async function confirmEmptyBin() {
  try {
    loading.value = true;
    const promises = deletedItems.value.map((item) =>
      fetch(`${API_BASE_URL}/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken.value}`,
        },
      })
    );
    await Promise.all(promises);
    deletedItems.value = [];
    selectedItems.value.clear();
    showEmptyConfirm.value = false;
    toast.success("Bin emptied successfully");
  } catch (error) {
    console.error('Failed to empty bin:', error);
    toast.error('Failed to empty bin');
  } finally {
    loading.value = false;
  }
}

async function performBulkAction() {
  try {
    loading.value = true;
    const itemIds = Array.from(selectedItems.value);
    const promises = itemIds.map((id) => {
      if (bulkAction.value === "restore") {
        return fetch(`${API_BASE_URL}/${id}/restore`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken.value}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        return fetch(`${API_BASE_URL}/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken.value}`,
          },
        });
      }
    });
    await Promise.all(promises);
    toast.success(`${bulkAction.value === "restore" ? "Restored" : "Permanently deleted"} ${itemIds.length} items`);
    deletedItems.value = deletedItems.value.filter((item) => !itemIds.includes(item.id));
    selectedItems.value.clear();
    showBulkConfirm.value = false;
  } catch (error) {
    console.error('Failed to perform bulk action:', error);
    toast.error('Failed to perform bulk action');
  } finally {
    loading.value = false;
  }
}

function downloadItem(item: DeletedItem) {
  if (!item.file_url || item.is_folder) {
    toast.error('Cannot download this item');
    return;
  }
  window.open(`${API_BASE_URL}/${item.id}/download`, '_blank');
  toast.success(`Downloaded ${item.title}`);
}

function previewItem(item: DeletedItem) {
  if (item.file_url && !item.is_folder) {
    window.open(item.file_url, '_blank');
  } else {
    toast.info('Preview not available for this item');
  }
}

onMounted(() => {
  fetchTrashItems();
});
</script>