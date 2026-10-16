import assert from 'node:assert/strict';
import test from 'node:test';

import { selectSuggestedFiles } from '../src/lib/fileSuggestions.ts';

test('uses recent non-folder files and caps the suggestion rail', () => {
  const suggestions = selectSuggestedFiles([
    { id: 'folder', is_folder: true, updated_at: '2026-10-16T10:00:00Z' },
    { id: 'old', is_folder: false, updated_at: '2026-10-10T10:00:00Z' },
    { id: 'recent', is_folder: false, last_viewed: '2026-10-16T09:00:00Z' },
    { id: 'new', is_folder: false, created_at: '2026-10-16T11:00:00Z' },
  ], 2);

  assert.deepEqual(suggestions.map((file) => file.id), ['new', 'recent']);
});
