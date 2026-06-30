const RSS_URL = "https://blog.purduehackers.com/rss.xml";
const OG_BASE = "https://blog.purduehackers.com/og/posts";

export interface LatestPost {
  title: string;
  link: string;
  slug: string;
  ogImage: string;
  date: string;
}

// Cache the feed in-memory so we don't refetch on every request to a warm instance.
const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache: { post: LatestPost | null; at: number } | null = null;

function decodeEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(m[1]) : "";
}

function slugFromLink(link: string): string {
  const parts = link.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function formatDate(pubDate: string): string {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export async function getLatestPost(): Promise<LatestPost | null> {
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return _cache.post;

  try {
    const res = await fetch(RSS_URL, { headers: { Accept: "application/rss+xml" } });
    if (!res.ok) throw new Error(`RSS responded ${res.status}`);
    const xml = await res.text();

    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
    if (!itemMatch) throw new Error("No <item> in feed");
    const block = itemMatch[1];

    const title = tag(block, "title");
    const link = tag(block, "link");
    const slug = slugFromLink(link);
    if (!title || !link || !slug) throw new Error("Incomplete feed item");

    const post: LatestPost = {
      title,
      link,
      slug,
      ogImage: `${OG_BASE}/${slug}.png`,
      date: formatDate(tag(block, "pubDate")),
    };

    _cache = { post, at: Date.now() };
    return post;
  } catch (e) {
    console.error("Failed to fetch latest blog post:", e);
    return _cache?.post ?? null;
  }
}
