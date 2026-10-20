// Server-only: the channel is fixed so this cannot become a general Discord proxy.
export const SHIP_GUILD_ID = '772576325897945119';
export const SHIP_CHANNEL_ID = '904896819165814794';

export interface MessageImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface MessageReaction {
  name: string;
  count: number;
  imageUrl?: string;
}

export interface CommunityMessage {
  channel: string;
  username: string;
  usernameColor: string;
  avatarUrl: string;
  timestamp: string;
  sourceUrl: string;
  content: string;
  images: MessageImage[];
  reactions: MessageReaction[];
}

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
}

interface DiscordMessage {
  id: string;
  type: number;
  timestamp: string;
  content: string;
  author: DiscordUser;
  mentions?: DiscordUser[];
  attachments: {
    url: string;
    content_type?: string;
    description?: string;
    width?: number;
    height?: number;
  }[];
  reactions?: {
    emoji: { id: string | null; name: string | null };
    count: number;
  }[];
}

interface DiscordMember {
  nick?: string | null;
  roles: string[];
}

interface DiscordRole {
  id: string;
  position: number;
  color: number;
}

function avatarUrl(user: DiscordUser): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`;
  }
  const index = Number(BigInt(user.id) >> 22n) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export async function getCommunityFeed({
  token = process.env.SHIP_DISCORD_BOT_TOKEN,
  fetcher = fetch,
}: {
  token?: string;
  fetcher?: typeof fetch;
} = {}): Promise<CommunityMessage[]> {
  if (!token) throw new Error('Community feed is not configured');

  async function read<T>(route: string): Promise<T> {
    const response = await fetcher(`https://discord.com/api/v10${route}`, {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`Discord community feed: HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  const messages = await read<DiscordMessage[]>(
    `/channels/${SHIP_CHANNEL_ID}/messages?limit=10`
  );
  if (!Array.isArray(messages)) throw new Error('Invalid Discord feed');

  const posts = messages
    .filter(
      (message) =>
        (message.type === 0 || message.type === 19) &&
        !message.author.bot &&
        /^\d+$/.test(message.id) &&
        (message.content || message.attachments.length > 0)
    )
    .slice(0, 3);
  if (posts.length === 0) return [];

  // A missing role/member permission should not hide otherwise readable posts.
  const roles = await read<DiscordRole[]>(
    `/guilds/${SHIP_GUILD_ID}/roles`
  ).catch(() => []);

  return Promise.all(
    posts.map(async (message) => {
      const member = await read<DiscordMember>(
        `/guilds/${SHIP_GUILD_ID}/members/${message.author.id}`
      ).catch(() => null);
      const role = roles
        .filter((role) => member?.roles.includes(role.id) && role.color)
        .sort((a, b) => b.position - a.position)[0];
      const username =
        member?.nick ?? message.author.global_name ?? message.author.username;
      const content = message.content.replace(/<@!?(\d+)>/g, (match, id) => {
        const user = message.mentions?.find((user) => user.id === id);
        return user ? `@${user.global_name ?? user.username}` : match;
      });

      return {
        channel: '🚢ship',
        username,
        usernameColor: role
          ? `#${role.color.toString(16).padStart(6, '0')}`
          : '#f2f3f5',
        avatarUrl: avatarUrl(message.author),
        timestamp: message.timestamp,
        sourceUrl: `https://discord.com/channels/${SHIP_GUILD_ID}/${SHIP_CHANNEL_ID}/${message.id}`,
        content,
        images: message.attachments
          .filter((attachment) => {
            try {
              const url = new URL(attachment.url);
              return (
                attachment.content_type?.startsWith('image/') &&
                !attachment.content_type.includes('svg') &&
                url.protocol === 'https:' &&
                ['cdn.discordapp.com', 'media.discordapp.net'].includes(
                  url.hostname
                )
              );
            } catch {
              return false;
            }
          })
          .map((attachment, index) => ({
            url: attachment.url,
            alt:
              attachment.description ||
              `Image ${index + 1} from ${username}'s project`,
            width: attachment.width,
            height: attachment.height,
          })),
        reactions: (message.reactions ?? [])
          .filter((reaction) => reaction.emoji.name && reaction.count > 0)
          .map((reaction) => ({
            name: reaction.emoji.name!,
            count: reaction.count,
            ...(reaction.emoji.id
              ? {
                  // A static frame also respects reduced-motion preferences.
                  imageUrl: `https://cdn.discordapp.com/emojis/${reaction.emoji.id}.webp?size=32`,
                }
              : {}),
          })),
      };
    })
  );
}
