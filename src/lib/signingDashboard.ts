export type SigningFilter = 'all' | 'in-progress' | 'signed';

export interface SigningStatusRecord {
  status: string;
}

export interface SigningDashboardCounts {
  all: number;
  drafts: number;
  pending: number;
  signed: number;
}

export function filterSigningRequests<T extends SigningStatusRecord>(
  requests: readonly T[],
  filter: SigningFilter,
): T[] {
  if (filter === 'all') return [...requests];
  if (filter === 'signed') return requests.filter((request) => request.status === 'completed');

  return requests.filter((request) => request.status !== 'completed');
}

export function signingCounts<T extends SigningStatusRecord>(
  requests: readonly T[],
): SigningDashboardCounts {
  return requests.reduce<SigningDashboardCounts>(
    (counts, request) => {
      counts.all += 1;

      if (request.status === 'completed') counts.signed += 1;
      else if (request.status === 'draft') counts.drafts += 1;
      else counts.pending += 1;

      return counts;
    },
    { all: 0, drafts: 0, pending: 0, signed: 0 },
  );
}
