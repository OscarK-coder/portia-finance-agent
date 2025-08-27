// transfer-cli.js
import { ethers } from "ethers";
import dotenv from "dotenv";
import { addTransaction } from "./transactions.js";

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DEMO_PRIVATE_KEY = process.env.DEMO_WALLET_PRIVATE_KEY;
const DEMO_ADDRESS = process.env.DEMO_WALLET_ADDRESS;
const JUDGE_ADDRESS = process.env.JUDGE_WALLET_ADDRESS;
const USDC_CONTRACT = process.env.USDC_CONTRACT;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(DEMO_PRIVATE_KEY, provider);

const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

async function main() {
  const [,, token, amountArg, toArg] = process.argv;

  if (!token || !amountArg) {
    console.error("❌ Usage: node transfer-cli.js <eth|usdc> <amount> [recipient]");
    process.exit(1);
  }

  const recipient = toArg || JUDGE_ADDRESS;

  if (token === "eth") {
    const tx = await wallet.sendTransaction({
      to: recipient,
      value: ethers.parseEther(amountArg),
    });
    console.log(`✅ Sent ${amountArg} ETH → ${recipient}`);
    console.log("🔗 Tx:", tx.hash);

    await addTransaction({
      id: Date.now(),
      type: "eth",
      from: DEMO_ADDRESS,
      to: recipient,
      amount: parseFloat(amountArg),
      hash: tx.hash,
      timestamp: new Date().toISOString(),
    });
  }

  if (token === "usdc") {
    const usdc = new ethers.Contract(USDC_CONTRACT, ERC20_ABI, wallet);
    const value = ethers.parseUnits(amountArg, 6);
    const tx = await usdc.transfer(recipient, value);

    console.log(`✅ Sent ${amountArg} USDC → ${recipient}`);
    console.log("🔗 Tx:", tx.hash);

    await addTransaction({
      id: Date.now(),
      type: "usdc",
      from: DEMO_ADDRESS,
      to: recipient,
      amount: parseFloat(amountArg),
      hash: tx.hash,
      timestamp: new Date().toISOString(),
    });
  }
}

main().catch(console.error);
