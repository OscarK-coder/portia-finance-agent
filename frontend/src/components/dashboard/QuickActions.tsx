"use client";

import Panel from "@/components/Panel";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ArrowUpRight, AlertTriangle, Coins } from "lucide-react";
import toast from "react-hot-toast";
import { LogEntry } from "@/components/dashboard/AuditLog";

interface QuickActionsProps {
  onSendUSDC: () => Promise<void>;
  onTriggerAlert: (type: string) => Promise<void>;
  onMintCircle: () => Promise<void>;
  pushEvent: (entry: LogEntry) => void;
  pushConsoleMessage: (msg: { role: "assistant"; text: string }) => void; 

export default function QuickActions({
  onSendUSDC,
  onTriggerAlert,
  onMintCircle,
  pushEvent,
  pushConsoleMessage,
}: QuickActionsProps) {
  const handleSendUSDC = async () => {
    try {
      await onSendUSDC();
      toast.success("🚀 Sent 10 USDC to Judge Wallet");

      const msg = "I’ve successfully sent 10 USDC to the Judge Wallet. ✅";
      pushEvent({
        id: Date.now(),
        type: "action",
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      });
      pushConsoleMessage({ role: "assistant", text: msg });
    } catch {
      toast.error("❌ Failed to send USDC");
      pushEvent({
        id: Date.now(),
        type: "error",
        message: "USDC transfer failed",
        timestamp: new Date().toLocaleTimeString(),
      });
      pushConsoleMessage({ role: "assistant", text: "⚠️ The USDC transfer failed." });
    }
  };

  const handleTriggerAlert = async (type: string) => {
    try {
      await onTriggerAlert(type);
      const msg = `⚠️ Demo alert triggered: ${type}`;
      toast(msg);
      pushEvent({
        id: Date.now(),
        type: "alert",
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      });
      pushConsoleMessage({ role: "assistant", text: msg });
    } catch {
      toast.error("❌ Failed to trigger alert");
      pushEvent({
        id: Date.now(),
        type: "error",
        message: "Alert trigger failed",
        timestamp: new Date().toLocaleTimeString(),
      });
      pushConsoleMessage({ role: "assistant", text: "⚠️ Failed to trigger demo alert." });
    }
  };

  const handleMintCircle = async () => {
    try {
      await onMintCircle();
      const msg = "✅ Minted 100 USDC in Circle account.";
      toast.success(msg);
      pushEvent({
        id: Date.now(),
        type: "action",
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      });
      pushConsoleMessage({ role: "assistant", text: msg });
    } catch {
      toast.error("❌ Circle mint failed");
      pushEvent({
        id: Date.now(),
        type: "error",
        message: "Circle mint failed",
        timestamp: new Date().toLocaleTimeString(),
      });
      pushConsoleMessage({ role: "assistant", text: "⚠️ Circle mint failed." });
    }
  };

  return (
    <ErrorBoundary title="Quick Actions">
      <Panel title="Quick Actions">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Send USDC */}
          <button
            onClick={handleSendUSDC}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg 
                       bg-indigo-500 hover:bg-indigo-600 text-white text-sm"
          >
            <ArrowUpRight size={16} /> Send USDC
          </button>

          {/* Trigger Demo Alert */}
          <button
            onClick={() => handleTriggerAlert("market_drop")}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg 
                       bg-amber-500 hover:bg-amber-600 text-white text-sm"
          >
            <AlertTriangle size={16} /> Trigger Alert
          </button>

          {/* Mint Circle */}
          <button
            onClick={handleMintCircle}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg 
                       bg-emerald-500 hover:bg-emerald-600 text-white text-sm"
          >
            <Coins size={16} /> Mint Circle
          </button>
        </div>
      </Panel>
    </ErrorBoundary>
  );
}
