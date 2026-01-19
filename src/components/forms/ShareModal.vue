<script setup lang="ts">
import { ref, computed } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Button from '@/components/ui/button/Button.vue';
import Input from '@/components/ui/input/Input.vue';
import { toast } from '@/components/ui/toast';
import { t } from '@/i18n';
import type { AppForm } from '@/types';

interface Props {
  isOpen: boolean;
  form: AppForm | null;
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isPublishingShare = ref(false);
const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin;

const computedShareLink = computed(() => {
  if (!props.form?.id) return '';
  
  const isPublished = props.form.status === 'published';
  const shareSlug = props.form.sharing?.share_slug;
  
  if (isPublished && shareSlug) {
    return `${SHARE_BASE_URL}/f/${shareSlug}`;
  }
  
  return `${SHARE_BASE_URL}/f/by-id/${props.form.id}`;
});

const shareHelperItems = computed(() => [
  {
    label: t('Commons.button.copy'),
    action: copyShareLink,
  },
  {
    label: t('components.forms.commons.button.open_new_tab'),
    action: openShareLink,
  },
]);

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(computedShareLink.value);
    toast({
      title: t('components.forms.views.forms.text.link_copied'),
      description: t('components.forms.views.forms.text.link_copied_description'),
    });
  } catch (error) {
    console.error('Failed to copy link:', error);
    toast({
      title: t('components.forms.commons.error.failed_to_copy'),
      description: t('components.forms.views.forms.text.manual_copy_required'),
      variant: 'destructive',
    });
  }
};

const openShareLink = () => {
  if (computedShareLink.value) {
    window.open(computedShareLink.value, '_blank');
  }
};

const handleShareLinkFocus = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement;
  target.select();
};

const closeModal = () => {
  emit('close');
};
</script>

<template>
  <Dialog :open="isOpen" @update:open="closeModal">
    <DialogContent class="w-full max-w-sm sm:max-w-lg mx-auto">
      <DialogHeader>
        <DialogTitle>{{ t('Commons.aria_label.share_form') }}</DialogTitle>
        <DialogDescription>
          {{ t('Views.Forms.heading.share_this_form_with') }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ t('Commons.label.share_link') }}
          </label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <Input
              :model-value="computedShareLink"
              readonly
              class="flex-1 font-mono text-xs sm:text-sm"
              @focus="handleShareLinkFocus"
            />
            <Button
              type="button"
              variant="outline"
              :disabled="!computedShareLink"
              @click="copyShareLink"
              class="text-xs sm:text-sm"
            >
              {{ t('Commons.button.copy') }}
            </Button>
          </div>
          <p class="text-xs text-slate-500">
            {{ t('Views.Forms.text.anyone_with_this_link') }}
          </p>
        </div>

        <div v-if="shareHelperItems.length" class="grid gap-2 sm:grid-cols-2">
          <Button
            v-for="item in shareHelperItems"
            :key="item.label"
            type="button"
            variant="outline"
            class="justify-start text-xs sm:text-sm"
            @click="item.action"
          >
            {{ item.label }}
          </Button>
        </div>

        <div v-if="isPublishingShare" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          {{ t('Views.Forms.text.publishing_form_to_generate') }}
        </div>
      </div>

      <DialogFooter class="flex gap-2">
        <DialogClose asChild>
          <Button type="button" variant="secondary" :disabled="isPublishingShare" class="text-xs sm:text-sm">
            {{ t('Commons.button.close') }}
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
