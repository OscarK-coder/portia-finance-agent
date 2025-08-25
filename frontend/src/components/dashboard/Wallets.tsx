"use client";

import { useEffect, useState } from "react";
import { Wallet, CreditCard, ExternalLink, ArrowRight, Send } from "lucide-react";
import Panel from "@/components/Panel";
import CopyButton from "@/components/CopyButton";
import Link from "next/link";
import Image from "next/image";
import type { LogEntry } from "@/components/dashboard/AuditLog";
import { getWalletBalance, transferUSDC, pushLog } from "@/lib/api";
import toast from "react-hot-toast";

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
  eventsFeed = [],
}: WalletsProps) {
  const [demoBalance, setDemoBalance] = useState<WalletBalance | null>(null);
  const [judgeBalance, setJudgeBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch balances on mount
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const demo = await getWalletBalance(demoWallet);
        const judge = await getWalletBalance(judgeWallet);
        setDemoBalance({ usdc: demo.usdc, eth: demo.eth });
        setJudgeBalance({ usdc: judge.usdc, eth: judge.eth });
      } catch (err) {
        console.error("Error fetching balances", err);
        toast.error("⚠️ Failed to fetch balances");
      }
    };
    fetchBalances();
  }, [demoWallet, judgeWallet]);

  // 🔹 Trigger transfer from Demo → Judge
  const handleTransfer = async () => {
    setLoading(true);
    try {
      const amount = 5; // demo transfer (could make user-input)
      const tx = await transferUSDC(judgeWallet, amount);

      await pushLog("action", `Transferred ${amount} USDC → Judge Wallet`, {
        tx_hash: tx.tx_hash,
        explorer: tx.explorer,
      });

      toast.success("✅ Transfer successful");
      // refresh balances after transfer
      const demo = await getWalletBalance(demoWallet);
      const judge = await getWalletBalance(judgeWallet);
      setDemoBalance({ usdc: demo.usdc, eth: demo.eth });
      setJudgeBalance({ usdc: judge.usdc, eth: judge.eth });
    } catch (err) {
      console.error(err);
      toast.error("⚠️ Transfer failed");
      await pushLog("error", "USDC transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const renderWallet = (
    label: string,
    address: string,
    balance: WalletBalance | null,
    icon: React.ReactNode,
    badge: string
  ) => {
    const walletTxs = eventsFeed.filter(
      (e) =>
        e.message.includes(address.slice(0, 6)) ||
        e.message.toLowerCase().includes(label.toLowerCase())
    );

    return (
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border p-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {icon}
            </div>
            <div>
              <p className="text-base font-semibold">{label}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {badge}
              </span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="flex flex-col gap-1 text-xs">
          <p className="break-all text-zinc-600 dark:text-zinc-400">{address}</p>
          <div className="flex items-center gap-2">
            <CopyButton text={address} />
            <Link
              href={`https://sepolia.etherscan.io/address/${address}`}
              target="_blank"
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink size={14} /> View on Etherscan
            </Link>
          </div>
        </div>

        {/* Balances */}
        {balance ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg p-3 bg-emerald-100/60 dark:bg-emerald-900/30">
              <div className="flex items-center gap-2 mb-1">
                <Image src="/tokens/usdc.svg" alt="USDC" width={16} height={16} />
              </div>
              <p className="font-mono font-bold text-lg">{balance.usdc.toFixed(2)}</p>
              <p className="text-[11px] text-zinc-500">≈ ${balance.usdc.toFixed(2)}</p>
            </div>

            <div className="rounded-lg p-3 bg-indigo-100/60 dark:bg-indigo-900/30">
              <div className="flex items-center gap-2 mb-1">
                <Image src="/tokens/eth.svg" alt="ETH" width={16} height={16} />
              </div>
              <p className="font-mono font-bold text-lg">{balance.eth.toFixed(4)}</p>
              <p className="text-[11px] text-zinc-500">≈ ${(balance.eth * 3500).toFixed(2)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 italic">Loading balances...</p>
        )}

        {/* Transactions */}
        <div>
          <p className="text-xs text-zinc-500 mb-1">Recent Transactions</p>
          <div className="space-y-1 text-xs">
            {walletTxs.length > 0 ? (
              walletTxs.slice(0, 3).map((tx) => {
                const isIncoming =
                  tx.message.toLowerCase().includes("received") ||
                  tx.message.toLowerCase().includes("incoming");
                return (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center rounded bg-zinc-50 dark:bg-zinc-800 px-2 py-1.5"
                  >
                    <span className="font-medium">{tx.message}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isIncoming
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}
                      >
                        {isIncoming ? "Incoming" : "Outgoing"}
                      </span>
                      <span className="text-zinc-400">{tx.timestamp}</span>
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
      <Panel
        title="Wallets"
        actions={
          <button
            disabled={loading}
            onClick={handleTransfer}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send size={14} /> Send 5 USDC → Judge
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderWallet("Demo Wallet", demoWallet, demoBalance, <Wallet size={18} />, "Owned by Us")}
          {renderWallet("Judge Wallet", judgeWallet, judgeBalance, <CreditCard size={18} />, "Destination")}
        </div>

        {/* Unified Activity Log */}
        <div className="mt-6">
          <p className="text-xs text-zinc-500 mb-1">Unified Activity</p>
          <ul className="space-y-1 text-xs">
            {eventsFeed.length > 0 ? (
              eventsFeed.slice(0, 5).map((e) => (
                <li
                  key={e.id}
                  className="flex justify-between items-center rounded bg-zinc-50 dark:bg-zinc-800 px-2 py-1.5"
                >
                  <span className="flex items-center gap-1">
                    {e.message.includes("Transferred") && (
                      <ArrowRight className="h-3 w-3 text-emerald-500" />
                    )}
                    {e.message}
                  </span>
                  <span className="text-zinc-400">{e.timestamp}</span>
                </li>
              ))
            ) : (
              <li className="italic text-zinc-400">No recent activity</li>
            )}
          </ul>
        </div>
      </Panel>
    </section>
  );
}
