import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";
import { getTransactionList, getTokenTransfers } from "../utils/explorer.js";

export interface WalletPersonalityParams {
  address: string;
  network?: string;
}

export interface PersonalityTrait {
  label: string;
  score: number;
}

export interface WalletPersonalityResult {
  address: string;
  personality: string;
  emoji: string;
  description: string;
  traits: PersonalityTrait[];
  stats: {
    txCount: number;
    nativeBalance: string;
    contractInteractions: number;
    uniqueTokens: number;
    walletAge: string;
    avgTxValue: string;
  };
}

const PERSONALITIES = {
  DEFI_DEGEN: {
    label: "DeFi Degen",
    emoji: "🦍",
    description: "Always chasing the next yield. This wallet lives and breathes DeFi protocols.",
  },
  WHALE: {
    label: "Crypto Whale",
    emoji: "🐋",
    description: "Large holdings and significant market influence. Moves markets when active.",
  },
  HODLER: {
    label: "Diamond HODLer",
    emoji: "💎",
    description: "Patient and steadfast. Buys and holds without panic.",
  },
  DAY_TRADER: {
    label: "Day Trader",
    emoji: "📈",
    description: "High-frequency activity with precision timing. Never sleeps.",
  },
  BUILDER: {
    label: "On-Chain Builder",
    emoji: "🏗️",
    description: "Deploys contracts and builds the ecosystem. The backbone of Web3.",
  },
  NEW_EXPLORER: {
    label: "New Explorer",
    emoji: "🌱",
    description: "Just getting started in Web3. The future is bright!",
  },
  COLLECTOR: {
    label: "Token Collector",
    emoji: "🎨",
    description: "Passionate about digital assets and diverse token portfolios.",
  },
  WEB3_CITIZEN: {
    label: "Web3 Citizen",
    emoji: "🌐",
    description: "Balanced participation across the ecosystem. A true community member.",
  },
} as const;

type PersonalityKey = keyof typeof PERSONALITIES;

interface DerivedStats {
  txCount: number;
  balanceEth: number;
  contractInteractionRatio: number;
  uniqueTokens: number;
  failedTxRatio: number;
  daysSinceFirst: number;
}

function determinePersonality(s: DerivedStats): {
  key: PersonalityKey;
  traits: PersonalityTrait[];
} {
  const traits: PersonalityTrait[] = [];
  const scores = {} as Record<PersonalityKey, number>;
  (Object.keys(PERSONALITIES) as PersonalityKey[]).forEach((k) => (scores[k] = 0));

  if (s.txCount > 500) {
    scores.DAY_TRADER += 35;
    scores.DEFI_DEGEN += 20;
    traits.push({ label: "Hyperactive", score: 95 });
  } else if (s.txCount > 100) {
    scores.DEFI_DEGEN += 25;
    scores.WEB3_CITIZEN += 20;
    traits.push({ label: "Active", score: 75 });
  } else if (s.txCount > 20) {
    scores.WEB3_CITIZEN += 30;
    scores.HODLER += 15;
    traits.push({ label: "Moderate", score: 55 });
  } else if (s.txCount <= 5) {
    scores.NEW_EXPLORER += 50;
    traits.push({ label: "Newcomer", score: 20 });
  }

  if (s.balanceEth > 100) {
    scores.WHALE += 55;
    traits.push({ label: "Large Holdings", score: 99 });
  } else if (s.balanceEth > 10) {
    scores.WHALE += 20;
    scores.HODLER += 20;
    traits.push({ label: "Significant Holdings", score: 78 });
  } else if (s.balanceEth > 1) {
    scores.HODLER += 15;
    traits.push({ label: "Moderate Holdings", score: 58 });
  }

  if (s.contractInteractionRatio > 0.7) {
    scores.DEFI_DEGEN += 40;
    scores.BUILDER += 20;
    traits.push({ label: "DeFi Power User", score: 88 });
  } else if (s.contractInteractionRatio > 0.4) {
    scores.DEFI_DEGEN += 20;
    scores.WEB3_CITIZEN += 15;
    traits.push({ label: "DeFi Participant", score: 65 });
  }

  if (s.uniqueTokens > 20) {
    scores.COLLECTOR += 35;
    scores.DEFI_DEGEN += 10;
    traits.push({ label: "Token Collector", score: 82 });
  } else if (s.uniqueTokens > 8) {
    scores.WEB3_CITIZEN += 20;
    traits.push({ label: "Diversified", score: 62 });
  }

  if (s.daysSinceFirst < 30) {
    scores.NEW_EXPLORER += 40;
    traits.push({ label: "Brand New", score: 10 });
  } else if (s.daysSinceFirst > 365) {
    scores.HODLER += 20;
    scores.WHALE += 10;
    traits.push({ label: "Veteran", score: 92 });
  }

  if (s.failedTxRatio > 0.2) {
    scores.DEFI_DEGEN += 20;
    traits.push({ label: "Risk Taker", score: 77 });
  }

  const winner = (Object.entries(scores) as [PersonalityKey, number][]).sort(
    ([, a], [, b]) => b - a
  )[0][0];

  return { key: winner, traits: traits.slice(0, 5) };
}

export const walletPersonalityAnalyzer: Skill<
  WalletPersonalityParams,
  WalletPersonalityResult
> = {
  name: "walletPersonalityAnalyzer",
  description:
    "Analyzes an on-chain wallet's transaction history and behavior patterns to generate a personality profile. Returns personality type (DeFi Degen, Whale, HODLer, etc.), behavioral traits, and key statistics.",
  parameters: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "The wallet address to analyze (0x-prefixed)",
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
  }): Promise<SkillResult<WalletPersonalityResult>> {
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
      const contractTxs = transactions.filter((tx) => tx.input && tx.input !== "0x");
      const failedTxs = transactions.filter((tx) => tx.isError === "1");
      const uniqueTokens = new Set(
        tokenTransfers.map((t) => t.contractAddress.toLowerCase())
      ).size;

      const earliestTs =
        transactions.length > 0
          ? Math.min(...transactions.map((tx) => parseInt(tx.timeStamp || "0")))
          : Date.now() / 1000;
      const daysSinceFirst = (Date.now() / 1000 - earliestTs) / 86400;

      const totalValueWei = transactions.reduce(
        (sum, tx) => sum + BigInt(tx.value || "0"),
        0n
      );
      const avgValueEth =
        transactions.length > 0
          ? parseFloat(ethers.formatEther(totalValueWei / BigInt(transactions.length)))
          : 0;

      const derived: DerivedStats = {
        txCount,
        balanceEth,
        contractInteractionRatio:
          transactions.length > 0 ? contractTxs.length / transactions.length : 0,
        uniqueTokens,
        failedTxRatio:
          transactions.length > 0 ? failedTxs.length / transactions.length : 0,
        daysSinceFirst,
      };

      const { key, traits } = determinePersonality(derived);
      const personality = PERSONALITIES[key];

      const walletAge =
        daysSinceFirst < 1
          ? "< 1 day"
          : daysSinceFirst < 30
          ? `${Math.floor(daysSinceFirst)} days`
          : daysSinceFirst < 365
          ? `${Math.floor(daysSinceFirst / 30)} months`
          : `${(daysSinceFirst / 365).toFixed(1)} years`;

      return {
        success: true,
        data: {
          address,
          personality: personality.label,
          emoji: personality.emoji,
          description: personality.description,
          traits,
          stats: {
            txCount,
            nativeBalance: `${balanceEth.toFixed(4)} ${config.nativeToken}`,
            contractInteractions: contractTxs.length,
            uniqueTokens,
            walletAge,
            avgTxValue: `${avgValueEth.toFixed(6)} ${config.nativeToken}`,
          },
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
