import { describe, expect, test } from 'bun:test';
import { getCommunityFeed, SHIP_CHANNEL_ID } from './communityFeed';
import { renderShipContent } from './ships';

const post = {
  id: '1561479355501383810',
  type: 0,
  timestamp: '2026-10-18T20:41:29.235Z',
  content: 'built with <@1234> 🚀',
  author: { id: '12345678901234567', username: 'builder', avatar: 'avatar' },
  mentions: [{ id: '1234', username: 'friend' }],
  attachments: [1, 2, 3].map((number) => ({
    url: `https://cdn.discordapp.com/attachments/photo-${number}.webp`,
    content_type: 'image/webp',
    width: 640,
    height: 480,
  })),
  reactions: [
    { emoji: { id: null, name: '🎉' }, count: 9 },
    { emoji: { id: '123456789', name: 'glider' }, count: 4 },
  ],
};

function mockFetch(
  posts: unknown,
  { status = 200, memberStatus = 200 } = {}
): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/messages?')) {
      expect(url).toContain(`/channels/${SHIP_CHANNEL_ID}/messages?limit=10`);
      return Response.json(posts, { status });
    }
    if (url.endsWith('/roles')) {
      return Response.json([{ id: 'role', position: 1, color: 0xf3b600 }]);
    }
    return Response.json(
      { nick: 'Server nickname', roles: ['role'] },
      { status: memberStatus }
    );
  }) as typeof fetch;
}

describe('public ship feed', () => {
  test('keeps grouped photos, real reactions, mentions, and server identity', async () => {
    const [message] = await getCommunityFeed({
      token: 'test-only',
      fetcher: mockFetch([post]),
    });
    expect(message.images).toHaveLength(3);
    expect(message.reactions).toEqual([
      { name: '🎉', count: 9 },
      {
        name: 'glider',
        count: 4,
        imageUrl: 'https://cdn.discordapp.com/emojis/123456789.webp?size=32',
      },
    ]);
    expect(message.username).toBe('Server nickname');
    expect(message.usernameColor).toBe('#f3b600');
    expect(message.content).toBe('built with @friend 🚀');
    expect(message.sourceUrl).toEndWith(`/${SHIP_CHANNEL_ID}/${post.id}`);
  });

  test('excludes bots and system events and limits the feed to three posts', async () => {
    const messages = await getCommunityFeed({
      token: 'test-only',
      fetcher: mockFetch([
        { ...post, author: { ...post.author, bot: true } },
        { ...post, type: 18 },
        ...['100', '101', '102', '103'].map((id) => ({ ...post, id })),
      ]),
    });
    expect(messages).toHaveLength(3);
    expect(
      messages.map((message) => message.sourceUrl.split('/').at(-1))
    ).toEqual(['100', '101', '102']);
  });

  test('does not lose the post when a member lookup fails', async () => {
    const [message] = await getCommunityFeed({
      token: 'test-only',
      fetcher: mockFetch([post], { memberStatus: 403 }),
    });
    expect(message.username).toBe('builder');
    expect(message.usernameColor).toBe('#f2f3f5');
  });

  test('ignores invalid or non-Discord attachments without dropping valid photos', async () => {
    const [message] = await getCommunityFeed({
      token: 'test-only',
      fetcher: mockFetch([
        {
          ...post,
          attachments: [
            ...post.attachments,
            { url: 'not-a-url', content_type: 'image/png' },
            { url: 'https://example.com/image.png', content_type: 'image/png' },
            {
              url: 'https://cdn.discordapp.com/file.svg',
              content_type: 'image/svg+xml',
            },
          ],
        },
      ]),
    });
    expect(message.images).toHaveLength(3);
  });

  test('propagates rate limits so the endpoint can retain the last render', async () => {
    await expect(
      getCommunityFeed({
        token: 'test-only',
        fetcher: mockFetch({ error: 'rate limited' }, { status: 429 }),
      })
    ).rejects.toThrow('HTTP 429');
  });

  test('distinguishes an empty channel from a failed or unconfigured feed', async () => {
    expect(
      await getCommunityFeed({ token: 'test-only', fetcher: mockFetch([]) })
    ).toEqual([]);
    await expect(getCommunityFeed({ token: '' })).rejects.toThrow(
      'not configured'
    );
    await expect(
      getCommunityFeed({
        token: 'test-only',
        fetcher: mockFetch({ unexpected: 'response' }),
      })
    ).rejects.toThrow('Invalid Discord feed');
  });

  test('renders user text and custom emoji without raw HTML or nested links', async () => {
    const html = await renderShipContent(
      '<script>alert(1)</script>\n\n**hello** <:glider:123456789> [project](https://example.com)'
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<a ');
    expect(html).toContain('<strong>hello</strong>');
    expect(html).toContain('cdn.discordapp.com/emojis/123456789.webp');
  });
});
