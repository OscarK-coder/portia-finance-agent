"use client";

import { CreditCard } from "lucide-react";
import Panel from "@/components/Panel";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import type { Subscription } from "@/lib/api";

interface SubscriptionPanelProps {
  subscriptions: Subscription[];
  balance: number;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}

export default function SubscriptionPanel({
  subscriptions,
  balance,
  onPause,
  onResume,
  onCancel,
}: SubscriptionPanelProps) {
  // Animate Stripe balance
  const motionBalance = useMotionValue(balance);
  const balanceDisplay = useTransform(motionBalance, (latest) =>
    `$${latest.toFixed(2)}`
  );
  const [flash, setFlash] = useState<"down" | "up" | null>(null);

  useEffect(() => {
    const controls = animate(motionBalance, balance, {
      duration: 0.8,
      ease: "easeOut",
    });
    setFlash(balance < motionBalance.get() ? "down" : "up");
    const t = setTimeout(() => setFlash(null), 600);
    return () => {
      controls.stop();
      clearTimeout(t);
    };
  }, [balance, motionBalance]);

  const sortedSubs = [...subscriptions].sort((a, b) => {
    if (!a.renews_on) return 1;
    if (!b.renews_on) return -1;
    return new Date(a.renews_on).getTime() - new Date(b.renews_on).getTime();
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-600",
      paused: "bg-amber-100 text-amber-600",
      canceled: "bg-rose-100 text-rose-600",
      trialing: "bg-purple-100 text-purple-600",
    };
    return (
      <span
        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
          map[status] || "bg-zinc-200 text-zinc-600"
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <section id="subscriptions">
      <Panel title="Subscriptions">
        {/* ✅ Animated Balance */}
        <div className="mb-4 text-sm font-medium flex items-center gap-2">
          Stripe Balance:{" "}
          <motion.span
            className={`font-semibold ${
              flash === "down" ? "text-rose-500" : "text-emerald-600"
            } transition-colors`}
          >
            {balanceDisplay}
          </motion.span>
        </div>

        {sortedSubs.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No subscriptions</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedSubs.map((sub) => (
              <div
                key={sub.id}
                className={`p-4 rounded-xl border ${
                  sub.status === "canceled"
                    ? "border-zinc-300 bg-zinc-100 opacity-70"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {sub.logo ? (
                      <img
                        src={sub.logo}
                        alt={sub.plan}
                        className="w-8 h-8 rounded object-contain"
                      />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center bg-zinc-200 rounded text-xs font-bold">
                        {sub.logoFallback || sub.plan.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-zinc-800">{sub.plan}</p>
                      <p className="text-xs text-zinc-500">
                        {sub.renews_on
                          ? `Renews on ${new Date(
                              sub.renews_on
                            ).toLocaleDateString()}`
                          : "No renewal date"}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(sub.status)}
                </div>

                <div className="flex items-center gap-1 text-xs text-zinc-500 mb-2">
                  <CreditCard size={14} />
                  Last payment: via Stripe Sandbox
                </div>

                <div className="flex gap-2">
                  {sub.status === "active" && (
                    <>
                      <button
                        onClick={() => onPause(sub.id)}
                        className="flex-1 px-3 py-1 text-xs bg-amber-500 text-white rounded-full"
                      >
                        Pause
                      </button>
                      <button
                        onClick={() => onCancel(sub.id)}
                        className="flex-1 px-3 py-1 text-xs bg-rose-600 text-white rounded-full"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {sub.status === "paused" && (
                    <button
                      onClick={() => onResume(sub.id)}
                      className="flex-1 px-3 py-1 text-xs bg-emerald-600 text-white rounded-full"
                    >
                      Resume
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </section>
  );
}
