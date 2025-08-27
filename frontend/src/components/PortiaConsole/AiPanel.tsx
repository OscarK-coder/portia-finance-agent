"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Send, Download, Info, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Recommendations, { CardVariant } from "@/components/Recommendations";
import {
  askPortia,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  transferUSDC,
  mintUSDC,
  redeemUSDC,
  pushLog,
  type Alert,
} from "@/lib/api";
import PortiaLoader from "@/components/PortiaLoader";

/* ------------------------------
 * Types
 * ------------------------------ */
interface CardMessage {
  id: number;
  type: "card";
  variant: CardVariant;
  title: string;
  description: string;
  actions?: { label: string; tool: string; args?: Record<string, any> }[];
}

interface ChatMessage {
  id: number;
  type: "action" | "info";
  message: string;
  timestamp: string;
}

type Message = CardMessage | ChatMessage;

interface AiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  preload?: Alert | null;
  onLog?: (entry: {
    type: "action" | "info" | "alert" | "error" | "success";
    message: string;
    timestamp: string;
  }) => void;
  onExecuteAction?: (action: string) => void;
}

/* ------------------------------
 * Local helper: getEventIcon
 * ------------------------------ */
function getEventIcon(type: string, size = 16) {
  switch (type) {
    case "sent":
      return <Send className={`h-${size / 4} w-${size / 4} text-rose-500`} />;
    case "recv":
      return <Download className={`h-${size / 4} w-${size / 4} text-emerald-500`} />;
    case "info":
      return <Info className={`h-${size / 4} w-${size / 4} text-blue-500`} />;
    case "alert":
      return <AlertTriangle className={`h-${size / 4} w-${size / 4} text-amber-500`} />;
    case "success":
      return <CheckCircle className={`h-${size / 4} w-${size / 4} text-green-500`} />;
    case "error":
      return <XCircle className={`h-${size / 4} w-${size / 4} text-red-500`} />;
    case "action":
      return <RefreshCw className={`h-${size / 4} w-${size / 4} text-indigo-500`} />;
    default:
      return <Info className={`h-${size / 4} w-${size / 4} text-zinc-400`} />;
  }
}

/* ------------------------------
 * Component
 * ------------------------------ */
export default function AiPanel({
  isOpen,
  onClose,
  preload,
  onLog,
  onExecuteAction,
}: AiPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "info",
      message: "Welcome to Portia AI Console. You can ask questions below.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ------------------------------
   * Handle preload alert
   * ------------------------------ */
  useEffect(() => {
    if (preload) {
      const card: CardMessage = {
        id: Date.now(),
        type: "card",
        variant: preload.type as CardVariant,
        title: preload.message,
        description: preload.summary || preload.message,
        actions: preload.recommendations || [],
      };

      setMessages((prev) => [...prev, card]);
      onLog?.({
        type: "alert",
        message: `Alert loaded into AI Console: ${preload.message}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  }, [preload]);

  /* ------------------------------
   * Execute Action
   * ------------------------------ */
  const executeAction = async (tool: string, args?: Record<string, any>) => {
    try {
      if (tool === "noop") {
        const skipMsg: ChatMessage = {
          id: Date.now(),
          type: "info",
          message: "⏭️ Skipped this recommendation.",
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => prev.filter((m) => m.type !== "card").concat(skipMsg));
        onLog?.({ type: "info", message: "User skipped recommendation", timestamp: skipMsg.timestamp });
        if (preload?.id) {
          (window as any).resolveAlertExternally?.(preload.id, "Skipped recommendation");
        }
        return;
      }

      const userMsg: ChatMessage = {
        id: Date.now(),
        type: "action",
        message: `Selected action: ${tool}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      onLog?.({ type: "action", message: `User selected ${tool}`, timestamp: userMsg.timestamp });
      setIsTyping(true);

      switch (tool) {
        case "pauseSubscription":
          await pauseSubscription(args?.id);
          break;
        case "resumeSubscription":
          await resumeSubscription(args?.id);
          break;
        case "cancelSubscription":
          await cancelSubscription(args?.id);
          break;
        case "transferUSDC":
          await transferUSDC(args?.to || "0xBackupWallet", args?.amount || 50);
          break;
        case "mintUSDC":
          await mintUSDC(args?.amount || 100);
          break;
        case "redeemUSDC":
          await redeemUSDC(args?.amount || 100);
          break;
      }

      await pushLog("action", `Executed action: ${tool}`);
      onExecuteAction?.(tool);

      setTimeout(() => {
        setIsTyping(false);

        const confirmationMsg =
          tool === "cancelSubscription"
            ? "✅ Subscription canceled and refund issued."
            : tool === "pauseSubscription"
            ? "⏸️ Subscription paused successfully."
            : tool === "resumeSubscription"
            ? "▶️ Subscription resumed successfully."
            : tool === "transferUSDC"
            ? "💸 USDC transferred successfully."
            : tool === "mintUSDC"
            ? "🪙 USDC minted successfully."
            : tool === "redeemUSDC"
            ? "🏦 USDC redeemed successfully."
            : "✅ Action completed.";

        const confirmation: ChatMessage = {
          id: Date.now() + 1,
          type: "info",
          message: confirmationMsg,
          timestamp: new Date().toLocaleTimeString(),
        };

        setMessages((prev) => prev.filter((m) => m.type !== "card").concat(confirmation));

        onLog?.({ type: "success", message: confirmationMsg, timestamp: confirmation.timestamp });
        if (preload?.id) {
          (window as any).resolveAlertExternally?.(preload.id, confirmationMsg);
        }
      }, 5500);
    } catch (err) {
      console.error("⚠️ Action failed:", err);
      await pushLog("error", `Failed to execute ${tool}`);
      onLog?.({
        type: "error",
        message: `Failed to execute ${tool}`,
        timestamp: new Date().toLocaleTimeString(),
      });
      setIsTyping(false);
    }
  };

  /* ------------------------------
   * Send Message to Portia
   * ------------------------------ */
  const handleSend = async (msg?: string) => {
    const text = msg || input;
    if (!text.trim()) return;

    const timestamp = new Date().toLocaleTimeString();
    const userMsg: ChatMessage = {
      id: Date.now(),
      type: "action",
      message: text,
      timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    onLog?.({ type: "action", message: `User asked: ${text}`, timestamp });

    if (!msg) setInput("");
    setIsTyping(true);

    try {
      const res = await askPortia(text, "user1");

      if ("responses" in res && Array.isArray(res.responses) && res.responses.length > 0) {
        const replies: Message[] = res.responses.map((r: any) =>
          typeof r === "string"
            ? {
                id: Date.now() + Math.random(),
                type: "info",
                message: r,
                timestamp: new Date().toLocaleTimeString(),
              }
            : ({ ...r, id: Date.now() + Math.random() } as CardMessage)
        );

        setTimeout(() => {
          setMessages((prev) => [...prev, ...replies]);
          setIsTyping(false);
        }, 1000);
      } else if ("response" in res && res.response) {
        const reply: ChatMessage = {
          id: Date.now(),
          type: "info",
          message: String(res.response),
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, reply]);
        onLog?.({ type: "info", message: String(res.response), timestamp: reply.timestamp });
        setIsTyping(false);
      } else {
        setIsTyping(false);
      }
    } catch (err) {
      console.error("⚠️ Portia failed:", err);
      onLog?.({
        type: "error",
        message: "Portia failed to respond",
        timestamp: new Date().toLocaleTimeString(),
      });
      setIsTyping(false);
    }
  };

  /* ------------------------------
   * Auto-scroll
   * ------------------------------ */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ------------------------------
   * UI
   * ------------------------------ */
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="fixed top-0 right-0 bottom-0 z-50 flex flex-col border-l border-zinc-200 bg-white shadow-xl"
            style={{ width: "380px" }}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-200 bg-white">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-800">
                Portia AI Console
              </h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-red-100">
                <X size={16} className="text-red-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 custom-scrollbar">
              <AnimatePresence>
                {messages.map((e) =>
                  e.type === "card" ? (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Recommendations
                        variant={e.variant}
                        title={e.title}
                        description={e.description}
                        actions={e.actions}
                        onAction={(tool: string, args?: Record<string, any>) =>
                          executeAction(tool, args)
                        }
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: e.type === "action" ? 30 : -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: e.type === "action" ? 30 : -30 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`max-w-[75%] px-3 py-1 text-xs flex items-center gap-2 ${
                        e.type === "action"
                          ? "ml-auto bg-black text-white rounded-full"
                          : "mr-auto bg-zinc-200 text-zinc-900 rounded-full"
                      }`}
                    >
                      {getEventIcon(e.type)}
                      <span>{e.message}</span>
                      <div className="text-[9px] opacity-50 mt-0.5 text-right">
                        {e.timestamp}
                      </div>
                    </motion.div>
                  )
                )}
              </AnimatePresence>

              {isTyping && (
                <div className="mr-auto flex flex-col items-start">
                  <PortiaLoader />
                  <div className="flex items-center mt-1 ml-1 text-[11px] text-zinc-500">
                    Portia is analyzing...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-zinc-200 p-2 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 px-3 py-1.5 rounded-full border border-zinc-300 bg-white text-xs outline-none focus:ring-2 focus:ring-black"
                placeholder="Ask Portia something..."
              />
              <button
                onClick={() => handleSend()}
                className="px-4 py-1.5 rounded-full bg-black hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1 shadow transition"
              >
                <Send size={13} /> Send
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
