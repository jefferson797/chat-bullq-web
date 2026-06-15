/**
 * Tuner brand marks — inline SVG so they inherit `currentColor`
 * (monochrome by brand rule: black on light, white on dark).
 * Source: brand-kit/logo/*.svg.
 */

type LogoProps = React.SVGProps<SVGSVGElement>;

/** Full "TUNER" wordmark. Aspect ratio ~5.15:1. */
export function TunerLogo({ className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 599.67 116.48"
      fill="currentColor"
      role="img"
      aria-label="Tuner"
      className={className}
      {...props}
    >
      <g>
        <polygon points="520.61 74.56 548.85 116.48 589.29 116.48 561.05 74.56 520.61 74.56" />
        <polygon points="483.83 0 505.82 32.64 561.06 32.64 561.05 74.56 599.67 74.56 599.67 0 483.83 0" />
      </g>
      <g>
        <rect x="367.98" y="83.84" width="115.85" height="32.64" />
        <rect x="367.98" y="41.92" width="115.85" height="32.64" />
        <rect x="367.98" y="0" width="115.85" height="32.64" />
      </g>
      <polygon points="281.76 0 241.91 59.15 241.91 116.48 280.54 116.48 280.54 32.64 319.13 32.64 319.13 116.48 357.76 116.48 357.76 0 281.76 0" />
      <polygon points="203.29 0 203.29 83.84 164.69 83.84 164.69 0 126.07 0 126.07 116.48 203.29 116.48 203.29 116.48 241.91 59.15 241.91 0 203.29 0" />
      <g>
        <polygon points="115.85 0 38.61 0 38.61 116.48 77.24 116.48 77.24 32.64 115.85 32.64 115.85 0" />
        <polygon points="0 32.64 38.61 0 0 0 0 32.64" />
      </g>
    </svg>
  );
}

/** Compact "TNR" mark (favicon/avatar). Aspect ratio ~3:1. */
export function TunerMark({ className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 234.65 78.65"
      fill="currentColor"
      role="img"
      aria-label="Tuner"
      className={className}
      {...props}
    >
      <g>
        <polygon points="181.27 50.34 200.34 78.65 227.64 78.65 208.57 50.34 181.27 50.34" />
        <polygon points="156.43 0 171.28 22.04 208.58 22.04 208.57 50.34 234.65 50.34 234.65 0 156.43 0" />
      </g>
      <polygon points="105.12 0 78.22 39.94 78.22 78.65 104.3 78.65 104.3 22.04 130.36 22.04 130.36 78.65 156.43 78.65 156.43 0 105.12 0" />
      <g>
        <polygon points="78.22 0 26.07 0 26.07 78.65 52.15 78.65 52.15 22.04 78.22 22.04 78.22 0" />
        <polygon points="0 22.04 26.07 0 0 0 0 22.04" />
      </g>
    </svg>
  );
}
