import { computed } from 'vue';
import { t, setLocale, currentLocale } from '@/i18n';

export function useTranslation() {
  return {
    t,
    locale: computed(() => currentLocale.value),
    setLocale,
  };
}
