"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { getEventIcon } from "@/lib/eventIcons";
import { getLogs } from "@/lib/api";
import Panel from "@/components/Panel";

export interface LogEntry {
  id: number;
  type: "info" | "success" | "error" | "action" | "alert";
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

interface AuditLogProps {
  events?: LogEntry[];
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
      let cls = "text-zinc-700";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = "text-indigo-500"; // keys
        else cls = "text-green-600"; // strings
      } else if (/true|false/.test(match)) cls = "text-amber-500"; // booleans
      else if (/null/.test(match)) cls = "text-pink-500"; // null
      else cls = "text-purple-500"; // numbers
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

// ✅ Dummy logs for testing
const DUMMY_LOGS: LogEntry[] = [
  {
    id: 1,
    type: "info",
    message: "Connected to Portia backend",
    timestamp: new Date().toISOString(),
  },
  {
    id: 2,
    type: "success",
    message: "USDC top-up confirmed",
    timestamp: new Date().toISOString(),
  },
  {
    id: 3,
    type: "error",
    message: "Subscription payment failed",
    timestamp: new Date().toISOString(),
    details: { plan: "Spotify", amount: "₹199", status: "failed" },
  },
  {
    id: 4,
    type: "action",
    message: "Judge requested balance refresh",
    timestamp: new Date().toISOString(),
  },
];

export default function AuditLog({ events: externalEvents }: AuditLogProps) {
  const [events, setEvents] = useState<LogEntry[]>(externalEvents ?? []);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalEvents) {
      setEvents(externalEvents);
      return;
    }

    const fetchLogs = async () => {
      try {
        const logs = await getLogs();
        setEvents(logs.length > 0 ? logs : DUMMY_LOGS);
      } catch {
        setEvents(DUMMY_LOGS);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [externalEvents]);

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
    const day = getDayLabel(new Date(e.timestamp));
    if (!groups[day]) groups[day] = [];
    groups[day].push(e);
    return groups;
  }, {} as Record<string, LogEntry[]>);

  return (
    <section id="audit">
      <Panel title="Audit Log">
        {/* Filters + Search */}
        <div className="flex flex-wrap gap-2 items-center mb-3">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <div className="flex items-center ml-auto bg-zinc-100 rounded-full px-2">
            <Search size={14} className="text-zinc-500" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="bg-transparent text-sm px-1 py-1 focus:outline-none rounded-full"
            />
          </div>
        </div>

        {/* Logs */}
        <div className="h-80 overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="wait">
            {filteredEvents.length === 0 ? (
              <motion.p
                key="no-events"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-zinc-500 flex items-center justify-center h-full"
              >
                No events found.
              </motion.p>
            ) : (
              Object.entries(groupedEvents)
                .sort(
                  (a, b) =>
                    new Date(b[1][0].timestamp).getTime() -
                    new Date(a[1][0].timestamp).getTime()
                )
                .map(([day, dayEvents]) => (
                  <div key={day} className="mb-4">
                    <h3 className="text-xs font-semibold text-zinc-500 mb-2 ml-1">
                      {day}
                    </h3>
                    {dayEvents.map((e, idx) => (
                      <motion.div
                        key={`${e.id}-${idx}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-3 rounded-lg mb-2 border border-zinc-200 bg-white shadow-sm"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {getEventIcon(e.type, 16)}
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-mono">
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
                              className="flex items-center gap-1 text-xs text-indigo-600"
                            >
                              {expanded[e.id] ? (
                                <>
                                  <ChevronUp size={14} /> Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={14} /> Details
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Message */}
                        <p className="text-sm font-medium text-zinc-800">
                          {e.message}
                        </p>

                        {/* Details */}
                        <AnimatePresence>
                          {expanded[e.id] && e.details && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="mt-2 p-2 rounded-md bg-zinc-100"
                            >
                              {highlightJSON(e.details)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                ))
            )}
          </AnimatePresence>
        </div>
      </Panel>
    </section>
  );
}
