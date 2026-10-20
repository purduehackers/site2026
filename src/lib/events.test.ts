import { describe, expect, test } from 'bun:test';
import { formatHackNightStart, getNextHackNight } from './events';

const now = new Date('2026-10-20T12:00:00Z');
const event = {
  name: 'Hack Night 7.6', slug: '7.6', eventType: 'hack-night',
  start: '2026-10-24T00:00:00Z', location_name: 'HIVE (BHEE 270/280)',
};
const respond = (body: unknown, status = 200) =>
  (async () => Response.json(body, { status })) as typeof fetch;

describe('next Hack Night', () => {
  test('ignores elapsed, invalid, and other-category records and picks the soonest', async () => {
    const result = await getNextHackNight(now, respond({ docs: [
      { ...event, slug: 'later', start: '2026-10-31T00:00:00Z' },
      { ...event, start: '2026-10-20T08:00:00Z' },
      { ...event, eventType: 'workshop', start: '2026-10-21T00:00:00Z' },
      { ...event, start: 'invalid' }, null, event,
    ] }));
    expect(result?.href).toBe('https://events.purduehackers.com/events/hack-night/7.6');
    expect(result?.location).toBe('HIVE (BHEE 270/280)');
  });

  test('does not invent a location or another Friday when the feed has none', async () => {
    expect((await getNextHackNight(now, respond({ docs: [{ ...event, location_name: null }] })))?.location).toBeNull();
    expect(await getNextHackNight(now, respond({ docs: [] }))).toBeNull();
  });

  test('falls back on malformed, failed, or unavailable feeds', async () => {
    expect(await getNextHackNight(now, respond({ docs: {} }))).toBeNull();
    expect(await getNextHackNight(now, respond({}, 503))).toBeNull();
    expect(await getNextHackNight(now, (async () => { throw new Error('offline'); }) as typeof fetch)).toBeNull();
  });

  test('formats the Purdue date across UTC midnight and daylight saving time', () => {
    expect(formatHackNightStart(event.start)).toBe('Friday, October 23, 8pm ET');
    expect(formatHackNightStart('2026-11-14T01:30:00Z')).toBe('Friday, November 13, 8:30pm ET');
  });
});
