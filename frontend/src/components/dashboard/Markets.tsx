"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import Panel from "@/components/Panel";
import Skeleton from "@/components/Skeleton";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { getCryptoPrice, getWalletBalance } from "@/lib/api";

interface MarketsProps {
  demoWallet: string;
}

export default function Markets({ demoWallet }: MarketsProps) {
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [ethChange, setEthChange] = useState<number>(0);
  const [ethSpark, setEthSpark] = useState<{ idx: number; price: number }[]>([]);

  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [ethBalance, setEthBalance] = useState<number>(0);
  const [portfolioHistory, setPortfolioHistory] = useState<
    { idx: number; price: number }[]
  >([]);
  const [portfolioChange, setPortfolioChange] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [gasFee, setGasFee] = useState<number | null>(null);

  // ETH price fetch
  useEffect(() => {
    const fetchEth = async () => {
      try {
        const res = await getCryptoPrice("ETH");
        if (res?.price) {
          setEthPrice(res.price);
          setEthSpark((prev) => {
            const next = [...prev, { idx: prev.length, price: res.price }].slice(-20);
            if (next.length > 1) {
              const first = next[0].price;
              const last = next[next.length - 1].price;
              setEthChange(((last - first) / first) * 100);
            }
            return next;
          });
        }
      } catch (err) {
        console.error("⚠️ ETH fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEth();
    const i = setInterval(fetchEth, 30000);
    return () => clearInterval(i);
  }, []);

  // Wallet balances (ETH + USDC)
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const wallet = await getWalletBalance(demoWallet);
        setUsdcBalance(wallet?.usdc ?? 0);
        setEthBalance(wallet?.eth ?? 0);
      } catch (err) {
        console.error("⚠️ Error fetching wallet balances:", err);
      }
    };
    fetchBalances();
    const i = setInterval(fetchBalances, 60000);
    return () => clearInterval(i);
  }, [demoWallet]);

  // Gas fee mock
  useEffect(() => {
    const fetchGas = async () =>
      setGasFee(Math.floor(Math.random() * 20) + 5);
    fetchGas();
    const i = setInterval(fetchGas, 30000);
    return () => clearInterval(i);
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

  // Portfolio total in USD
  const portfolioTotal =
    (usdcBalance ?? 0) + (ethBalance ?? 0) * (ethPrice ?? 0);

  // Track portfolio history & % change
  useEffect(() => {
    if (!portfolioTotal) return;
    setPortfolioHistory((prev) => {
      const next = [...prev, { idx: prev.length, price: portfolioTotal }];
      if (next.length > 1) {
        const first = next[0].price;
        const last = next[next.length - 1].price;
        setPortfolioChange(((last - first) / first) * 100);
      }
      return next.slice(-20);
    });
  }, [portfolioTotal]);

  const ChangeLine = ({ value }: { value?: number }) => {
    if (value === undefined) {
      return (
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <Minus className="h-3 w-3" /> –
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-xs">
        {value >= 0 ? (
          <ArrowUpRight className="h-3 w-3 text-emerald-500" />
        ) : (
          <ArrowDownRight className="h-3 w-3 text-rose-500" />
        )}
        <span className={value >= 0 ? "text-emerald-600" : "text-rose-600"}>
          {value.toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <section id="markets">
      <Panel title="Markets">
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* ETH */}
          <li className="rounded-lg border border-zinc-200 bg-white/70 p-3 flex flex-col">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-semibold">ETH</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-600">
                Sepolia
              </span>
            </div>
            <div className="text-lg font-bold">
              {ethPrice === null ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                `$${ethPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}`
              )}
            </div>
            <div className="flex justify-between items-center">
              <ChangeLine value={ethChange} />
              {ethSpark.length > 0 &&
                renderSparkline(ethSpark, ethChange >= 0)}
            </div>
          </li>

          {/* USDC */}
          <li className="rounded-lg border border-zinc-200 bg-white/70 p-3 flex flex-col">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-semibold">USDC</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-600">
                Stablecoin
              </span>
            </div>
            <div className="text-lg font-bold">$1.00</div>
            <div className="flex justify-between items-center">
              <ChangeLine /> {/* placeholder */}
            </div>
            <div className="text-xs text-zinc-500">Peg ±0.1%</div>
          </li>

          {/* Gas Fees */}
          <li className="rounded-lg border border-zinc-200 bg-white/70 p-3 flex flex-col">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-semibold">Gas Fees</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-600">
                Network
              </span>
            </div>
            <div className="text-lg font-bold">
              {gasFee ? `${gasFee} gwei` : <Skeleton className="h-6 w-12" />}
            </div>
            <div className="flex justify-between items-center">
              <ChangeLine /> {/* placeholder */}
            </div>
            <div className="text-xs text-zinc-500">Sepolia avg</div>
          </li>

          {/* Portfolio */}
          <li className="rounded-lg border border-zinc-200 bg-white/70 p-3 flex flex-col">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-semibold">Portfolio</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-600">
                Wallet
              </span>
            </div>
            <div className="text-lg font-bold">
              ${portfolioTotal.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="flex justify-between items-center">
              <ChangeLine value={portfolioChange} />
              {portfolioHistory.length > 1 &&
                renderSparkline(
                  portfolioHistory,
                  portfolioHistory[portfolioHistory.length - 1].price >=
                    portfolioHistory[0].price
                )}
            </div>
            <div className="text-xs text-zinc-500">
              {ethBalance.toFixed(3)} ETH + {usdcBalance.toFixed(2)} USDC
            </div>
          </li>
        </ul>
      </Panel>
    </section>
  );
}
