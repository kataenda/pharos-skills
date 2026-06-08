# Pharos Skills Suite

> **Pharos Skill-to-Agent Dual Cascade Hackathon — Phase 1 Submission**
> Built for [Pharos Network](https://pharosnetwork.xyz) · 9 Reusable AI Agent Skills

A production-ready collection of **9 composable Skills** that AI agents can call to perform on-chain intelligence tasks on Pharos Network and other EVM chains. Each Skill is a self-contained module exposing a typed `execute()` interface and an OpenAI function-calling schema — ready to be plugged into any LLM-powered agent.

---

## Live Demo

> API: `https://pharos-skills.up.railway.app` *(deploy link after Railway setup)*
> UI: `https://pharos-skills.up.railway.app/`

---

## Skills Overview

| # | Skill | Description | Pharos? |
|---|---|---|---|
| 1 | `walletPersonalityAnalyzer` | Behavioral personality profile for any wallet | ✅ All chains |
| 2 | `onChainCreditScore` | Credit score 0–1000 graded D to AAA | ✅ All chains |
| 3 | `smartContractRiskAuditor` | Security audit: bytecode + source analysis | ✅ All chains |
| 4 | `whaleTracking` | Large transfer detection in recent blocks | ✅ All chains |
| 5 | `crossChainPortfolioAnalyzer` | Multi-chain token portfolio with USD values | ✅ All chains |
| 6 | `walletReputationOracle` | Trust score 0–100 with UNTRUSTED→EXCELLENT level | ✅ All chains |
| 7 | `rugPullDetector` | Rug pull signal scanner: mint, blacklist, fees, concentration | ✅ All chains |
| 8 | `aiPortfolioRebalancer` | Rebalancing recommendations by risk profile | ✅ All chains |
| **9** | **`pharosNetworkIntelligence`** | **Real-time Pharos chain stats: TPS, gas, block time, load** | **🔷 Pharos only** |

---

## Network Support

| Network | Chain ID | Native Token | Explorer |
|---|---|---|---|
| **Pharos Atlantic Testnet** | **688689** | **PHRS** | [atlantic.pharosscan.xyz](https://atlantic.pharosscan.xyz) |
| **Pharos Pacific Mainnet** | **1672** | **PROS** | [pharosscan.xyz](https://pharosscan.xyz) |
| Ethereum Mainnet | 1 | ETH | etherscan.io |
| Polygon | 137 | MATIC | polygonscan.com |
| BNB Smart Chain | 56 | BNB | bscscan.com |
| Arbitrum One | 42161 | ETH | arbiscan.io |

---

## Quick Start

```bash
git clone https://github.com/yourusername/pharos-skills
cd pharos-skills
npm install
npm run build
npm start
# → API running on http://localhost:3000
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Interactive test UI |
| `GET` | `/health` | Server status + skills + networks |
| `GET` | `/api/skills` | Full skill definitions |
| `GET` | `/api/agent-tools` | **OpenAI function-calling format** (for LLM agents) |
| `POST` | `/api/wallet-personality` | Run Wallet Personality Analyzer |
| `POST` | `/api/credit-score` | Run On-Chain Credit Score |
| `POST` | `/api/risk-audit` | Run Smart Contract Risk Auditor |
| `POST` | `/api/whale-tracker` | Run Whale Tracking |
| `POST` | `/api/portfolio` | Run Cross-Chain Portfolio Analyzer |
| `POST` | `/api/wallet-reputation` | Run Wallet Reputation Oracle |
| `POST` | `/api/rug-pull` | Run Rug Pull Detector |
| `POST` | `/api/rebalance` | Run AI Portfolio Rebalancer |
| `POST` | `/api/network-stats` | Run Pharos Network Intelligence |

---

## AI Agent Integration (OpenAI Function Calling)

The `/api/agent-tools` endpoint returns all 9 Skills in the exact format expected by OpenAI, Claude, and any function-calling compatible LLM:

```typescript
const response = await fetch("https://your-deploy.railway.app/api/agent-tools");
const { tools } = await response.json();

// Pass directly to OpenAI / Claude API
const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  tools: tools,   // ← all 9 skills, ready to use
  messages: [{ role: "user", content: "Analyze this Pharos wallet: 0x..." }],
});
```

**Example agent-tools response:**
```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "pharosNetworkIntelligence",
        "description": "Provides real-time Pharos Network intelligence: latest block, gas price, estimated TPS...",
        "parameters": {
          "type": "object",
          "properties": {
            "network": { "type": "string", "enum": ["pharos_testnet", "pharos_mainnet"] },
            "blockSample": { "type": "number" }
          }
        }
      }
    }
    // ... 8 more skills
  ]
}
```

---

## Skill Reference

### 1. Wallet Personality Analyzer

Profiles a wallet's behavior into 8 archetypes based on transaction history.

**Personalities:** DeFi Degen 🦍 · Crypto Whale 🐋 · Diamond HODLer 💎 · Day Trader 📈 · On-Chain Builder 🏗️ · New Explorer 🌱 · Token Collector 🎨 · Web3 Citizen 🌐

```bash
curl -X POST http://localhost:3000/api/wallet-personality \
  -H "Content-Type: application/json" \
  -d '{"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","network":"ethereum"}'
```

```json
{
  "success": true,
  "data": {
    "personality": "Crypto Whale",
    "emoji": "🐋",
    "traits": [{"label": "Large Holdings", "score": 99}],
    "stats": { "txCount": 312, "nativeBalance": "145.2300 ETH" }
  }
}
```

---

### 2. On-Chain Credit Score

Scores a wallet 0–1000 across 6 weighted dimensions.

| Dimension | Weight |
|---|---|
| Wallet Age | 150 pts |
| Activity Level | 150 pts |
| Balance Stability | 200 pts |
| DeFi Participation | 200 pts |
| Transaction Success Rate | 150 pts |
| Token Diversity | 150 pts |

**Grades:** `D` → `CCC` → `B` → `BB` → `BBB` → `A` → `AA` → `AAA`

```bash
curl -X POST http://localhost:3000/api/credit-score \
  -d '{"address":"0x...","network":"pharos_testnet"}'
```

---

### 3. Smart Contract Risk Auditor

Audits contract bytecode and source code for security vulnerabilities.

**Checks:** Source verification · SELFDESTRUCT · EIP-1967 proxy · `tx.origin` auth · `delegatecall` · Reentrancy · Timestamp dependence

**Risk Levels:** `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

```bash
curl -X POST http://localhost:3000/api/risk-audit \
  -d '{"contractAddress":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","network":"ethereum"}'
```

---

### 4. Whale Tracking

Scans recent blocks for native token transfers above a configurable threshold.

```bash
curl -X POST http://localhost:3000/api/whale-tracker \
  -d '{"thresholdNative":100,"blockRange":20,"network":"pharos_testnet"}'
```

---

### 5. Cross-Chain Portfolio Analyzer

Aggregates ERC-20 + native token holdings across all supported chains with live USD prices from CoinGecko.

```bash
curl -X POST http://localhost:3000/api/portfolio \
  -d '{"address":"0x...","chains":["pharos_testnet","ethereum","polygon"]}'
```

---

### 6. Wallet Reputation Oracle

Scores wallet trustworthiness 0–100 across 6 factors. Returns `UNTRUSTED` / `LOW` / `FAIR` / `GOOD` / `EXCELLENT`.

```bash
curl -X POST http://localhost:3000/api/wallet-reputation \
  -d '{"address":"0x...","network":"pharos_testnet"}'
```

---

### 7. Rug Pull Detector

Scans token contracts for rug pull signals: mint functions, blacklists, adjustable fees, selfdestruct, ownership status, and holder concentration from transfer analysis.

```bash
curl -X POST http://localhost:3000/api/rug-pull \
  -d '{"contractAddress":"0x...","network":"ethereum"}'
```

---

### 8. AI Portfolio Rebalancer

Analyzes current portfolio allocation and generates HOLD/INCREASE/REDUCE/EXIT recommendations based on a risk profile.

| Profile | Stablecoin | Bluechip | Native | Altcoin |
|---|---|---|---|---|
| `conservative` | 45% | 35% | 15% | 5% |
| `moderate` | 25% | 40% | 20% | 15% |
| `aggressive` | 10% | 30% | 20% | 40% |

```bash
curl -X POST http://localhost:3000/api/rebalance \
  -d '{"address":"0x...","riskProfile":"moderate","chains":["pharos_testnet","ethereum"]}'
```

---

### 9. Pharos Network Intelligence 🔷

**Pharos-exclusive skill.** Provides real-time chain intelligence for Pharos Testnet and Mainnet — the ideal skill for agents deciding *when* to execute transactions.

**Returns:**
- Latest block number
- Gas price (Gwei)
- Average block time (ms)
- Estimated TPS (from block sample)
- Network load level: `LOW` | `MODERATE` | `HIGH` | `CONGESTED`
- `optimalGasWindow` boolean — tells an agent whether now is a good time to transact
- Recent block stats (gas used/limit, tx count, base fee)

```bash
curl -X POST http://localhost:3000/api/network-stats \
  -d '{"network":"pharos_testnet","blockSample":10}'
```

```json
{
  "success": true,
  "data": {
    "network": "Pharos Atlantic Testnet",
    "chainId": 688689,
    "latestBlock": 1042891,
    "gasPriceGwei": "0.0010",
    "avgBlockTimeMs": 2000,
    "estimatedTps": 12.5,
    "networkLoad": "LOW",
    "optimalGasWindow": true,
    "summary": "Network is in optimal state (TPS: 12.5). Ideal window for agent transaction execution."
  }
}
```

---

## Composability — Example Agent Flows

### Flow 1: Pharos Whale Hunter Agent
```
pharosNetworkIntelligence   → check if network load is LOW
        ↓
whaleTracking               → scan last 20 Pharos blocks for >100 PHRS moves
        ↓
walletPersonalityAnalyzer   → profile each whale wallet found
        ↓
walletReputationOracle      → score their trustworthiness
        ↓
crossChainPortfolioAnalyzer → map their full holdings
```

### Flow 2: DeFi Risk Intelligence Agent
```
rugPullDetector             → scan token contract for rug signals
        ↓
smartContractRiskAuditor    → deep audit of contract security
        ↓
onChainCreditScore          → score the deployer wallet
        ↓
walletReputationOracle      → reputation check on deployer
```

### Flow 3: Portfolio Manager Agent
```
crossChainPortfolioAnalyzer → get current holdings & USD value
        ↓
aiPortfolioRebalancer       → generate rebalancing actions
        ↓
pharosNetworkIntelligence   → wait for optimal gas window on Pharos
        ↓
[Agent executes rebalance transactions on Pharos]
```

---

## Using as a TypeScript Library

```typescript
import {
  walletPersonalityAnalyzer,
  pharosNetworkIntelligence,
  getSkillDefinitions,
  ALL_SKILLS,
} from "pharos-skills";

// Execute a skill directly
const result = await pharosNetworkIntelligence.execute({
  network: "pharos_testnet",
  blockSample: 10,
});

if (result.success) {
  console.log(`TPS: ${result.data.estimatedTps}`);
  console.log(`Optimal window: ${result.data.optimalGasWindow}`);
}

// Get all skill definitions for LLM tool registration
const tools = getSkillDefinitions();
```

---

## Deploy to Railway (One Click)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

```bash
# Manual deploy
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## Deploy to Render

1. Fork this repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo — Render auto-detects `render.yaml`
4. Deploy → live in ~2 minutes

---

## Project Structure

```
pharos-skills/
├── src/
│   ├── skills/
│   │   ├── pharosNetworkIntelligence.ts   ← Pharos-native ⭐
│   │   ├── walletPersonalityAnalyzer.ts
│   │   ├── onChainCreditScore.ts
│   │   ├── smartContractRiskAuditor.ts
│   │   ├── whaleTracking.ts
│   │   ├── crossChainPortfolioAnalyzer.ts
│   │   ├── walletReputationOracle.ts
│   │   ├── rugPullDetector.ts
│   │   └── aiPortfolioRebalancer.ts
│   ├── api/
│   │   └── server.ts                      ← Express REST API
│   ├── config/
│   │   └── networks.ts                    ← Pharos + EVM chain configs
│   ├── utils/
│   │   ├── client.ts                      ← ethers.js providers
│   │   └── explorer.ts                    ← Block explorer API helpers
│   ├── types/
│   │   └── skill.ts                       ← Skill interface types
│   └── index.ts                           ← Library entry point
├── public/
│   └── index.html                         ← Interactive test UI
├── railway.toml                           ← Railway deployment config
├── render.yaml                            ← Render deployment config
└── tsconfig.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5 |
| Runtime | Node.js 20+ |
| Web3 | ethers.js v6 |
| API | Express 5 |
| Price Data | CoinGecko API (free tier) |
| Explorer | Blockscout-compatible (Pharos, Etherscan, etc.) |
| Deploy | Railway / Render |

---

## Hackathon Alignment

This submission directly addresses the Pharos Skill-to-Agent Hackathon goals:

- **Reusable Skills** — Each skill is a standalone module callable by any agent
- **AI Agent Integration** — `/api/agent-tools` returns OpenAI function-calling format, pluggable into any LLM
- **Pharos-native** — `pharosNetworkIntelligence` is built exclusively for Pharos Testnet and Mainnet
- **Composable** — Skills chain together for complex agent workflows (see flows above)
- **On-chain economy** — Skills enable agents to analyze, decide, and act within the Pharos ecosystem

---

## License

MIT — built for the Pharos Skill-to-Agent Dual Cascade Hackathon
