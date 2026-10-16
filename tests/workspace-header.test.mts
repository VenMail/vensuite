import assert from 'node:assert/strict';
import test from 'node:test';

import { isWorkspaceHeaderExpanded } from '../src/lib/workspaceHeader.ts';

test('keeps workspace details visible unless a collapsible header is collapsed', () => {
  assert.equal(isWorkspaceHeaderExpanded(false, false), true);
  assert.equal(isWorkspaceHeaderExpanded(true, false), true);
  assert.equal(isWorkspaceHeaderExpanded(true, true), false);
});
