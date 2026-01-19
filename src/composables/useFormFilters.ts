import { ref, computed, watch } from 'vue';
import type { AppForm, FormDefinition } from '@/types';

export const useFormFilters = (forms: any[]) => {
  const searchValue = ref('');
  const debouncedSearch = ref('');
  const currentFilter = ref('all');
  const sortBy = ref('date');

  let debounceTimer: number | null = null;
  
  watch(searchValue, (newValue) => {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      debouncedSearch.value = newValue;
    }, 300) as unknown as number;
  });

  const computeFieldCount = (form: AppForm): number | null => {
    if (typeof form.question_count === 'number') {
      return form.question_count;
    }

    const definition = form.form as FormDefinition | undefined;
    if (!definition) return null;

    if (Array.isArray(definition.questions)) {
      return definition.questions.length;
    }

    if (Array.isArray(definition.pages)) {
      return definition.pages.reduce<number>((total, page) => {
        const pageQuestions = Array.isArray((page as any)?.questions) ? (page as any).questions.length : 0;
        const orderIds = Array.isArray(page?.question_order) ? page.question_order.length : 0;
        return total + Math.max(pageQuestions, orderIds);
      }, 0);
    }

    return null;
  };

  const computeResponseCount = (form: AppForm): number | null => {
    if (typeof form.response_count === 'number') return form.response_count;
    if (typeof form.responses?.length === 'number') return form.responses.length;

    return null;
  };

  const filteredForms = computed(() => {
    let formsList = forms;
    
    // Apply filter
    if (currentFilter.value !== 'all') {
      formsList = formsList.filter((form) => {
        const title = form.title?.toLowerCase() || '';
        const description = (form as any).description?.toLowerCase() || '';
        
        switch (currentFilter.value) {
          case 'contact':
            return title.includes('contact') || description.includes('contact');
          case 'feedback':
            return title.includes('feedback') || description.includes('feedback');
          case 'registration':
            return title.includes('registration') || description.includes('registration') || title.includes('signup');
          case 'survey':
            return title.includes('survey') || description.includes('survey');
          default:
            return true;
        }
      });
    }
    
    // Apply search
    const query = debouncedSearch.value.trim().toLowerCase();
    if (query) {
      formsList = formsList.filter((form) => 
        form.title?.toLowerCase().includes(query) ||
        (form as any).description?.toLowerCase().includes(query)
      );
    }
    
    return formsList;
  });

  const sortedForms = computed(() => {
    const formsList = [...filteredForms.value];
    
    switch (sortBy.value) {
      case 'name':
        return formsList.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'responses':
        return formsList.sort((a, b) => {
          const aResponses = computeResponseCount(a) || 0;
          const bResponses = computeResponseCount(b) || 0;
          return bResponses - aResponses;
        });
      case 'date':
      default:
        return formsList.sort((a, b) => {
          const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
          const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
          return bDate - aDate;
        });
    }
  });

  const formsSubtitle = computed(() => {
    switch (currentFilter.value) {
      case 'contact':
        return 'Contact forms';
      case 'feedback':
        return 'Feedback forms';
      case 'registration':
        return 'Registration forms';
      case 'survey':
        return 'Survey forms';
      default:
        return 'All forms';
    }
  });

  const setFilter = (filter: string) => {
    currentFilter.value = filter;
  };

  const setSortBy = (sort: string) => {
    sortBy.value = sort;
  };

  const clearFilters = () => {
    currentFilter.value = 'all';
    searchValue.value = '';
    debouncedSearch.value = '';
    sortBy.value = 'date';
  };

  return {
    searchValue,
    debouncedSearch,
    currentFilter,
    sortBy,
    filteredForms,
    sortedForms,
    formsSubtitle,
    computeFieldCount,
    computeResponseCount,
    setFilter,
    setSortBy,
    clearFilters,
  };
};
