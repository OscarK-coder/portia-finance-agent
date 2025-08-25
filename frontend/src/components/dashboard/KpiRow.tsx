"use client";

import { useEffect, useState, ReactNode } from "react";
import {
  Wallet,
  CreditCard,
  Bell,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getCryptoPrice } from "@/lib/api";

// Glow effect hook
function useGlowEffect(value: number, type: "upDown" | "increaseOnly") {
  const [last, setLast] = useState(value);
  const [glow, setGlow] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value > last) setGlow("up");
    else if (value < last && type === "upDown") setGlow("down");
    setLast(value);

    if (glow) {
      const timer = setTimeout(() => setGlow(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return glow;
}

// Animated counter
const useCountUp = (target: number, duration = 1000, decimals = 0) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let frame: number;
    const initial = value;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(initial + (target - initial) * progress);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
};

interface KpiRowProps {
  treasury: number | null;           // total treasury (calculated in page.tsx)
  activeSubscriptions: number | null;
  alertsCount: number | null;
  transactions: number | null;
}

export default function KpiRow({
  treasury,
  activeSubscriptions,
  alertsCount,
  transactions,
}: KpiRowProps) {
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [ethChange, setEthChange] = useState<number>(0);

  // Fetch ETH price from backend
  useEffect(() => {
    const fetchEth = async () => {
      try {
        const res = await getCryptoPrice("ETH");
        if (res?.price) {
          // Calculate change if we already had a price
          if (ethPrice) {
            const change = ((res.price - ethPrice) / ethPrice) * 100;
            setEthChange(change);
          }
          setEthPrice(res.price);
        }
      } catch (err) {
        console.error("⚠️ Failed to fetch ETH price", err);
      }
    };
    fetchEth();
    const interval = setInterval(fetchEth, 60000);
    return () => clearInterval(interval);
  }, []);

  // Values
  const treasuryVal = treasury ?? 0;
  const subsVal = activeSubscriptions ?? 0;
  const alertsVal = alertsCount ?? 0;
  const txVal = transactions ?? 0;

  // Glow trackers
  const treasuryGlow = useGlowEffect(treasuryVal, "upDown");
  const subsGlow = useGlowEffect(subsVal, "upDown");
  const alertsGlow = useGlowEffect(alertsVal, "increaseOnly");
  const txGlow = useGlowEffect(txVal, "increaseOnly");

  // Card component
  const Card = ({
    label,
    icon,
    children,
    glow,
    glowColor,
  }: {
    label: string;
    icon: ReactNode;
    children: ReactNode;
    glow?: "up" | "down" | null;
    glowColor?: { up: string; down?: string };
  }) => (
    <div
      className="relative p-3 rounded-lg shadow bg-white/70 dark:bg-gray-900/70 
                 backdrop-blur border border-white/20 dark:border-zinc-700/30 
                 flex flex-col justify-between h-28 overflow-hidden"
    >
      {glow && (
        <div
          className={`absolute inset-0 rounded-lg pointer-events-none animate-pulse transition 
            ${glow === "up" ? glowColor?.up : glowColor?.down || ""}`}
        />
      )}
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 relative z-10">
        {icon}
        {label}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Market (ETH Only) */}
      <Card label="Market" icon={<span>📈</span>}>
        <div className="text-lg font-bold">
          ETH ${useCountUp(ethPrice, 1000, 0)}
          <div className="text-xs mt-1 flex items-center gap-1 font-normal">
            {ethChange >= 0 ? (
              <>
                <ArrowUpRight className="h-3 w-3 text-green-600" />
                <span>{ethChange.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="h-3 w-3 text-red-600" />
                <span>{ethChange.toFixed(1)}%</span>
              </>
            )}
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-600 inline-block mt-2">
          Sepolia
        </span>
      </Card>

      {/* Treasury */}
      <Card
        label="Treasury"
        icon={<Wallet className="h-4 w-4 text-emerald-500" />}
        glow={treasuryGlow}
        glowColor={{ up: "bg-green-400/20", down: "bg-red-400/20" }}
      >
        <div className="text-lg font-bold">
          ${useCountUp(treasuryVal, 1000, 0)}
        </div>
        <div className="text-[11px] text-zinc-500">Aggregated Assets</div>
      </Card>

      {/* Transactions */}
      <Card
        label="Transactions"
        icon={<Zap className="h-4 w-4 text-indigo-500" />}
        glow={txGlow}
        glowColor={{ up: "bg-blue-400/20" }}
      >
        <div className="text-lg font-bold">{useCountUp(txVal, 1000, 0)}</div>
        <div className="text-[11px] text-zinc-500">Audit Log entries</div>
      </Card>

      {/* Subscriptions */}
      <Card
        label="Subscriptions"
        icon={<CreditCard className="h-4 w-4 text-pink-500" />}
        glow={subsGlow}
        glowColor={{ up: "bg-green-400/20", down: "bg-red-400/20" }}
      >
        <div className="text-lg font-bold">{useCountUp(subsVal, 1000, 0)}</div>
        <div className="text-[11px] text-zinc-500 mt-1">Active Plans</div>
      </Card>

      {/* Alerts */}
      <Card
        label="Alerts"
        icon={<Bell className="h-4 w-4 text-amber-500" />}
        glow={alertsGlow}
        glowColor={{ up: "bg-amber-400/20" }}
      >
        <div className="text-lg font-bold">{useCountUp(alertsVal, 1000, 0)}</div>
        {alertsVal === 0 ? (
          <div className="flex items-center gap-2 text-sm mt-1 text-green-600">
            Stable
            <span className="text-zinc-500 dark:text-zinc-400 text-xs">
              • No active alerts
            </span>
          </div>
        ) : (
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-100 text-red-600 flex items-center gap-1">
              ⚠️ {alertsVal} Active
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
