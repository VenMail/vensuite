import type { FormBlock } from '@/components/forms/blocks/types';
import type { FormTheme } from '@/types';
export interface PremiumFormTemplate {
  slug: string; name: string; subtitle: string; title: string; description: string;
  theme: FormTheme; blocks: Omit<FormBlock, 'id'>[];
}
export const premiumFormTemplates: PremiumFormTemplate[];
