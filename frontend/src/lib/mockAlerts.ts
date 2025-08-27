// src/lib/mockAlerts.ts
import type { Alert } from "@/lib/api";

export const mockAlerts: Alert[] = [
  {
    id: 1,
    type: "subscription",
    level: "warning",
    message: "Monthly subscription costs exceeded $50 — review active plans.",
    summary: "You’re spending over $50/month on subscriptions.",
    timestamp: new Date().toISOString(),
    recommendations: [
      {
        label: "Pause Amazon Prime for one month to save $14.99",
        tool: "pauseSubscription",
        args: { id: "amazon-prime" },
      },
      {
        label: "Cancel ChatGPT Plus to save $20",
        tool: "cancelSubscription",
        args: { id: "chatgpt-plus" },
      },
      { label: "Skip action for now", tool: "noop" },
    ],
  },
  {
    id: 2,
    type: "wallet",
    level: "error",
    message: "Demo Wallet USDC balance dropped below 10 USDC.",
    summary: "Demo Wallet is almost empty, needs funds (8.00 USDC left).",
    timestamp: new Date().toISOString(),
    recommendations: [
      {
        label: "Pause Spotify subscription to save $9.99",
        tool: "pauseSubscription",
        args: { id: "spotify" },
      },
      {
        label: "Transfer 20 USDC from external wallet",
        tool: "transferUSDC",
        args: { from: "0xBackup", to: "demo", amount: 20 },
      },
      { label: "Skip action for now", tool: "noop" },
    ],
  },
  {
    id: 3,
    type: "wallet",
    level: "critical", // 🚨 Judge Wallet USDC critical
    message: "Judge Wallet USDC balance critically low (2.00 USDC).",
    summary: "Judge Wallet may not cover upcoming payments.",
    timestamp: new Date().toISOString(),
    recommendations: [
      {
        label: "Transfer 10 USDC from Demo Wallet",
        tool: "transferUSDC",
        args: { from: "demo", to: "judge", amount: 10 },
      },
      { label: "Skip action for now", tool: "noop" },
    ],
  },
  {
    id: 4,
    type: "wallet",
    level: "critical", // 🚨 Judge Wallet ETH empty
    message: "Judge Wallet ETH balance is 0.00.",
    summary: "Judge Wallet cannot pay gas fees.",
    timestamp: new Date().toISOString(),
    recommendations: [
      {
        label: "Send 0.05 ETH from Demo Wallet",
        tool: "transferETH",
        args: { from: "demo", to: "judge", amount: 0.05 },
      },
      {
        label: "Swap 5 USDC → ETH",
        tool: "swapTokens",
        args: { from: "USDC", to: "ETH", amount: 5 },
      },
      { label: "Skip action for now", tool: "noop" },
    ],
  },
  {
    id: 5,
    type: "subscription",
    level: "warning",
    message: "You are subscribed to both Spotify and Apple Music.",
    summary: "Duplicate music subscriptions detected.",
    timestamp: new Date().toISOString(),
    recommendations: [
      {
        label: "Cancel Apple Music (less used, more expensive)",
        tool: "cancelSubscription",
        args: { id: "apple-music" },
      },
      {
        label: "Cancel Spotify (keep Apple ecosystem only)",
        tool: "cancelSubscription",
        args: { id: "spotify" },
      },
      { label: "Skip action for now", tool: "noop" },
    ],
  },
  {
    id: 6,
    type: "market",
    level: "warning",
    message: "ETH price dropped by 12% today.",
    summary: "Market volatility alert for Ethereum.",
    timestamp: new Date().toISOString(),
    recommendations: [
      {
        label: "Rebalance: convert 30% ETH → USDC",
        tool: "redeemUSDC",
        args: { amount: 300 },
      },
      {
        label: "Sell 10% ETH to reduce volatility",
        tool: "transferUSDC",
        args: { to: "0xBackupWallet", amount: 100 },
      },
      { label: "Skip action for now", tool: "noop" },
    ],
  },
  {
    id: 7,
    type: "subscription",
    level: "info",
    message: "Netflix hasn’t been used in 3 weeks.",
    summary: "Inactive subscription detected.",
    timestamp: new Date().toISOString(),
    recommendations: [
      {
        label: "Pause Netflix for one month and save $15.49",
        tool: "pauseSubscription",
        args: { id: "netflix" },
      },
      {
        label: "Cancel Netflix permanently",
        tool: "cancelSubscription",
        args: { id: "netflix" },
      },
      { label: "Skip action for now", tool: "noop" },
    ],
  },
];
