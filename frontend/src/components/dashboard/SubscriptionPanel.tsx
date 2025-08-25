"use client";

import Image from "next/image";
import { CreditCard } from "lucide-react";
import Panel from "@/components/Panel";
import { pushLog, askPortia } from "@/lib/api";
import type { Subscription } from "@/lib/api";

interface SubscriptionPanelProps {
  subscriptions: Subscription[];
  balance?: number;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}

export default function SubscriptionPanel({
  subscriptions = [],
  balance = 0,
  onPause,
  onResume,
  onCancel,
}: SubscriptionPanelProps) {
  // ✅ Show all, including canceled
  const sortedSubs = [...subscriptions].sort((a, b) => {
    if (!a.renews_on) return 1;
    if (!b.renews_on) return -1;
    return new Date(a.renews_on).getTime() - new Date(b.renews_on).getTime();
  });

  const counts = {
    active: subscriptions.filter((s) => s.status === "active").length,
    paused: subscriptions.filter((s) => s.status === "paused").length,
    trialing: subscriptions.filter((s) => s.status === "trialing").length,
    canceled: subscriptions.filter((s) => s.status === "canceled").length,
  };

  const getStatusBadge = (status: Subscription["status"]) => {
    const map: Record<Subscription["status"], string> = {
      active: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      paused: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      canceled: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
      trialing: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${map[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRenewalProgress = (renews_on: string | null) => {
    if (!renews_on) return 0;
    const renewDate = new Date(renews_on).getTime();
    const now = Date.now();
    const totalCycle = 30 * 24 * 60 * 60 * 1000;
    const remaining = Math.max(renewDate - now, 0);
    return Math.min(100, Math.max(0, Math.round(((totalCycle - remaining) / totalCycle) * 100)));
  };

  const getProgressColor = (percent: number) => {
    if (percent > 50) return "bg-emerald-500";
    if (percent > 20) return "bg-amber-500";
    return "bg-rose-500";
  };

  // handlers with logging + Portia call
  const handlePause = async (sub: Subscription) => {
    await onPause(sub.id);
    pushLog("action", `Paused subscription: ${sub.plan}`, { subId: sub.id });
    await askPortia(`Subscription ${sub.plan} was paused. Should I suggest renewal?`);
  };

  const handleResume = async (sub: Subscription) => {
    await onResume(sub.id);
    pushLog("action", `Resumed subscription: ${sub.plan}`, { subId: sub.id });
    await askPortia(`Subscription ${sub.plan} was resumed.`);
  };

  const handleCancel = async (sub: Subscription) => {
    await onCancel(sub.id);
    pushLog("action", `Canceled subscription: ${sub.plan}`, { subId: sub.id });
    await askPortia(`Subscription ${sub.plan} was canceled. Suggest next action.`);
  };

  return (
    <section id="subscriptions">
      <Panel title="Subscriptions">
        <div className="mb-4 text-sm font-medium">
          Stripe Balance:{" "}
          <span className="text-emerald-600 dark:text-emerald-400">${balance.toFixed(2)}</span>
        </div>

        {sortedSubs.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No subscriptions</p>
        ) : (
          <>
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-4">
              <span className="text-emerald-600 dark:text-emerald-400">{counts.active} Active</span>
              <span className="text-amber-600 dark:text-amber-400">{counts.paused} Paused</span>
              <span className="text-purple-600 dark:text-purple-400">{counts.trialing} Trialing</span>
              <span className="text-rose-600 dark:text-rose-400">{counts.canceled} Canceled</span>
            </div>

            {/* Cards */}
            <div className="flex gap-6 overflow-x-auto pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible">
              {sortedSubs.map((sub) => {
                const progress = getRenewalProgress(sub.renews_on);
                return (
                  <div
                    key={sub.id}
                    className={`flex flex-col gap-3 rounded-xl border p-5 shadow-sm transition min-w-[240px] md:min-w-0
                      ${
                        sub.status === "canceled"
                          ? "border-zinc-300 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/40 opacity-70"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                      }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {sub.logo ? (
                          <Image src={sub.logo} alt={sub.plan} width={32} height={32} className="rounded" />
                        ) : (
                          <div className="w-8 h-8 flex items-center justify-center rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-bold">
                            {sub.plan.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{sub.plan}</p>
                          <p className="text-xs text-zinc-500">
                            {sub.renews_on
                              ? `Renews on ${new Date(sub.renews_on).toLocaleDateString()}`
                              : "No renewal date"}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(sub.status)}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <CreditCard size={14} />
                      Last payment: via Portia Mock
                    </div>

                    {sub.renews_on && (
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 mt-2">
                        <div className={`${getProgressColor(progress)} h-2 rounded-full`} style={{ width: `${progress}%` }} />
                      </div>
                    )}

                    <div className="flex gap-2 mt-auto">
                      {sub.status === "active" && (
                        <>
                          <button onClick={() => handlePause(sub)} className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition">
                            Pause
                          </button>
                          <button onClick={() => handleCancel(sub)} className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition">
                            Cancel
                          </button>
                        </>
                      )}
                      {sub.status === "paused" && (
                        <button onClick={() => handleResume(sub)} className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Panel>
    </section>
  );
}
