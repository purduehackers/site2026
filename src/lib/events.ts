const EVENTS_URL = 'https://events.purduehackers.com';
export const EVENTS_HREF = `${EVENTS_URL}/`;

export interface HackNight {
  name: string;
  start: string;
  location: string | null;
  href: string;
}

export async function getNextHackNight(
  now = new Date(),
  request: typeof fetch = fetch
): Promise<HackNight | null> {
  // A daily boundary lets requests share the Events site's CDN cache. Filter
  // elapsed events again below using the actual time of this render.
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  const params = new URLSearchParams({
    'where[eventType][equals]': 'hack-night',
    'where[start][greater_than]': day.toISOString(),
    sort: 'start',
    limit: '10',
    depth: '0',
  });
  for (const field of ['name', 'slug', 'start', 'eventType', 'location_name']) {
    params.set(`select[${field}]`, 'true');
  }

  try {
    const response = await request(`${EVENTS_URL}/api/events?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data?.docs)) return null;
    const event = data.docs
      .filter(
        (event: Record<string, unknown>) =>
          event?.eventType === 'hack-night' &&
          typeof event.name === 'string' && event.name.trim() &&
          typeof event.slug === 'string' && event.slug.trim() &&
          typeof event.start === 'string' &&
          Date.parse(event.start) > now.getTime()
      )
      .sort(
        (a: { start: string }, b: { start: string }) =>
          Date.parse(a.start) - Date.parse(b.start)
      )[0];
    if (!event) return null;

    return {
      name: event.name,
      start: event.start,
      location: typeof event.location_name === 'string' && event.location_name.trim()
        ? event.location_name.trim() : null,
      href: `${EVENTS_URL}/events/hack-night/${encodeURIComponent(event.slug)}`,
    };
  } catch {
    // The homepage remains useful when the events service is unavailable.
    return null;
  }
}

export function formatHackNightStart(start: string): string {
  const date = new Date(start);
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Indiana/Indianapolis',
    weekday: 'long', month: 'long', day: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Indiana/Indianapolis',
    hour: 'numeric', minute: '2-digit',
  }).format(date).replace(':00', '').replace(' ', '').toLowerCase();
  return `${day}, ${time} ET`;
}
