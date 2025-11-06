<template>
  <div class="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
    <SlidesTitleBar
      :title="deckTitle"
      :is-saving="slidesStore.isSaving"
      :has-unsaved-changes="slidesStore.hasUnsavedChanges"
      :is-offline="isOffline"
      :last-saved-at="slidesStore.lastSavedAt"
      :share-link="shareLink"
      :privacy-type="privacyType"
      :share-members="shareMembers"
      @update:title="handleTitleChange"
      @manual-save="handleManualSave"
      @back="goBack"
      @copy-link="copyShareLink"
      @change-privacy="updateVisibility"
      @invite="handleInviteMember"
      @update-member="handleUpdateMember"
      @remove-member="handleRemoveMember"
    />

    <SlidesToolbar
      :pages="pages"
      :active-page-id="activePage?.id || null"
      :snap-settings="snapSettings"
      :is-saving="slidesStore.isSaving"
      :disabled="!activePage"
      :templates="slidesStore.templateSummaries"
      :selected-template-slug="slidesStore.selectedTemplateSlug"
      :selection="selectionState"
      :available-fonts="availableFonts"
      @change-template="handleChangeTemplate"
      @add-page="handleAddPage"
      @duplicate-page="handleDuplicatePage"
      @delete-page="handleDeletePage"
      @select-page="handleSelectPage"
      @move-page="handleMovePage"
      @update-snap-settings="handleSnapSettingsUpdate"
      @import-powerpoint="openPowerPointImport"
      @import-html="openHtmlImport"
      @export="handleExport"
      @change-font="handleToolbarChangeFont"
      @change-font-advanced="handleToolbarChangeFontAdvanced"
      @insert-chart="handleToolbarInsertChart"
    />

    <div class="flex flex-1 overflow-hidden">
      <SlidesOutline
        :pages="pages"
        :active-page-id="activePage?.id || null"
        :templates="slidesStore.templateSummaries"
        :selected-template-slug="slidesStore.selectedTemplateSlug"
        class="hidden w-60 border-r border-gray-200 bg-white/90 shadow-sm dark:border-gray-700 dark:bg-gray-800/90 lg:flex"
        @select="handleSelectPage"
        @duplicate="handleDuplicatePage"
        @delete="handleDeletePage"
        @move="handleMovePage"
        @add="handleAddPage"
        @change-template="handleChangeTemplate"
      />

      <div class="relative flex flex-1 flex-col overflow-hidden">
        <div class="flex-1 overflow-auto bg-slate-200 dark:bg-slate-950">
          <div class="mx-auto flex h-full w-full max-w-5xl items-center justify-center px-6 py-8">
            <div class="relative h-full w-full rounded-xl bg-white shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
              <SlideCanvas
                v-if="activePage"
                :scene="activePage.scene"
                :snap-settings="snapSettings"
                :disabled="slidesStore.importStatus.isImporting"
                :text-command="textCommand"
                :chart-command="chartCommand"
                :text-advanced-command="textAdvancedCommand"
                class="h-[720px] w-full"
                @update:scene="handleSceneUpdate"
                @thumbnail="handleThumbnailGenerated"
                @selection="handleSelection"
                @available-fonts="handleAvailableFonts"
              />
              <div v-else class="flex h-[720px] items-center justify-center text-gray-500 dark:text-gray-400">
                Select or add a slide to begin.
              </div>
            </div>
          </div>
        </div>
      </div>

      <SlidesInspector
        class="hidden w-72 border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 xl:flex"
        :snap-settings="snapSettings"
        :import-status="slidesStore.importStatus"
        :disabled="slidesStore.isSaving || slidesStore.importStatus.isImporting"
        @update-snap-settings="handleSnapSettingsUpdate"
        @import-powerpoint="openPowerPointImport"
        @import-html="openHtmlImport"
      />
    </div>

    <input ref="pptxInput" type="file" accept=".ppt,.pptx" class="hidden" @change="handlePowerPointFile" />
    <input ref="htmlInput" type="file" accept=".html,.htm" class="hidden" @change="handleHtmlFile" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import SlidesTitleBar from '@/components/slides/SlidesTitleBar.vue';
import SlidesToolbar from '@/components/slides/SlidesToolbar.vue';
import SlidesOutline from '@/components/slides/SlidesOutline.vue';
import SlidesInspector from '@/components/slides/SlidesInspector.vue';
import SlideCanvas from '@/components/slides/SlideCanvas.vue';
import { useSlidesStore } from '@/store/slides.ts';
import type { SlideDeckTemplate, SlideScene, SnapSettings } from '@/types/slides';
import { useFileStore } from '@/store/files';
import { toast } from 'vue-sonner';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
const slidesStore = useSlidesStore();
const fileStore = useFileStore();

const { pages, activePage, title, snapSettings } = storeToRefs(slidesStore);

type ShareMember = {
  email: string;
  permission: 'view' | 'comment' | 'edit';
  name?: string;
  avatarUrl?: string;
  status?: 'accepted' | 'pending' | 'declined';
};

const shareLink = ref<string>('');
const privacyType = ref<number>(7);
const shareMembers = ref<ShareMember[]>([]);
const isOffline = ref(!navigator.onLine);

const pptxInput = ref<HTMLInputElement | null>(null);
const htmlInput = ref<HTMLInputElement | null>(null);

const deckTitle = computed(() => title.value);
const deckId = computed(() => slidesStore.deckId);

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`;

const permToApi: Record<ShareMember['permission'], 'v' | 'c' | 'e'> = {
  view: 'v',
  comment: 'c',
  edit: 'e',
};

const apiToPerm: Record<'v' | 'c' | 'e', ShareMember['permission']> = {
  v: 'view',
  c: 'comment',
  e: 'edit',
};

const slideTemplateCache = new Map<string, SlideDeckTemplate>();
const slideTemplateLoaders = Object.fromEntries(
  Object.entries(
    import.meta.glob('@/assets/templates/*.json', {
      import: 'default',
      eager: false,
    })
  ).map(([path, loader]) => {
    const fileName = path.split('/').pop() ?? '';
    const templateKey = fileName.replace(/\.json$/, '');
    return [templateKey, loader as () => Promise<SlideDeckTemplate>];
  })
) as Record<string, () => Promise<SlideDeckTemplate>>;

function parseSharingInfoString(info?: string | null): ShareMember[] {
  if (!info || typeof info !== 'string') return [];
  return info
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [email, access] = pair.split(':').map((segment) => (segment || '').trim());
      if (!email || !access || !(access in apiToPerm)) return null;
      return { email, permission: apiToPerm[access as 'v' | 'c' | 'e'] } as ShareMember;
    })
    .filter((entry): entry is ShareMember => Boolean(entry));
}

function serializeSharingInfoString(members: ShareMember[]): string {
  return members.map((member) => `${member.email}:${permToApi[member.permission]}`).join(',');
}

function buildShareLink(id: string | null | undefined): string {
  if (!id) return '';
  return `${window.location.origin}/slides/${id}`;
}

async function bootstrapDeck() {
  const templateId = route.params.template as string | undefined;
  const deckId = route.params.deckId as string | undefined;

  if (route.name === 'slides-new') {
    await slidesStore.initNewDeck(templateId);
    return;
  }

  if (templateId && route.name === 'slides-template') {
    await slidesStore.initNewDeck(templateId);
    await loadTemplate(templateId);
    return;
  }

  if (deckId) {
    try {
      await slidesStore.loadDeckFromFileId(deckId);
      await hydrateSharing(deckId);
    } catch (error) {
      console.error(error);
      toast.error('Unable to load slide deck');
      await slidesStore.initNewDeck();
    }
  } else {
    await slidesStore.initNewDeck();
  }
}

async function hydrateSharing(id: string) {
  try {
    const file = (await fileStore.loadDocument(id, 'pptx')) as ((ReturnType<typeof fileStore.loadDocument> extends Promise<infer R> ? R : never) & {
      sharing_info?: string | null;
      privacy_type?: number | string;
    }) | null;
    if (file) {
      shareLink.value = file.file_url || buildShareLink(id);
      privacyType.value = Number(file.privacy_type ?? 7);
      shareMembers.value = parseSharingInfoString(file.sharing_info);
    }
  } catch (error) {
    console.warn('Failed to hydrate sharing details', error);
  }
}

async function loadTemplate(templateId: string) {
  try {
    if (slideTemplateCache.has(templateId)) {
      slidesStore.applyTemplate(slideTemplateCache.get(templateId)!, templateId);
      return;
    }

    const loader = slideTemplateLoaders[templateId];
    if (!loader) {
      console.warn(`Slide template not found: ${templateId}`);
      toast.error('Template unavailable, starting with blank deck.');
      return;
    }

    const template = await loader();
    slideTemplateCache.set(templateId, template);
    slidesStore.applyTemplate(template, templateId);
  } catch (error) {
    console.warn('Slide template load failed', error);
    toast.error('Template unavailable, starting with blank deck.');
  }
}

function handleTitleChange(value: string) {
  slidesStore.updateTitle(value);
  slidesStore.markDirty();
  slidesStore.scheduleAutosave();
}

function handleManualSave() {
  slidesStore.persistDeck().catch(() => toast.error('Failed to save deck'));
}

function goBack() {
  router.back();
}

function copyShareLink() {
  if (!shareLink.value) {
    toast.info('Share link not available yet');
    return;
  }
  navigator.clipboard.writeText(shareLink.value).then(() => toast.success('Share link copied'));
}

async function updateVisibility(value: number) {
  const idParam = deckId.value || (route.params.deckId as string | undefined);
  if (!idParam) {
    toast.info('Save the deck before adjusting visibility');
    return;
  }
  try {
    const response = await axios.patch(`${FILES_ENDPOINT}/${idParam}`, { privacy_type: value });
    if (response.data?.document) {
      privacyType.value = Number(response.data.document.privacy_type ?? value);
      toast.success('Visibility updated');
    } else {
      privacyType.value = value;
    }
  } catch (error) {
    console.error('Failed to update visibility', error);
    toast.error('Unable to update visibility');
  }
}

async function handleInviteMember(payload: { email: string; permission: ShareMember['permission']; note?: string }) {
  const idParam = deckId.value || (route.params.deckId as string | undefined);
  if (!idParam) {
    toast.info('Save the deck before inviting collaborators');
    return;
  }
  try {
    const updatedMembers = [...shareMembers.value.filter((member) => member.email !== payload.email), {
      email: payload.email,
      permission: payload.permission,
    }];
    const sharingInfo = serializeSharingInfoString(updatedMembers);
    const response = await axios.patch(`${FILES_ENDPOINT}/${idParam}`, { sharing_info: sharingInfo });
    if (response.data?.document) {
      shareMembers.value = parseSharingInfoString(response.data.document.sharing_info);
      toast.success('Collaborator added');
    } else {
      shareMembers.value = updatedMembers;
    }
  } catch (error) {
    console.error('Failed to invite collaborator', error);
    toast.error('Unable to invite collaborator');
  }
}

function handleUpdateMember(payload: { email: string; permission: ShareMember['permission'] }) {
  return handleInviteMember(payload);
}

async function handleRemoveMember(payload: { email: string }) {
  const idParam = deckId.value || (route.params.deckId as string | undefined);
  if (!idParam) {
    toast.info('Save the deck before removing collaborators');
    return;
  }
  try {
    const updatedMembers = shareMembers.value.filter((member) => member.email !== payload.email);
    const sharingInfo = serializeSharingInfoString(updatedMembers);
    const response = await axios.patch(`${FILES_ENDPOINT}/${idParam}`, { sharing_info: sharingInfo });
    if (response.data?.document) {
      shareMembers.value = parseSharingInfoString(response.data.document.sharing_info);
      toast.success('Collaborator removed');
    } else {
      shareMembers.value = updatedMembers;
    }
  } catch (error) {
    console.error('Failed to remove collaborator', error);
    toast.error('Unable to remove collaborator');
  }
}

function handleAddPage(templateSlug?: string) {
  slidesStore.addPage(templateSlug);
  slidesStore.scheduleAutosave();
}

function handleDuplicatePage(pageId?: string | null) {
  if (!pageId) return;
  slidesStore.duplicatePage(pageId);
  slidesStore.scheduleAutosave();
}

function handleDeletePage(pageId?: string | null) {
  if (!pageId) return;
  slidesStore.deletePage(pageId);
  slidesStore.scheduleAutosave();
}

function handleSelectPage(pageId?: string | null) {
  if (!pageId) return;
  slidesStore.setActivePage(pageId);
}

function handleMovePage(direction: 'up' | 'down', pageId?: string | null) {
  if (!pageId) return;
  slidesStore.movePage(pageId, direction);
  slidesStore.scheduleAutosave();
}

function handleChangeTemplate(slug: string) {
  slidesStore.setSelectedTemplate(slug);
}

function handleSceneUpdate(scene: SlideScene) {
  if (!activePage.value) return;
  slidesStore.updatePageScene(activePage.value.id, scene);
  slidesStore.scheduleAutosave();
}

function handleThumbnailGenerated(thumbnail: string | null) {
  if (!thumbnail || !activePage.value) return;
  slidesStore.setPageThumbnail(activePage.value.id, thumbnail);
}

// Selection-driven toolbar state and commands
const selectionState = ref<{ hasText: boolean; fontFamily?: number } | undefined>(undefined);
const textCommand = ref<{ seq: number; fontFamily?: number }>({ seq: 0 });
const chartCommand = ref<{ seq: number; type: 'bar' | 'line' | 'pie' }>({ seq: 0, type: 'bar' });
const textAdvancedCommand = ref<{ seq: number; name: string }>({ seq: 0, name: '' });
const availableFonts = ref<string[]>([]);

function handleSelection(payload: { hasText: boolean; fontFamily?: number }) {
  selectionState.value = payload;
}

function handleToolbarChangeFont(fontFamily: number) {
  textCommand.value = { seq: (textCommand.value.seq ?? 0) + 1, fontFamily };
}

function handleToolbarInsertChart(type: 'bar' | 'line' | 'pie') {
  chartCommand.value = { seq: (chartCommand.value.seq ?? 0) + 1, type } as any;
}

function handleAvailableFonts(list: string[]) {
  availableFonts.value = Array.isArray(list) ? Array.from(new Set(list)) : [];
}

function handleToolbarChangeFontAdvanced(name: string) {
  if (!name) return;
  textAdvancedCommand.value = { seq: (textAdvancedCommand.value.seq ?? 0) + 1, name } as any;
}

function openPowerPointImport() {
  pptxInput.value?.click();
}

function openHtmlImport() {
  htmlInput.value?.click();
}

async function handlePowerPointFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  await slidesStore.importPowerPoint(file).catch((error: unknown) => {
    console.error(error);
    toast.error('PowerPoint import failed');
  });
  input.value = '';
}

async function handleHtmlFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  await slidesStore.importHtml(file).catch((error: unknown) => {
    console.error(error);
    toast.error('HTML import failed');
  });
  input.value = '';
}

function handleSnapSettingsUpdate(settings: Partial<SnapSettings>) {
  slidesStore.updateSnapSettings(settings);
  slidesStore.scheduleAutosave();
}

function handleExport(format: 'pdf' | 'pptx' | 'images') {
  slidesStore.exportDeck(format).catch((err: unknown) => {
    console.error(err);
    toast.error('Export failed');
  });
}

watch(
  () => route.fullPath,
  () => {
    void bootstrapDeck();
  }
);

watch(
  () => deckId.value,
  (id) => {
    if (!id) return;
    shareLink.value = buildShareLink(id);
    void hydrateSharing(id);
  }
);

onMounted(() => {
  void bootstrapDeck();
  window.addEventListener('online', setOnline);
  window.addEventListener('offline', setOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', setOnline);
  window.removeEventListener('offline', setOffline);
});

function setOnline() {
  isOffline.value = false;
}

function setOffline() {
  isOffline.value = true;
}
</script>
