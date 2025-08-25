"use client";

import React from "react";
import { AlertTriangle, Wallet, Database, Info } from "lucide-react";

export type CardVariant = "alert" | "treasury" | "subscription" | "info";

interface RecommendationCardProps {
  variant: CardVariant;
  title: string;
  description: string;
}

export default function RecommendationCard({
  variant,
  title,
  description,
}: RecommendationCardProps) {
  const styles: Record<CardVariant, { color: string; icon: React.ReactNode }> = {
    alert: {
      color: "border-red-300 dark:border-red-600",
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
    },
    treasury: {
      color: "border-blue-300 dark:border-blue-600",
      icon: <Database className="w-4 h-4 text-blue-500" />,
    },
    subscription: {
      color: "border-emerald-300 dark:border-emerald-600",
      icon: <Wallet className="w-4 h-4 text-emerald-500" />,
    },
    info: {
      color: "border-indigo-300 dark:border-indigo-600",
      icon: <Info className="w-4 h-4 text-indigo-500" />,
    },
  };

  // ✅ Fallback in case variant is invalid
  const { color, icon } = styles[variant] ?? styles["info"];

  return (
    <div
      className={`max-w-sm mr-auto rounded-xl border shadow-md p-3 text-sm 
                  bg-white/80 dark:bg-zinc-800/80 ${color}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-300">{description}</p>
    </div>
  );
}
