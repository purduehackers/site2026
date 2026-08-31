import React from 'react';

export interface NormalizedLogo {
  name: string;
  src: string;
  /** Sponsor's site. Null for a logo we have no link for. */
  url?: string | null;
  /** Normalized size, in units of the 48px base the script normalized around. */
  width: number;
  height: number;
  /** Optical-center nudge, already expressed in em. Null when already centered. */
  transform?: string | null;
}

interface LogoGridProps {
  logos: NormalizedLogo[];
  showGrid?: boolean;
  className?: string;
}

/** Must match BASE_SIZE in scripts/normalize-logos.mjs. */
const BASE_SIZE = 48;

/**
 * Sponsor logos, each sized so it carries the same optical weight as its
 * neighbours rather than the same height. The sizes come from
 * src/data/sponsors.normalized.json — see scripts/normalize-logos.mjs.
 *
 * Sizes are emitted in `em` against the grid's own font-size (--logo-base), so
 * the whole soup scales at breakpoints without re-measuring anything.
 */
export default function LogoGrid({
  logos,
  showGrid = true,
  className = '',
}: LogoGridProps) {
  const gridLine = showGrid ? 'logo-grid-line' : '';

  return (
    <div className={`logo-soup ${className}`}>
      {logos.map((logo) => {
        // The cell is the link when we have a site to point at, so the whole
        // logo is the hit area and the alt text doubles as the link text.
        const Cell = logo.url ? 'a' : 'div';

        return (
          <Cell
            key={logo.src}
            className={`logo-grid-cell ${gridLine}`}
            href={logo.url ?? undefined}
            target={logo.url ? '_blank' : undefined}
            style={{
              width: `${logo.width / BASE_SIZE}em`,
              height: `${logo.height / BASE_SIZE}em`,
              transform: logo.transform ?? undefined,
            }}
          >
            {/* Two copies of the same artwork: a white silhouette at rest, with
                the brand-coloured original fading in over it on hover. The colour
                swap can't be a filter transition — see the note in global.css. */}
            <img
              src={logo.src}
              alt={logo.name}
              width={logo.width}
              height={logo.height}
              loading="lazy"
              decoding="async"
              className="logo-grid-img logo-grid-img--wash"
            />
            <img
              src={logo.src}
              alt=""
              aria-hidden="true"
              width={logo.width}
              height={logo.height}
              loading="lazy"
              decoding="async"
              className="logo-grid-img logo-grid-img--brand"
            />
          </Cell>
        );
      })}
    </div>
  );
}
