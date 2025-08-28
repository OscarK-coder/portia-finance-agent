# Portia Finance Agent 💸🤖

Portia Finance Agent is a **multi-wallet finance guardian** that helps you track crypto balances, manage subscriptions, and act on real-time alerts with an AI console.  
Built with **Next.js + FastAPI + Stripe + Web3**.

---

## 🚀 Features

- **Crypto Wallets**
  - Sepolia ETH + USDC balances
  - Real-time transactions
  - Judge & Demo wallet comparison

- **Subscriptions**
  - Manage Spotify, Netflix, Prime, ChatGPT, and more
  - Pause, Resume, Cancel, Refund via Stripe Sandbox
  - Live balance tracking

- **Markets & Alerts**
  - Crypto market prices
  - Automated alerts (low balance, BTC price spike, etc.)
  - AI-powered recommendations with action buttons

- **Portia AI Console**
  - Chat-like interface
  - Real-time responses + quick actions
  - Connected with backend tools

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router, TailwindCSS, shadcn/ui, Framer Motion)
- **Backend:** FastAPI (Python), Stripe SDK, Web3.py
- **Blockchain:** Sepolia testnet (ETH + USDC)
- **Infra:**  
  - Frontend → Vercel  
  - Backend → Render  

---

## 📂 Project Structure
.
├── frontend/ # Next.js app (deployed on Vercel)
├── backend/ # FastAPI app (deployed on Render)
├── scripts/ # Helper scripts (not used in build)
├── data/ # Local db/json files (ignored by Vercel)
├── types/ # Shared TypeScript types
├── .vercelignore # Prevents backend/scripts from being uploaded
└── README.md

---

## ⚙️ Environment Variables

### Frontend (`/frontend/.env.local`)


NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api

NEXT_PUBLIC_DEMO_WALLET=0x...
NEXT_PUBLIC_JUDGE_WALLET=0x...
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/your-key

NEXT_PUBLIC_USDC_CONTRACT=0x...
NEXT_PUBLIC_ETHERSCAN_API_KEY=your-api-key


### Backend (`/.env`)

PORTIA_API_KEY=your-portia-key
OPENAI_API_KEY=your-openai-key
STRIPE_SECRET_KEY=sk_test_...

---

##  Running Locally

1. **Backend (FastAPI)**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload

2. **Backend (FastAPI)**
   ```bash
   cd frontend
   npm install
   npm run dev

Deployment

Frontend: Vercel (frontend/ as root directory)

Backend: Render (point to backend/requirements.txt)

Use .vercelignore to exclude backend/, scripts/, and data/ from Vercel.

Screenshots