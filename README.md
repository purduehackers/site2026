# site 2026

## Community feed

The Community section shows the latest three human posts from `#ship`, with
grouped image attachments and reaction counts. It uses the same Discord message
component as the existing collage card.

Set `SHIP_DISCORD_BOT_TOKEN` in your local environment and the appropriate
Vercel environment to enable the live feed. The bot needs View Channel, Read
Message History, and the Message Content intent for Purdue Hackers' public
`#ship` channel (`904896819165814794`). The token stays on the server. The
endpoint's guild and channel are fixed; it does not accept channel IDs from the
browser.

`/api/community-feed` refreshes independently of the homepage's hourly ISR, with
a 60-second CDN cache and up to five minutes of stale-while-revalidate. The
browser fetches when the feed is near the viewport, then once a minute while
visible. Refreshes preserve keyboard focus. No JavaScript or an unavailable
upstream leaves dated local examples visible.

The fallback data in `src/data/communityMessages.ts` includes original message
links, captured reaction counts, and local copies of the images. It is a curated
snapshot, not a server export. Live attachment URLs are refreshed with the feed.

Validation:

```sh
bun test src/lib/communityFeed.test.ts
npm run build
```
