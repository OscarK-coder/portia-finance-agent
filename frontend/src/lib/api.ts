import { ethers } from "ethers";
import type { LogEntry } from "@/components/dashboard/AuditLog";
import type { CardVariant } from "@/components/Recommendations";

/* ------------------------------
 * Provider Setup (Infura Sepolia)
 * ------------------------------ */
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://sepolia.infura.io/v3/b95c564bfa684b288dccc68c05e5d041";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

/* ------------------------------
 * API Base (FastAPI backend)
 * ------------------------------ */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

// 🌐 Log which backend is used at runtime
if (typeof window !== "undefined") {
  console.log("🌐 Using API_BASE:", API_BASE);
}

async function apiFetch<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${res.statusText} – ${text}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`❌ API request failed: ${url}`, err);
    throw err;
  }
}

export { apiFetch };

/* ------------------------------
 * Prices
 * ------------------------------ */
export async function getCryptoPrice(symbol: string) {
  try {
    const data = await apiFetch<{ symbol: string; price: number; currency: string }>(
      `/price/${symbol.toLowerCase()}`
    );
    return { symbol: data.symbol, price: data.price, currency: data.currency };
  } catch (err) {
    console.error("⚠️ Failed to fetch price:", err);
    return { symbol, price: 0, currency: "USD" };
  }
}

/* ------------------------------
 * Wallet Balances
 * ------------------------------ */
export async function getWalletBalance(address: string) {
  try {
    const ethBalance = await provider.getBalance(address);
    const eth = parseFloat(ethers.formatEther(ethBalance));

    const contractAddr =
      process.env.NEXT_PUBLIC_USDC_CONTRACT ||
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC Sepolia
    const usdcContract = new ethers.Contract(contractAddr, ERC20_ABI, provider);
    const decimals: number = await usdcContract.decimals();
    const rawUsdc = await usdcContract.balanceOf(address);
    const usdc = parseFloat(ethers.formatUnits(rawUsdc, decimals));

    const [ethPrice, usdcPrice] = await Promise.all([
      getCryptoPrice("eth"),
      getCryptoPrice("usdc"),
    ]);

    return {
      address,
      usdc,
      eth,
      usdValue: {
        usdc: usdc * usdcPrice.price,
        eth: eth * ethPrice.price,
      },
      explorer: `https://sepolia.etherscan.io/address/${address}`,
    };
  } catch (err) {
    console.error("⚠️ Failed to fetch wallet balance:", err);
    return {
      address,
      usdc: 0,
      eth: 0,
      usdValue: { usdc: 0, eth: 0 },
      explorer: "#",
    };
  }
}

/* ------------------------------
 * Alerts
 * ------------------------------ */
export interface Alert {
  id: number;
  type: "subscription" | "wallet" | "market" | "treasury";
  level: "info" | "warning" | "error" | "success" | "critical";
  message: string;
  timestamp: string;
  summary?: string;
  recommendations?: {
    label: string;
    tool: string;
    args?: Record<string, any>;
  }[];
}

export async function getAlerts(): Promise<Alert[]> {
  return apiFetch<Alert[]>("/alerts");
}

export async function resolveAlert(id: number) {
  return apiFetch(`/alerts/${id}/resolve`, { method: "POST" });
}

/* ------------------------------
 * Subscriptions (via backend)
 * ------------------------------ */
export interface Subscription {
  id: string;
  plan: string;
  status: "active" | "paused" | "canceled" | "trialing";
  renews_on: string | null;
  logo?: string;
  logoFallback?: string;
}

export interface SubscriptionResponse {
  subs: Subscription[];
  balance: number;
}

export async function fetchSubscriptions(): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>("/subscriptions");
}

export async function pauseSubscription(subId: string) {
  return apiFetch(`/stripe/pause`, {
    method: "POST",
    body: JSON.stringify({ subId }),
  });
}

export async function resumeSubscription(subId: string) {
  return apiFetch(`/stripe/resume`, {
    method: "POST",
    body: JSON.stringify({ subId }),
  });
}

export async function cancelSubscription(subId: string) {
  return apiFetch(`/stripe/cancel`, {
    method: "POST",
    body: JSON.stringify({ subId }),
  });
}

export async function refundSubscription(subId: string) {
  return apiFetch(`/stripe/refund`, {
    method: "POST",
    body: JSON.stringify({ subId }),
  });
}

/* ------------------------------
 * Transactions
 * ------------------------------ */
export interface TxEntry {
  id: number;
  type: "eth" | "usdc";
  from: string;
  to: string;
  amount: number;
  hash: string;
  timestamp: string;
}

export async function getTransactions(address: string): Promise<TxEntry[]> {
  return apiFetch<TxEntry[]>(`/crypto/transactions/${address}`);
}

export async function addTransaction(entry: TxEntry) {
  return apiFetch("/crypto/transactions", {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

/* ------------------------------
 * Treasury (backend calls)
 * ------------------------------ */
export async function transferUSDC(to: string, amount: number) {
  return apiFetch("/crypto/transfer", {
    method: "POST",
    body: JSON.stringify({ to, amount }),
  });
}

export async function mintUSDC(amount: number) {
  return apiFetch("/crypto/mint", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export async function redeemUSDC(amount: number) {
  return apiFetch("/crypto/redeem", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

/* ------------------------------
 * Logs
 * ------------------------------ */
export async function getLogs(): Promise<LogEntry[]> {
  return apiFetch<LogEntry[]>("/logs");
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

/* ------------------------------
 * Portia AI (via backend)
 * ------------------------------ */
export interface CardMessage {
  type: "card";
  variant: CardVariant;
  title: string;
  description: string;
  actions?: { label: string; tool: string; args?: Record<string, any> }[];
}
export type PortiaResponse = string | CardMessage;

export async function askPortia(query: string, user = "demo") {
  return apiFetch(`/agent/ask`, {
    method: "POST",
    body: JSON.stringify({ query, user }),
  });
}
