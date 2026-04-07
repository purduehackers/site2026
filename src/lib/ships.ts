import { turso } from "./turso";

export interface LatestShip {
  username: string;
  content: string;
  timeAgo: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export async function getLatestShip(): Promise<LatestShip | null> {
  try {
    const result = await turso.execute(
      "SELECT username, content, shipped_at FROM ship ORDER BY shipped_at DESC LIMIT 1"
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      username: String(row.username),
      content: String(row.content ?? ""),
      timeAgo: relativeTime(String(row.shipped_at)),
    };
  } catch (e) {
    console.error("Failed to fetch latest ship:", e);
    return null;
  }
}
