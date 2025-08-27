"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";

const tabs = [
  { id: "alerts", label: "Dashboard" },
  { id: "markets", label: "Markets" },
  { id: "wallet", label: "Wallets" },
  { id: "subscription", label: "Subscription" },
  { id: "treasury", label: "Treasury" },
  { id: "audit", label: "Audit Log" },
  { id: "console", label: "Console" },
];

export default function TopNavbar({
  onOpenConsole,
  onCloseConsole,
  isConsoleOpen,
  onNavigate,
}: {
  onOpenConsole: () => void;
  onCloseConsole: () => void;
  isConsoleOpen: boolean;
  onNavigate: (id: string) => void;
}) {
  const [active, setActive] = useState<string>("alerts");
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const sections = tabs
      .filter((t) => t.id !== "console")
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => !!el);

    observer.current?.disconnect();
    observer.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-64px 0px -70% 0px", threshold: [0.1, 0.25, 0.5, 0.75] }
    );

    sections.forEach((el) => observer.current?.observe(el));
    return () => observer.current?.disconnect();
  }, []);

  const go = (id: string) => {
    if (id === "console") {
      if (isConsoleOpen) {
        onCloseConsole();
      } else {
        onOpenConsole();
      }
    } else {
      onNavigate(id);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/90 backdrop-blur-md shadow-sm">
      <nav className="h-14 px-6 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="text-sm font-bold tracking-tight text-indigo-600"
        >
          Portia
          <span className="font-normal text-zinc-500">AI</span>
        </Link>

        {/* Tabs */}
        <ul className="hidden md:flex items-center gap-5 text-xs">
          {tabs.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => go(t.id)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  (t.id === "console" && isConsoleOpen) || active === t.id
                    ? "text-indigo-500 font-semibold underline underline-offset-4"
                    : "text-zinc-600 hover:text-indigo-400"
                }`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => go("console")}
            className={`p-2 rounded-full transition ${
              isConsoleOpen
                ? "bg-indigo-500 text-white shadow"
                : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Toggle Portia Console"
          >
            <Bot size={16} />
          </button>
        </div>
      </nav>
    </header>
  );
}
