// transfer.js
import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DEMO_PRIVATE_KEY = process.env.DEMO_WALLET_PRIVATE_KEY;
const DEMO_ADDRESS = process.env.DEMO_WALLET_ADDRESS;
const JUDGE_ADDRESS = process.env.JUDGE_WALLET_ADDRESS;
const USDC_CONTRACT = process.env.USDC_CONTRACT;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(DEMO_PRIVATE_KEY, provider);

const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

/* --------------------------------
   Local JSON storage for demo logs
   -------------------------------- */
const storePath = path.resolve("./tx-store.json");

function saveTransaction(entry) {
  let data = { txs: [], logs: [] };
  if (fs.existsSync(storePath)) {
    data = JSON.parse(fs.readFileSync(storePath, "utf-8"));
  }
  data.txs.unshift(entry); // add tx
  data.logs.unshift({
    id: Date.now(),
    type: "action",
    message: `Transaction: ${entry.type.toUpperCase()} ${entry.amount} from ${entry.from.slice(
      0,
      6
    )}… to ${entry.to.slice(0, 6)}…`,
    timestamp: new Date().toISOString(),
    details: { hash: entry.hash },
  });
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
  console.log("📝 Transaction + log saved to tx-store.json");
}

async function main() {
  const [token, amountArg] = process.argv.slice(2);

  if (token === "eth") {
    const amount = amountArg || "0.01";
    const tx = await wallet.sendTransaction({
      to: JUDGE_ADDRESS,
      value: ethers.parseEther(amount),
    });
    console.log(`✅ Sent ${amount} ETH → ${JUDGE_ADDRESS}`);
    console.log("🔗 Tx:", tx.hash);

    saveTransaction({
      id: Date.now(),
      type: "eth",
      from: DEMO_ADDRESS,
      to: JUDGE_ADDRESS,
      amount: parseFloat(amount),
      hash: tx.hash,
      timestamp: new Date().toISOString(),
    });
  }

  if (token === "usdc") {
    const amount = amountArg || "2";
    const value = ethers.parseUnits(amount, 6);

    const usdc = new ethers.Contract(USDC_CONTRACT, ERC20_ABI, wallet);
    const tx = await usdc.transfer(JUDGE_ADDRESS, value);
    console.log(`✅ Sent ${amount} USDC → ${JUDGE_ADDRESS}`);
    console.log("🔗 Tx:", tx.hash);

    saveTransaction({
      id: Date.now(),
      type: "usdc",
      from: DEMO_ADDRESS,
      to: JUDGE_ADDRESS,
      amount: parseFloat(amount),
      hash: tx.hash,
      timestamp: new Date().toISOString(),
    });
  }
}

main().catch(console.error);
