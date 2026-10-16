export interface SuggestibleFile {
  id?: string;
  is_folder?: boolean;
  last_viewed?: string | Date | null;
  updated_at?: string | Date | null;
  created_at?: string | Date | null;
}

function activityTime(file: SuggestibleFile): number {
  const timestamp = file.last_viewed || file.updated_at || file.created_at;
  const value = timestamp ? new Date(timestamp).getTime() : 0;
  return Number.isNaN(value) ? 0 : value;
}

export function selectSuggestedFiles<T extends SuggestibleFile>(
  files: readonly T[],
  limit = 8,
): T[] {
  return files
    .filter((file) => !file.is_folder)
    .sort((a, b) => activityTime(b) - activityTime(a))
    .slice(0, limit);
}
