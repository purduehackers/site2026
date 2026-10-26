// Keep every requested variant in Vercel's allowlist. One quality also lets
// repeated photos (including the dither layers) share the same cached response.
export const IMAGE_QUALITY = 75;
export const IMAGE_WIDTHS = [
  40, 80, 160, 240, 320, 480, 640, 800, 960, 1280, 1600, 1920, 2560,
];

// Astro uses path globs; Vercel's Build Output API uses regular expressions.
// Declare both from the same small list instead of allowing arbitrary hosts.
const remoteSources = [
  { hostname: 'blog.purduehackers.com', path: '/og/posts/' },
  { hostname: 'cdn.discordapp.com', path: '/avatars/' },
  { hostname: 'cdn.discordapp.com', path: '/embed/avatars/' },
  { hostname: 'cdn.discordapp.com', path: '/attachments/' },
  { hostname: 'media.discordapp.net', path: '/attachments/' },
];

export const astroRemotePatterns = remoteSources.map(({ hostname, path }) => ({
  protocol: 'https' as const,
  hostname,
  pathname: `${path}**`,
}));

export const vercelRemotePatterns = remoteSources.map(({ hostname, path }) => ({
  protocol: 'https' as const,
  hostname: `^${hostname.replaceAll('.', '\\.')}$`,
  pathname: `^${path}.*$`,
}));

export function canOptimizeRemoteImage(src: string): boolean {
  try {
    const url = new URL(src);
    return (
      url.protocol === 'https:' &&
      !url.port &&
      !url.username &&
      !url.password &&
      /\.(png|jpe?g|webp|avif)$/i.test(url.pathname) &&
      remoteSources.some(
        ({ hostname, path }) =>
          url.hostname === hostname && url.pathname.startsWith(path)
      )
    );
  } catch {
    return false;
  }
}

export function photoWidths(sourceWidth: number): number[] {
  return IMAGE_WIDTHS.filter((width) => width >= 240 && width <= sourceWidth);
}
