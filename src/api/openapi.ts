export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Pharos Skills API",
    version: "1.0.0",
    description: `## Reusable AI Agent Skills for Pharos Network

A collection of **13 composable Skills** that AI agents can call to perform on-chain intelligence tasks on Pharos Network and other EVM chains.

### Pharos Pillars Covered
| Pillar | Skills |
|---|---|
| 🤖 AI Agent Economy | \`agentDecisionEngine\`, \`agentTaskPlanner\` |
| 💸 On-chain Payments | \`onChainPaymentAdvisor\` |
| 🕸️ Social Interactions | \`socialGraphAnalyzer\` |
| 🧠 Intelligent Agents | \`agentDecisionEngine\`, \`agentTaskPlanner\` |
| 🔷 Pharos-native | \`pharosNetworkIntelligence\` |

### Quick Start
\`\`\`bash
npm install && npm run build && npm start
\`\`\`

### AI Agent Integration
\`GET /api/agent-tools\` returns all 13 skills in **OpenAI function-calling format** — paste directly into any LLM tool call.`,
    contact: { name: "Pharos Skills Hackathon", url: "https://pharosnetwork.xyz" },
    license: { name: "MIT" },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local development" },
    { url: "https://pharos-skills.up.railway.app", description: "Production (Railway)" },
  ],
  tags: [
    { name: "System",        description: "Health checks and skill discovery" },
    { name: "Wallet",        description: "Wallet intelligence skills" },
    { name: "Contract",      description: "Smart contract analysis skills" },
    { name: "Portfolio",     description: "Portfolio and asset skills" },
    { name: "Payments",      description: "On-chain payment intelligence" },
    { name: "Social",        description: "On-chain social graph" },
    { name: "Network",       description: "Pharos network intelligence" },
    { name: "Agent",         description: "AI agent orchestration — decision, planning, recommendations" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        description: "Returns server status, list of all skills, and supported networks.",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                example: {
                  status: "ok",
                  skills: ["walletPersonalityAnalyzer", "onChainCreditScore"],
                  networks: [{ key: "pharos_testnet", name: "Pharos Atlantic Testnet", chainId: 688689, nativeToken: "PHRS" }],
                  timestamp: "2026-06-08T00:00:00.000Z",
                },
              },
            },
          },
        },
      },
    },
    "/skills": {
      get: {
        tags: ["System"],
        summary: "List all skill names",
        description: "Returns a clean registry of all 13 skill names. Designed for agent discovery.",
        operationId: "listSkills",
        responses: {
          "200": {
            description: "Skill registry",
            content: {
              "application/json": {
                example: {
                  skills: ["walletPersonalityAnalyzer", "onChainCreditScore", "pharosNetworkIntelligence"],
                  count: 13,
                  version: "1.0.0",
                  docsUrl: "/api/skills",
                  agentToolsUrl: "/api/agent-tools",
                },
              },
            },
          },
        },
      },
    },
    "/api/skills": {
      get: {
        tags: ["System"],
        summary: "Full skill definitions",
        description: "Returns complete skill definitions including parameter schemas.",
        operationId: "getSkillDefinitions",
        responses: { "200": { description: "Array of skill definitions with name, description, parameters" } },
      },
    },
    "/api/agent-tools": {
      get: {
        tags: ["System", "Agent"],
        summary: "OpenAI function-calling format ⭐",
        description: "Returns all 13 skills in **OpenAI function-calling format**. Paste the `tools` array directly into any OpenAI/Claude/LLM API call that supports tool use.",
        operationId: "getAgentTools",
        responses: {
          "200": {
            description: "Array of tool definitions",
            content: {
              "application/json": {
                example: {
                  tools: [{
                    type: "function",
                    function: {
                      name: "pharosNetworkIntelligence",
                      description: "Provides real-time Pharos Network intelligence...",
                      parameters: { type: "object", properties: { network: { type: "string" } } },
                    },
                  }],
                },
              },
            },
          },
        },
      },
    },
    "/api/wallet-personality": {
      post: {
        tags: ["Wallet"],
        summary: "Wallet Personality Analyzer",
        description: "Profiles a wallet's on-chain behavior into 8 archetypes: DeFi Degen 🦍, Crypto Whale 🐋, Diamond HODLer 💎, Day Trader 📈, On-Chain Builder 🏗️, New Explorer 🌱, Token Collector 🎨, Web3 Citizen 🌐",
        operationId: "walletPersonality",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["address"],
                properties: {
                  address: { type: "string", example: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
                  network: { type: "string", enum: ["pharos_testnet","pharos_mainnet","ethereum","polygon","bsc","arbitrum"], default: "pharos_testnet" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Personality profile",
            content: {
              "application/json": {
                example: { success: true, data: { personality: "Crypto Whale", emoji: "🐋", description: "...", traits: [], stats: { txCount: 312, nativeBalance: "145.23 ETH" } } },
              },
            },
          },
        },
      },
    },
    "/api/credit-score": {
      post: {
        tags: ["Wallet"],
        summary: "On-Chain Credit Score",
        description: "Scores a wallet 0–1000 across 6 dimensions. Grades: D → CCC → B → BB → BBB → A → AA → AAA",
        operationId: "creditScore",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["address"],
                properties: {
                  address: { type: "string", example: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
                  network: { type: "string", default: "pharos_testnet" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Credit score result", content: { "application/json": { example: { success: true, data: { score: 742, grade: "A", summary: "Good standing." } } } } },
        },
      },
    },
    "/api/risk-audit": {
      post: {
        tags: ["Contract"],
        summary: "Smart Contract Risk Auditor",
        description: "Audits contract bytecode + source for SELFDESTRUCT, DELEGATECALL, tx.origin, reentrancy, proxy patterns. Risk: LOW / MEDIUM / HIGH / CRITICAL",
        operationId: "riskAudit",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["contractAddress"],
                properties: {
                  contractAddress: { type: "string", example: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
                  network: { type: "string", default: "ethereum" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Risk audit result with findings array" } },
      },
    },
    "/api/whale-tracker": {
      post: {
        tags: ["Wallet"],
        summary: "Whale Tracking",
        description: "Scans recent blocks for native token transfers above a configurable threshold.",
        operationId: "whaleTracker",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  thresholdNative: { type: "number", default: 100, description: "Min transfer in native tokens" },
                  blockRange: { type: "number", default: 20, maximum: 100 },
                  watchAddresses: { type: "array", items: { type: "string" } },
                  network: { type: "string", default: "pharos_testnet" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Whale transactions and top whales by volume" } },
      },
    },
    "/api/portfolio": {
      post: {
        tags: ["Portfolio"],
        summary: "Cross-Chain Portfolio Analyzer",
        description: "Aggregates ERC-20 + native token holdings across all supported chains with live USD prices from CoinGecko.",
        operationId: "portfolio",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["address"],
                properties: {
                  address: { type: "string", example: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
                  chains: { type: "array", items: { type: "string" }, example: ["pharos_testnet","ethereum"] },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Portfolio per chain with USD values and total" } },
      },
    },
    "/api/wallet-reputation": {
      post: {
        tags: ["Wallet"],
        summary: "Wallet Reputation Oracle",
        description: "Scores wallet trustworthiness 0–100. Trust levels: UNTRUSTED / LOW / FAIR / GOOD / EXCELLENT",
        operationId: "walletReputation",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["address"],
                properties: {
                  address: { type: "string", example: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
                  network: { type: "string", default: "pharos_testnet" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Reputation score with factors and red flags",
            content: { "application/json": { example: { success: true, data: { reputationScore: 72, trustLevel: "GOOD", flags: [] } } } } },
        },
      },
    },
    "/api/rug-pull": {
      post: {
        tags: ["Contract"],
        summary: "Rug Pull Detector",
        description: "Scans token contracts for: unverified source, mint functions, blacklist, pausable, adjustable fees, selfdestruct, non-renounced ownership, holder concentration.",
        operationId: "rugPull",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["contractAddress"],
                properties: {
                  contractAddress: { type: "string" },
                  network: { type: "string", default: "ethereum" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Rug risk level and signals" } },
      },
    },
    "/api/rebalance": {
      post: {
        tags: ["Portfolio"],
        summary: "AI Portfolio Rebalancer",
        description: "Analyzes current portfolio and generates HOLD/INCREASE/REDUCE/EXIT actions per asset based on risk profile.\n\n| Profile | Stablecoin | Bluechip | Native | Altcoin |\n|---|---|---|---|---|\n| conservative | 45% | 35% | 15% | 5% |\n| moderate | 25% | 40% | 20% | 15% |\n| aggressive | 10% | 30% | 20% | 40% |",
        operationId: "rebalance",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["address"],
                properties: {
                  address: { type: "string" },
                  riskProfile: { type: "string", enum: ["conservative","moderate","aggressive"], default: "moderate" },
                  chains: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Current allocation, target allocation, and rebalancing actions" } },
      },
    },
    "/api/payment-advice": {
      post: {
        tags: ["Payments"],
        summary: "On-Chain Payment Advisor ⭐ (Pharos pillar)",
        description: "Before executing any payment, validates: sender balance, recipient reputation, gas cost, network conditions. Returns recommended/not-recommended verdict.\n\n**Checks performed:**\n- Sender balance sufficiency\n- Recipient type (EOA vs contract)\n- Recipient trust level (via walletReputationOracle)\n- Large transfer warning (>50% of balance)\n- Network conditions (Pharos only)",
        operationId: "paymentAdvice",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["from","to","amountNative"],
                properties: {
                  from: { type: "string", description: "Sender address" },
                  to: { type: "string", description: "Recipient address" },
                  amountNative: { type: "number", description: "Amount in native token (PHRS, ETH, etc.)" },
                  network: { type: "string", default: "pharos_testnet" },
                },
              },
              example: { from: "0xSENDER...", to: "0xRECIPIENT...", amountNative: 1.5, network: "pharos_testnet" },
            },
          },
        },
        responses: {
          "200": {
            description: "Payment risk assessment",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    paymentRisk: "LOW",
                    recommended: true,
                    recipientTrust: "GOOD",
                    networkOptimal: true,
                    estimatedGasCost: "0.00000042 PHRS",
                    advice: "Payment looks safe. Network conditions are optimal.",
                    checks: [{ check: "Sender Balance", status: "PASS", detail: "Sufficient funds" }],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/social-graph": {
      post: {
        tags: ["Social"],
        summary: "Social Graph Analyzer ⭐ (Pharos pillar)",
        description: "Maps a wallet's on-chain social network. Returns social score (0–100), community level, top connections, and community categories (DEX/DAO/NFT/Pharos Ecosystem).\n\n**Community Levels:** ISOLATED → PARTICIPANT → CONNECTOR → INFLUENCER",
        operationId: "socialGraph",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["address"],
                properties: {
                  address: { type: "string" },
                  network: { type: "string", default: "pharos_testnet" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Social graph analysis",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    socialScore: 68,
                    communityLevel: "CONNECTOR",
                    uniqueInteractions: 34,
                    communityCategories: ["Pharos Ecosystem","DeFi / Payments","DEX / Liquidity Provider"],
                    topConnections: [{ address: "0xabc...", interactionCount: 12, relationshipType: "FREQUENT" }],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/network-stats": {
      post: {
        tags: ["Network"],
        summary: "Pharos Network Intelligence 🔷",
        description: "Real-time Pharos chain stats. Exclusively for Pharos Testnet and Mainnet.\n\n**Returns:** latest block, gas price, avg block time, estimated TPS, network load (LOW/MODERATE/HIGH/CONGESTED), `optimalGasWindow` boolean.",
        operationId: "networkStats",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  network: { type: "string", enum: ["pharos_testnet","pharos_mainnet"], default: "pharos_testnet" },
                  blockSample: { type: "number", minimum: 5, maximum: 20, default: 10 },
                },
              },
              example: { network: "pharos_testnet", blockSample: 10 },
            },
          },
        },
        responses: {
          "200": {
            description: "Network intelligence",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    network: "Pharos Atlantic Testnet",
                    chainId: 688689,
                    latestBlock: 23773524,
                    gasPriceGwei: "0.0010",
                    avgBlockTimeMs: 2000,
                    estimatedTps: 12.5,
                    networkLoad: "LOW",
                    optimalGasWindow: true,
                    summary: "Network is in optimal state. Ideal window for agent transaction execution.",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/agent/decide": {
      post: {
        tags: ["Agent"],
        summary: "Agent Decision Engine ⭐",
        description: "The AI agent decision layer. Runs **4 skills in parallel** (reputation + credit score + whale tracking + network intelligence) and produces a single actionable decision.\n\n**Actions:** BUY | HOLD | SELL | MONITOR | AVOID\n\n**Confidence:** 0–100%",
        operationId: "agentDecide",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["wallet"],
                properties: {
                  wallet: { type: "string", description: "Wallet address to evaluate" },
                  network: { type: "string", default: "pharos_testnet" },
                },
              },
              example: { wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", network: "pharos_testnet" },
            },
          },
        },
        responses: {
          "200": {
            description: "Decision with signals",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    action: "BUY",
                    confidence: 89,
                    reason: "Strong positive signals from walletReputationOracle, onChainCreditScore",
                    networkCondition: "OPTIMAL",
                    executionReady: true,
                    signals: [{ source: "walletReputationOracle", signal: "BULLISH", weight: 3, detail: "Trust: EXCELLENT" }],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/agent/plan": {
      post: {
        tags: ["Agent"],
        summary: "Agent Task Planner ⭐",
        description: "Translates a **natural language goal** into an ordered sequence of Skills to execute.\n\n**Supported goals:** yield/income, rebalance, risk/audit, whale/track, buy/invest, sell/exit, reputation, contract/token due diligence",
        operationId: "agentPlan",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["goal"],
                properties: {
                  goal: { type: "string", example: "Increase portfolio yield on Pharos" },
                  context: {
                    type: "object",
                    properties: {
                      wallet: { type: "string" },
                      network: { type: "string" },
                      riskProfile: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Task plan with ordered steps",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    goal: "Increase portfolio yield",
                    intent: "Maximize portfolio yield",
                    priority: "HIGH",
                    estimatedDuration: "3–5 minutes",
                    skillSequence: ["crossChainPortfolioAnalyzer","walletReputationOracle","aiPortfolioRebalancer","pharosNetworkIntelligence","agentDecisionEngine"],
                    steps: [{ order: 1, action: "Analyze current portfolio", skill: "crossChainPortfolioAnalyzer", inputHint: '{"address":"<wallet>"}' }],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/agent/recommend": {
      post: {
        tags: ["Agent"],
        summary: "Agent Recommend (aggregated) ⭐",
        description: "Single endpoint that runs reputation + credit score + decision engine and returns a combined recommendation. The simplest way to get an agent recommendation for any wallet.",
        operationId: "agentRecommend",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["wallet"],
                properties: {
                  wallet: { type: "string" },
                  network: { type: "string", default: "pharos_testnet" },
                },
              },
              example: { wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", network: "pharos_testnet" },
            },
          },
        },
        responses: {
          "200": {
            description: "Aggregated wallet recommendation",
            content: {
              "application/json": {
                example: {
                  wallet: "0xd8dA6BF...",
                  wallet_score: 82,
                  credit_score: 742,
                  credit_grade: "A",
                  trust_level: "GOOD",
                  risk: "medium",
                  recommended_action: "BUY",
                  confidence: 89,
                  reason: "Strong on-chain history with favorable conditions.",
                  execution_ready: true,
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      NetworkKey: {
        type: "string",
        enum: ["pharos_testnet","pharos_mainnet","ethereum","polygon","bsc","arbitrum"],
        description: "Supported blockchain networks",
      },
      SkillResult: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { type: "object" },
          error: { type: "string" },
        },
      },
    },
  },
};
