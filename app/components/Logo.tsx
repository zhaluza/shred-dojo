interface LogoProps {
  /** Width of the pick SVG in px (default 38) */
  pickWidth?: number;
  /** Additional classes on the flex container */
  className?: string;
  /** Semantic element for the brand name (default 'div') */
  as?: "h1" | "h2" | "h3" | "div" | "span";
  /** Tailwind text/tracking classes for the brand name */
  textClassName?: string;
}

export function Logo({
  pickWidth = 38,
  className = "",
  as: Tag = "div",
  textClassName = "text-[clamp(2.8rem,8vw,5rem)] tracking-[0.03em]",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <PickIcon width={pickWidth} />
      <Tag
        className={`font-display font-semibold uppercase leading-none ${textClassName}`}
      >
        Shred
        <br />
        <em className="text-[var(--accent)] not-italic">Dojo</em>
      </Tag>
    </div>
  );
}

interface PickIconProps {
  width?: number;
  className?: string;
}

export function PickIcon({ width = 38, className = "" }: PickIconProps) {
  return (
    <svg
      viewBox="0 0 160 210"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{
        width,
        flexShrink: 0,
        transform: "rotate(225deg)",
        marginTop: "0.2rem",
      }}
    >
      <path
        d="M 80 6
           C 92 22, 118 44, 138 72
           C 152 92, 156 114, 150 136
           C 142 164, 120 186, 80 192
           C 40 186, 18 164, 10 136
           C 4 114, 8 92, 22 72
           C 42 44, 68 22, 80 6
           Z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="10"
        strokeLinejoin="round"
      />
    </svg>
  );
}
