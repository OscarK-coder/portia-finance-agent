"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      console.error("Copy failed");
    }
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium 
                 border border-zinc-200 hover:bg-zinc-50 
                 dark:border-zinc-800 dark:hover:bg-zinc-900/60"
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
