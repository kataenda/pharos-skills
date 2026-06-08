import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";
import { getTransactionList, getTokenTransfers } from "../utils/explorer.js";

export interface ReputationParams {
  address: string;
  network?: string;
}

export interface ReputationFactor {
  name: string;
  score: number;
  maxScore: number;
  detail: string;
}

export interface WalletReputationResult {
  address: string;
  network: string;
  reputationScore: number;
  trustLevel: "UNTRUSTED" | "LOW" | "FAIR" | "GOOD" | "EXCELLENT";
  factors: ReputationFactor[];
  flags: string[];
  summary: string;
}

function getTrustLevel(score: number): WalletReputationResult["trustLevel"] {
  if (score >= 80) return "EXCELLENT";
  if (score >= 60) return "GOOD";
  if (score >= 40) return "FAIR";
  if (score >= 20) return "LOW";
  return "UNTRUSTED";
}

export const walletReputationOracle: Skill<ReputationParams, WalletReputationResult> = {
  name: "walletReputationOracle",
  description:
    "Evaluates a wallet's on-chain reputation and trustworthiness (0–100 score) based on transaction history, activity age, success rate, DeFi participation, token diversity, and balance health. Returns a trust level (UNTRUSTED to EXCELLENT) with detailed factor breakdown and red-flag warnings.",
  parameters: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "Wallet address to evaluate",
      },
      network: {
        type: "string",
        description: "Network: pharos_testnet, pharos_mainnet, ethereum, polygon, bsc, arbitrum",
        default: "pharos_testnet",
      },
    },
    required: ["address"],
  },

  async execute({ address, network = "pharos_testnet" }): Promise<SkillResult<WalletReputationResult>> {
    try {
      if (!ethers.isAddress(address)) {
        return { success: false, error: "Invalid wallet address" };
      }

      const provider = getProvider(network);
      const config = getNetworkConfig(network);

      const [rawBalance, txCount, transactions, tokenTransfers] = await Promise.all([
        provider.getBalance(address).catch(() => 0n),
        provider.getTransactionCount(address).catch(() => 0),
        getTransactionList(config.explorerApi, address, 200),
        getTokenTransfers(config.explorerApi, address, 100),
      ]);

      const factors: ReputationFactor[] = [];
      const flags: string[] = [];

      // 1. Wallet age — max 20 pts (full at 1 year)
      const earliestTs = transactions.length > 0
        ? Math.min(...transactions.map(tx => parseInt(tx.timeStamp || "0")))
        : Date.now() / 1000;
      const daysSinceFirst = (Date.now() / 1000 - earliestTs) / 86400;
      const ageScore = Math.min(20, Math.floor((daysSinceFirst / 365) * 20));
      const ageDetail = daysSinceFirst < 1
        ? "Brand new wallet"
        : daysSinceFirst < 30
        ? `${Math.floor(daysSinceFirst)} days old`
        : daysSinceFirst < 365
        ? `${Math.floor(daysSinceFirst / 30)} months old`
        : `${(daysSinceFirst / 365).toFixed(1)} years old`;
      factors.push({ name: "Wallet Age", score: ageScore, maxScore: 20, detail: ageDetail });

      // 2. Transaction volume — max 20 pts (log scale, full at 500 txs)
      const txScore = txCount === 0
        ? 0
        : Math.min(20, Math.floor((Math.log10(txCount + 1) / Math.log10(501)) * 20));
      factors.push({ name: "Transaction Volume", score: txScore, maxScore: 20, detail: `${txCount} total transactions` });
      if (txCount === 0) flags.push("No transaction history on this network");

      // 3. Success rate — max 20 pts
      const failedTxs = transactions.filter(tx => tx.isError === "1").length;
      const successRate = transactions.length > 0 ? 1 - failedTxs / transactions.length : 1;
      const successScore = Math.floor(successRate * 20);
      factors.push({
        name: "Transaction Success Rate",
        score: successScore,
        maxScore: 20,
        detail: `${(successRate * 100).toFixed(1)}% success (${failedTxs} failed out of ${transactions.length})`,
      });
      if (successRate < 0.7 && transactions.length > 10) flags.push("Unusually high transaction failure rate");

      // 4. DeFi participation — max 20 pts
      const contractTxs = transactions.filter(tx => tx.input && tx.input !== "0x").length;
      const defiRatio = transactions.length > 0 ? contractTxs / transactions.length : 0;
      const defiScore = Math.min(20, Math.floor(defiRatio * 20));
      factors.push({
        name: "DeFi Participation",
        score: defiScore,
        maxScore: 20,
        detail: `${(defiRatio * 100).toFixed(1)}% contract interactions (${contractTxs} txs)`,
      });

      // 5. Token diversity — max 10 pts
      const uniqueTokens = new Set(tokenTransfers.map(t => t.contractAddress.toLowerCase())).size;
      const tokenScore = Math.min(10, uniqueTokens);
      factors.push({ name: "Token Diversity", score: tokenScore, maxScore: 10, detail: `${uniqueTokens} unique tokens interacted with` });

      // 6. Balance health — max 10 pts
      const balanceEth = parseFloat(ethers.formatEther(rawBalance));
      const balScore = balanceEth <= 0 ? 0
        : balanceEth < 0.01 ? 2
        : balanceEth < 0.1  ? 5
        : balanceEth < 1    ? 7
        : 10;
      factors.push({
        name: "Balance Health",
        score: balScore,
        maxScore: 10,
        detail: `${balanceEth.toFixed(4)} ${config.nativeToken}`,
      });
      if (balanceEth === 0 && txCount > 0) flags.push("Zero balance despite prior activity");

      const totalScore = factors.reduce((s, f) => s + f.score, 0);
      const trustLevel = getTrustLevel(totalScore);

      const summary =
        trustLevel === "EXCELLENT" ? "Highly reputable wallet with strong, consistent on-chain history and active DeFi engagement."
        : trustLevel === "GOOD"    ? "Good standing. Solid transaction history and meaningful network participation."
        : trustLevel === "FAIR"    ? "Moderate reputation. Some activity but limited history or engagement depth."
        : trustLevel === "LOW"     ? "Low reputation. New or infrequently used wallet with minimal traceable history."
        : "Untrusted. No meaningful on-chain history detected on this network.";

      return {
        success: true,
        data: { address, network: config.name, reputationScore: totalScore, trustLevel, factors, flags, summary },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};
