"use client";

import { useState, useEffect, useRef } from "react";

import AuditLog from "@/components/dashboard/AuditLog";
import type { LogEntry } from "@/types/audit-log";

import KpiRow from "@/components/dashboard/KpiRow";
import Markets from "@/components/dashboard/Markets";
import Alerts from "@/components/dashboard/Alerts";
import Wallets from "@/components/dashboard/Wallets";
import SubscriptionPanel from "@/components/dashboard/SubscriptionPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import TopNavbar from "@/components/TopNavBar";
import AiPanel from "@/components/PortiaConsole/AiPanel";

import { getLogs, type Subscription } from "@/lib/api";
import { mockAlerts } from "@/lib/mockAlerts";
import { MOCK_SUBSCRIPTIONS } from "@/lib/mockSubscriptions";

import type { Alert } from "@/lib/api";

const uniqueId = () => Date.now() + Math.floor(Math.random() * 1000);

/* Smooth scroll helper with offset for navbar */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  const yOffset = -56; // h-14 navbar height
  const y = el.getBoundingClientRect().top + window.scrollY + yOffset;

  window.scrollTo({ top: y, behavior: "smooth" });
}

export default function Page() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<Alert | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(MOCK_SUBSCRIPTIONS);
  const [stripeBalance, setStripeBalance] = useState<number>(76.43);

  const usageRef = useRef<HTMLDivElement | null>(null);

  const demoWallet =
    process.env.NEXT_PUBLIC_DEMO_WALLET ||
    "0x9ba79e76F4d1B06fA48855DC34e3D6E7bb1BED2B";
  const judgeWallet =
    process.env.NEXT_PUBLIC_JUDGE_WALLET ||
    "0x0eaa75FfdadCdb688E1055154818fE1dB0718bab";

  useEffect(() => {
    (async () => {
      try {
        const fetchedLogs = await getLogs();
        setLogs(fetchedLogs ?? []);
      } catch (err) {
        console.error("❌ Failed to fetch logs", err);
      }
    })();
  }, []);

  const handleExecuteAction = (action: string) => {
    let logMessage = "";
    let updatedAlerts = [...alerts];

    if (action.includes("Cancel Netflix")) {
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.plan === "Netflix" ? { ...s, status: "canceled" } : s
        )
      );
      setStripeBalance((b) => b - 15.49);
      logMessage = "Canceled Netflix (refunded $15.49).";
      updatedAlerts = updatedAlerts.filter((a) => !a.message.includes("Netflix"));
    }
    if (action.includes("Pause Spotify")) {
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.plan === "Spotify" ? { ...s, status: "paused" } : s
        )
      );
      logMessage = "Paused Spotify subscription.";
      updatedAlerts = updatedAlerts.filter((a) => !a.message.includes("Spotify"));
    }
    if (action.includes("Cancel Apple Music")) {
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.plan === "Apple Music" ? { ...s, status: "canceled" } : s
        )
      );
      setStripeBalance((b) => b - 10.99);
      logMessage = "Canceled Apple Music (refunded $10.99).";
      updatedAlerts = updatedAlerts.filter((a) => !a.message.includes("Apple Music"));
    }
    if (action.includes("Cancel ChatGPT Plus")) {
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.plan === "ChatGPT Plus" ? { ...s, status: "canceled" } : s
        )
      );
      setStripeBalance((b) => b - 20.0);
      logMessage = "Canceled ChatGPT Plus (refunded $20).";
      updatedAlerts = updatedAlerts.filter((a) => !a.message.includes("ChatGPT Plus"));
    }

    setAlerts(updatedAlerts);
    if (logMessage) {
      setLogs((prev) => [
        {
          id: uniqueId(),
          type: "action",
          message: logMessage,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white text-zinc-900">
      <TopNavbar
        onOpenConsole={() => setIsConsoleOpen(true)}
        onCloseConsole={() => setIsConsoleOpen(false)}
        isConsoleOpen={isConsoleOpen}
        onNavigate={scrollToSection}
      />

      {/* Push content below navbar */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 pb-10 space-y-8 pt-14">
        <ErrorBoundary title="KPIs">
          <KpiRow
            treasury={(subscriptions ?? []).length * 100}
            activeSubscriptions={
              (subscriptions ?? []).filter((s) => s.status === "active").length
            }
            alertsCount={(alerts ?? []).length}
            transactions={(logs ?? []).filter((e) => e.type === "action").length}
          />
        </ErrorBoundary>

        <ErrorBoundary title="Markets">
          <Markets demoWallet={demoWallet} />
        </ErrorBoundary>

        <ErrorBoundary title="Alerts">
          <Alerts
            alerts={alerts ?? []}
            onAskPortia={(alert: Alert) => {
              setAiPrompt(alert);
              setIsConsoleOpen(true);
            }}
          />
        </ErrorBoundary>

        <ErrorBoundary title="Wallets">
          <Wallets demoWallet={demoWallet} judgeWallet={judgeWallet} />
        </ErrorBoundary>

        <ErrorBoundary title="Subscriptions">
          <SubscriptionPanel
            subscriptions={subscriptions ?? []}
            balance={stripeBalance ?? 0}
            onPause={async (id) => {
              setSubscriptions((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, status: "paused" } : s
                )
              );
            }}
            onResume={async (id) => {
              setSubscriptions((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, status: "active" } : s
                )
              );
            }}
            onCancel={async (id) => {
              setSubscriptions((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, status: "canceled" } : s
                )
              );
            }}
          />
        </ErrorBoundary>

        <ErrorBoundary title="Audit Log">
          <section id="audit" ref={usageRef}>
            <AuditLog
              events={(logs ?? []).map((e) => ({
                ...e,
                id: uniqueId(),
              }))}
            />
          </section>
        </ErrorBoundary>
      </div>

      {/* ✅ AiPanel has no `events` prop */}
      <AiPanel
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
        preload={aiPrompt}
        onLog={(entry) =>
          setLogs((prev) => [{ ...entry, id: uniqueId() }, ...prev])
        }
        onExecuteAction={handleExecuteAction}
      />
    </main>
  );
}
