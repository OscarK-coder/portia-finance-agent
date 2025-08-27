import { ethers } from "ethers";
import type { LogEntry } from "@/components/dashboard/AuditLog";
import type { CardVariant } from "@/components/Recommendations";
import { MOCK_SUBSCRIPTIONS } from "./mockSubscriptions";

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
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

async function apiFetch<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${res.statusText} – ${text}`);
  }
  return (await res.json()) as T;
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
 * Alerts (mock)
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
  const { mockAlerts } = await import("./mockAlerts");
  return mockAlerts;
}

export async function resolveAlert(id: number) {
  console.log("✅ resolveAlert called for", id);
  return { ok: true };
}

/* ------------------------------
 * Subscriptions (frontend mock only)
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

let subsState: Subscription[] = [...MOCK_SUBSCRIPTIONS];
let balanceState = 120;

export async function fetchSubscriptions(): Promise<SubscriptionResponse> {
  return { subs: subsState, balance: balanceState };
}

export async function pauseSubscription(subId: string) {
  subsState = subsState.map((s) =>
    s.id === subId ? { ...s, status: "paused" } : s
  );
  await pushLog("action", `Paused subscription ${subId}`, { subId });
  return { subs: subsState, balance: balanceState };
}

export async function resumeSubscription(subId: string) {
  subsState = subsState.map((s) =>
    s.id === subId ? { ...s, status: "active" } : s
  );
  await pushLog("action", `Resumed subscription ${subId}`, { subId });
  return { subs: subsState, balance: balanceState };
}

export async function cancelSubscription(subId: string) {
  subsState = subsState.map((s) =>
    s.id === subId ? { ...s, status: "canceled" } : s
  );
  await pushLog("action", `Canceled subscription ${subId}`, { subId });
  return { subs: subsState, balance: balanceState };
}

export async function refundSubscription(subId: string) {
  console.log("💸 Mock refund for", subId);
  await pushLog("action", `Refund issued for ${subId}`, { subId });
  return { ok: true, message: `Refund processed for ${subId}` };
}

/* ------------------------------
 * Transactions (in-memory + ETH + USDC)
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

let txs: TxEntry[] = [];

export async function getTransactions(address: string): Promise<TxEntry[]> {
  const merged: TxEntry[] = [...txs];

  // ✅ Etherscan ETH txs
  try {
    const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || "YourApiKeyToken";
    const res = await fetch(
      `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`
    );
    const data = await res.json();
    if (data.status === "1") {
      merged.push(
        ...data.result.slice(0, 5).map((t: any): TxEntry => ({
          id: Number(t.timeStamp),
          type: "eth",
          from: t.from,
          to: t.to,
          amount: parseFloat(ethers.formatEther(t.value)),
          hash: t.hash,
          timestamp: new Date(Number(t.timeStamp) * 1000).toISOString(),
        }))
      );
    }
  } catch (err) {
    console.error("⚠️ Failed to fetch ETH txs:", err);
  }

  // ✅ USDC transfers from logs
  try {
    const usdcAddr =
      process.env.NEXT_PUBLIC_USDC_CONTRACT ||
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    const usdc = new ethers.Contract(usdcAddr, ERC20_ABI, provider);

    const latest = await provider.getBlockNumber();
    const filter = usdc.filters.Transfer(null, address);
    const logs = await usdc.queryFilter(filter, latest - 5000, "latest");

    for (const log of logs) {
      if ("args" in log && log.args) {
        const { from, to, value } = log.args as unknown as {
          from: string;
          to: string;
          value: bigint;
        };

        const block = await provider.getBlock(log.blockNumber);

        merged.push({
          id: log.blockNumber,
          type: "usdc",
          from,
          to,
          amount: parseFloat(ethers.formatUnits(value, 6)),
          hash: log.transactionHash,
          timestamp: block
            ? new Date(block.timestamp * 1000).toISOString()
            : new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error("⚠️ Failed to fetch USDC transfers:", err);
  }

  return merged.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function addTransaction(entry: TxEntry) {
  txs.unshift(entry);
  await pushLog(
    "action",
    `Transaction: ${entry.type.toUpperCase()} ${entry.amount} from ${entry.from.slice(
      0,
      6
    )}… to ${entry.to.slice(0, 6)}…`,
    { hash: entry.hash }
  );
  console.log("📝 Added transaction:", entry);
  return { ok: true };
}

/* ------------------------------
 * Treasury (mock actions)
 * ------------------------------ */
export async function transferUSDC(to: string, amount: number) {
  console.log("🟢 Mock transferUSDC", to, amount);
  const entry: TxEntry = {
    id: Date.now(),
    type: "usdc",
    from: "DEMO_WALLET",
    to,
    amount,
    hash: "0xMOCKTX",
    timestamp: new Date().toISOString(),
  };
  await addTransaction(entry);
  return { status: "mocked", ...entry };
}

export async function mintUSDC(amount: number) {
  console.log("🟢 Mock mintUSDC", amount);
  await pushLog("action", `Minted ${amount} USDC`, { amount });
  return { status: "mocked", amount };
}

export async function redeemUSDC(amount: number) {
  console.log("🟢 Mock redeemUSDC", amount);
  await pushLog("action", `Redeemed ${amount} USDC`, { amount });
  return { status: "mocked", amount };
}

/* ------------------------------
 * Logs (in-memory with defaults)
 * ------------------------------ */
let logs: LogEntry[] = [
  {
    id: Date.now(),
    type: "info",
    message: "🚀 Portia Finance Agent started",
    timestamp: new Date().toISOString(),
  },
  {
    id: Date.now() + 1,
    type: "success",
    message: "Connected to mock subscriptions + wallets",
    timestamp: new Date().toISOString(),
  },
];

export async function getLogs(): Promise<LogEntry[]> {
  return logs;
}

export async function pushLog(
  type: "info" | "success" | "error" | "action" | "alert",
  message: string,
  details?: Record<string, any>
) {
  const entry: LogEntry = {
    id: Date.now(),
    type,
    message,
    timestamp: new Date().toISOString(),
    details,
  };
  logs.unshift(entry);
  console.log("📒 pushLog:", entry);
  return { ok: true };
}

/* ------------------------------
 * Portia Mock Responses
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
  console.log("🤖 Mock askPortia:", query);
  await pushLog("info", `User asked Portia: ${query}`);
  return {
    responses: [
      {
        type: "card",
        variant: "subscription",
        title: "Mock Recommendation",
        description: "You’re spending too much on subscriptions.",
        actions: [
          { label: "Pause Netflix", tool: "pauseSubscription", args: { subId: "sub1" } },
          { label: "Cancel Spotify", tool: "cancelSubscription", args: { subId: "sub2" } },
          { label: "Skip for now", tool: "noop" },
        ],
      },
    ],
  };
}
