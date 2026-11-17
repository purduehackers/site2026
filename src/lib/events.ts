import { EVENTS_URL } from '../data/site';

/** Public Payload API behind events.purduehackers.com. */
const API = `${EVENTS_URL}/api/events?sort=-start&limit=40&depth=0`;
const TIME_ZONE = 'America/Indiana/Indianapolis';

export type EventKind =
  | 'hack-night'
  | 'workshop'
  | 'special'
  | 'callout'
  | 'other';

export interface SiteEvent {
  name: string;
  kind: EventKind;
  start: string;
  end: string | null;
  location: string | null;
  locationUrl: string | null;
  url: string;
  summary: string | null;
  /** First photo on the event, as a CMS media id (see getEventPhotos). */
  photoId: number | null;
}

/** Category names for the EventCard component (it colours by this). */
export const KIND_CATEGORY: Record<EventKind, string> = {
  'hack-night': 'Hack night',
  workshop: 'Workshop',
  special: 'Special',
  callout: 'Callout',
  other: 'Event',
};

export const KIND_LABEL: Record<EventKind, string> = {
  'hack-night': 'Hack Night',
  workshop: 'Workshop',
  special: 'Guest / special',
  callout: 'Callout',
  other: 'Event',
};

function kindOf(type: unknown): EventKind {
  const t = String(type ?? '').toLowerCase();
  return t === 'hack-night' ||
    t === 'workshop' ||
    t === 'special' ||
    t === 'callout'
    ? t
    : 'other';
}

/** First paragraph of a Lexical rich-text document, as plain text. */
function firstParagraph(description: any): string | null {
  const text = (node: any): string =>
    typeof node?.text === 'string'
      ? node.text
      : (node?.children ?? []).map(text).join('');
  for (const child of description?.root?.children ?? []) {
    const line = text(child).replace(/​/g, '').trim();
    if (line) return line;
  }
  return null;
}

export function normalizeEvents(payload: unknown): SiteEvent[] {
  const docs = (payload as any)?.docs;
  if (!Array.isArray(docs)) return [];
  return docs
    .filter(
      (doc) =>
        doc?.published !== false &&
        typeof doc?.name === 'string' &&
        typeof doc?.slug === 'string' &&
        !Number.isNaN(Date.parse(doc?.start))
    )
    .map((doc) => ({
      name: doc.name,
      kind: kindOf(doc.eventType),
      start: new Date(doc.start).toISOString(),
      end: Number.isNaN(Date.parse(doc.end))
        ? null
        : new Date(doc.end).toISOString(),
      location: doc.location_name || null,
      locationUrl: doc.location_url || null,
      url: `${EVENTS_URL}/events/${String(doc.eventType ?? 'event').toLowerCase()}/${doc.slug}`,
      summary: firstParagraph(doc.description),
      photoId: Number.isInteger(doc.images?.[0]?.image)
        ? doc.images[0].image
        : null,
    }));
}

/** Soonest first. An event counts as upcoming until it ends (or 6h after start). */
export function splitEvents(events: SiteEvent[], now = Date.now()) {
  const endOf = (e: SiteEvent) =>
    e.end ? Date.parse(e.end) : Date.parse(e.start) + 6 * 3_600_000;
  const upcoming = events
    .filter((e) => endOf(e) > now)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const past = events
    .filter((e) => endOf(e) <= now)
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  return { upcoming, past };
}

/** Never throws: a failed feed is `null`, and pages say so instead of guessing. */
export async function getEvents(): Promise<SiteEvent[] | null> {
  try {
    const res = await fetch(API, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return normalizeEvents(await res.json());
  } catch {
    return null;
  }
}

/** The CMS behind the events site; its media collection is public. */
const MEDIA_API = 'https://cms.purduehackers.com/api/media';

/**
 * Photo URLs for the given media ids, in one request. Photos are a nicety:
 * any failure returns an empty map and the cards fall back to a placeholder.
 */
export async function getEventPhotos(
  ids: number[]
): Promise<Map<number, string>> {
  const photos = new Map<number, string>();
  if (!ids.length) return photos;
  const query = `where[id][in]=${ids.join(',')}&limit=${ids.length}&depth=0`;
  try {
    const res = await fetch(`${MEDIA_API}?${query}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return photos;
    for (const doc of (await res.json())?.docs ?? []) {
      if (
        Number.isInteger(doc?.id) &&
        typeof doc?.url === 'string' &&
        doc.url.startsWith(`${MEDIA_API}/file/`) &&
        String(doc.mimeType).startsWith('image/')
      )
        photos.set(doc.id, doc.url);
    }
  } catch {
    // keep whatever we have
  }
  return photos;
}

/** Consecutive events grouped under their month ("November 2026"), in order. */
export function groupByMonth(events: SiteEvent[]) {
  const groups: { month: string; events: SiteEvent[] }[] = [];
  for (const event of events) {
    const month = part(event.start, { month: 'long', year: 'numeric' });
    const last = groups.at(-1);
    if (last?.month === month) last.events.push(event);
    else groups.push({ month, events: [event] });
  }
  return groups;
}

const part = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, ...options }).format(
    new Date(iso)
  );

export const eventDate = {
  weekday: (iso: string) => part(iso, { weekday: 'short' }),
  month: (iso: string) => part(iso, { month: 'short' }),
  day: (iso: string) => part(iso, { day: 'numeric' }),
  time: (iso: string) =>
    part(iso, { hour: 'numeric', minute: '2-digit' }) + ' ET',
  long: (iso: string) =>
    part(iso, { weekday: 'long', month: 'long', day: 'numeric' }),
};

/**
 * The month containing `now`, Eastern time, as a Sunday-first grid: leading
 * blanks, then each day with the kinds of events that start on it.
 */
export function calendarMonth(events: SiteEvent[], now = Date.now()) {
  const iso = new Date(now).toISOString();
  const [month, year] = part(iso, { month: 'numeric', year: 'numeric' })
    .split('/')
    .map(Number);
  const today = Number(part(iso, { day: 'numeric' }));
  // Weekday names of a date-only value don't depend on the time zone.
  const blanks = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = Array.from({ length }, (_, i) => ({
    day: i + 1,
    today: i + 1 === today,
    kinds: [] as EventKind[],
  }));
  for (const event of events) {
    const [m, d, y] = part(event.start, {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    })
      .split('/')
      .map(Number);
    const slot = y === year && m === month ? days[d - 1] : undefined;
    if (slot && !slot.kinds.includes(event.kind)) slot.kinds.push(event.kind);
  }
  return {
    label: part(iso, { month: 'long', year: 'numeric' }),
    blanks,
    days,
  };
}
