<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { signingApi, type SigningRequestSummary } from '@/services/signing';
import { toast } from '@/composables/useToast';
import { useAuthStore } from '@/store/auth';
import {
  FileText,
  Upload,
  Trash2,
  Send,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  PenTool,
  Download,
  Eye,
  UserRound,
} from 'lucide-vue-next';

const authStore = useAuthStore();
const currentUserEmail = computed(() => authStore.email || '');
const currentUserFullName = computed(() => {
  const first = authStore.firstName || '';
  const last = authStore.lastName || '';
  return (first + ' ' + last).trim() || currentUserEmail.value;
});

const requests = ref<SigningRequestSummary[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Upload dialog state
const showUploadDialog = ref(false);
const uploadFile = ref<File | null>(null);
const uploadName = ref('');
const uploadSigners = ref<Array<{ name: string; email: string }>>([
  { name: '', email: '' },
]);
const uploadMessage = ref('');
const isUploading = ref(false);
const signSelfMode = ref(false);
const isSigningSelf = ref(false);

// Send dialog state
const showSendDialog = ref(false);
const sendTarget = ref<SigningRequestSummary | null>(null);
const sendSigners = ref<Array<{ name: string; email: string }>>([]);
const isSending = ref(false);

// Delete confirmation
const deleteTarget = ref<SigningRequestSummary | null>(null);
const isDeleting = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const statusConfig: Record<string, { label: string; icon: typeof Clock; class: string }> = {
  draft: { label: 'Draft', icon: FileText, class: 'bg-gray-100 text-gray-600' },
  pending: { label: 'Pending', icon: Clock, class: 'bg-amber-100 text-amber-700' },
  partially_signed: { label: 'Partially Signed', icon: Clock, class: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', icon: CheckCircle2, class: 'bg-green-100 text-green-700' },
  declined: { label: 'Declined', icon: AlertCircle, class: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', icon: AlertCircle, class: 'bg-gray-100 text-gray-500' },
};

function getStatusConfig(status: string) {
  return statusConfig[status] || statusConfig.draft;
}

const sortedRequests = computed(() => {
  return [...requests.value].sort((a, b) => {
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate;
  });
});

const stats = computed(() => {
  const total = requests.value.length;
  const completed = requests.value.filter(r => r.status === 'completed').length;
  const pending = requests.value.filter(r => r.status === 'pending' || r.status === 'partially_signed').length;
  const draft = requests.value.filter(r => r.status === 'draft').length;
  return { total, completed, pending, draft };
});

async function fetchRequests() {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await signingApi.listSigningRequests(1, 50);
    requests.value = response.data;
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to load signing requests';
  } finally {
    isLoading.value = false;
  }
}

function openUploadDialog() {
  uploadFile.value = null;
  uploadName.value = '';
  uploadSigners.value = [{ name: '', email: '' }];
  uploadMessage.value = '';
  signSelfMode.value = false;
  showUploadDialog.value = true;
}

function toggleSignSelf() {
  signSelfMode.value = !signSelfMode.value;
  if (signSelfMode.value) {
    uploadSigners.value = [{
      name: currentUserFullName.value,
      email: currentUserEmail.value,
    }];
  } else {
    uploadSigners.value = [{ name: '', email: '' }];
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploadFile.value = file;
  if (!uploadName.value) {
    uploadName.value = file.name.replace(/\.[^.]+$/, '');
  }
}

function addSigner() {
  uploadSigners.value.push({ name: '', email: '' });
}

function removeSigner(index: number) {
  uploadSigners.value.splice(index, 1);
}

function addSendSigner() {
  sendSigners.value.push({ name: '', email: '' });
}

function removeSendSigner(index: number) {
  sendSigners.value.splice(index, 1);
}

async function handleUpload() {
  if (!uploadFile.value) {
    toast.error('Please select a document to upload');
    return;
  }
  if (!uploadName.value.trim()) {
    toast.error('Please enter a document name');
    return;
  }

  const validSigners = uploadSigners.value.filter(s => s.email.trim());
  if (validSigners.length === 0) {
    toast.error('At least one signer is required');
    return;
  }
  for (const s of validSigners) {
    if (!/^[^\s@]+@[^^\s@]+\.[^\s@]+$/.test(s.email)) {
      toast.error(`Invalid email: ${s.email}`);
      return;
    }
  }

  isUploading.value = true;
  try {
    const result = await signingApi.prepareSigningRequest({
      document: uploadFile.value,
      document_name: uploadName.value.trim(),
      signers: validSigners.map(s => ({ name: s.name.trim() || s.email.split('@')[0], email: s.email.trim() })),
      message: uploadMessage.value.trim() || undefined,
      send_email: false,
    });

    toast.success('Document uploaded. Opening editor...');
    showUploadDialog.value = false;

    // Open the signing editor in a new tab
    if (result.editor_url) {
      window.open(result.editor_url, '_blank');
    }

    // Refresh list
    await fetchRequests();
  } catch (e: any) {
    toast.error(e?.data?.message || 'Failed to upload document');
  } finally {
    isUploading.value = false;
  }
}

async function signSelf(req: SigningRequestSummary) {
  if (!currentUserEmail.value) {
    toast.error('Unable to determine your email. Please ensure you are logged in.');
    return;
  }

  isSigningSelf.value = true;
  try {
    // Ensure the current user is in the signers list
    const existingSigners = req.signers || [];
    const hasSelf = existingSigners.some(s => s.email === currentUserEmail.value);
    const signers = hasSelf
      ? existingSigners
      : [...existingSigners, { name: currentUserFullName.value, email: currentUserEmail.value }];

    // Send the request without emailing signers
    await signingApi.sendSigningRequest(
      req.id,
      signers.map(s => ({ name: s.name || s.email.split('@')[0], email: s.email })),
      false
    );

    // Get the signer URL for the current user
    const result = await signingApi.getSignerUrl(req.id, currentUserEmail.value);
    if (result.signing_url) {
      toast.success('Opening signing view...');
      window.open(result.signing_url, '_blank');
    } else {
      toast.error('Could not retrieve signing URL');
    }

    await fetchRequests();
  } catch (e: any) {
    toast.error(e?.data?.message || 'Failed to start self-signing');
  } finally {
    isSigningSelf.value = false;
  }
}

function openSendDialog(req: SigningRequestSummary) {
  sendTarget.value = req;
  sendSigners.value = (req.signers || []).map(s => ({
    name: s.name || '',
    email: s.email || '',
  }));
  if (sendSigners.value.length === 0) {
    sendSigners.value = [{ name: '', email: '' }];
  }
  showSendDialog.value = true;
}

async function handleSend() {
  if (!sendTarget.value) return;

  const validSigners = sendSigners.value.filter(s => s.email.trim());
  if (validSigners.length === 0) {
    toast.error('At least one signer is required');
    return;
  }
  for (const s of validSigners) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) {
      toast.error(`Invalid email: ${s.email}`);
      return;
    }
  }

  isSending.value = true;
  try {
    await signingApi.sendSigningRequest(
      sendTarget.value.id,
      validSigners.map(s => ({ name: s.name.trim() || s.email.split('@')[0], email: s.email.trim() })),
      true
    );
    toast.success('Signing invitations sent');
    showSendDialog.value = false;
    await fetchRequests();
  } catch (e: any) {
    toast.error(e?.data?.message || 'Failed to send signing request');
  } finally {
    isSending.value = false;
  }
}

async function handleDelete() {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  try {
    await signingApi.deleteSigningRequest(deleteTarget.value.id);
    toast.success('Signing request deleted');
    deleteTarget.value = null;
    await fetchRequests();
  } catch (e: any) {
    toast.error(e?.data?.message || 'Failed to delete');
  } finally {
    isDeleting.value = false;
  }
}

async function openEditor(req: SigningRequestSummary) {
  // For draft status, open the editor to place fields
  // The editor URL format: /signing/editor/:id?token=...
  // We need to get the editor URL from the backend — but we can construct it
  // since the backend prepare endpoint returns it. For existing drafts,
  // we'll open the route directly and the editor will fetch its own session.
  const editorUrl = `${window.location.origin}/signing/editor/${req.id}`;
  window.open(editorUrl, '_blank');
}

async function openSignerUrl(req: SigningRequestSummary) {
  try {
    const result = await signingApi.getSignerUrl(req.id);
    if (result.signing_url) {
      window.open(result.signing_url, '_blank');
    }
  } catch (e: any) {
    toast.error(e?.data?.message || 'Could not get signing URL');
  }
}

async function refreshStatus(req: SigningRequestSummary) {
  try {
    const updated = await signingApi.getSigningRequestStatus(req.id);
    const index = requests.value.findIndex(r => r.id === req.id);
    if (index >= 0) {
      requests.value[index] = updated;
    }
    toast.success('Status updated');
  } catch (e: any) {
    toast.error(e?.data?.message || 'Failed to refresh status');
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function signerStatusSummary(signers: SigningRequestSummary['signers']): string {
  if (!signers || signers.length === 0) return 'No signers';
  const completed = signers.filter(s => s.status === 'completed').length;
  const declined = signers.filter(s => s.status === 'declined').length;
  if (declined > 0) return `${declined} declined`;
  if (completed === signers.length) return 'All signed';
  return `${completed}/${signers.length} signed`;
}

onMounted(() => {
  fetchRequests();
});
</script>

<template>
  <div
    :class="[
      'h-full min-h-0 flex flex-col overflow-hidden text-gray-900 transition-colors duration-200',
      'bg-gradient-to-br from-gray-50 to-gray-100',
      'dark:bg-gradient-to-br dark:from-gray-900 to-gray-800'
    ]"
  >
    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <PenTool class="w-5 h-5 text-cyan-600" />
          Signing
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Upload, prepare, and track documents for signature
        </p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        @click="openUploadDialog"
      >
        <Upload class="w-4 h-4" />
        Upload Document
      </button>
    </header>

    <!-- Stats bar -->
    <div class="flex items-center gap-6 px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 shrink-0">
      <div class="flex items-center gap-2">
        <FileText class="w-4 h-4 text-gray-400" />
        <span class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ stats.total }} total</span>
      </div>
      <div class="flex items-center gap-2">
        <Clock class="w-4 h-4 text-amber-500" />
        <span class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ stats.pending }} pending</span>
      </div>
      <div class="flex items-center gap-2">
        <CheckCircle2 class="w-4 h-4 text-green-500" />
        <span class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ stats.completed }} completed</span>
      </div>
      <div class="flex items-center gap-2">
        <PenTool class="w-4 h-4 text-gray-400" />
        <span class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ stats.draft }} drafts</span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-h-0 overflow-auto p-6">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <Loader2 class="w-8 h-8 text-cyan-600 animate-spin" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-20">
        <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
        <p class="text-red-600 font-medium">{{ error }}</p>
        <button class="mt-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg" @click="fetchRequests">
          Try again
        </button>
      </div>

      <!-- Empty state -->
      <div v-else-if="sortedRequests.length === 0" class="flex flex-col items-center justify-center py-20">
        <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <PenTool class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">No documents yet</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm text-center">
          Upload a PDF or DOCX to start collecting signatures. You can add signing fields and invite signers.
        </p>
        <button
          class="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          @click="openUploadDialog"
        >
          <Upload class="w-4 h-4" />
          Upload your first document
        </button>
      </div>

      <!-- Request cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="req in sortedRequests"
          :key="req.id"
          class="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow p-5"
        >
          <!-- Status badge -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <FileText class="w-5 h-5 text-gray-400 shrink-0" />
              <h3 class="font-semibold text-gray-900 dark:text-white truncate text-sm" :title="req.document_name">
                {{ req.document_name }}
              </h3>
            </div>
            <span
              class="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              :class="getStatusConfig(req.status).class"
            >
              <component :is="getStatusConfig(req.status).icon" class="w-3 h-3" />
              {{ getStatusConfig(req.status).label }}
            </span>
          </div>

          <!-- Signers summary -->
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {{ signerStatusSummary(req.signers) }}
          </p>

          <!-- Signer emails -->
          <div v-if="req.signers && req.signers.length > 0" class="mb-3">
            <div
              v-for="(signer, i) in req.signers.slice(0, 3)"
              :key="i"
              class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 py-0.5"
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="{
                  'bg-green-500': signer.status === 'completed',
                  'bg-amber-500': signer.status === 'pending' || !signer.status,
                  'bg-red-500': signer.status === 'declined',
                }"
              />
              <span class="truncate">{{ signer.email }}</span>
            </div>
            <p v-if="req.signers.length > 3" class="text-xs text-gray-400 mt-0.5">
              +{{ req.signers.length - 3 }} more
            </p>
          </div>

          <!-- Date -->
          <p class="text-xs text-gray-400 mb-4">
            Created {{ formatDate(req.created_at) }}
          </p>

          <!-- Actions -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-if="req.status === 'draft'"
              class="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-400/20 transition"
              @click="openEditor(req)"
            >
              <PenTool class="w-3.5 h-3.5" />
              Edit Fields
            </button>
            <button
              v-if="req.status === 'draft'"
              class="inline-flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-400/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-400/20 transition"
              :disabled="isSigningSelf"
              @click="signSelf(req)"
            >
              <Loader2 v-if="isSigningSelf" class="w-3.5 h-3.5 animate-spin" />
              <UserRound v-else class="w-3.5 h-3.5" />
              Sign Myself
            </button>
            <button
              v-if="req.status === 'draft'"
              class="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-400/20 transition"
              @click="openSendDialog(req)"
            >
              <Send class="w-3.5 h-3.5" />
              Send
            </button>
            <button
              v-if="req.status === 'pending' || req.status === 'partially_signed'"
              class="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              @click="refreshStatus(req)"
            >
              <Eye class="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              v-if="req.status === 'pending' || req.status === 'partially_signed'"
              class="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              @click="openSignerUrl(req)"
            >
              <ExternalLink class="w-3.5 h-3.5" />
              Sign
            </button>
            <a
              v-if="req.signed_document_url"
              :href="req.signed_document_url"
              target="_blank"
              class="inline-flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-400/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-400/20 transition"
            >
              <Download class="w-3.5 h-3.5" />
              Download
            </a>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/20 transition ml-auto"
              @click="deleteTarget = req"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Dialog -->
    <Teleport to="body">
      <div
        v-if="showUploadDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showUploadDialog = false"
      >
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-900 dark:text-white">Upload Document for Signing</h3>
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="showUploadDialog = false">
              <span class="text-xl">&times;</span>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <!-- File input -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Document file</label>
              <div
                class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-cyan-400 transition"
                @click="fileInputRef?.click()"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  accept=".pdf,.docx,.doc"
                  class="hidden"
                  @change="handleFileSelect"
                />
                <Upload class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p v-if="!uploadFile" class="text-sm text-gray-500">Click to select a PDF or DOCX</p>
                <p v-else class="text-sm text-cyan-600 font-medium">{{ uploadFile.name }}</p>
              </div>
            </div>

            <!-- Document name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Document name</label>
              <input
                v-model="uploadName"
                type="text"
                placeholder="e.g. NDA with Acme Corp"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
              />
            </div>

            <!-- Sign myself toggle -->
            <div class="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
              <button
                type="button"
                class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
                :class="signSelfMode ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'"
                @click="toggleSignSelf"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5"
                  :class="signSelfMode ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
              <div class="flex items-center gap-1.5">
                <UserRound class="w-4 h-4 text-gray-400" />
                <span class="text-sm text-gray-600 dark:text-gray-300">Sign it myself</span>
              </div>
            </div>

            <!-- Signers (hidden in self-sign mode) -->
            <div v-if="!signSelfMode">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Signers</label>
              <div class="space-y-2">
                <div
                  v-for="(signer, i) in uploadSigners"
                  :key="i"
                  class="flex items-center gap-2"
                >
                  <input
                    v-model="signer.name"
                    type="text"
                    placeholder="Name"
                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    v-model="signer.email"
                    type="email"
                    placeholder="Email"
                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  />
                  <button
                    v-if="uploadSigners.length > 1"
                    class="text-red-400 hover:text-red-600 p-1"
                    @click="removeSigner(i)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                class="mt-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                @click="addSigner"
              >
                + Add signer
              </button>
            </div>

            <!-- Self-sign info -->
            <div v-if="signSelfMode" class="rounded-lg bg-green-50 dark:bg-green-400/10 border border-green-200 dark:border-green-400/20 p-3">
              <div class="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <UserRound class="w-4 h-4 shrink-0" />
                <span>You will be the only signer: <strong>{{ currentUserEmail }}</strong></span>
              </div>
              <p class="text-xs text-green-600 dark:text-green-400 mt-1">After uploading, place your fields in the editor, then sign directly.</p>
            </div>

            <!-- Message (only when sending to others) -->
            <div v-if="!signSelfMode">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message (optional)</label>
              <textarea
                v-model="uploadMessage"
                rows="2"
                placeholder="Add a note for the signers..."
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              @click="showUploadDialog = false"
            >
              Cancel
            </button>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isUploading || !uploadFile"
              @click="handleUpload"
            >
              <Loader2 v-if="isUploading" class="w-4 h-4 animate-spin" />
              <Upload v-else class="w-4 h-4" />
              {{ isUploading ? 'Uploading...' : (signSelfMode ? 'Upload & Prepare' : 'Upload & Prepare') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Send Dialog -->
    <Teleport to="body">
      <div
        v-if="showSendDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showSendDialog = false"
      >
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-900 dark:text-white">Send for Signature</h3>
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="showSendDialog = false">
              <span class="text-xl">&times;</span>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Sending <span class="font-medium text-gray-700 dark:text-gray-300">{{ sendTarget?.document_name }}</span>.
              Signers will receive an email invitation to sign.
            </p>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Signers</label>
              <div class="space-y-2">
                <div
                  v-for="(signer, i) in sendSigners"
                  :key="i"
                  class="flex items-center gap-2"
                >
                  <input
                    v-model="signer.name"
                    type="text"
                    placeholder="Name"
                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    v-model="signer.email"
                    type="email"
                    placeholder="Email"
                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  />
                  <button
                    v-if="sendSigners.length > 1"
                    class="text-red-400 hover:text-red-600 p-1"
                    @click="removeSendSigner(i)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                class="mt-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                @click="addSendSigner"
              >
                + Add signer
              </button>
            </div>
          </div>
          <div class="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              @click="showSendDialog = false"
            >
              Cancel
            </button>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isSending"
              @click="handleSend"
            >
              <Loader2 v-if="isSending" class="w-4 h-4 animate-spin" />
              <Send v-else class="w-4 h-4" />
              {{ isSending ? 'Sending...' : 'Send Invitations' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="deleteTarget = null"
      >
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
          <div class="p-5">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-400/10 flex items-center justify-center">
                <Trash2 class="w-5 h-5 text-red-600" />
              </div>
              <h3 class="font-semibold text-gray-900 dark:text-white">Delete signing request?</h3>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              "{{ deleteTarget.document_name }}" will be permanently deleted. This cannot be undone.
            </p>
          </div>
          <div class="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              @click="deleteTarget = null"
            >
              Cancel
            </button>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              :disabled="isDeleting"
              @click="handleDelete"
            >
              <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin" />
              <Trash2 v-else class="w-4 h-4" />
              {{ isDeleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
