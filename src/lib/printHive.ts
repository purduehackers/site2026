/** PrintHive, the makerspace print queue. Its queue endpoint is public. */
export const PRINTHIVE_URL = 'https://print.purduehackers.com/';
const QUEUE_API = `${PRINTHIVE_URL}api/queue`;

export interface QueueSummary {
  printing: number;
  queued: number;
  /** When we asked, so the page can say how fresh the numbers are. */
  checkedAt: string;
}

/** Counts jobs by status. Job titles are never kept. */
export function summarizeQueue(
  payload: unknown,
  now = new Date()
): QueueSummary | null {
  if (!Array.isArray(payload)) return null;
  const count = (status: string) =>
    payload.filter((job) => job?.status === status).length;
  return {
    printing: count('printing'),
    queued: count('queued'),
    checkedAt: now.toISOString(),
  };
}

/** Never throws: a failed request is `null` and the page just links out. */
export async function getPrintQueue(): Promise<QueueSummary | null> {
  try {
    const res = await fetch(QUEUE_API, { signal: AbortSignal.timeout(4000) });
    return res.ok ? summarizeQueue(await res.json()) : null;
  } catch {
    return null;
  }
}
