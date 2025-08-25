"use client";

import { useState, useEffect, useRef } from "react";

import AuditLog, { LogEntry } from "@/components/dashboard/AuditLog";
import KpiRow from "@/components/dashboard/KpiRow";
import Markets from "@/components/dashboard/Markets";
import Wallets from "@/components/dashboard/Wallets";
import SubscriptionPanel from "@/components/dashboard/SubscriptionPanel";
import TreasuryPanel from "@/components/dashboard/TreasuryPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import TopNavbar from "@/components/TopNavBar";
import AiPanel from "@/components/PortiaConsole/AiPanel";

import {
  getSubscriptions,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  getCircleBalances,
  getWalletBalance,
  getAlerts,
  getLogs,
  type Subscription,
  type SubscriptionResponse,
  type Alert,
} from "@/lib/api";

export default function Page() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stripeBalance, setStripeBalance] = useState<number>(0);
  const [treasury, setTreasury] = useState<{ usdc: number; eth: number; circle: number }>({
    usdc: 0,
    eth: 0,
    circle: 0,
  });

  const usageRef = useRef<HTMLDivElement | null>(null);

  const demoWallet =
    process.env.NEXT_PUBLIC_DEMO_WALLET ||
    "0x9ba79e76F4d1B06fA48855DC34e3D6E7bb1BED2B";
  const judgeWallet =
    process.env.NEXT_PUBLIC_JUDGE_WALLET ||
    "0x0eaa75FfdadCdb688E1055154818fE1dB0718bab";

  /* --------------------------
   * Fetch initial data
   * --------------------------*/
  useEffect(() => {
    (async () => {
      try {
        const res: SubscriptionResponse = await getSubscriptions("user1");
        setSubscriptions(res.subs);
        setStripeBalance(res.balance);

        const circle = await getCircleBalances();
        const circleBalance =
          circle.balances.find((b) => b.currency === "USD")?.amount || 0;

        const wallet = await getWalletBalance(demoWallet);

        setTreasury({
          usdc: wallet.usdc,
          eth: wallet.eth,
          circle: circleBalance,
        });

        const fetchedAlerts = await getAlerts();
        setAlerts(fetchedAlerts);

        const fetchedLogs = await getLogs();
        setLogs(fetchedLogs);
      } catch (err) {
        console.error("❌ Failed to fetch initial data", err);
      }
    })();
  }, []);

  /* --------------------------
   * Subscription Actions
   * --------------------------*/
  const handlePause = async (id: string) => {
    const res = await pauseSubscription("user1", id);
    setSubscriptions(res.subs);
    setStripeBalance(res.balance);
    setLogs((prev) => [
      {
        id: Date.now(),
        type: "action",
        message: `Paused subscription: ${id}`,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  const handleResume = async (id: string) => {
    const res = await resumeSubscription("user1", id);
    setSubscriptions(res.subs);
    setStripeBalance(res.balance);
    setLogs((prev) => [
      {
        id: Date.now(),
        type: "action",
        message: `Resumed subscription: ${id}`,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  const handleCancel = async (id: string) => {
    const res = await cancelSubscription("user1", id);
    setSubscriptions(res.subs);
    setStripeBalance(res.balance);
    setLogs((prev) => [
      {
        id: Date.now(),
        type: "action",
        message: `Canceled subscription: ${id}`,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  /* --------------------------
   * Refresh Treasury
   * --------------------------*/
  const refreshTreasury = async () => {
    const circle = await getCircleBalances();
    const circleBalance =
      circle.balances.find((b) => b.currency === "USD")?.amount || 0;

    const wallet = await getWalletBalance(demoWallet);

    setTreasury({
      usdc: wallet.usdc,
      eth: wallet.eth,
      circle: circleBalance,
    });

    setLogs((prev) => [
      {
        id: Date.now(),
        type: "info",
        message: "Treasury refreshed",
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  /* --------------------------
   * Render
   * --------------------------*/
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black text-zinc-900 dark:text-zinc-100">
      <TopNavbar
        onOpenConsole={() => setIsConsoleOpen(true)}
        onCloseConsole={() => setIsConsoleOpen(false)}
        isConsoleOpen={isConsoleOpen}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-10 pb-10 space-y-8">
        <ErrorBoundary title="KPIs">
          <KpiRow
            treasury={treasury.usdc + treasury.circle + treasury.eth * 3500}
            activeSubscriptions={
              subscriptions.filter((s) => s.status === "active").length
            }
            alertsCount={alerts.length}
            transactions={logs.filter((e) => e.type === "action").length}
          />
        </ErrorBoundary>

        <ErrorBoundary title="Markets">
          <Markets transactionsFeed={logs} />
        </ErrorBoundary>

        <ErrorBoundary title="Wallets">
          <Wallets demoWallet={demoWallet} judgeWallet={judgeWallet} />
        </ErrorBoundary>

        <ErrorBoundary title="Subscriptions">
          <SubscriptionPanel
            subscriptions={subscriptions}
            balance={stripeBalance}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
          />
        </ErrorBoundary>

        <ErrorBoundary title="Treasury">
          <TreasuryPanel
            treasury={treasury}
            demoWallet={demoWallet}
            onRefresh={refreshTreasury}
            eventsFeed={logs}
          />
        </ErrorBoundary>

        <ErrorBoundary title="Audit Log">
          <section id="audit" ref={usageRef}>
            <AuditLog events={logs} />
          </section>
        </ErrorBoundary>
      </div>

      <AiPanel
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
      />
    </main>
  );
}
