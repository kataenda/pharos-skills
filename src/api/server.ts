import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { join } from "path";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./openapi.js";
import {
  walletPersonalityAnalyzer,
  onChainCreditScore,
  smartContractRiskAuditor,
  whaleTracking,
  crossChainPortfolioAnalyzer,
  walletReputationOracle,
  rugPullDetector,
  aiPortfolioRebalancer,
  pharosNetworkIntelligence,
  agentDecisionEngine,
  agentTaskPlanner,
  ALL_SKILLS,
  onChainPaymentAdvisor,
  socialGraphAnalyzer,
} from "../index.js";
import { NETWORKS } from "../config/networks.js";

const PUBLIC_DIR = join(process.cwd(), "public");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// ── Swagger UI ────────────────────────────────────────────────────────────
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: "Pharos Skills API Docs",
  customCss: ".swagger-ui .topbar { background-color: #6B46C1; }",
}));
app.get("/api/openapi.json", (_req: Request, res: Response) => res.json(openApiSpec));

// ── Request logger ────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Serve UI ──────────────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(join(PUBLIC_DIR, "index.html"));
});

// ── Health check ──────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    skills: ALL_SKILLS.map(s => s.name),
    networks: Object.entries(NETWORKS).map(([key, cfg]) => ({
      key,
      name: cfg.name,
      chainId: cfg.chainId,
      nativeToken: cfg.nativeToken,
    })),
    timestamp: new Date().toISOString(),
  });
});

// ── Agent Tools (OpenAI function-calling format) ──────────────────────────
app.get("/api/agent-tools", (_req: Request, res: Response) => {
  const tools = [
    walletPersonalityAnalyzer,
    onChainCreditScore,
    smartContractRiskAuditor,
    whaleTracking,
    crossChainPortfolioAnalyzer,
    walletReputationOracle,
    rugPullDetector,
    aiPortfolioRebalancer,
    pharosNetworkIntelligence,
    agentDecisionEngine,
    agentTaskPlanner,
  ].map(({ name, description, parameters }) => ({
    type: "function",
    function: { name, description, parameters },
  }));
  res.json({ tools });
});

// ── Skill definitions (for AI agent discovery) ────────────────────────────
app.get("/api/skills", (_req: Request, res: Response) => {
  const skills = [
    walletPersonalityAnalyzer,
    onChainCreditScore,
    smartContractRiskAuditor,
    whaleTracking,
    crossChainPortfolioAnalyzer,
    walletReputationOracle,
    rugPullDetector,
    aiPortfolioRebalancer,
    pharosNetworkIntelligence,
  ].map(({ name, description, parameters }) => ({ name, description, parameters }));

  res.json({ skills });
});

// ── POST /api/wallet-personality ──────────────────────────────────────────
app.post("/api/wallet-personality", async (req: Request, res: Response) => {
  const { address, network } = req.body as { address?: string; network?: string };

  if (!address) {
    res.status(400).json({ success: false, error: "address is required" });
    return;
  }

  const result = await walletPersonalityAnalyzer.execute({ address, network });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /api/credit-score ────────────────────────────────────────────────
app.post("/api/credit-score", async (req: Request, res: Response) => {
  const { address, network } = req.body as { address?: string; network?: string };

  if (!address) {
    res.status(400).json({ success: false, error: "address is required" });
    return;
  }

  const result = await onChainCreditScore.execute({ address, network });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /api/risk-audit ──────────────────────────────────────────────────
app.post("/api/risk-audit", async (req: Request, res: Response) => {
  const { contractAddress, network } = req.body as {
    contractAddress?: string;
    network?: string;
  };

  if (!contractAddress) {
    res.status(400).json({ success: false, error: "contractAddress is required" });
    return;
  }

  const result = await smartContractRiskAuditor.execute({ contractAddress, network });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /api/whale-tracker ───────────────────────────────────────────────
app.post("/api/whale-tracker", async (req: Request, res: Response) => {
  const { thresholdNative, blockRange, watchAddresses, network } = req.body as {
    thresholdNative?: number;
    blockRange?: number;
    watchAddresses?: string[];
    network?: string;
  };

  const result = await whaleTracking.execute({
    thresholdNative,
    blockRange,
    watchAddresses,
    network,
  });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /api/portfolio ───────────────────────────────────────────────────
app.post("/api/portfolio", async (req: Request, res: Response) => {
  const { address, chains } = req.body as {
    address?: string;
    chains?: string[];
  };

  if (!address) {
    res.status(400).json({ success: false, error: "address is required" });
    return;
  }

  const result = await crossChainPortfolioAnalyzer.execute({ address, chains });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /api/payment-advice ──────────────────────────────────────────────
app.post("/api/payment-advice", async (req: Request, res: Response) => {
  const { from, to, amountNative, network } = req.body as {
    from?: string; to?: string; amountNative?: number; network?: string;
  };
  if (!from || !to || amountNative === undefined) {
    res.status(400).json({ success: false, error: "from, to, and amountNative are required" });
    return;
  }
  const result = await onChainPaymentAdvisor.execute({ from, to, amountNative, network });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /api/social-graph ─────────────────────────────────────────────────
app.post("/api/social-graph", async (req: Request, res: Response) => {
  const { address, network } = req.body as { address?: string; network?: string };
  if (!address) {
    res.status(400).json({ success: false, error: "address is required" });
    return;
  }
  const result = await socialGraphAnalyzer.execute({ address, network });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /api/wallet-reputation ───────────────────────────────────────────
app.post("/api/wallet-reputation", async (req: Request, res: Response) => {
  const { address, network } = req.body as { address?: string; network?: string };
  if (!address) {
    res.status(400).json({ success: false, error: "address is required" });
    return;
  }
  const result = await walletReputationOracle.execute({ address, network });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /api/rug-pull ────────────────────────────────────────────────────
app.post("/api/rug-pull", async (req: Request, res: Response) => {
  const { contractAddress, network } = req.body as { contractAddress?: string; network?: string };
  if (!contractAddress) {
    res.status(400).json({ success: false, error: "contractAddress is required" });
    return;
  }
  const result = await rugPullDetector.execute({ contractAddress, network });
  res.status(result.success ? 200 : 400).json(result);
});

// ── GET /skills (clean registry for juries & agents) ─────────────────────
app.get("/skills", (_req: Request, res: Response) => {
  res.json({
    skills: ALL_SKILLS.map(s => s.name),
    count: ALL_SKILLS.length,
    version: "1.0.0",
    docsUrl: "/api/skills",
    agentToolsUrl: "/api/agent-tools",
  });
});

// ── POST /agent/recommend ─────────────────────────────────────────────────
app.post("/agent/recommend", async (req: Request, res: Response) => {
  const { wallet, network = "pharos_testnet" } = req.body as {
    wallet?: string;
    network?: string;
  };

  if (!wallet) {
    res.status(400).json({ success: false, error: "wallet is required" });
    return;
  }

  const [reputationRes, creditRes, decisionRes] = await Promise.all([
    walletReputationOracle.execute({ address: wallet, network }),
    onChainCreditScore.execute({ address: wallet, network }),
    agentDecisionEngine.execute({ wallet, network }),
  ]);

  const walletScore = reputationRes.success
    ? Math.round(
        ((reputationRes.data?.reputationScore ?? 0) / 100) * 60 +
        ((creditRes.data?.score ?? 0) / 1000) * 40
      )
    : null;

  const grade = creditRes.data?.grade ?? null;
  const trustLevel = reputationRes.data?.trustLevel ?? "UNKNOWN";
  const creditScore = creditRes.data?.score ?? null;

  let risk: "low" | "medium" | "high" | "critical" = "medium";
  if (trustLevel === "EXCELLENT" && (creditScore ?? 0) >= 700) risk = "low";
  else if (trustLevel === "UNTRUSTED" || (creditScore ?? 999) < 200) risk = "critical";
  else if (trustLevel === "LOW" || (creditScore ?? 999) < 400) risk = "high";

  res.json({
    wallet,
    network,
    wallet_score: walletScore,
    credit_score: creditScore,
    credit_grade: grade,
    trust_level: trustLevel,
    risk,
    recommended_action: decisionRes.data?.action ?? "MONITOR",
    confidence: decisionRes.data?.confidence ?? 0,
    reason: decisionRes.data?.reason ?? "Insufficient data",
    execution_ready: decisionRes.data?.executionReady ?? false,
    network_condition: decisionRes.data?.networkCondition ?? "ACCEPTABLE",
  });
});

// ── POST /agent/decide ────────────────────────────────────────────────────
app.post("/agent/decide", async (req: Request, res: Response) => {
  const { wallet, network } = req.body as { wallet?: string; network?: string };
  if (!wallet) {
    res.status(400).json({ success: false, error: "wallet is required" });
    return;
  }
  const result = await agentDecisionEngine.execute({ wallet, network });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /agent/plan ──────────────────────────────────────────────────────
app.post("/agent/plan", async (req: Request, res: Response) => {
  const { goal, context } = req.body as {
    goal?: string;
    context?: { wallet?: string; network?: string; riskProfile?: string };
  };
  if (!goal) {
    res.status(400).json({ success: false, error: "goal is required" });
    return;
  }
  const result = await agentTaskPlanner.execute({ goal, context });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /api/network-stats ───────────────────────────────────────────────
app.post("/api/network-stats", async (req: Request, res: Response) => {
  const { network, blockSample } = req.body as {
    network?: "pharos_testnet" | "pharos_mainnet";
    blockSample?: number;
  };
  const result = await pharosNetworkIntelligence.execute({ network, blockSample });
  res.status(result.success ? 200 : 400).json(result);
});

// ── POST /api/rebalance ───────────────────────────────────────────────────
app.post("/api/rebalance", async (req: Request, res: Response) => {
  const { address, riskProfile, chains } = req.body as {
    address?: string;
    riskProfile?: "conservative" | "moderate" | "aggressive";
    chains?: string[];
  };
  if (!address) {
    res.status(400).json({ success: false, error: "address is required" });
    return;
  }
  const result = await aiPortfolioRebalancer.execute({ address, riskProfile, chains });
  res.status(result.success ? 200 : 400).json(result);
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`\nPharos Skills API running on http://localhost:${PORT}`);

  console.log("\nSupported Networks:");
  for (const [key, cfg] of Object.entries(NETWORKS)) {
    console.log(`  ✓ ${cfg.name} (${key}) — chainId: ${cfg.chainId}, token: ${cfg.nativeToken}`);
  }

  console.log("\nEndpoints:");
  console.log("  GET  /health");
  console.log("  GET  /api/skills");
  console.log("  POST /api/wallet-personality");
  console.log("  POST /api/credit-score");
  console.log("  POST /api/risk-audit");
  console.log("  POST /api/whale-tracker");
  console.log("  POST /api/portfolio");
  console.log("  POST /api/wallet-reputation");
  console.log("  POST /api/rug-pull");
  console.log("  POST /api/rebalance");
  console.log("  POST /api/network-stats");
  console.log("  GET  /api/agent-tools");
  console.log("  GET  /skills");
  console.log("  POST /agent/recommend");
  console.log("  POST /agent/decide");
  console.log("  POST /agent/plan");
  console.log("  POST /api/payment-advice");
  console.log("  POST /api/social-graph");
  console.log("\nDocs:");
  console.log(`  GET  /docs          → Swagger UI`);
  console.log(`  GET  /api/openapi.json → Raw OpenAPI spec\n`);
});

export default app;
