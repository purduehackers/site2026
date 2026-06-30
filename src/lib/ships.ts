import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import {
  remarkDiscord,
  discordRemarkRehypeHandlers,
} from '@purduehackers/discord-markdown-utils';
import { visit } from 'unist-util-visit';
import type { Node } from 'unist';
import type { Element } from 'hast';

import { getTurso } from './turso';

export interface ShipImage {
  url: string;
  width?: number;
  height?: number;
}

export interface LatestShip {
  username: string;
  usernameColor: string;
  avatarUrl: string;
  contentHtml: string;
  timeAgo: string;
  image: ShipImage | null;
}

// Discord's generic placeholder avatar, used when a ship has no avatar_url.
export const DEFAULT_AVATAR_URL =
  'https://cdn.discordapp.com/embed/avatars/0.png';

// Default username color (Discord's color for members with no colored role).
export const DEFAULT_USERNAME_COLOR = '#f2f3f5';

// Discord colors usernames by the member's top role. We don't have role data,
// so derive a stable, pleasant color per user from their ID — close enough to
// the real thing that the card reads like Discord.
const USERNAME_COLORS = [
  '#e0729a',
  '#5865f2',
  '#3ba55d',
  '#faa61a',
  '#ed4245',
  '#00b0f4',
  '#eb459e',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return USERNAME_COLORS[hash % USERNAME_COLORS.length];
}

// Modern Discord default-avatar index for accounts with no custom avatar.
// Mirrors commit-overflow-website's getAvatarUrl().
function defaultAvatarUrl(userId: string): string {
  try {
    const index = Number(BigInt(userId) >> 22n) % 6;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  } catch {
    return DEFAULT_AVATAR_URL;
  }
}

// Mirrors the resolver in commit-overflow-website's transform.ts. We have no
// Discord bot token here, so user/role/channel mentions fall back to the
// library defaults; emoji and timestamps resolve from the mention itself.
const resolver = {
  async user(_mention: { type: 'user'; id: string }) {
    return null;
  },
  async role(_mention: { type: 'role'; id: string }) {
    return null;
  },
  async channel(_mention: { type: 'channel'; id: string }) {
    return null;
  },
  async emoji({
    animated,
    id,
  }: {
    type: 'emoji';
    animated: boolean;
    name: string;
    id: string;
  }) {
    const query = animated ? '?animated=true' : '';
    return `https://cdn.discordapp.com/emojis/${id}.webp${query}`;
  },
  async timestamp({ date }: { type: 'timestamp'; date: Date }) {
    return date.toLocaleString();
  },
};

// Ported from commit-overflow-website's transform.ts (rehypeGitLinks).
// Rewrites bare GitHub URLs into compact inline chips, e.g. "user/repo @abc1234"
// or "user/repo #12" — Discord's link-embed equivalent. The patterns cover
// commit / diff / issue+PR / file / repo URLs and handle several edge cases;
// keep them in sync with the upstream version if you change them.
const COMMIT_PATTERN =
  /^https?:\/\/(?<domain>[^/]+)\/(?<user>[^/]+)\/(?<repo>[^/]+)\/commit\/(?<sha>[a-f0-9]+)$/i;
const DIFF_PATTERN =
  /^https?:\/\/(?<domain>[^/]+)\/(?<user>[^/]+)\/(?<repo>[^/]+)\/compare\/(?<from>.+)(?<dots>\.\.\.?)(?<to>.+)$/i;
const ISSUE_PULL_PATTERN =
  /^https?:\/\/(?<domain>[^/]+)\/(?<user>[^/]+)\/(?<repo>[^/]+)\/(?:pull|issues)\/(?<num>\d+)$/i;
const FILE_PATTERN =
  /^https?:\/\/(?<domain>[^/]+)\/(?<user>[^/]+)\/(?<repo>[^/]+)\/(?:tree|blob)\/(?<rev>[^/]+)\/(?<path>.*)$/;
const REPO_PATTERN =
  /^https?:\/\/(?<domain>[^/]+)\/(?<user>[^/]+)\/(?<repo>[^/]+)$/i;

function abbreviateRev(rev: string): string {
  if (rev.match(/[0-9a-f]{40}/i)) {
    return rev.slice(0, 7);
  }
  return rev;
}

function rehypeGitLinks() {
  return (tree: Node) => {
    visit(tree, 'element', (link: Element) => {
      if (link.tagName !== 'a') return;

      const href = link.properties.href;
      if (!href || typeof href !== 'string') return;

      // Only rewrite bare URLs (a single text child equal to the href).
      if (link.children.length !== 1 || link.children[0].type !== 'text')
        return;
      const text = link.children[0].value;
      if (text != href) return;

      const repoName = (domain: string, user: string, repo: string) =>
        domain === 'github.com'
          ? `${user}/${repo}`
          : `${domain}:${user}/${repo}`;
      let match;
      let newContent: [string, string][];
      if ((match = href.match(COMMIT_PATTERN))) {
        const { domain, user, repo, sha } = match.groups!;
        newContent = [
          ['github-repo', repoName(domain, user, repo)],
          ['github-sha', abbreviateRev(sha)],
        ];
      } else if ((match = href.match(DIFF_PATTERN))) {
        const { domain, user, repo, from, to, dots } = match.groups!;
        newContent = [
          ['github-repo', repoName(domain, user, repo)],
          ['github-sha', `${abbreviateRev(from)}${dots}${abbreviateRev(to)}`],
        ];
      } else if ((match = href.match(ISSUE_PULL_PATTERN))) {
        const { domain, user, repo, num } = match.groups!;
        newContent = [
          ['github-repo', repoName(domain, user, repo)],
          ['github-num', `#${num}`],
        ];
      } else if ((match = href.match(FILE_PATTERN))) {
        const { domain, user, repo, rev, path } = match.groups!;
        newContent = [
          ['github-repo', repoName(domain, user, repo)],
          ['github-file', `${path}`],
          ['github-sha', abbreviateRev(rev)],
        ];
      } else if ((match = href.match(REPO_PATTERN))) {
        const { domain, user, repo } = match.groups!;
        newContent = [['github-repo', repoName(domain, user, repo)]];
      } else {
        return;
      }

      link.properties.className = ['github-commit'];
      link.children = newContent.map(([clazz, value]) => ({
        type: 'element',
        tagName: 'span',
        properties: { className: [clazz] },
        children: [{ type: 'text', value }],
      }));
    });
  };
}

// The ship card is itself an <a>, so collapse every remaining anchor to a span
// (nested anchors are invalid HTML). GitHub chips keep their class; other links
// become styled discord-link spans.
function rehypeLinksToSpans() {
  return (tree: Node) => {
    visit(tree, 'element', (el: Element) => {
      if (el.tagName !== 'a') return;
      el.tagName = 'span';
      delete el.properties.href;
      delete el.properties.target;
      delete el.properties.rel;
      const classes = el.properties.className;
      const isGitChip =
        Array.isArray(classes) && classes.includes('github-commit');
      if (!isGitChip) el.properties.className = ['discord-link'];
    });
  };
}

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkDiscord, { resolver })
  .use(remarkRehype, { handlers: discordRemarkRehypeHandlers })
  .use(rehypeGitLinks)
  .use(rehypeLinksToSpans)
  .use(rehypeStringify);

// Ported from commit-overflow-website's transform.ts. Truncates to ~maxWords,
// preferring to end on a sentence boundary and avoiding awkward trailing words.
const AWKWARD_END_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'been',
  'be',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'my',
  'your',
  'his',
  'her',
  'its',
  'our',
  'their',
  'what',
  'which',
  'who',
  'whom',
  'whose',
  'where',
  'when',
  'why',
  'how',
  'if',
  'then',
  'so',
  'than',
  'such',
  'both',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'any',
  'no',
  'not',
  'only',
  'own',
  'same',
  'just',
  'also',
  'very',
  'even',
  'still',
]);

function smartTruncate(text: string, maxWords: number = 50): string {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= maxWords) return text;

  const windowStart = Math.max(0, maxWords - 10);
  const windowEnd = Math.min(words.length, maxWords + 5);

  let bestEnd = -1;
  for (let i = windowStart; i < windowEnd; i++) {
    if (/[.!?]["')]?$/.test(words[i])) {
      bestEnd = i;
      if (i >= maxWords - 5) break;
    }
  }

  if (bestEnd === -1) {
    for (let i = maxWords; i > windowStart; i--) {
      const normalized = words[i - 1].toLowerCase().replace(/[^a-z]/g, '');
      if (!AWKWARD_END_WORDS.has(normalized)) {
        bestEnd = i - 1;
        break;
      }
    }
  }

  if (bestEnd === -1) bestEnd = maxWords - 1;

  return words.slice(0, bestEnd + 1).join(' ') + '...';
}

function firstImageAttachment(raw: string): ShipImage | null {
  try {
    const list = JSON.parse(raw || '[]');
    if (!Array.isArray(list)) return null;
    const img = list.find(
      (a) =>
        a &&
        typeof a.url === 'string' &&
        (typeof a.type === 'string'
          ? a.type.startsWith('image/')
          : /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(a.url))
    );
    if (!img) return null;
    return {
      url: String(img.url),
      width: typeof img.width === 'number' ? img.width : undefined,
      height: typeof img.height === 'number' ? img.height : undefined,
    };
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c
  );
}

async function renderShipContent(content: string): Promise<string> {
  const truncated = smartTruncate(content, 50);
  if (!truncated.trim()) return '';
  try {
    return String(await markdownProcessor.process(truncated));
  } catch (e) {
    console.error('Failed to render ship content:', e);
    return `<p>${escapeHtml(truncated)}</p>`;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
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
    const result = await getTurso().execute(
      'SELECT user_id, username, avatar_url, content, attachments, shipped_at FROM ship ORDER BY shipped_at DESC LIMIT 1'
    );

    const row = result.rows[0];
    if (!row) return null;

    const userId = String(row.user_id ?? '');
    return {
      username: String(row.username),
      usernameColor: colorForUser(userId),
      avatarUrl: row.avatar_url
        ? String(row.avatar_url)
        : defaultAvatarUrl(userId),
      contentHtml: await renderShipContent(String(row.content ?? '')),
      timeAgo: relativeTime(String(row.shipped_at)),
      image: firstImageAttachment(String(row.attachments ?? '[]')),
    };
  } catch (e) {
    console.error('Failed to fetch latest ship:', e);
    return null;
  }
}
