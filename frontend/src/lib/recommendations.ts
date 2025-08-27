// src/lib/recommendations.ts
import type { CardVariant } from "@/components/Recommendations";

export interface DemoAction {
  label: string;
  tool: string;
  args?: Record<string, any>;
}

export interface DemoRec {
  variant: CardVariant;
  chat: string;
  actions: DemoAction[];
}

export const DEMO_RECOMMENDATIONS: Record<string, DemoRec> = {
  subscription: {
    variant: "subscription",
    chat: "Subscription alert detected. Choose an action:",
    actions: [
      { label: "Pause subscription", tool: "pauseSubscription" },
      { label: "Cancel subscription", tool: "cancelSubscription" },
      { label: "Skip action for now", tool: "noop" },
    ],
  },
  wallet: {
    variant: "danger",
    chat: "Your wallet balance is low. What would you like to do?",
    actions: [
      { label: "Top up 50 USDC", tool: "mintUSDC", args: { amount: 50 } },
      { label: "Pause Spotify", tool: "pauseSubscription", args: { id: "spotify" } },
      { label: "Skip action", tool: "noop" },
    ],
  },
  market: {
    variant: "alert",
    chat: "ETH market moved sharply. Consider these actions:",
    actions: [
      { label: "Rebalance ETH → USDC", tool: "redeemUSDC", args: { amount: 100 } },
      { label: "Sell ETH", tool: "transferUSDC", args: { to: "0xBackupWallet", amount: 100 } },
      { label: "Skip action", tool: "noop" },
    ],
  },
  treasury: {
    variant: "treasury",
    chat: "Treasury has insufficient balance. Choose:",
    actions: [
      { label: "Withdraw 100 USDC", tool: "redeemUSDC", args: { amount: 100 } },
      { label: "Top up 200 USDC", tool: "mintUSDC", args: { amount: 200 } },
      { label: "Skip action", tool: "noop" },
    ],
  },
};
