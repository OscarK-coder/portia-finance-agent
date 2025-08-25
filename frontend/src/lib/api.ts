// frontend/src/lib/api.ts
import type { LogEntry } from "@/components/dashboard/AuditLog";
import type { CardVariant } from "@/components/RecommendationCard";

/* ------------------------------
 * API Base
 * ------------------------------ */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

/* ------------------------------
 * Generic fetch wrapper
 * ------------------------------ */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/* ------------------------------
 * Health
 * ------------------------------ */
export async function getHealth() {
  return apiFetch<{ status: string; time: string }>("/health");
}

/* ------------------------------
 * Crypto
 * ------------------------------ */
export async function getCryptoPrice(symbol: string) {
  return apiFetch<{ symbol: string; price: number; currency: string }>(
    `/crypto/price?symbol=${symbol}`
  );
}

export async function getWalletBalance(address: string) {
  return apiFetch<{
    address: string;
    usdc: number;
    eth: number;
    explorer: string;
  }>(`/crypto/wallet/balance?address=${address}`);
}

export async function transferUSDC(to: string, amount: number) {
  return apiFetch<{
    status: string;
    tx_hash: string;
    explorer: string;
    to: string;
    amount: number;
  }>("/crypto/transfer", {
    method: "POST",
    body: JSON.stringify({ to, amount }),
  });
}

/* ------------------------------
 * Circle (Treasury)
 * ------------------------------ */
export async function getCircleBalances() {
  return apiFetch<{
    balances: { currency: string; amount: number }[];
    mode: string;
    note?: string;
  }>("/circle/balances");
}

export async function mintUSDC(amount: number) {
  return apiFetch("/circle/mint", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export async function redeemUSDC(amount: number) {
  return apiFetch("/circle/redeem", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

/* ------------------------------
 * Subscriptions (Stripe Sandbox)
 * ------------------------------ */
export type SubStatus = "active" | "paused" | "canceled" | "trialing";

export interface Subscription {
  id: string;
  plan: string;
  status: SubStatus;
  renews_on: string | null;
  logo?: string | null;
}

export interface SubscriptionResponse {
  subs: Subscription[];
  balance: number;
}

export async function getSubscriptions(user: string): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>(`/subscriptions/${user}`);
}

export async function pauseSubscription(user: string, subId: string): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>(`/subscriptions/${user}/pause/${subId}`, {
    method: "POST",
  });
}

export async function resumeSubscription(user: string, subId: string): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>(`/subscriptions/${user}/resume/${subId}`, {
    method: "POST",
  });
}

export async function cancelSubscription(user: string, subId: string): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>(`/subscriptions/${user}/cancel/${subId}`, {
    method: "POST",
  });
}

/* ------------------------------
 * Alerts
 * ------------------------------ */
export interface Alert {
  id: number;
  level: "info" | "warning" | "error";
  type?: string;
  message: string;
  timestamp?: string;
  context?: Record<string, any>;
  recommendations?: string[];
  plans?: Record<string, any>[];
  summary?: string;
  advisor_output?: Record<string, any>;
}

export async function getAlerts(): Promise<Alert[]> {
  const res = await apiFetch<{ alerts: Alert[]; count: number }>("/alerts");
  return res.alerts;
}

export async function triggerDemoEvent(type: string) {
  return apiFetch(`/alerts/demo/${type}`, { method: "POST" });
}

/* ------------------------------
 * Agent / Portia
 * ------------------------------ */
export interface CardMessage {
  type: "card";
  variant: CardVariant;
  title: string;
  description: string;
}

export type PortiaResponse = string | CardMessage;

export async function askPortia(query: string, user = "user1") {
  return apiFetch<{
    response: PortiaResponse;
    session_id: string;
    took_ms: number;
    mode: string;
    executed_tools?: any[];
  }>("/agent/ask", {
    method: "POST",
    body: JSON.stringify({ query, user_id: user }),
  });
}

/* ------------------------------
 * Logs / Audit
 * ------------------------------ */
export async function getLogs(): Promise<LogEntry[]> {
  const data = await apiFetch<
    {
      id: number;
      type: string;
      message: string;
      timestamp: string;
      details?: Record<string, any>;
    }[]
  >("/logs");

  return data.map((log) => ({
    ...log,
    type: (["info", "success", "error", "action", "alert"].includes(log.type)
      ? (log.type as LogEntry["type"])
      : "info"),
  }));
}

export async function pushLog(
  type: "info" | "success" | "error" | "action" | "alert",
  message: string,
  details?: Record<string, any>
) {
  return apiFetch("/logs", {
    method: "POST",
    body: JSON.stringify({ type, message, details }),
  });
}
