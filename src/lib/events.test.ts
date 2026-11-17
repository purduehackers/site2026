import { expect, test } from 'bun:test';
import {
  calendarMonth,
  groupByMonth,
  normalizeEvents,
  splitEvents,
} from './events';
import { lightningFromClock } from './lightningTime';

const doc = (over: Record<string, unknown>) => ({
  name: 'Hack Night 7.10',
  slug: '7.10',
  published: true,
  eventType: 'hack-night',
  start: '2026-11-21T01:00:00.000Z',
  end: '2026-11-21T07:00:00.000Z',
  location_name: 'HIVE (BHEE 270/280)',
  ...over,
});

test('normalizes feed docs and drops unusable ones', () => {
  const events = normalizeEvents({
    docs: [
      doc({}),
      doc({ name: 'AMA', slug: 'ama', eventType: 'Special', end: null }),
      doc({ slug: 'draft', published: false }),
      doc({ slug: 'undated', start: 'soon' }),
    ],
  });
  expect(events.map((e) => e.kind)).toEqual(['hack-night', 'special']);
  expect(events[0].url).toBe(
    'https://events.purduehackers.com/events/hack-night/7.10'
  );
  expect(events[1].url).toEndWith('/events/special/ama');
  expect(normalizeEvents(null)).toEqual([]);
  expect(normalizeEvents({ docs: 'nope' })).toEqual([]);
});

test('an event stays upcoming until it ends', () => {
  const events = normalizeEvents({
    docs: [
      doc({}),
      doc({
        slug: '7.9',
        start: '2026-11-14T01:00:00Z',
        end: '2026-11-14T07:00:00Z',
      }),
      doc({ slug: '7.11', start: '2026-12-05T01:00:00Z', end: null }),
    ],
  });
  const during = Date.parse('2026-11-21T03:00:00Z');
  const { upcoming, past } = splitEvents(events, during);
  expect(upcoming.map((e) => e.url.split('/').pop())).toEqual(['7.10', '7.11']);
  expect(past.map((e) => e.url.split('/').pop())).toEqual(['7.9']);
});

test('keeps the first photo id and groups by Eastern month', () => {
  const events = normalizeEvents({
    docs: [
      doc({ images: [{ id: 'a', image: 3752 }, { id: 'b', image: 3753 }] }),
      // 9 PM Eastern on Oct 31 is already November in UTC
      doc({ slug: 'oct', start: '2026-11-01T01:00:00Z', images: [] }),
      doc({ slug: 'sep', start: '2026-09-20T00:00:00Z', images: 'bad' }),
    ],
  });
  expect(events.map((e) => e.photoId)).toEqual([3752, null, null]);
  expect(
    groupByMonth(events).map((g) => [g.month, g.events.length])
  ).toEqual([
    ['November 2026', 1],
    ['October 2026', 1],
    ['September 2026', 1],
  ]);
});

test('lays out the current Eastern month with event days marked', () => {
  const events = normalizeEvents({
    docs: [
      doc({}), // Fri Nov 20, 8 PM ET
      doc({ slug: 'ws', eventType: 'workshop', start: '2026-11-03T00:00:00Z' }),
      doc({ slug: 'dec', start: '2026-12-05T01:00:00Z' }),
    ],
  });
  // 11 PM Eastern on Nov 30 is December in UTC; the grid must still be November
  const month = calendarMonth(events, Date.parse('2026-12-01T04:00:00Z'));
  expect(month.label).toBe('November 2026');
  expect(month.blanks).toBe(0); // Nov 1 2026 is a Sunday
  expect(month.days).toHaveLength(30);
  expect(month.days[19].kinds).toEqual(['hack-night']);
  expect(month.days[1].kinds).toEqual(['workshop']); // Nov 2, 7 PM ET
  expect(month.days.filter((d) => d.today).map((d) => d.day)).toEqual([30]);
});

test('lightning time matches the codes used in Hack Night schedules', () => {
  expect(lightningFromClock(0).text).toBe('0~0~0|0');
  expect(lightningFromClock(12).text).toBe('8~0~0|0');
  expect(lightningFromClock(20).text).toBe('d~5~5|5');
  expect(lightningFromClock(20, 30).text).toBe('d~a~a|a');
  expect(lightningFromClock(21).text).toBe('e~0~0|0');
  expect(lightningFromClock(12).colors).toEqual([
    '#80a100',
    '#3200d6',
    '#f68500',
  ]);
});
