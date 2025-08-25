"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Maximize2, Minimize2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RecommendationCard, { CardVariant } from "@/components/RecommendationCard";
import { askPortia, getAlerts, triggerDemoEvent, type Alert } from "@/lib/api"; 

// ---------------------
// Typing Indicator
// ---------------------
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 h-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100"
          animate={{
            x: [0, 16, 32, 48],
            opacity: [0, 1, 1, 0],
            scale: [0.6, 1, 1, 0.6],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------
// Types
// ---------------------
interface CardMessage {
  id: number;
  type: "card";
  variant: CardVariant;
  title: string;
  description: string;
}

interface ChatMessage {
  id: number;
  type: "action" | "info";
  message: string;
  timestamp: string;
}

type Message = CardMessage | ChatMessage;

// ---------------------
// Component
// ---------------------
export default function AiPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [height, setHeight] = useState(0.6);
  const [isFull, setIsFull] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [seenAlertIds, setSeenAlertIds] = useState<Set<number>>(new Set());

  // Sounds
  const sendSound = useRef<HTMLAudioElement | null>(null);
  const replySound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    sendSound.current = new Audio(
      "https://assets.mixkit.co/sfx/preview/mixkit-interface-click-1126.mp3"
    );
    sendSound.current.volume = 0.25;

    replySound.current = new Audio(
      "https://assets.mixkit.co/sfx/preview/mixkit-soft-pop-2367.mp3"
    );
    replySound.current.volume = 0.2;
  }, []);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setHeight(0.6);
      setIsFull(false);
      setMessages([]);
      setSeenAlertIds(new Set());
    }
  }, [isOpen]);

  // ESC closes
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Resize drag
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isFull) return;
    const startY = e.clientY;
    const startHeight = height;

    const onMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      setHeight(
        Math.min(1, Math.max(0.25, startHeight + deltaY / window.innerHeight))
      );
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ---------------------
  // Fetch Alerts periodically
  // ---------------------
  useEffect(() => {
    if (!isOpen) return;

    const fetchAlerts = async () => {
      try {
        const alerts = await getAlerts();
        const newOnes = alerts.filter((a) => !seenAlertIds.has(a.id));
        if (newOnes.length > 0) {
          setSeenAlertIds((prev) => {
            const copy = new Set(prev);
            newOnes.forEach((a) => copy.add(a.id));
            return copy;
          });

          const alertMsgs: Message[] = newOnes.map((a) => ({
            id: a.id,
            type: "info",
            message: `🔔 [${a.level.toUpperCase()}] ${a.message}`,
            timestamp: a.timestamp || new Date().toLocaleTimeString(),
          }));

          setMessages((prev) => [...alertMsgs, ...prev]);
          try {
            await replySound.current?.play();
          } catch (e) {
            console.warn("🔇 Failed to play reply sound:", e);
          }
        }
      } catch (e) {
        console.warn("⚠️ Failed to fetch alerts:", e);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [isOpen, seenAlertIds]);

  // ---------------------
  // Handle Send
  // ---------------------
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      type: "action",
      message: `Judge: ${input}`,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [userMsg, ...prev]);
    try {
      await sendSound.current?.play();
    } catch (e) {
      console.warn("🔇 Failed to play send sound:", e);
    }

    const query = input;
    setInput("");
    setIsTyping(true);

    try {
      const res = await askPortia(query, "user1");
      setIsTyping(false);

      let reply: Message;
      if (typeof res.response === "string") {
        reply = {
          id: Date.now() + 1,
          type: "info",
          message: `🤖 Portia: ${res.response}`,
          timestamp: new Date().toLocaleTimeString(),
        };
      } else {
        reply = { ...res.response, id: Date.now() + 1 } as CardMessage;
      }

      setMessages((prev) => [reply, ...prev]);
      try {
        await replySound.current?.play();
      } catch (e) {
        console.warn("🔇 Failed to play reply sound:", e);
      }
    } catch (err) {
      console.warn("⚠️ Backend failed:", err);
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
          />

          {/* Console */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{
              y: 0,
              height: isFull ? "100vh" : `${height * 100}vh`,
              opacity: 1,
              boxShadow: "0 0 40px rgba(99,102,241,0.2)",
            }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-6 pb-4"
          >
            <div className="h-full w-full max-w-6xl flex flex-col rounded-2xl overflow-hidden shadow-xl border border-white/20 dark:border-zinc-800/50 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-2xl backdrop-saturate-150">
              {!isFull && (
                <div
                  onMouseDown={startDrag}
                  className="h-2 cursor-row-resize bg-zinc-300/60 dark:bg-zinc-700/60 rounded-t-2xl"
                />
              )}

              {/* Header */}
              <div className="flex justify-between items-center px-4 py-2 border-b border-white/20 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isTyping
                        ? "bg-yellow-400 animate-pulse"
                        : "bg-green-500"
                    }`}
                  />
                  <h2 className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 tracking-tight">
                    Portia AI Console
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsFull(!isFull)}
                    className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                  >
                    {isFull ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                  >
                    <X size={16} className="text-red-500" />
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-3 py-1 flex gap-2 border-b border-transparent bg-white/30 dark:bg-zinc-900/30 backdrop-blur relative">
                {["💸 Transfer", "📊 Subscriptions", "🔔 Alerts", "🏦 Treasury"].map(
                  (chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        setInput(chip);
                        handleSend();
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                    >
                      {chip}
                    </button>
                  )
                )}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 text-[13px] leading-snug relative">
                {messages.map((e) =>
                  e.type === "card" ? (
                    <RecommendationCard
                      key={e.id}
                      variant={e.variant}
                      title={e.title}
                      description={e.description}
                    />
                  ) : (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`max-w-[75%] px-3 py-1.5 rounded-xl shadow-sm ${
                        e.message?.startsWith("Judge:")
                          ? "ml-auto bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                          : "mr-auto bg-white/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {e.message}
                      {"timestamp" in e && (
                        <div className="text-[10px] opacity-70 mt-0.5">
                          {e.timestamp}
                        </div>
                      )}
                    </motion.div>
                  )
                )}

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mr-auto bg-white/70 dark:bg-zinc-800 px-3 py-1.5 rounded-xl shadow-sm"
                  >
                    <TypingIndicator />
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-white/20 dark:border-zinc-800 p-2 flex gap-2 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ask Portia something..."
                />
                <button
                  onClick={handleSend}
                  className="px-5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white text-xs font-medium flex items-center gap-1 shadow transition"
                >
                  <Send size={14} /> Send
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
