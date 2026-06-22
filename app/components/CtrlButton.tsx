export function CtrlButton({
  label,
  active,
  onClick,
  small,
  disabled,
  title,
  normalCase,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
  disabled?: boolean;
  title?: string;
  normalCase?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        // Blueprint control: hairline border, zero radius, cyan ink for active/hover.
        "font-display border rounded-none transition-all duration-100 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]",
        normalCase ? "" : "uppercase",
        small
          ? "text-[0.65rem] tracking-[0.1em] px-[0.7rem] py-[0.28rem] max-[700px]:py-[0.55rem] max-[700px]:px-[1rem]"
          : "text-[0.75rem] tracking-[0.08em] px-[0.85rem] py-[0.35rem] max-[700px]:py-[0.6rem]",
        disabled
          ? "bg-transparent text-[var(--muted)] border-[var(--border)] opacity-40 cursor-not-allowed"
          : active
            ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]"
            : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </button>
  );
}
