import { ref } from 'vue';
import { useFormStore } from '@/store/forms';
import { useFormTemplates } from './useFormTemplates';
import { router } from '@/main';

export const useFormWizard = () => {
  const formStore = useFormStore();
  const { storeTemplateData } = useFormTemplates();

  const showWizard = ref(false);
  const wizardPreset = ref('');

  const normalizeOption = (option: any, index: number) => {
    if (typeof option === 'string') {
      const value = option.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `option-${index + 1}`;
      return { value, label: option };
    }
    const value = option?.value || option?.label || `option-${index + 1}`;
    const label = option?.label || option?.value || `Option ${index + 1}`;
    return { value, label };
  };

  const mapType = (type: string | undefined): string => {
    switch (type) {
      case 'dropdown':
        return 'select';
      case 'toggle':
        return 'yesno';
      default:
        return type || 'short';
    }
  };

  const mapCategory = (type: string): string => {
    const categoryMap: Record<string, string> = {
      radio: 'choice',
      select: 'choice',
      dropdown: 'choice',
      checkbox: 'choices',
      yesno: 'switch',
      rating: 'rating',
      slider: 'choice',
      range: 'choice',
      file: 'file',
    };
    return categoryMap[type] || 'text';
  };

  const buildQuestionPayload = (block: any, index: number, pageId: string) => {
    const id = block.id || crypto.randomUUID();
    const type = mapType(block.type);
    const category = block.category || mapCategory(type);

    const base: any = {
      id,
      page_id: pageId,
      position: index,
      type,
      category,
      question: block.question || 'Untitled question',
      description: block.description ?? '',
      placeholder: block.placeholder ?? '',
      required: Boolean(block.required),
    };

    if (category === 'choice' || category === 'choices' || category === 'switch') {
      const rawOptions = block.options && block.options.length ? block.options : type === 'yesno'
        ? ['Yes', 'No']
        : ['Option 1', 'Option 2'];
      base.options = rawOptions.map((opt: any, optIndex: number) => normalizeOption(opt, optIndex));
    }

    if (type === 'rating') {
      base.icon_type = block.iconType || 'star';
      base.min = typeof block.min === 'number' ? block.min : 1;
      base.max = typeof block.max === 'number' ? block.max : 5;
      base.allow_half = Boolean(block.allowHalf);
    }

    if (type === 'slider' || type === 'range') {
      base.min = typeof block.min === 'number' ? block.min : 0;
      base.max = typeof block.max === 'number' ? block.max : 10;
      base.step = typeof block.step === 'number' && block.step > 0 ? block.step : 1;
      base.show_labels = Boolean(block.showLabels);
      if (block.options?.length) {
        base.options = block.options.map((opt: any, optIndex: number) => normalizeOption(opt, optIndex));
      }
    }

    return base;
  };

  const handleWizardCreate = async (data: { title: string; description: string; blocks: any[] }) => {
    let pageId: string = crypto.randomUUID();

    const questions = data.blocks.map((block, index) => buildQuestionPayload(block, index, pageId));

    let pagePayload = {
      id: pageId,
      title: 'Page 1',
      description: data.description,
      position: 1,
      question_order: questions.map(q => q.id),
    };

    const form = await formStore.createForm({
      title: data.title,
      description: data.description,
      pages: [pagePayload],
      logic_rules: [],
    });

    if (form?.id) {
      const persistedPageId = form.pages?.[0]?.id ?? pageId;
      if (persistedPageId !== pageId) {
        pageId = persistedPageId;
        pagePayload = {
          ...pagePayload,
          id: persistedPageId,
          description: data.description,
          title: form.pages?.[0]?.title || pagePayload.title,
        };
        questions.forEach((question) => {
          question.page_id = persistedPageId;
        });
      }

      const needsBackfill = !form.questions || form.questions.length === 0;

      if (needsBackfill) {
        storeTemplateData(form.id, {
          title: data.title,
          description: data.description,
          blocks: data.blocks,
        });

        await formStore.updateForm(form.id, {
          title: data.title,
          description: data.description,
          layout_mode: form.layout_mode ?? 'auto',
          pages: [pagePayload],
          questions,
          logic_rules: [],
          settings: form.settings,
          header: form.header,
          typography: form.typography,
          theme: form.theme,
          navigation: form.navigation,
          welcome_screen: form.welcome_screen,
          completion_screen: form.completion_screen,
          sharing: form.sharing,
          security: form.security,
          payment: form.payment,
        });
      }

      showWizard.value = false;
      router.replace({ name: 'form-edit', params: { id: form.id } });
    }
  };

  const handleWizardCreateBlank = async () => {
    const form = await formStore.createForm({ 
      title: 'Blank Form',
      pages: [
        {
          id: crypto.randomUUID(),
          title: 'Untitled page',
          position: 1,
          question_order: [],
        }
      ],
      logic_rules: [],
    });
    
    if (form?.id) {
      showWizard.value = false;
      router.replace({ name: 'form-edit', params: { id: form.id } });
    }
  };

  const openWizard = (preset?: string) => {
    wizardPreset.value = preset || '';
    showWizard.value = true;
  };

  const closeWizard = () => {
    showWizard.value = false;
    wizardPreset.value = '';
  };

  return {
    showWizard,
    wizardPreset,
    handleWizardCreate,
    handleWizardCreateBlank,
    openWizard,
    closeWizard,
  };
};
