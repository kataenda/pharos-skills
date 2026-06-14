import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { walletReputationOracle } from "./walletReputationOracle.js";
import { onChainCreditScore } from "./onChainCreditScore.js";
import { whaleTracking } from "./whaleTracking.js";
import { pharosNetworkIntelligence } from "./pharosNetworkIntelligence.js";
import { NETWORKS } from "../config/networks.js";

export interface DecisionParams {
  wallet: string;
  network?: string;
}

export interface DecisionSignal {
  source: string;
  signal: "BULLISH" | "BEARISH" | "NEUTRAL" | "WARNING";
  weight: number;
  detail: string;
}

export interface DecisionResult {
  wallet: string;
  network: string;
  action: "BUY" | "HOLD" | "SELL" | "MONITOR" | "AVOID";
  confidence: number;
  reason: string;
  signals: DecisionSignal[];
  networkCondition: "OPTIMAL" | "ACCEPTABLE" | "UNFAVORABLE";
  executionReady: boolean;
}

const ACTION_WEIGHTS = { BULLISH: 1, NEUTRAL: 0, BEARISH: -1, WARNING: -2 };

function scoreToAction(
  score: number,
  maxScore: number
): { action: DecisionResult["action"]; confidence: number } {
  const pct = score / maxScore;
  if (pct >= 0.65) return { action: "BUY",     confidence: Math.round(50 + pct * 50) };
  if (pct >= 0.40) return { action: "HOLD",    confidence: Math.round(40 + pct * 40) };
  if (pct >= 0.20) return { action: "MONITOR", confidence: Math.round(30 + pct * 30) };
  if (pct >= 0.00) return { action: "SELL",    confidence: Math.round(60 - pct * 60) };
  return { action: "AVOID", confidence: 90 };
}

export const agentDecisionEngine: Skill<DecisionParams, DecisionResult> = {
  name: "agentDecisionEngine",
  description:
    "Deterministic, rule-based decision layer (transparent weighted signal scoring — not an LLM). Aggregates results from Wallet Reputation, Credit Score, Whale Tracking, and Network Intelligence to produce a single actionable decision (BUY/HOLD/SELL/MONITOR/AVOID) with a confidence score and human-readable reason. Designed to be the final step in any agent decision pipeline on Pharos.",
  parameters: {
    type: "object",
    properties: {
      wallet: {
        type: "string",
        description: "Wallet address to evaluate for decision making",
      },
      network: {
        type: "string",
        description: "Network: pharos_testnet, pharos_mainnet, ethereum, polygon, bsc, arbitrum",
        default: "pharos_testnet",
      },
    },
    required: ["wallet"],
  },

  async execute({ wallet, network = "pharos_testnet" }): Promise<SkillResult<DecisionResult>> {
    try {
      if (!ethers.isAddress(wallet)) {
        return { success: false, error: "Invalid wallet address" };
      }

      if (!NETWORKS[network]) {
        return { success: false, error: `Unknown network: ${network}` };
      }

      // Run all intelligence skills in parallel
      const isPharos = network === "pharos_testnet" || network === "pharos_mainnet";

      const [reputationResult, creditResult, whaleResult, networkResult] = await Promise.all([
        walletReputationOracle.execute({ address: wallet, network }),
        onChainCreditScore.execute({ address: wallet, network }),
        whaleTracking.execute({ network, blockRange: 20, thresholdNative: 10 }),
        isPharos
          ? pharosNetworkIntelligence.execute({ network: network as "pharos_testnet" | "pharos_mainnet", blockSample: 5 })
          : Promise.resolve(null),
      ]);

      const signals: DecisionSignal[] = [];

      // ── Signal 1: Wallet Reputation ────────────────────────────────
      if (reputationResult.success && reputationResult.data) {
        const r = reputationResult.data;
        const signalMap: Record<string, DecisionSignal["signal"]> = {
          EXCELLENT: "BULLISH", GOOD: "BULLISH",
          FAIR: "NEUTRAL", LOW: "BEARISH", UNTRUSTED: "WARNING",
        };
        signals.push({
          source: "walletReputationOracle",
          signal: signalMap[r.trustLevel] ?? "NEUTRAL",
          weight: 3,
          detail: `Trust: ${r.trustLevel} (score ${r.reputationScore}/100) — ${r.summary}`,
        });
        if (r.flags.length > 0) {
          signals.push({
            source: "walletReputationOracle.flags",
            signal: "WARNING",
            weight: 2,
            detail: `Red flags: ${r.flags.join("; ")}`,
          });
        }
      }

      // ── Signal 2: Credit Score ─────────────────────────────────────
      if (creditResult.success && creditResult.data) {
        const c = creditResult.data;
        let sig: DecisionSignal["signal"] = "NEUTRAL";
        if (c.score >= 700) sig = "BULLISH";
        else if (c.score >= 500) sig = "NEUTRAL";
        else if (c.score >= 300) sig = "BEARISH";
        else sig = "WARNING";
        signals.push({
          source: "onChainCreditScore",
          signal: sig,
          weight: 3,
          detail: `Credit score ${c.score}/1000 (${c.grade}) — ${c.summary}`,
        });
      }

      // ── Signal 3: Whale Activity ───────────────────────────────────
      if (whaleResult.success && whaleResult.data) {
        const w = whaleResult.data;
        const isWatchedWallet = w.whaleTransactions.some(
          tx =>
            tx.from.toLowerCase() === wallet.toLowerCase() ||
            tx.to?.toLowerCase() === wallet.toLowerCase()
        );
        if (isWatchedWallet) {
          signals.push({
            source: "whaleTracking",
            signal: "BULLISH",
            weight: 4,
            detail: `Wallet directly involved in ${w.whaleTransactions.length} whale-level transactions (volume: ${w.totalVolume.toFixed(2)})`,
          });
        } else if (w.whaleTransactions.length > 5) {
          signals.push({
            source: "whaleTracking",
            signal: "BULLISH",
            weight: 1,
            detail: `High whale activity on network: ${w.whaleTransactions.length} large txs, total volume ${w.totalVolume.toFixed(2)}`,
          });
        } else {
          signals.push({
            source: "whaleTracking",
            signal: "NEUTRAL",
            weight: 1,
            detail: `Low whale activity: ${w.whaleTransactions.length} large txs in recent blocks`,
          });
        }
      }

      // ── Signal 4: Network Condition (Pharos only) ──────────────────
      let networkCondition: DecisionResult["networkCondition"] = "ACCEPTABLE";
      if (networkResult && networkResult.success && networkResult.data) {
        const n = networkResult.data;
        if (n.optimalGasWindow) {
          networkCondition = "OPTIMAL";
          signals.push({
            source: "pharosNetworkIntelligence",
            signal: "BULLISH",
            weight: 2,
            detail: `Network load: ${n.networkLoad}, gas: ${n.gasPriceGwei} Gwei, TPS: ${n.estimatedTps} — optimal execution window`,
          });
        } else if (n.networkLoad === "HIGH") {
          networkCondition = "UNFAVORABLE";
          signals.push({
            source: "pharosNetworkIntelligence",
            signal: "BEARISH",
            weight: 2,
            detail: `Network congested (${n.networkLoad}), gas: ${n.gasPriceGwei} Gwei — consider delaying execution`,
          });
        } else {
          signals.push({
            source: "pharosNetworkIntelligence",
            signal: "NEUTRAL",
            weight: 1,
            detail: `Network load: ${n.networkLoad}, gas: ${n.gasPriceGwei} Gwei`,
          });
        }
      }

      // ── Aggregate signals into score ───────────────────────────────
      let weightedScore = 0;
      let totalWeight = 0;

      for (const sig of signals) {
        weightedScore += ACTION_WEIGHTS[sig.signal] * sig.weight;
        totalWeight += sig.weight;
      }

      const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
      // Map -2..+1 to 0..maxScore
      const maxScore = 10;
      const mappedScore = Math.round(((normalizedScore + 2) / 3) * maxScore);
      const { action, confidence } = scoreToAction(mappedScore, maxScore);

      // Override to AVOID if reputation is UNTRUSTED
      const reputationTrust = reputationResult.data?.trustLevel;
      const finalAction: DecisionResult["action"] =
        reputationTrust === "UNTRUSTED" ? "AVOID" : action;
      const finalConfidence =
        reputationTrust === "UNTRUSTED" ? 95 : confidence;

      // Build human-readable reason
      const bullish = signals.filter(s => s.signal === "BULLISH").map(s => s.source);
      const bearish = signals.filter(s => s.signal === "BEARISH" || s.signal === "WARNING").map(s => s.source);
      let reason = "";

      if (finalAction === "BUY") {
        reason = bullish.length > 0
          ? `Strong positive signals from ${bullish.join(", ")}. Wallet shows strong on-chain credibility and favorable network conditions.`
          : "Multiple indicators align positively.";
      } else if (finalAction === "HOLD") {
        reason = "Mixed signals — no strong case to buy or sell. Monitor for changes.";
      } else if (finalAction === "SELL") {
        reason = bearish.length > 0
          ? `Negative signals from ${bearish.join(", ")}. Wallet shows weak on-chain history or poor conditions.`
          : "Risk indicators suggest reducing exposure.";
      } else if (finalAction === "MONITOR") {
        reason = "Insufficient signals for a strong recommendation. Continue monitoring wallet activity.";
      } else {
        reason = `Wallet flagged as untrusted. Trust level: ${reputationTrust}. Avoid interaction until reputation improves.`;
      }

      return {
        success: true,
        data: {
          wallet,
          network: NETWORKS[network].name,
          action: finalAction,
          confidence: finalConfidence,
          reason,
          signals,
          networkCondition,
          executionReady: networkCondition !== "UNFAVORABLE" && finalAction !== "AVOID",
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};
