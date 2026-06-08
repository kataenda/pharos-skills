import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";
import { getTransactionList, getTokenTransfers } from "../utils/explorer.js";

export interface CreditScoreParams {
  address: string;
  network?: string;
}

export interface ScoreComponent {
  score: number;
  maxScore: number;
  label: string;
}

export interface CreditScoreResult {
  address: string;
  score: number;
  grade: string;
  breakdown: {
    walletAge: ScoreComponent;
    activityLevel: ScoreComponent;
    balanceStability: ScoreComponent;
    defiParticipation: ScoreComponent;
    transactionSuccess: ScoreComponent;
    tokenDiversity: ScoreComponent;
  };
  summary: string;
  recommendations: string[];
}

function getGrade(score: number): string {
  if (score >= 900) return "AAA";
  if (score >= 800) return "AA";
  if (score >= 700) return "A";
  if (score >= 600) return "BBB";
  if (score >= 500) return "BB";
  if (score >= 400) return "B";
  if (score >= 300) return "CCC";
  return "D";
}

export const onChainCreditScore: Skill<CreditScoreParams, CreditScoreResult> = {
  name: "onChainCreditScore",
  description:
    "Calculates an on-chain credit score (0–1000) for a wallet address based on wallet age, activity, balance stability, DeFi participation, transaction success rate, and token diversity. Returns a grade (D to AAA) and improvement recommendations.",
  parameters: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "The wallet address to score",
      },
      network: {
        type: "string",
        description:
          "Network: pharos_testnet, pharos_mainnet, ethereum, polygon, bsc, arbitrum",
        default: "pharos_testnet",
      },
    },
    required: ["address"],
  },

  async execute({
    address,
    network = "pharos_testnet",
  }): Promise<SkillResult<CreditScoreResult>> {
    try {
      if (!ethers.isAddress(address)) {
        return { success: false, error: "Invalid wallet address" };
      }

      const provider = getProvider(network);
      const config = getNetworkConfig(network);

      const [rawBalance, txCount, transactions, tokenTransfers] = await Promise.all([
        provider.getBalance(address),
        provider.getTransactionCount(address),
        getTransactionList(config.explorerApi, address, 200),
        getTokenTransfers(config.explorerApi, address, 100),
      ]);

      const balanceEth = parseFloat(ethers.formatEther(rawBalance));
      const failedTxs = transactions.filter((tx) => tx.isError === "1").length;
      const contractTxs = transactions.filter((tx) => tx.input && tx.input !== "0x").length;
      const uniqueTokens = new Set(
        tokenTransfers.map((t) => t.contractAddress.toLowerCase())
      ).size;

      const earliestTs =
        transactions.length > 0
          ? Math.min(...transactions.map((tx) => parseInt(tx.timeStamp || "0")))
          : Date.now() / 1000;
      const daysSinceFirst = (Date.now() / 1000 - earliestTs) / 86400;

      // 1. Wallet Age — max 150 pts (full score at 2 years)
      const walletAgeScore = Math.min(150, Math.floor((daysSinceFirst / 730) * 150));
      const walletAgeLabel =
        daysSinceFirst < 30
          ? "New Account"
          : daysSinceFirst < 180
          ? "Established"
          : daysSinceFirst < 365
          ? "Mature"
          : "Veteran";

      // 2. Activity Level — max 150 pts (log scale)
      const activityScore =
        txCount === 0
          ? 0
          : Math.min(150, Math.floor((Math.log10(txCount + 1) / Math.log10(1001)) * 150));
      const activityLabel =
        txCount < 5
          ? "Dormant"
          : txCount < 50
          ? "Low Activity"
          : txCount < 200
          ? "Moderate"
          : "Highly Active";

      // 3. Balance Stability — max 200 pts
      const balanceScore =
        balanceEth <= 0
          ? 0
          : balanceEth < 0.1
          ? 20
          : balanceEth < 1
          ? 60
          : balanceEth < 10
          ? 120
          : balanceEth < 100
          ? 170
          : 200;
      const balanceLabel =
        balanceEth <= 0
          ? "Empty"
          : balanceEth < 1
          ? "Low Balance"
          : balanceEth < 10
          ? "Moderate Balance"
          : "Strong Balance";

      // 4. DeFi Participation — max 200 pts
      const defiRatio = transactions.length > 0 ? contractTxs / transactions.length : 0;
      const defiScore = Math.min(
        200,
        Math.floor(defiRatio * 170) + (uniqueTokens > 5 ? 30 : 0)
      );
      const defiLabel =
        defiRatio < 0.1
          ? "No DeFi Activity"
          : defiRatio < 0.3
          ? "Beginner DeFi User"
          : defiRatio < 0.6
          ? "Active DeFi User"
          : "DeFi Power User";

      // 5. Transaction Success Rate — max 150 pts
      const successRate =
        transactions.length > 0 ? 1 - failedTxs / transactions.length : 1;
      const successScore = Math.floor(successRate * 150);
      const successLabel =
        successRate >= 0.95
          ? "Excellent"
          : successRate >= 0.85
          ? "Good"
          : successRate >= 0.7
          ? "Fair"
          : "Poor";

      // 6. Token Diversity — max 150 pts
      const tokenScore = Math.min(150, uniqueTokens * 10);
      const tokenLabel =
        uniqueTokens === 0
          ? "No Tokens"
          : uniqueTokens < 5
          ? "Limited"
          : uniqueTokens < 15
          ? "Diversified"
          : "Highly Diversified";

      const totalScore =
        walletAgeScore +
        activityScore +
        balanceScore +
        defiScore +
        successScore +
        tokenScore;

      const grade = getGrade(totalScore);

      const recommendations: string[] = [];
      if (walletAgeScore < 50)
        recommendations.push("Build wallet history over time to improve your age score.");
      if (activityScore < 50)
        recommendations.push("Increase on-chain activity to demonstrate consistent engagement.");
      if (balanceScore < 60)
        recommendations.push("Maintain a higher native token balance for better stability score.");
      if (defiScore < 60)
        recommendations.push("Participate in DeFi protocols (swaps, LP, lending) to boost DeFi score.");
      if (successScore < 100)
        recommendations.push("Reduce failed transactions by simulating before sending.");
      if (tokenScore < 50)
        recommendations.push("Hold diverse tokens to demonstrate portfolio breadth.");

      const summary =
        totalScore >= 800
          ? "Excellent on-chain reputation. Highly trustworthy wallet with strong history."
          : totalScore >= 600
          ? "Good standing. Active participant with solid transaction history."
          : totalScore >= 400
          ? "Fair standing. Some on-chain activity but room for improvement."
          : "Limited on-chain history. Build more activity to improve your score.";

      return {
        success: true,
        data: {
          address,
          score: totalScore,
          grade,
          breakdown: {
            walletAge: { score: walletAgeScore, maxScore: 150, label: walletAgeLabel },
            activityLevel: { score: activityScore, maxScore: 150, label: activityLabel },
            balanceStability: { score: balanceScore, maxScore: 200, label: balanceLabel },
            defiParticipation: { score: defiScore, maxScore: 200, label: defiLabel },
            transactionSuccess: { score: successScore, maxScore: 150, label: successLabel },
            tokenDiversity: { score: tokenScore, maxScore: 150, label: tokenLabel },
          },
          summary,
          recommendations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
