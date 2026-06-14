# Pharos Skills Suite

> **Pharos Skill-to-Agent Dual Cascade Hackathon — Phase 1 Submission**
> Built for [Pharos Network](https://pharosnetwork.xyz) · 13 Reusable AI Agent Skills

A production-ready collection of **13 composable Skills** that AI agents can call to perform on-chain intelligence tasks on Pharos Network and other EVM chains. Each Skill is a self-contained module exposing a typed `execute()` interface and an OpenAI function-calling schema — ready to be plugged into any LLM-powered agent.

---

## 🌐 Live Demo

| | URL |
|---|---|
| **Interactive UI** | https://pharos.soenic.com |
| **Swagger API Docs** | https://pharos.soenic.com/docs |
| **Health Check** | https://pharos.soenic.com/health |
| **Agent Tools (OpenAI format)** | https://pharos.soenic.com/api/agent-tools |
| **GitHub** | https://github.com/kataenda/pharos-skills |

---

## Skills Overview

| # | Skill | Description | Pharos Pillar |
|---|---|---|---|
| 1 | `walletPersonalityAnalyzer` | Behavioral personality profile — 8 archetypes | AI Agent Economy |
| 2 | `onChainCreditScore` | Credit score 0–1000, grade D to AAA | AI Agent Economy |
| 3 | `smartContractRiskAuditor` | Security audit: bytecode + source analysis | AI Agent Economy |
| 4 | `whaleTracking` | Large transfer detection in recent blocks | AI Agent Economy |
| 5 | `crossChainPortfolioAnalyzer` | Multi-chain portfolio with live USD prices | AI Agent Economy |
| 6 | `walletReputationOracle` | Trust score 0–100, UNTRUSTED→EXCELLENT | AI Agent Economy |
| 7 | `rugPullDetector` | Rug pull signal scanner: mint, blacklist, fees | AI Agent Economy |
| 8 | `aiPortfolioRebalancer` | Rebalancing recommendations by risk profile | AI Agent Economy |
| **9** | **`pharosNetworkIntelligence`** | **Real-time Pharos chain stats: TPS, gas, load** | **🔷 Pharos-native** |
| **10** | **`onChainPaymentAdvisor`** | **Pre-payment validation: balance, risk, network** | **💸 On-chain Payments** |
| **11** | **`socialGraphAnalyzer`** | **On-chain social graph: score, community level** | **🕸️ Social Interactions** |
| **12** | **`agentDecisionEngine`** | **Runs 4 skills in parallel → BUY/HOLD/SELL/AVOID** | **🤖 Intelligent Agents** |
| **13** | **`agentTaskPlanner`** | **Natural language goal → ordered skill steps** | **🤖 Intelligent Agents** |

---

## Pharos Pillars Coverage

| Pillar | Skills |
|---|---|
| 🤖 AI Agent Economy | All 13 skills |
| 💸 On-chain Payments | `onChainPaymentAdvisor` |
| 🕸️ Social Interactions | `socialGraphAnalyzer` |
| 🧠 Intelligent Agents | `agentDecisionEngine`, `agentTaskPlanner` |
| 🔷 Pharos-native | `pharosNetworkIntelligence` |

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
git clone https://github.com/kataenda/pharos-skills
cd pharos-skills
npm install
npm run build
npm start
# → API running on http://localhost:3000
# → Swagger docs at http://localhost:3000/docs
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Interactive test UI |
| `GET` | `/docs` | **Swagger API documentation** |
| `GET` | `/health` | Server status + all 13 skills + networks |
| `GET` | `/skills` | Clean skill registry (for agent discovery) |
| `GET` | `/api/skills` | Full skill definitions with schemas |
| `GET` | `/api/agent-tools` | **OpenAI function-calling format** |
| `GET` | `/api/openapi.json` | Raw OpenAPI 3.0 spec |
| `POST` | `/api/wallet-personality` | Wallet Personality Analyzer |
| `POST` | `/api/credit-score` | On-Chain Credit Score |
| `POST` | `/api/risk-audit` | Smart Contract Risk Auditor |
| `POST` | `/api/whale-tracker` | Whale Tracking |
| `POST` | `/api/portfolio` | Cross-Chain Portfolio Analyzer |
| `POST` | `/api/wallet-reputation` | Wallet Reputation Oracle |
| `POST` | `/api/rug-pull` | Rug Pull Detector |
| `POST` | `/api/rebalance` | AI Portfolio Rebalancer |
| `POST` | `/api/network-stats` | Pharos Network Intelligence |
| `POST` | `/api/payment-advice` | On-Chain Payment Advisor |
| `POST` | `/api/social-graph` | Social Graph Analyzer |
| `POST` | `/agent/decide` | Agent Decision Engine |
| `POST` | `/agent/plan` | Agent Task Planner |
| `POST` | `/agent/recommend` | Aggregated agent recommendation |

---

## AI Agent Integration (OpenAI Function Calling)

The `/api/agent-tools` endpoint returns all 13 Skills in the exact format expected by OpenAI, Claude, and any function-calling compatible LLM:

```typescript
const response = await fetch("https://pharos.soenic.com/api/agent-tools");
const { tools } = await response.json();

// Pass directly to OpenAI / Claude API
const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  tools: tools,   // ← all 13 skills, ready to use
  messages: [{ role: "user", content: "Analyze this Pharos wallet: 0x..." }],
});
```

---

## Skill Reference

### 1. Wallet Personality Analyzer

Profiles a wallet's behavior into 8 archetypes based on transaction history.

**Personalities:** DeFi Degen 🦍 · Crypto Whale 🐋 · Diamond HODLer 💎 · Day Trader 📈 · On-Chain Builder 🏗️ · New Explorer 🌱 · Token Collector 🎨 · Web3 Citizen 🌐

```bash
curl -X POST https://pharos.soenic.com/api/wallet-personality \
  -H "Content-Type: application/json" \
  -d '{"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","network":"pharos_testnet"}'
```

---

### 2. On-Chain Credit Score

Scores a wallet 0–1000 across 6 weighted dimensions.

**Grades:** `D` → `CCC` → `B` → `BB` → `BBB` → `A` → `AA` → `AAA`

```bash
curl -X POST https://pharos.soenic.com/api/credit-score \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","network":"pharos_testnet"}'
```

---

### 3. Smart Contract Risk Auditor

Audits contract bytecode and source code for security vulnerabilities.

**Checks:** Source verification · SELFDESTRUCT · EIP-1967 proxy · `tx.origin` auth · `delegatecall` · Reentrancy

**Risk Levels:** `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

```bash
curl -X POST https://pharos.soenic.com/api/risk-audit \
  -H "Content-Type: application/json" \
  -d '{"contractAddress":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","network":"ethereum"}'
```

---

### 4. Whale Tracking

Scans recent blocks for native token transfers above a configurable threshold.

```bash
curl -X POST https://pharos.soenic.com/api/whale-tracker \
  -H "Content-Type: application/json" \
  -d '{"thresholdNative":100,"blockRange":20,"network":"pharos_testnet"}'
```

---

### 5. Cross-Chain Portfolio Analyzer

Aggregates ERC-20 + native token holdings across all supported chains with live USD prices from CoinGecko.

```bash
curl -X POST https://pharos.soenic.com/api/portfolio \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","chains":["pharos_testnet","ethereum","polygon"]}'
```

---

### 6. Wallet Reputation Oracle

Scores wallet trustworthiness 0–100 across 6 factors.

**Trust Levels:** `UNTRUSTED` | `LOW` | `FAIR` | `GOOD` | `EXCELLENT`

```bash
curl -X POST https://pharos.soenic.com/api/wallet-reputation \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","network":"pharos_testnet"}'
```

---

### 7. Rug Pull Detector

Scans token contracts for rug pull signals: mint functions, blacklists, adjustable fees, selfdestruct, ownership status, and holder concentration.

**Risk:** `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

```bash
curl -X POST https://pharos.soenic.com/api/rug-pull \
  -H "Content-Type: application/json" \
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
curl -X POST https://pharos.soenic.com/api/rebalance \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","riskProfile":"moderate","chains":["pharos_testnet","ethereum"]}'
```

---

### 9. Pharos Network Intelligence 🔷

**Pharos-exclusive skill.** Real-time chain intelligence for Pharos Testnet and Mainnet.

**Returns:** Latest block · Gas price (Gwei) · Avg block time · Estimated TPS · Network load · `optimalGasWindow`

**Network Load:** `LOW` | `MODERATE` | `HIGH` | `CONGESTED`

```bash
curl -X POST https://pharos.soenic.com/api/network-stats \
  -H "Content-Type: application/json" \
  -d '{"network":"pharos_testnet","blockSample":10}'
```

```json
{
  "success": true,
  "data": {
    "network": "Pharos Atlantic Testnet",
    "chainId": 688689,
    "latestBlock": 23773524,
    "gasPriceGwei": "0.0010",
    "avgBlockTimeMs": 2000,
    "estimatedTps": 12.5,
    "networkLoad": "LOW",
    "optimalGasWindow": true,
    "summary": "Network is in optimal state. Ideal window for agent transaction execution."
  }
}
```

---

### 10. On-Chain Payment Advisor 💸

**Pharos On-chain Payments pillar.** Validates a payment before execution — checks sender balance, recipient reputation, network conditions, and large transfer warnings.

**Payment Risk:** `LOW` | `MEDIUM` | `HIGH` | `BLOCKED`

```bash
curl -X POST https://pharos.soenic.com/api/payment-advice \
  -H "Content-Type: application/json" \
  -d '{"from":"0xSENDER","to":"0xRECIPIENT","amountNative":1.5,"network":"pharos_testnet"}'
```

```json
{
  "success": true,
  "data": {
    "paymentRisk": "LOW",
    "recommended": true,
    "recipientTrust": "GOOD",
    "networkOptimal": true,
    "advice": "Payment looks safe. Network conditions are optimal.",
    "checks": [
      { "check": "Sender Balance", "status": "PASS", "detail": "Sufficient funds" },
      { "check": "Network Condition", "status": "PASS", "detail": "Optimal gas window" }
    ]
  }
}
```

---

### 11. Social Graph Analyzer 🕸️

**Pharos Social Interactions pillar.** Maps a wallet's on-chain social network — unique interactions, community categories, and social influence level.

**Community Level:** `ISOLATED` | `PARTICIPANT` | `CONNECTOR` | `INFLUENCER`

**Community Categories:** Pharos Ecosystem · DeFi / Payments · DEX / Liquidity · DAO / Governance · NFT Collector · Builder

```bash
curl -X POST https://pharos.soenic.com/api/social-graph \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","network":"pharos_testnet"}'
```

```json
{
  "success": true,
  "data": {
    "socialScore": 68,
    "communityLevel": "CONNECTOR",
    "uniqueInteractions": 34,
    "communityCategories": ["Pharos Ecosystem", "DeFi / Payments"],
    "topConnections": [
      { "address": "0xabc...", "interactionCount": 12, "relationshipType": "FREQUENT" }
    ]
  }
}
```

---

### 12. Agent Decision Engine 🤖

**Intelligent Agent pillar.** Runs 4 skills in parallel (reputation + credit score + whale tracking + network intelligence) and synthesizes a single actionable decision.

**Actions:** `BUY` | `HOLD` | `SELL` | `MONITOR` | `AVOID`

```bash
curl -X POST https://pharos.soenic.com/agent/decide \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x...","network":"pharos_testnet"}'
```

```json
{
  "success": true,
  "data": {
    "action": "BUY",
    "confidence": 89,
    "reason": "Strong positive signals from walletReputationOracle, onChainCreditScore",
    "networkCondition": "OPTIMAL",
    "executionReady": true,
    "signals": [
      { "source": "walletReputationOracle", "signal": "BULLISH", "weight": 3, "detail": "Trust: EXCELLENT" }
    ]
  }
}
```

---

### 13. Agent Task Planner 🤖

**Intelligent Agent pillar.** Translates a natural language goal into an ordered sequence of Skills for an agent to execute.

**Supported goals:** yield/income · rebalance · risk audit · whale tracking · buy/invest · sell/exit · reputation check · contract due diligence

```bash
curl -X POST https://pharos.soenic.com/agent/plan \
  -H "Content-Type: application/json" \
  -d '{"goal":"Increase portfolio yield on Pharos","context":{"wallet":"0x...","network":"pharos_testnet"}}'
```

```json
{
  "success": true,
  "data": {
    "goal": "Increase portfolio yield on Pharos",
    "intent": "Maximize portfolio yield",
    "priority": "HIGH",
    "estimatedDuration": "3–5 minutes",
    "skillSequence": [
      "crossChainPortfolioAnalyzer",
      "aiPortfolioRebalancer",
      "pharosNetworkIntelligence",
      "agentDecisionEngine"
    ],
    "steps": [
      { "order": 1, "action": "Analyze current portfolio", "skill": "crossChainPortfolioAnalyzer" },
      { "order": 2, "action": "Generate rebalancing plan", "skill": "aiPortfolioRebalancer" },
      { "order": 3, "action": "Check Pharos network conditions", "skill": "pharosNetworkIntelligence" },
      { "order": 4, "action": "Make final decision", "skill": "agentDecisionEngine" }
    ]
  }
}
```

---

## Composability — Example Agent Flows

### Flow 1: Payment Safety Agent
```
agentTaskPlanner         → plan: "send payment safely"
        ↓
walletReputationOracle   → check recipient trust
        ↓
pharosNetworkIntelligence → verify network is optimal
        ↓
onChainPaymentAdvisor    → final payment risk assessment
        ↓
agentDecisionEngine      → GO / NO GO decision
```

### Flow 2: Pharos Whale Hunter Agent
```
pharosNetworkIntelligence   → check if network load is LOW
        ↓
whaleTracking               → scan last 20 Pharos blocks for large moves
        ↓
walletPersonalityAnalyzer   → profile each whale wallet found
        ↓
walletReputationOracle      → score their trustworthiness
        ↓
socialGraphAnalyzer         → map their on-chain social network
```

### Flow 3: DeFi Risk Intelligence Agent
```
rugPullDetector             → scan token contract for rug signals
        ↓
smartContractRiskAuditor    → deep audit of contract security
        ↓
onChainCreditScore          → score the deployer wallet
        ↓
walletReputationOracle      → reputation check on deployer
        ↓
agentDecisionEngine         → final risk verdict
```

### Flow 4: Portfolio Manager Agent
```
crossChainPortfolioAnalyzer → get current holdings & USD value
        ↓
aiPortfolioRebalancer       → generate rebalancing actions
        ↓
pharosNetworkIntelligence   → wait for optimal gas window on Pharos
        ↓
agentDecisionEngine         → confirm execution is safe
```

---

## Using as a TypeScript Library

```typescript
import {
  pharosNetworkIntelligence,
  agentDecisionEngine,
  agentTaskPlanner,
  onChainPaymentAdvisor,
  getSkillDefinitions,
  ALL_SKILLS,
} from "pharos-skills";

// Execute a skill directly
const network = await pharosNetworkIntelligence.execute({
  network: "pharos_testnet",
  blockSample: 10,
});

// Plan an agent task
const plan = await agentTaskPlanner.execute({
  goal: "Send payment safely to 0xABC",
  context: { wallet: "0x...", network: "pharos_testnet" },
});

// Get all skill definitions for LLM tool registration
const tools = getSkillDefinitions();
// → pass to OpenAI, Claude, or any function-calling LLM
```

---

## Project Structure

```
pharos-skills/
├── src/
│   ├── skills/
│   │   ├── pharosNetworkIntelligence.ts   ← Pharos-native 🔷
│   │   ├── onChainPaymentAdvisor.ts       ← On-chain Payments 💸
│   │   ├── socialGraphAnalyzer.ts         ← Social Interactions 🕸️
│   │   ├── agentDecisionEngine.ts         ← Intelligent Agents 🤖
│   │   ├── agentTaskPlanner.ts            ← Intelligent Agents 🤖
│   │   ├── walletPersonalityAnalyzer.ts
│   │   ├── onChainCreditScore.ts
│   │   ├── smartContractRiskAuditor.ts
│   │   ├── whaleTracking.ts
│   │   ├── crossChainPortfolioAnalyzer.ts
│   │   ├── walletReputationOracle.ts
│   │   ├── rugPullDetector.ts
│   │   └── aiPortfolioRebalancer.ts
│   ├── api/
│   │   ├── server.ts                      ← Express REST API (19 endpoints)
│   │   └── openapi.ts                     ← OpenAPI 3.0 spec
│   ├── config/
│   │   └── networks.ts                    ← Pharos + EVM chain configs
│   ├── utils/
│   │   ├── client.ts                      ← ethers.js providers
│   │   └── explorer.ts                    ← Blockscout API helpers
│   ├── types/
│   │   └── skill.ts                       ← Skill<TParams, TResult> interface
│   └── index.ts                           ← Library entry point + ALL_SKILLS
├── public/
│   └── index.html                         ← Interactive test UI (13 cards)
├── railway.toml
├── render.yaml
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
| API Docs | Swagger UI (OpenAPI 3.0) |
| Price Data | CoinGecko API (free tier) |
| Explorer | Blockscout-compatible (Pharos, Etherscan, etc.) |
| Deploy | Coolify (self-hosted) |

---

## Hackathon Alignment

| Judging Criteria | Implementation |
|---|---|
| Originality & creativity | 13 skills covering all 5 Pharos pillars |
| Technical quality | TypeScript + ethers.js v6, real on-chain RPC calls |
| Practical use case for AI Agents | `/api/agent-tools` in OpenAI function-calling format |
| Reusability & composability | `Skill<TParams, TResult>` interface, chainable flows |
| Deployment on Pharos | Live at pharos.soenic.com, Pharos Testnet & Mainnet |
| UX & documentation | Interactive UI + Swagger docs at `/docs` |
| Alignment with Pharos vision | All 5 pillars: AI Economy, Payments, Social, Agents, Native |

---

## Testing Skills via CLI

### One command (Windows / PowerShell)

The easiest way — `run-test.ps1` builds, starts the server, waits until it's
ready, tests all 13 skills, and stops the server again. No need for two
terminals or a manually running server:

```powershell
.\run-test.ps1
```

> If scripts are blocked by execution policy, run once per terminal:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

### Test against a running server

If a server is already running (locally via `npm start`, or in production),
use `test-all-skills.ps1` directly:

```powershell
# Test against localhost (requires `npm start` in another terminal)
.\test-all-skills.ps1

# Test against production
.\test-all-skills.ps1 -BaseUrl "https://pharos.soenic.com"

# Test with a custom wallet
.\test-all-skills.ps1 -Wallet "0xYOUR_WALLET" -Network "pharos_testnet"
```

> Unit tests (no server needed): `npm test` runs the 26 Vitest specs.

**Expected output:**
```
================================================================
  Pharos Skills API -- Test All 13 Skills
================================================================
  URL     : https://pharos.soenic.com
  Wallet  : 0xbac32...
  Network : pharos_testnet
================================================================

[1]  Wallet Personality Analyzer
  [PASS] walletPersonalityAnalyzer           633ms
       Personality : New Explorer
...
================================================================
  PASS : 13 / 13
================================================================
  All 13 skills working.
```

### Individual skill calls (PowerShell)

```powershell
# Wallet Personality
Invoke-WebRequest -Uri "https://pharos.soenic.com/api/wallet-personality" `
  -Method POST -ContentType "application/json" `
  -Body '{"address":"0x...","network":"pharos_testnet"}' `
  -UseBasicParsing | Select-Object -ExpandProperty Content

# Pharos Network Intelligence
Invoke-WebRequest -Uri "https://pharos.soenic.com/api/network-stats" `
  -Method POST -ContentType "application/json" `
  -Body '{"network":"pharos_testnet"}' `
  -UseBasicParsing | Select-Object -ExpandProperty Content

# Agent Decision Engine
Invoke-WebRequest -Uri "https://pharos.soenic.com/agent/decide" `
  -Method POST -ContentType "application/json" `
  -Body '{"wallet":"0x...","network":"pharos_testnet"}' `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Individual skill calls (Linux/macOS/Git Bash)

```bash
# Wallet Personality
curl -X POST https://pharos.soenic.com/api/wallet-personality \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","network":"pharos_testnet"}'

# Pharos Network Intelligence
curl -X POST https://pharos.soenic.com/api/network-stats \
  -H "Content-Type: application/json" \
  -d '{"network":"pharos_testnet"}'

# Agent Decision Engine
curl -X POST https://pharos.soenic.com/agent/decide \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x...","network":"pharos_testnet"}'

# Agent Task Planner
curl -X POST https://pharos.soenic.com/agent/plan \
  -H "Content-Type: application/json" \
  -d '{"goal":"Increase portfolio yield on Pharos","context":{"network":"pharos_testnet"}}'
```

---

## License

MIT © soesoe — built for the Pharos Skill-to-Agent Dual Cascade Hackathon
