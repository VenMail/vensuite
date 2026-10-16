export interface WorkspaceInsightFile {
  is_folder?: boolean;
  file_type?: string | null;
}

export function summarizeWorkspaceFiles(files: readonly WorkspaceInsightFile[]) {
  const items = files.filter((file) => !file.is_folder);
  const documents = items.filter((file) =>
    ['doc', 'docx', 'txt', 'rtf', 'pdf'].includes((file.file_type || '').toLowerCase()),
  ).length;
  const sheets = items.filter((file) =>
    ['xls', 'xlsx', 'csv', 'ods'].includes((file.file_type || '').toLowerCase()),
  ).length;

  return { files: items.length, documents, sheets };
}
