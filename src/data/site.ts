/** Shared by the header, mobile menu, footer and sitemap. */
export const SITE_URL = 'https://www.purduehackers.com';
export const DISCORD_URL = 'https://discord.gg/5paFjKzdPE';
export const EVENTS_URL = 'https://events.purduehackers.com';
export const HIVE_MAP_URL = 'https://maps.app.goo.gl/gDXHC11FSE8Xk3ff9';
export const DONATE_URL =
  'https://hcb.hackclub.com/donations/start/purdue-hackers';
export const CONTACT_EMAIL = 'phackers@purdue.edu';

export const NAV = [
  { label: 'Hack Night', href: '/hack-night', blurb: 'Fridays, 8 PM, HIVE' },
  { label: 'Events', href: '/events', blurb: 'Workshops, guests, shows' },
  { label: 'Makerspace', href: '/makerspace', blurb: 'Tools in BHEE 280N' },
  {
    label: 'Community',
    href: '/community',
    blurb: 'Discord, ships, artifacts',
  },
  { label: 'Support', href: '/support', blurb: 'Microgrants and friends' },
  { label: 'About', href: '/about', blurb: 'Start here' },
] as const;

/** Every crawlable page. `/shows` sits under Events in the nav. */
export const ROUTES = ['/', ...NAV.map((item) => item.href), '/shows'];
