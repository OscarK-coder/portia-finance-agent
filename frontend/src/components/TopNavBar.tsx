"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react";

const tabs = [
  { id: "alerts", label: "Dashboard" },
  { id: "markets", label: "Markets" },
  { id: "wallet", label: "Wallets" },
  { id: "subscription", label: "Subscription" },
  { id: "treasury", label: "Treasury" },
  { id: "audit", label: "Audit Log" },
  { id: "console", label: "Console" }, // ✅ Console tab toggles AI panel
];

export default function TopNavbar({
  onOpenConsole,
  onCloseConsole,
  isConsoleOpen,
}: {
  onOpenConsole: () => void;
  onCloseConsole: () => void;
  isConsoleOpen: boolean;
}) {
  const [active, setActive] = useState<string>("alerts");
  const [darkMode, setDarkMode] = useState(false);
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
        onCloseConsole(); // ✅ clicking again closes
      } else {
        onOpenConsole();
      }
    } else {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur dark:bg-zinc-900/80 dark:border-zinc-800">
      <nav className="h-14 px-6 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Console
        </Link>

        {/* Tabs */}
        <ul className="hidden md:flex items-center gap-4 text-xs">
          {tabs.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => go(t.id)}
                className={`px-2 py-1 rounded transition-colors ${
                  (t.id === "console" && isConsoleOpen) || active === t.id
                    ? "text-indigo-500 underline underline-offset-4"
                    : "text-zinc-600 hover:text-indigo-400 dark:text-zinc-400 dark:hover:text-indigo-300"
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
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            title="Toggle Theme"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>
    </header>
  );
}
