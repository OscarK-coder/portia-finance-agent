"use client";

import { useEffect, useState } from "react";
import { Wallet, CreditCard, ExternalLink } from "lucide-react";
import Panel from "@/components/Panel";
import CopyButton from "@/components/CopyButton";
import Link from "next/link";
import type { LogEntry } from "@/components/dashboard/AuditLog";
import { getWalletBalance, getCryptoPrice, getTransactions, TxEntry } from "@/lib/api";
import toast from "react-hot-toast";
import Skeleton from "@/components/Skeleton";

interface WalletBalance {
  usdc: number;
  eth: number;
}
interface WalletsProps {
  demoWallet: string;
  judgeWallet: string;
  eventsFeed?: LogEntry[];
}

export default function Wallets({
  demoWallet,
  judgeWallet,
}: WalletsProps) {
  const [demoBalance, setDemoBalance] = useState<WalletBalance | null>(null);
  const [judgeBalance, setJudgeBalance] = useState<WalletBalance | null>(null);
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [usdcPrice, setUsdcPrice] = useState<number | null>(null);

  const [demoTxs, setDemoTxs] = useState<TxEntry[]>([]);
  const [judgeTxs, setJudgeTxs] = useState<TxEntry[]>([]);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const demo = await getWalletBalance(demoWallet);
        const judge = await getWalletBalance(judgeWallet);
        setDemoBalance({ usdc: demo.usdc, eth: demo.eth });
        setJudgeBalance({ usdc: judge.usdc, eth: judge.eth });
      } catch (err) {
        console.error("⚠️ Error fetching balances:", err);
        toast.error("Failed to fetch wallet balances");
      }
    };

    const fetchPrices = async () => {
      try {
        const [eth, usdc] = await Promise.all([
          getCryptoPrice("eth"),
          getCryptoPrice("usdc"),
        ]);
        setEthPrice(eth.price);
        setUsdcPrice(usdc.price);
      } catch (err) {
        console.error("⚠️ Error fetching prices:", err);
      }
    };

    const fetchTxs = async () => {
      try {
        setDemoTxs(await getTransactions(demoWallet));
        setJudgeTxs(await getTransactions(judgeWallet));
      } catch (err) {
        console.error("⚠️ Error fetching txs:", err);
      }
    };

    fetchBalances();
    fetchPrices();
    fetchTxs();

    const i = setInterval(() => {
      fetchBalances();
      fetchPrices();
      fetchTxs();
    }, 20000);

    return () => clearInterval(i);
  }, [demoWallet, judgeWallet]);

  const renderWallet = (
    label: string,
    address: string,
    balance: WalletBalance | null,
    txs: TxEntry[],
    icon: React.ReactNode,
    badge: string
  ) => {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white shadow-sm w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border p-2 border-zinc-200 bg-zinc-50 text-zinc-600">
              {icon}
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-800">{label}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                {badge}
              </span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="flex flex-col gap-1 text-xs">
          <p className="break-all text-zinc-600">{address}</p>
          <div className="flex items-center gap-2">
            <CopyButton text={address} />
            <Link
              href={`https://sepolia.etherscan.io/address/${address}`}
              target="_blank"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <ExternalLink size={14} /> View on Etherscan
            </Link>
          </div>
        </div>

        {/* Balances */}
        {balance ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* USDC */}
            <div className="rounded-lg p-3 bg-emerald-100/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold">USDC</span>
              </div>
              <p className="font-mono font-bold text-lg text-zinc-900">
                {balance.usdc.toFixed(2)}
              </p>
              <p className="text-[11px] text-zinc-500">
                ≈ $
                {usdcPrice !== null
                  ? (balance.usdc * usdcPrice).toFixed(2)
                  : "—"}
              </p>
            </div>

            {/* ETH */}
            <div className="rounded-lg p-3 bg-indigo-100/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold">ETH</span>
              </div>
              <p className="font-mono font-bold text-lg text-zinc-900">
                {balance.eth.toFixed(4)}
              </p>
              <p className="text-[11px] text-zinc-500">
                ≈ $
                {ethPrice !== null
                  ? (balance.eth * ethPrice).toFixed(2)
                  : "—"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        )}

        {/* Transactions */}
        <div>
          <p className="text-xs text-zinc-500 mb-1">Recent Transactions</p>
          <div className="space-y-1 text-xs">
            {txs.length > 0 ? (
              txs.slice(0, 3).map((tx) => {
                const isIncoming = tx.to.toLowerCase() === address.toLowerCase();
                return (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center rounded bg-zinc-50 px-2 py-1.5"
                  >
                    <span className="font-medium">
                      {tx.type.toUpperCase()} {tx.amount}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isIncoming
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-rose-100 text-rose-600"
                        }`}
                      >
                        {isIncoming ? "Incoming" : "Outgoing"}
                      </span>
                      <Link
                        href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="italic text-zinc-400">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="wallets">
      <Panel title="Wallets">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderWallet("Demo Wallet", demoWallet, demoBalance, demoTxs, <Wallet size={18} />, "Owned by Us")}
          {renderWallet("Judge Wallet", judgeWallet, judgeBalance, judgeTxs, <CreditCard size={18} />, "Destination")}
        </div>
      </Panel>
    </section>
  );
}
