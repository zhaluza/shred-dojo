import type { ReactNode } from "react";

type MetaCell = { label: string; value: ReactNode };

// "Title block" header — the cartouche on an engineering drawing. An eyebrow
// callout + page title on the left, optional labeled spec cells on the right.
// Hairline border, zero radius, a cyan accent top-rule.
export function PageHeader({
  eyebrow,
  title,
  meta,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  /** Optional spec cells (key / system / tempo …) shown as a coordinate block. */
  meta?: MetaCell[];
  className?: string;
}) {
  return (
    <header
      className={[
        "mb-6 border border-[var(--border)] bg-[var(--surface)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ borderTop: "2px solid var(--accent)" }}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 px-4 md:px-5 py-3 md:py-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="flex items-center gap-2 mb-[0.4rem]">
              <span
                className="inline-block w-3 h-px shrink-0"
                style={{ backgroundColor: "var(--accent)" }}
                aria-hidden="true"
              />
              <span
                className="font-mono text-[0.55rem] tracking-[0.22em] uppercase"
                style={{ color: "var(--muted)" }}
              >
                {eyebrow}
              </span>
            </div>
          )}
          <h1 className="font-display font-semibold uppercase tracking-[0.03em] leading-none m-0 text-[clamp(1.7rem,4vw,2.6rem)]">
            {title}
          </h1>
        </div>

        {meta && meta.length > 0 && (
          <dl className="flex flex-wrap items-end gap-x-6 gap-y-2 m-0">
            {meta.map((cell, i) => (
              <div key={i} className="flex flex-col gap-1">
                <dt
                  className="font-mono text-[0.5rem] tracking-[0.16em] uppercase"
                  style={{ color: "var(--muted)" }}
                >
                  {cell.label}
                </dt>
                <dd className="font-display font-semibold text-[0.95rem] tracking-[0.04em] uppercase m-0 tabular-nums">
                  {cell.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </header>
  );
}
