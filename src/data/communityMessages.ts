import type { CommunityMessage } from '../lib/communityFeed';
import avatar0 from '../assets/community/polargraph-avatar.webp';
import image0_0 from '../assets/community/polargraph-1.webp';
import image0_1 from '../assets/community/polargraph-2.webp';
import image0_2 from '../assets/community/polargraph-3.webp';
import avatar1 from '../assets/community/android-mirroring-avatar.webp';
import image1_0 from '../assets/community/android-mirroring-1.webp';
import image1_1 from '../assets/community/android-mirroring-2.webp';
import avatar2 from '../assets/community/clay-workshop-avatar.webp';
import image2_0 from '../assets/community/clay-workshop-1.webp';
import image2_1 from '../assets/community/clay-workshop-2.webp';
import image2_2 from '../assets/community/clay-workshop-3.webp';
import image2_3 from '../assets/community/clay-workshop-4.webp';
import image2_4 from '../assets/community/clay-workshop-5.webp';

// Recent public #ship posts, captured on 2026-10-20, used when the live feed is
// unavailable. Text, reactions, display names, and role colors are snapshots.
// Discord user mentions are resolved to readable names. Each post retains its
// original message URL. All attachments are local WebP copies, resized without
// cropping, so this fallback does not depend on expiring Discord CDN signatures.
// No server export or credentials are checked in.
export const communityMessages: CommunityMessage[] = [
  {
    channel: '🚢ship',
    username: 'Ryder',
    usernameColor: '#f3b600',
    timestamp: '2026-10-18T20:41:29.235000+00:00',
    sourceUrl:
      'https://discord.com/channels/772576325897945119/904896819165814794/1561479355501383810',
    content: 'i made a polargraph for my apartment',
    reactions: [
      {
        name: '🎉',
        count: 9,
      },
      {
        name: '✨',
        count: 5,
      },
      {
        name: '🚀',
        count: 4,
      },
      {
        name: '👀',
        count: 4,
      },
      {
        name: '🔥',
        count: 10,
      },
    ],
    avatarUrl: avatar0.src,
    images: [
      {
        url: image0_0.src,
        alt: "Ryder's polargraph, image 1 of 3.",
        width: 640,
        height: 853,
      },
      {
        url: image0_1.src,
        alt: "Ryder's polargraph, image 2 of 3.",
        width: 640,
        height: 853,
      },
      {
        url: image0_2.src,
        alt: "Ryder's polargraph, image 3 of 3.",
        width: 640,
        height: 853,
      },
    ],
  },
  {
    channel: '🚢ship',
    username: 'Rishu Sharma',
    usernameColor: '#f3b600',
    timestamp: '2026-10-18T04:15:37.081000+00:00',
    sourceUrl:
      'https://discord.com/channels/772576325897945119/904896819165814794/1561231253384994850',
    content:
      'recreated iphone mirroring but for android, gonna open source once i work out most of the kinks and figure out how to make onboarding less than around 40 steps',
    reactions: [
      {
        name: '📱',
        count: 4,
      },
      {
        name: '💻',
        count: 4,
      },
      {
        name: '🎉',
        count: 5,
      },
      {
        name: '🤸',
        count: 4,
      },
      {
        name: '🦽',
        count: 4,
      },
      {
        name: '🏌️',
        count: 4,
      },
      {
        name: '🔥',
        count: 7,
      },
    ],
    avatarUrl: avatar1.src,
    images: [
      {
        url: image1_0.src,
        alt: "Rishu Sharma's android mirroring, image 1 of 2.",
        width: 640,
        height: 1003,
      },
      {
        url: image1_1.src,
        alt: "Rishu Sharma's android mirroring, image 2 of 2.",
        width: 640,
        height: 1003,
      },
    ],
  },
  {
    channel: '🚢ship',
    username: 'cho',
    usernameColor: '#f3b600',
    timestamp: '2026-10-10T04:15:15.420000+00:00',
    sourceUrl:
      'https://discord.com/channels/772576325897945119/904896819165814794/1558332059607367733',
    content: 'clay sculptures from today from workshop hosted by @egg !!',
    reactions: [
      {
        name: '🎉',
        count: 3,
      },
      {
        name: '✨',
        count: 12,
      },
      {
        name: '🚀',
        count: 4,
      },
    ],
    avatarUrl: avatar2.src,
    images: [
      {
        url: image2_0.src,
        alt: "cho's clay workshop, image 1 of 5.",
        width: 640,
        height: 853,
      },
      {
        url: image2_1.src,
        alt: "cho's clay workshop, image 2 of 5.",
        width: 640,
        height: 853,
      },
      {
        url: image2_2.src,
        alt: "cho's clay workshop, image 3 of 5.",
        width: 640,
        height: 853,
      },
      {
        url: image2_3.src,
        alt: "cho's clay workshop, image 4 of 5.",
        width: 640,
        height: 853,
      },
      {
        url: image2_4.src,
        alt: "cho's clay workshop, image 5 of 5.",
        width: 640,
        height: 853,
      },
    ],
  },
];
