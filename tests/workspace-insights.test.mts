import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeWorkspaceFiles } from '../src/lib/workspaceInsights.ts';

test('summarizes files, documents, and spreadsheets without counting folders as files', () => {
  const summary = summarizeWorkspaceFiles([
    { is_folder: true, file_type: 'folder' },
    { is_folder: false, file_type: 'docx' },
    { is_folder: false, file_type: 'pdf' },
    { is_folder: false, file_type: 'xlsx' },
    { is_folder: false, file_type: 'png' },
  ]);

  assert.deepEqual(summary, { files: 4, documents: 2, sheets: 1 });
});
