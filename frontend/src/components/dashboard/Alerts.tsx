"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Info, CheckCircle, XCircle, Siren } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Panel from "@/components/Panel";
import { mockAlerts } from "@/lib/mockAlerts";
import type { Alert } from "@/lib/api";
import { getAlerts, resolveAlert, pushLog } from "@/lib/api";

function Time({ ts }: { ts?: string }) {
  const [formatted, setFormatted] = useState("");
  useEffect(() => {
    if (ts) setFormatted(new Date(ts).toLocaleTimeString());
  }, [ts]);
  return <>{formatted || "just now"}</>;
}

const LEVEL_STYLES: Record<
  string,
  { icon: React.ElementType; color: string; label: string; extra?: string }
> = {
  info: { icon: Info, color: "text-blue-500", label: "Info" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", label: "Warning" },
  error: { icon: XCircle, color: "text-red-500", label: "Error" },
  success: { icon: CheckCircle, color: "text-green-500", label: "Success" },
  critical: {
    icon: AlertTriangle, // could swap with a custom siren if you prefer
    color: "text-red-700",
    label: "Critical 🚨",
    extra: "animate-pulse", // ✅ pulsing effect
  },
};

interface AlertsProps {
  alerts?: Alert[];
  onAskPortia: (payload: Alert) => void;
}

export default function Alerts({ alerts: externalAlerts, onAskPortia }: AlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>(externalAlerts ?? []);

  async function refresh() {
    if (externalAlerts) return setAlerts(externalAlerts);
    try {
      const data = await getAlerts();
      setAlerts(data);
    } catch {
      setAlerts(mockAlerts);
    }
  }

  useEffect(() => {
    if (!externalAlerts) refresh();
  }, [externalAlerts]);

  // 🔑 Called by AiPanel (via window.resolveAlertExternally)
  useEffect(() => {
    (window as any).resolveAlertExternally = async (id: number, reason?: string) => {
      setAlerts((prev) => prev.filter((a) => a.id !== id)); // remove from alerts tab
      try {
        await resolveAlert(id);
        await pushLog("success", `Alert resolved: ${reason || "No details"}`);
      } catch (err) {
        console.warn("⚠️ Failed to resolve alert:", err);
      }
    };
  }, []);

  return (
    <section id="alerts" className="mt-8">
      <Panel title="Alerts">
        {alerts.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">🎉 No active alerts</p>
        ) : (
          <div className="max-h-56 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            <AnimatePresence mode="sync">
              {alerts.map((alert) => {
                const style = LEVEL_STYLES[alert.level] || LEVEL_STYLES.info;
                const Icon = style.icon;

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    layout
                    className={`flex items-center gap-3 p-3 rounded-lg shadow-sm border border-zinc-200 
                      ${alert.level === "critical" ? "bg-red-50 border-red-300" : "bg-white/80"}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className={`${style.color} ${style.extra || ""}`} size={18} />
                    </div>

                    <div className="flex-1">
                      <p className="text-sm text-zinc-800 font-medium">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[11px] font-medium ${style.color} ${style.extra || ""}`}
                        >
                          {style.label}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          <Time ts={alert.timestamp} />
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onAskPortia(alert)} // ✅ open AiPanel
                      className={`ml-auto px-3 py-1 text-[11px] rounded-full 
                        ${alert.level === "critical"
                          ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
                          : "bg-zinc-200 hover:bg-zinc-300 text-zinc-800"}
                        transition shadow-sm`}
                    >
                      Ask Portia
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Panel>
    </section>
  );
}
