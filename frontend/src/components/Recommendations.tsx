"use client";

import React from "react";

export type CardVariant =
  | "info"
  | "danger"
  | "alert"
  | "treasury"
  | "subscription"
  | "refund";

interface Props {
  variant: CardVariant;
  title: string;
  description: string;
  actions?: { label: string; tool: string; args?: Record<string, any> }[];
  onAction?: (tool: string, args?: Record<string, any>) => void;
}

export default function Recommendations({
  variant,
  title,
  description,
  actions = [],
  onAction,
}: Props) {
  const colors: Record<CardVariant, string> = {
    info: "border-blue-400",
    danger: "border-red-400",
    alert: "border-yellow-400",
    treasury: "border-green-400",
    subscription: "border-purple-400",
    refund: "border-pink-400",
  };

  return (
    <div
      className={`p-3 rounded-xl border ${
        colors[variant] || "border-zinc-300"
      } bg-white shadow-sm`}
    >
      <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
      <p className="text-xs text-zinc-600 mt-1">{description}</p>
      <div className="flex gap-2 mt-3 flex-wrap">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => onAction?.(a.tool, a.args)}
            className="px-3 py-1 rounded-full text-xs bg-black text-white hover:bg-zinc-800 transition"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
