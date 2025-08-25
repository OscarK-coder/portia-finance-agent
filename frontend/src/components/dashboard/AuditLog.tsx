"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Search, ChevronDown, ChevronUp } from "lucide-react";
import { getEventIcon } from "@/lib/eventIcons";
import { getLogs } from "@/lib/api";

export interface LogEntry {
  id: number;
  type: "info" | "success" | "error" | "action" | "alert";
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

interface AuditLogProps {
  events?: LogEntry[]; // 👈 external events (optional)
}

const FILTERS: (LogEntry["type"] | "all")[] = [
  "all",
  "info",
  "success",
  "error",
  "action",
  "alert",
];

/* --- JSON Syntax Highlighter --- */
const highlightJSON = (obj: Record<string, any>) => {
  const json = JSON.stringify(obj, null, 2);
  const regex =
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g;

  return json.split("\n").map((line, i) => {
    const parts = line.replace(regex, (match) => {
      let cls = "text-zinc-700 dark:text-zinc-200";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = "text-indigo-500";
        else cls = "text-green-600 dark:text-green-400";
      } else if (/true|false/.test(match)) cls = "text-amber-500";
      else if (/null/.test(match)) cls = "text-pink-500";
      else cls = "text-purple-500";
      return `<span class="${cls}">${match}</span>`;
    });

    return (
      <div
        key={i}
        className="font-mono text-xs leading-snug whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: parts }}
      />
    );
  });
};

export default function AuditLog({ events: externalEvents }: AuditLogProps) {
  const [events, setEvents] = useState<LogEntry[]>(externalEvents ?? []);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  // 🔹 Fetch logs from backend only if no external events passed
  useEffect(() => {
    if (externalEvents) {
      setEvents(externalEvents);
      return;
    }

    const fetchLogs = async () => {
      try {
        const logs = await getLogs();
        setEvents(logs);
      } catch (err) {
        console.warn("⚠️ Falling back to demo events, backend logs unavailable.", err);
        setEvents([
          {
            id: 1,
            type: "info",
            message: "✅ Backend service connected successfully (fallback).",
            timestamp: new Date().toISOString(),
          },
          {
            id: 2,
            type: "success",
            message: "Synced wallet balances (fallback).",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [externalEvents]);

  // Restore filter + search
  useEffect(() => {
    const savedFilter = localStorage.getItem("auditlog_filter");
    const savedSearch = localStorage.getItem("auditlog_search");
    if (savedFilter) setFilter(savedFilter);
    if (savedSearch) setSearch(savedSearch);
  }, []);

  useEffect(() => {
    localStorage.setItem("auditlog_filter", filter);
    localStorage.setItem("auditlog_search", search);
  }, [filter, search]);

  // Shortcut `/` focuses search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // --- Filter + search ---
  const filteredEvents = useMemo(() => {
    return events.filter(
      (e) =>
        (filter === "all" || e.type === filter) &&
        e.message.toLowerCase().includes(search.toLowerCase())
    );
  }, [events, filter, search]);

  // --- Group by day ---
  const getDayLabel = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const groupedEvents = filteredEvents.reduce((groups, e) => {
    const date = new Date(e.timestamp);
    const day = getDayLabel(date);
    if (!groups[day]) groups[day] = [];
    groups[day].push(e);
    return groups;
  }, {} as Record<string, LogEntry[]>);

  // --- CSV Export ---
  const exportCSV = () => {
    const rows = [
      ["id", "type", "message", "timestamp"],
      ...events.map((e) => [e.id, e.type, e.message, e.timestamp]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="audit">
      <div className="p-6 rounded-2xl shadow bg-white dark:bg-gray-900 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">📜 Audit Log</h2>
          <button
            onClick={exportCSV}
            title="Download as CSV"
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
          >
            Export
          </button>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-wrap gap-2 items-center">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <div className="flex items-center ml-auto bg-zinc-100 dark:bg-zinc-800 rounded-full px-2">
            <Search size={14} className="text-zinc-500" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs... ( / )"
              className="bg-transparent text-sm px-1 py-1 focus:outline-none rounded-full"
            />
          </div>
        </div>

        {/* Logs */}
        <div className="h-80 overflow-y-auto relative pr-2">
          <AnimatePresence mode="wait">
            {filteredEvents.length === 0 ? (
              <motion.p
                key="no-events"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center justify-center h-full"
              >
                No events found.
              </motion.p>
            ) : (
              Object.entries(groupedEvents)
                .sort((a, b) => {
                  const dA = new Date(a[1][0].timestamp).getTime();
                  const dB = new Date(b[1][0].timestamp).getTime();
                  return dB - dA;
                })
                .map(([day, dayEvents]) => (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                    className="mb-4 relative"
                  >
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 ml-2">
                      {day}
                    </h3>

                    {dayEvents
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() -
                          new Date(a.timestamp).getTime()
                      )
                      .map((e) => (
                        <motion.div
                          key={e.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.3 }}
                          className="relative flex flex-col gap-2 p-3 rounded-xl mb-3 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                        >
                          {/* Top row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 ml-1.5">
                              {getEventIcon(e.type, 16)}
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-mono">
                                {new Date(e.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                            </div>

                            {e.details && (
                              <button
                                onClick={() =>
                                  setExpanded((prev) => ({
                                    ...prev,
                                    [e.id]: !prev[e.id],
                                  }))
                                }
                                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-300"
                              >
                                {expanded[e.id] ? (
                                  <>
                                    <ChevronUp size={14} /> Hide Details
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown size={14} /> View Details
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Message */}
                          <div className="flex items-start gap-3 mt-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full 
                                  ${
                                    e.type === "error"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                      : e.type === "alert"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                      : e.type === "success"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : e.type === "info"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                      : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                                  }`}
                              >
                                {e.type.toUpperCase()}
                              </span>
                              <span className="text-sm md:text-base font-medium text-zinc-900 dark:text-zinc-100">
                                {e.message}
                              </span>
                            </div>
                          </div>

                          {/* Expandable details */}
                          {e.details && (
                            <AnimatePresence>
                              {expanded[e.id] && (
                                <motion.div
                                  key="details"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="mt-2 p-2 rounded-md bg-zinc-100 dark:bg-zinc-900 overflow-hidden"
                                >
                                  {highlightJSON(e.details)}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          )}
                        </motion.div>
                      ))}
                  </motion.div>
                ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
