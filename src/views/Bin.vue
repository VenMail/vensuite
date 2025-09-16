<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  Trash2,
  RefreshCw,
  AlertCircle,
  LayoutList,
  LayoutGrid,
  Filter,
  Search,
  MoreVertical,
  Download,
  Eye,
  Loader2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Input from "@/components/ui/input/Input.vue";
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
  deletedAt: string;
  updated_at: string;
  is_folder: boolean;
  folder_id?: string;
  mime_type?: string;
  file_url?: string;
}

const deletedItems = ref<DeletedItem[]>([]);
const loading = ref(false);
const viewMode = ref<"list" | "grid">("list");
const selectedItems = ref<Set<string>>(new Set());
const searchQuery = ref("");
const filters = ref<{ type: string; source: string }>({ type: "", source: "" });
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

// API Helper Functions
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(authToken.value && { 'Authorization': `Bearer ${authToken.value}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Handle different error types gracefully
    let errorMessage = 'Unknown error';
    try {
      const errorText = await response.text();
      errorMessage = errorText || `HTTP ${response.status}`;
    } catch {
      errorMessage = `HTTP ${response.status}`;
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

async function fetchTrashItems() {
  loading.value = true;
  try {
    // Get all user files to find trash folder
    const userFiles = await apiRequest('');
    
    // Find the trash folder (marked with mime_type: 'application/vnd.trash' or title: 'Trash')
    const trashFolder = userFiles.data?.find((file: any) => 
      file.mime_type === 'application/vnd.trash' || file.title === 'Trash'
    );
    
    if (trashFolder) {
      // Get contents of trash folder using the show endpoint
      const trashContents = await apiRequest(`/${trashFolder.id}`);
      deletedItems.value = (trashContents.data || []).map((item: any) => ({
        ...item,
        deletedAt: formatDate(item.updated_at),
        source: item.is_folder ? 'Forms' : 'Files', // Adjust based on your logic
      }));
    } else {
      // No trash folder exists yet, so no items
      deletedItems.value = [];
    }
  } catch (error: any) {
    // Handle 404 gracefully - means no files exist yet or API not ready
    if (error.status === 404) {
      deletedItems.value = [];
      // Don't show error toast for 404 - just means no trash folder exists yet
      console.info('No trash folder found - trash is empty');
    } else {
      console.error('Failed to fetch trash items:', error);
      toast.error('Failed to load trash items');
      deletedItems.value = [];
    }
  } finally {
    loading.value = false;
  }
}

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

function toggleViewMode() {
  viewMode.value = viewMode.value === "list" ? "grid" : "list";
}

function setSort(field: "title" | "file_type" | "updated_at", dir: "asc" | "desc") {
  sortBy.value = field;
  sortDir.value = dir;
}

function openDetails(item: DeletedItem) {
  selectedItemForDetails.value = item;
  showDetailsDialog.value = true;
}

async function restoreItem(id: string) {
  try {
    loading.value = true;
    await apiRequest(`/${id}/restore`, { method: 'PATCH' });
    
    const item = deletedItems.value.find((i) => i.id === id);
    if (item) {
      toast.success(`Restored ${item.title}`);
      deletedItems.value = deletedItems.value.filter((i) => i.id !== id);
      selectedItems.value.delete(id);
    }
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
    await apiRequest(`/${id}`, { method: 'DELETE' });
    
    const item = deletedItems.value.find((i) => i.id === id);
    if (item) {
      toast.success(`Permanently deleted ${item.title}`);
      deletedItems.value = deletedItems.value.filter((i) => i.id !== id);
      selectedItems.value.delete(id);
    }
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
    
    // Delete all items in trash permanently
    const deletePromises = deletedItems.value.map(item => 
      apiRequest(`/${item.id}`, { method: 'DELETE' })
    );
    
    await Promise.allSettled(deletePromises);
    
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
    
    if (bulkAction.value === "restore") {
      const restorePromises = itemIds.map(id => 
        apiRequest(`/${id}/restore`, { method: 'PATCH' })
      );
      await Promise.allSettled(restorePromises);
      toast.success(`Restored ${itemIds.length} items`);
    } else {
      const deletePromises = itemIds.map(id => 
        apiRequest(`/${id}`, { method: 'DELETE' })
      );
      await Promise.allSettled(deletePromises);
      toast.success(`Permanently deleted ${itemIds.length} items`);
    }
    
    // Remove items from local state
    deletedItems.value = deletedItems.value.filter(item => !itemIds.includes(item.id));
    selectedItems.value.clear();
    showBulkConfirm.value = false;
  } catch (error) {
    console.error('Failed to perform bulk action:', error);
    toast.error('Failed to perform bulk action');
  } finally {
    loading.value = false;
  }
}

async function downloadItem(item: DeletedItem) {
  if (!item.file_url || item.is_folder) {
    toast.error('Cannot download this item');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/${item.id}/download`, {
      headers: {
        ...(authToken.value && { 'Authorization': `Bearer ${authToken.value}` }),
      },
    });
    
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = item.file_name || item.title || 'download';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success(`Downloaded ${item.title}`);
  } catch (error) {
    console.error('Failed to download item:', error);
    toast.error('Failed to download item');
  }
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

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold flex items-center">
        <Trash2 class="h-6 w-6 mr-2" />
        Trash
      </h1>
      <Button 
        variant="outline" 
        size="sm" 
        @click="fetchTrashItems"
        :disabled="loading"
      >
        <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': loading }]" />
        Refresh
      </Button>
    </div>

    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
      <!-- Header with actions, filters, etc. -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div class="flex items-center gap-2 flex-1">
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input v-model="searchQuery" placeholder="Search items..." class="pl-10" />
          </div>
          
          <Select v-model="filters.type">
            <SelectTrigger class="w-32">
              <Filter class="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem v-for="t in allTypes" :key="t" :value="t">{{ t }}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select v-model="filters.source">
            <SelectTrigger class="w-32">
              <Filter class="h-4 w-4 mr-2" />
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem v-for="s in allSources" :key="s" :value="s">{{ s }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="toggleViewMode">
            <LayoutList v-if="viewMode === 'grid'" class="h-4 w-4 mr-1" />
            <LayoutGrid v-else class="h-4 w-4 mr-1" />
            {{ viewMode === "grid" ? "List" : "Grid" }}
          </Button>
          
          <Select v-model="sortValue">
            <SelectTrigger class="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title-asc">Name (A-Z)</SelectItem>
              <SelectItem value="title-desc">Name (Z-A)</SelectItem>
              <SelectItem value="file_type-asc">Type (A-Z)</SelectItem>
              <SelectItem value="file_type-desc">Type (Z-A)</SelectItem>
              <SelectItem value="updated_at-desc">Deleted (Newest)</SelectItem>
              <SelectItem value="updated_at-asc">Deleted (Oldest)</SelectItem>
            </SelectContent>
          </Select>
          
          <div v-if="hasSelection" class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="clearSelection">Clear</Button>
            <Button variant="outline" size="sm" @click="selectAll">Select All</Button>
            <Select v-model="bulkAction">
              <SelectTrigger class="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restore">Restore</SelectItem>
                <SelectItem value="delete">Delete Permanently</SelectItem>
              </SelectContent>
            </Select>
            <Button
              :variant="bulkAction === 'restore' ? 'default' : 'destructive'"
              size="sm"
              @click="showBulkConfirm = true"
              :disabled="loading"
            >
              <Loader2 v-if="loading" class="h-4 w-4 mr-2 animate-spin" />
              {{ bulkAction === "restore" ? "Restore" : "Delete" }}
            </Button>
          </div>
          
          <Button
            variant="outline"
            class="text-white bg-orange-600 hover:bg-orange-700 dark:text-white dark:bg-orange-600 dark:hover:bg-orange-700 rounded-md"
            @click="emptyBin"
            :disabled="loading || deletedItems.length === 0"
          >
            <Loader2 v-if="loading" class="h-4 w-4 mr-2 animate-spin" />
            Empty Bin
          </Button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && deletedItems.length === 0" class="p-8 text-center">
        <Loader2 class="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
        <p class="text-gray-500">Loading trash items...</p>
      </div>

      <!-- List View (Table) -->
      <div v-else-if="viewMode === 'list'" class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="px-4 py-2 text-left text-gray-600 dark:text-gray-400">
                <Checkbox
                  :checked="selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0"
                  @checked-change="(checked: boolean) => checked ? selectAll() : clearSelection()"
                />
              </th>
              <th
                class="px-4 py-2 text-left text-gray-600 dark:text-gray-400 cursor-pointer hover:underline"
                @click="setSort('title', sortBy === 'title' && sortDir === 'asc' ? 'desc' : 'asc')"
              >
                Name
              </th>
              <th
                class="px-4 py-2 text-left text-gray-600 dark:text-gray-400 cursor-pointer hover:underline"
                @click="setSort('file_type', sortBy === 'file_type' && sortDir === 'asc' ? 'desc' : 'asc')"
              >
                Type
              </th>
              <th class="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Source</th>
              <th class="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Size</th>
              <th
                class="px-4 py-2 text-left text-gray-600 dark:text-gray-400 cursor-pointer hover:underline"
                @click="setSort('updated_at', sortBy === 'updated_at' && sortDir === 'asc' ? 'desc' : 'asc')"
              >
                Deleted At
              </th>
              <th class="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredAndSortedItems"
              :key="item.id"
              class="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <td class="px-4 py-2">
                <Checkbox
                  :checked="selectedItems.has(item.id)"
                  @checked-change="() => toggleSelection(item.id)"
                />
              </td>
              <td
                class="px-4 py-2 text-gray-900 dark:text-gray-100 cursor-pointer hover:underline"
                @click="openDetails(item)"
              >
                <div class="flex items-center">
                  <Trash2 v-if="item.is_folder" class="h-4 w-4 mr-2 text-gray-500" />
                  {{ item.title }}
                </div>
              </td>
              <td class="px-4 py-2 text-gray-900 dark:text-gray-100">
                <Badge variant="secondary">{{ item.file_type ?? (item.is_folder ? "Folder" : "Unknown") }}</Badge>
              </td>
              <td class="px-4 py-2 text-gray-900 dark:text-gray-100">
                <Badge :variant="item.source === 'Files' ? 'default' : 'outline'">{{ item.source }}</Badge>
              </td>
              <td class="px-4 py-2 text-gray-900 dark:text-gray-100">
                {{ item.file_size ? formatFileSize(item.file_size) : "N/A" }}
              </td>
              <td class="px-4 py-2 text-gray-900 dark:text-gray-100">
                {{ formatDate(item.updated_at) }}
              </td>
              <td class="px-4 py-2">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="sm">
                      <MoreVertical class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="restoreItem(item.id)" :disabled="loading">
                      <RefreshCw class="h-3 w-3 mr-2" />
                      Restore
                    </DropdownMenuItem>
                    <DropdownMenuItem v-if="!item.is_folder && item.file_url" @click="previewItem(item)">
                      <Eye class="h-3 w-3 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem v-if="!item.is_folder && item.file_url" @click="downloadItem(item)">
                      <Download class="h-3 w-3 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      @click="deletePermanently(item.id)"
                      class="text-destructive focus:text-destructive"
                      :disabled="loading"
                    >
                      <AlertCircle class="h-3 w-3 mr-2" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Grid View -->
      <div v-else class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="item in filteredAndSortedItems"
          :key="item.id"
          class="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md cursor-pointer relative"
          @click="openDetails(item)"
        >
          <div class="flex items-start">
            <Checkbox
              :checked="selectedItems.has(item.id)"
              @checked-change="() => toggleSelection(item.id)"
              class="mt-1"
              @click.stop
            />
            <div class="flex-1 ml-2">
              <h3 class="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Trash2 v-if="item.is_folder" class="h-4 w-4 mr-2 text-gray-500" />
                {{ item.title }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {{ item.file_type ?? (item.is_folder ? "Folder" : "Unknown") }} • {{ item.source }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Size: {{ item.file_size ? formatFileSize(item.file_size) : "N/A" }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Deleted: {{ formatDate(item.updated_at) }}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                variant="ghost"
                size="sm"
                class="absolute top-2 right-2 h-6 w-6 p-0"
                @click.stop
              >
                <MoreVertical class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click.stop="restoreItem(item.id)" :disabled="loading">
                <RefreshCw class="h-3 w-3 mr-2" />
                Restore
              </DropdownMenuItem>
              <DropdownMenuItem v-if="!item.is_folder && item.file_url" @click.stop="previewItem(item)">
                <Eye class="h-3 w-3 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem v-if="!item.is_folder && item.file_url" @click.stop="downloadItem(item)">
                <Download class="h-3 w-3 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                @click.stop="deletePermanently(item.id)"
                class="text-destructive focus:text-destructive"
                :disabled="loading"
              >
                <AlertCircle class="h-3 w-3 mr-2" />
                Delete Permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <!-- No items message -->
      <div
        v-if="!loading && filteredAndSortedItems.length === 0"
        class="p-8 text-center text-gray-500 dark:text-gray-400"
      >
        <Trash2 class="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p v-if="deletedItems.length === 0">Trash is empty</p>
        <p v-else>No items match your search criteria</p>
      </div>
    </div>

    <!-- Item Details Dialog -->
    <Dialog v-model:open="showDetailsDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Details: {{ selectedItemForDetails?.title }}</DialogTitle>
        </DialogHeader>
        <div v-if="selectedItemForDetails" class="space-y-4">
          <div>
            <h4 class="font-medium">Type</h4>
            <p>{{ selectedItemForDetails.file_type ?? (selectedItemForDetails.is_folder ? "Folder" : "Unknown") }}</p>
          </div>
          <div>
            <h4 class="font-medium">Source</h4>
            <p>{{ selectedItemForDetails.source }}</p>
          </div>
          <div v-if="selectedItemForDetails.file_name">
            <h4 class="font-medium">Original Filename</h4>
            <p>{{ selectedItemForDetails.file_name }}</p>
          </div>
          <div>
            <h4 class="font-medium">Size</h4>
            <p>{{ selectedItemForDetails.file_size ? formatFileSize(selectedItemForDetails.file_size) : "N/A" }}</p>
          </div>
          <div>
            <h4 class="font-medium">Deleted At</h4>
            <p>{{ formatDate(selectedItemForDetails.updated_at) }}</p>
          </div>
          <div v-if="selectedItemForDetails.mime_type">
            <h4 class="font-medium">MIME Type</h4>
            <p>{{ selectedItemForDetails.mime_type }}</p>
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
        <p>This will permanently delete all {{ deletedItems.length }} items in the trash. This action cannot be undone.</p>
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
        <p v-if="bulkAction === 'restore'">
          This will restore {{ selectedItems.size }} item(s) to their original location.
        </p>
        <p v-else>
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

<style scoped>
/* Optional: Add custom styles for enhanced UX */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Ensure proper table responsiveness */
@media (max-width: 768px) {
  .overflow-x-auto {
    font-size: 0.875rem;
  }
  
  .overflow-x-auto th,
  .overflow-x-auto td {
    padding: 0.5rem 0.25rem;
  }
}

/* Custom scrollbar for better UX */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>