import { LightningTime } from "@purduehackers/time";

// Channels sit on the sRGB edge, so lightness is traded for chroma.
const L_MUL = 0.97;
const C_MUL = 1.3;

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function saturate(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255));

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = (0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_) * L_MUL;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.hypot(A, B) * C_MUL;
  const H = Math.atan2(B, A);

  const a = C * Math.cos(H);
  const b2 = C * Math.sin(H);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b2) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b2) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b2) ** 3;

  return (
    "#" +
    [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ]
      .map((v) =>
        Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

let started = false;

// Writes --ph-bolt, --ph-zap and --ph-spark on :root. Safe to call more than once.
export function startLightning() {
  if (started || typeof window === "undefined") return;
  started = true;

  const root = document.documentElement;
  const cache = new Map<string, string>();
  const tinted = (hex: string) => {
    let v = cache.get(hex);
    if (v === undefined) cache.set(hex, (v = saturate(hex)));
    return v;
  };

  const lt = new LightningTime();
  let last = "";

  const tick = () => {
    const { boltColor, zapColor, sparkColor } = lt.convertToLightning(new Date()).colors;
    const next = boltColor + zapColor + sparkColor;
    if (next === last) return;
    last = next;
    root.style.setProperty("--ph-bolt", tinted(boltColor));
    root.style.setProperty("--ph-zap", tinted(zapColor));
    root.style.setProperty("--ph-spark", tinted(sparkColor));
  };

  tick();
  setInterval(tick, 1000);
}

export function tintLinks(scope: ParentNode = document) {
  const channels = ["--ph-zap", "--ph-spark", "--ph-bolt"];
  scope
    .querySelectorAll<HTMLElement>(".ph-link:not([data-plain], [data-tint])")
    .forEach((a, i) => a.style.setProperty("--link", `var(${channels[i % 3]})`));
}
