"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel";
import ErrorBoundary from "@/components/ErrorBoundary";
import Skeleton from "@/components/Skeleton";
import { RefreshCw, ExternalLink } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import { LogEntry } from "@/components/dashboard/AuditLog";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";
import Link from "next/link";

interface Treasury {
  usdc: number;   // Sepolia USDC balance
  eth: number;    // Sepolia ETH balance
  circle?: number; // Circle sandbox balance
}

interface TreasuryPanelProps {
  treasury: Treasury | null;
  demoWallet: string;
  onRefresh: () => Promise<void>;
  eventsFeed?: LogEntry[];
}

export default function TreasuryPanel({
  treasury,
  demoWallet,
  onRefresh,
  eventsFeed = [],
}: TreasuryPanelProps) {
  const [treasuryHistory, setTreasuryHistory] = useState<
    { time: string; value: number }[]
  >([]);
  const [safeEvents, setSafeEvents] = useState<LogEntry[]>([]);

  const getTotal = (t: Treasury | null) => {
    if (!t) return 0;
    return (t.usdc ?? 0) + (t.eth ?? 0) * 3500 + (t.circle ?? 0);
  };

  const total = getTotal(treasury);

  // 📈 Track history (real values only)
  useEffect(() => {
    if (!treasury) return;
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setTreasuryHistory((prev) =>
      [...prev, { time: now, value: total }].slice(-10)
    );
  }, [total]);

  const handleRefresh = async () => {
    try {
      await onRefresh();
      toast.success("🔄 Treasury refreshed");
    } catch {
      toast.error("⚠️ Refresh failed");
    }
  };

  // 📜 Prepare safe events
  useEffect(() => {
    const baseEvents = eventsFeed.filter((e) =>
      ["mint", "redeem", "action", "info"].includes(e.type)
    );

    const hydrated = baseEvents.map((e) => ({
      ...e,
      timestamp: e.timestamp
        ? e.timestamp
        : new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
    }));

    setSafeEvents(hydrated.slice(0, 3));
  }, [eventsFeed.length]);

  const proportions = treasury
    ? [
        { label: "USDC", value: treasury.usdc, color: "bg-emerald-500" },
        { label: "ETH", value: (treasury.eth ?? 0) * 3500, color: "bg-indigo-500" },
        { label: "Circle", value: treasury.circle ?? 0, color: "bg-amber-500" },
      ]
    : [];

  const totalNonZero = proportions.reduce((sum, a) => sum + a.value, 0);

  return (
    <section id="treasury">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Overview */}
        <ErrorBoundary title="Treasury Overview">
          <Panel title="Treasury Overview" className="md:col-span-2">
            {treasury ? (
              <div className="space-y-5">
                {/* Total */}
                <div>
                  <p className="text-sm text-zinc-500">Total Value</p>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                    ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                    Wallet: {demoWallet.slice(0, 6)}...{demoWallet.slice(-4)}
                    <CopyButton text={demoWallet} />
                    <Link
                      href={`https://sepolia.etherscan.io/address/${demoWallet}`}
                      target="_blank"
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink size={12} /> View
                    </Link>
                  </div>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-xs text-zinc-500">USDC (Wallet)</p>
                    <p className="font-mono font-semibold">{treasury.usdc.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl p-3 bg-indigo-50 dark:bg-indigo-900/20">
                    <p className="text-xs text-zinc-500">ETH</p>
                    <p className="font-mono font-semibold">{treasury.eth.toFixed(3)} ETH</p>
                  </div>
                  <div className="rounded-xl p-3 bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-xs text-zinc-500">Circle</p>
                    <p className="font-mono font-semibold">
                      {(treasury.circle ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Proportion Bar */}
                <div>
                  <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 flex overflow-hidden">
                    {proportions.map((p, i) => {
                      const width = totalNonZero
                        ? `${(p.value / totalNonZero) * 100}%`
                        : "0%";
                      return <div key={i} className={`${p.color}`} style={{ width }} />;
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    {proportions.map((p, i) => (
                      <span key={i}>{p.label}</span>
                    ))}
                  </div>
                </div>

                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg 
                             border border-zinc-200 hover:bg-zinc-50 
                             dark:border-zinc-800 dark:hover:bg-zinc-900/60"
                >
                  <RefreshCw className="h-4 w-4" /> Refresh
                </button>
              </div>
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </Panel>
        </ErrorBoundary>

        {/* Right: Insights */}
        <ErrorBoundary title="Treasury Insights">
          <Panel title="Insights">
            <div className="space-y-4">
              {/* Trend Sparkline */}
              <div>
                <p className="text-xs text-zinc-500 mb-1">Treasury Trend</p>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={treasuryHistory}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Events */}
              <div>
                <p className="text-xs text-zinc-500 mb-1">Recent Events</p>
                <ul className="space-y-1 text-xs">
                  {safeEvents.map((e) => (
                    <li key={e.id} className="flex justify-between">
                      <span>{e.message}</span>
                      <span className="text-zinc-400">{e.timestamp ?? "--:--"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        </ErrorBoundary>
      </div>
    </section>
  );
}
