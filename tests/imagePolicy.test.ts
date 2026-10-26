import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canOptimizeRemoteImage,
  vercelRemotePatterns,
} from '../src/lib/images.ts';

test('public raster sources match the generated Vercel allowlist, including signed URLs', () => {
  for (const src of [
    'https://blog.purduehackers.com/og/posts/bits-newsletter-1.png',
    'https://cdn.discordapp.com/avatars/123/abc.webp?size=128',
    'https://cdn.discordapp.com/embed/avatars/0.png',
    'https://cdn.discordapp.com/attachments/123/456/photo.jpg?ex=abc&is=def&hm=123',
    'https://media.discordapp.net/attachments/123/456/photo.png?width=640',
  ]) {
    assert.equal(canOptimizeRemoteImage(src), true, src);
    const url = new URL(src);
    assert.ok(
      vercelRemotePatterns.some(
        (pattern) =>
          pattern.protocol + ':' === url.protocol &&
          new RegExp(pattern.hostname).test(url.hostname) &&
          new RegExp(pattern.pathname).test(url.pathname)
      ),
      src
    );
  }
});

test('unapproved hosts, paths and animated/vector images keep their original URL', () => {
  for (const src of [
    'https://example.com/photo.jpg',
    'https://blog.purduehackers.com.evil.example/og/posts/post.png',
    'https://blogXpurduehackersXcom/og/posts/post.png',
    'https://blog.purduehackers.com/private/photo.png',
    'http://blog.purduehackers.com/og/posts/post.png',
    'https://cdn.discordapp.com/avatars/123/a_animated.gif',
    'https://cdn.discordapp.com/attachments/123/456/vector.svg',
    'https://user:password@cdn.discordapp.com/avatars/123/photo.png',
    'https://cdn.discordapp.com:8080/avatars/123/photo.png',
    'not a URL',
  ])
    assert.equal(canOptimizeRemoteImage(src), false, src);
});
