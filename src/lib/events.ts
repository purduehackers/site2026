const EVENTS_URL = 'https://events.purduehackers.com';
export const EVENTS_HREF = `${EVENTS_URL}/`;

export interface HackNight {
  name: string;
  start: string;
  location: string | null;
  href: string;
}

export interface HackNightPhoto {
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  caption: string;
  href: string;
}

export async function getLatestHackNightPhoto(
  now = new Date(),
  request: typeof fetch = fetch
): Promise<HackNightPhoto | null> {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  const params = new URLSearchParams({
    'where[eventType][equals]': 'hack-night',
    'where[start][less_than]': day.toISOString(),
    sort: '-start',
    limit: '5',
  });
  for (const field of ['name', 'slug', 'start', 'eventType', 'images']) {
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
    for (const event of data.docs) {
      if (
        event?.eventType !== 'hack-night' ||
        typeof event.name !== 'string' || !event.name.trim() ||
        typeof event.slug !== 'string' || !event.slug.trim() ||
        typeof event.start !== 'string' ||
        !Number.isFinite(Date.parse(event.start)) || Date.parse(event.start) >= now.getTime() ||
        !Array.isArray(event.images)
      ) continue;
      for (const entry of event.images) {
        const img = entry?.image;
        // Only published event photos, not upcoming-event posters or arbitrary
        // external URLs. The existing local photo remains the fallback.
        if (
          !img || img.source !== 'hack-night' ||
          typeof img.url !== 'string' ||
          !/^image\/(jpeg|png|webp|avif)$/.test(img.mimeType) ||
          !Number.isInteger(img.width) || img.width <= 0 || img.width > 20000 ||
          !Number.isInteger(img.height) || img.height <= 0 || img.height > 20000 ||
          !Number.isInteger(img.id) || img.id <= 0
        ) continue;
        let url: URL;
        try { url = new URL(img.url); } catch { continue; }
        if (
          url.protocol !== 'https:' || url.host !== 'cms.purduehackers.com' ||
          !url.pathname.startsWith('/api/media/file/') || url.username || url.password
        ) continue;
        const date = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Indiana/Indianapolis',
          month: 'long', day: 'numeric', year: 'numeric',
        }).format(new Date(event.start));
        return {
          src: url.href, width: img.width, height: img.height,
          alt: `A photo from ${event.name}`,
          title: event.name,
          caption: `${date} — see photos from the night`,
          href: `${EVENTS_URL}/events/hack-night/${encodeURIComponent(event.slug)}#photo-${img.id}`,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
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
