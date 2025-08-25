"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import Panel from "@/components/Panel";
import Skeleton from "@/components/Skeleton";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { getEventIcon } from "@/lib/eventIcons";
import { getCryptoPrice } from "@/lib/api"; // ✅ use backend API

export interface LogEntry {
  id: number;
  type: "info" | "success" | "error" | "action" | "alert" | "sent" | "recv";
  message: string;
  timestamp: string;
}

interface MarketsProps {
  transactionsFeed?: LogEntry[] | any[];
}

export default function Markets({ transactionsFeed = [] }: MarketsProps) {
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [ethChange, setEthChange] = useState<number>(0);
  const [ethSpark, setEthSpark] = useState<{ idx: number; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [gasFee, setGasFee] = useState<number | null>(null);

  // ETH fetch (backend)
  useEffect(() => {
    const fetchEth = async () => {
      try {
        const res = await getCryptoPrice("ETH"); // ✅ backend API
        if (res?.price) {
          setEthPrice(res.price);

          // Sparkline: just append to local history
          setEthSpark((prev) => {
            const next = [...prev, { idx: prev.length, price: res.price }];
            return next.slice(-20); // keep last 20 points
          });

          if (ethSpark.length > 1) {
            const first = ethSpark[0].price;
            const last = res.price;
            setEthChange(((last - first) / first) * 100);
          }
        }
      } catch (err) {
        console.error("Error fetching ETH price:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEth();
    const interval = setInterval(fetchEth, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Mock gas fee (replace with Alchemy later if needed)
  useEffect(() => {
    const fetchGas = async () =>
      setGasFee(Math.floor(Math.random() * 20) + 5);
    fetchGas();
    const interval = setInterval(fetchGas, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderSparkline = (
    data: { idx: number; price: number }[],
    isUp: boolean
  ) => (
    <div className="w-20 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="price"
            stroke={isUp ? "#10b981" : "#ef4444"}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  // Normalize transactions
  const latestTx: LogEntry[] = transactionsFeed
    .slice(0, 3)
    .map((tx: any, idx: number) => ({
      id: tx.id ?? idx,
      type: tx.type ?? "info",
      message: tx.message ?? tx.desc ?? "",
      timestamp: tx.timestamp ?? tx.time ?? "",
    }));

  return (
    <section id="markets">
      <Panel title="Markets">
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* ETH */}
          <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-4 flex flex-col justify-between">
            {loading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">ETH</span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-600">
                    Sepolia
                  </span>
                </div>
                <div className="text-lg font-bold">
                  ${ethPrice?.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {ethChange >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-rose-500" />
                  )}
                  <span
                    className={
                      ethChange >= 0 ? "text-emerald-600" : "text-rose-600"
                    }
                  >
                    {ethChange.toFixed(1)}%
                  </span>
                </div>
                {ethSpark.length > 0 && renderSparkline(ethSpark, ethChange >= 0)}
              </>
            )}
          </li>

          {/* USDC */}
          <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-semibold">USDC</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-600">
                Stablecoin
              </span>
            </div>
            <div className="text-lg font-bold">$1.00</div>
            <div className="text-xs text-zinc-500">Peg ±0.1%</div>
          </li>

          {/* Gas Fees */}
          <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Gas Fees</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-600">
                Network Cost
              </span>
            </div>
            <div className="text-lg font-bold">
              {gasFee ? `${gasFee} gwei` : <Skeleton className="h-6 w-16" />}
            </div>
            <div className="text-xs text-zinc-500">Sepolia avg fee</div>
          </li>

          {/* Treasury Recent Transactions */}
          <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Treasury</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-600">
                Activity
              </span>
            </div>
            <ul className="space-y-1 text-xs">
              {latestTx.length > 0 ? (
                latestTx.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1">
                      {getEventIcon(tx.type, 12)}
                      <span>{tx.message}</span>
                    </div>
                    <span className="text-zinc-500 text-[10px]">
                      {tx.timestamp}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-zinc-500 italic">No recent transactions</li>
              )}
            </ul>
          </li>
        </ul>
      </Panel>
    </section>
  );
}
