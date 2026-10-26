import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import {
  formatRelativeTime,
  startRelativeTime,
} from '../src/lib/relativeTime.ts';

test('cached ship ages handle unit boundaries, future dates and invalid input', () => {
  const posted = '2026-10-26T12:00:00.000Z';
  const start = Date.parse(posted);
  for (const [seconds, expected] of [
    [-60, 'just now'],
    [59, 'just now'],
    [60, '1m ago'],
    [3599, '59m ago'],
    [3600, '1h ago'],
    [86400, '1d ago'],
    [2592000, '1mo ago'],
  ] as const) {
    assert.equal(formatRelativeTime(posted, start + seconds * 1000), expected);
  }
  assert.equal(formatRelativeTime('invalid', start), '');
});

test('the serialized initializer corrects stale HTML without a module or hydration', () => {
  let now = Date.parse('2026-10-26T14:00:00.000Z');
  class TimeElement {
    dateTime = '2026-10-26T12:00:00.000Z';
    textContent = 'just now';
  }
  const element = new TimeElement();
  const listeners = new Map<string, () => void>();
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  const document = {
    currentScript: { previousElementSibling: element },
    hidden: false,
    addEventListener: (name: string, handler: () => void) =>
      listeners.set(name, handler),
  };
  const context = {
    document,
    window: { addEventListener: document.addEventListener },
    HTMLTimeElement: TimeElement,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    setInterval: (callback: () => void) => {
      timers.set(++nextTimer, callback);
      return nextTimer;
    },
    clearInterval: (id: number) => timers.delete(id),
  };
  runInNewContext(
    `(${startRelativeTime.toString()})(${formatRelativeTime.toString()})`,
    context
  );
  assert.equal(element.textContent, '2h ago');
  assert.equal(timers.size, 1);

  document.hidden = true;
  listeners.get('visibilitychange')!();
  assert.equal(timers.size, 0);
  now += 86400 * 1000;
  document.hidden = false;
  listeners.get('visibilitychange')!();
  assert.equal(element.textContent, '1d ago');
  assert.equal(timers.size, 1);
  listeners.get('pageshow')!();
  assert.equal(
    timers.size,
    1,
    'restoring from bfcache must not duplicate the timer'
  );
  listeners.get('pagehide')!();
  assert.equal(timers.size, 0);
});
