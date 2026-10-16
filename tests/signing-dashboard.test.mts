import assert from 'node:assert/strict';
import test from 'node:test';

import { filterSigningRequests, signingCounts } from '../src/lib/signingDashboard.ts';

test('separates in-progress requests from completed requests', () => {
  const requests = [
    { status: 'draft' },
    { status: 'pending' },
    { status: 'completed' },
  ];

  assert.equal(filterSigningRequests(requests, 'in-progress').length, 2);
  assert.deepEqual(signingCounts(requests), {
    all: 3,
    drafts: 1,
    pending: 1,
    signed: 1,
  });
});
