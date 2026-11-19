import type { FormPage } from '@/types';
export function mapSavedFormIds(sent: FormPage[], saved: FormPage[]): {pages: Record<string, string>; questions: Record<string, string>};
