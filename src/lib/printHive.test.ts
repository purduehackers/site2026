import { expect, test } from 'bun:test';
import { summarizeQueue } from './printHive';

test('counts printing and queued jobs and rejects odd payloads', () => {
  const now = new Date('2026-11-17T20:00:00Z');
  expect(
    summarizeQueue(
      [
        { status: 'printing', title: 'a' },
        { status: 'queued' },
        { status: 'queued' },
        { status: 'done' },
        null,
      ],
      now
    )
  ).toEqual({ printing: 1, queued: 2, checkedAt: '2026-11-17T20:00:00.000Z' });
  expect(summarizeQueue({ jobs: [] })).toBeNull();
});
