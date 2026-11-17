/**
 * Lightning Time splits the day into 16 bolts, each into 16 zaps, 16 sparks and
 * 16 charges, written in hex as `bolt~zap~spark|charge`. Midnight is `0~0~0|0`,
 * noon is `8~0~0|0`. See https://blog.purduehackers.com/posts/lightning-time
 */
export interface LightningTime {
  text: string;
  /** Bolt, zap and spark colours, using the default static channels. */
  colors: [string, string, string];
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0');

export function lightningFromMs(msIntoDay: number): LightningTime {
  const DAY = 86_400_000;
  const units = Math.floor(((((msIntoDay % DAY) + DAY) % DAY) / DAY) * 65536);
  const bolt = (units >> 12) & 15;
  const zap = (units >> 8) & 15;
  const spark = (units >> 4) & 15;
  const charge = units & 15;
  const h = (n: number) => n.toString(16);
  return {
    text: `${h(bolt)}~${h(zap)}~${h(spark)}|${h(charge)}`,
    colors: [
      `#${hex2(bolt * 16 + zap)}a100`,
      `#32${hex2(zap * 16 + spark)}d6`,
      `#f685${hex2(spark * 16 + charge)}`,
    ],
  };
}

export function lightningFromClock(hours: number, minutes = 0): LightningTime {
  return lightningFromMs((hours * 60 + minutes) * 60_000);
}
