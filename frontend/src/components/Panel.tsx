"use client";

import clsx from "clsx";

interface PanelProps {
  title?: string;
  subtitle?: string;
  className?: string;
  id?: string;
  actions?: React.ReactNode; // ✅ new
  children: React.ReactNode;
}

export default function Panel({
  title,
  subtitle,
  className = "",
  id,
  actions,
  children,
}: PanelProps) {
  return (
    <section
      id={id}
      className={clsx(
        "rounded-xl border shadow-sm transition hover:shadow-md",
        "bg-white dark:bg-gray-900",
        "border-zinc-200 dark:border-zinc-800",
        className
      )}
    >
      {(title || subtitle || actions) && (
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="space-y-1">
            {title && (
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="ml-4 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={title || subtitle || actions ? "p-5 pt-3" : "p-5"}>
        {children}
      </div>
    </section>
  );
}
