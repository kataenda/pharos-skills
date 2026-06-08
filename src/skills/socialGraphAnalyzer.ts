import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";
import { getTransactionList, getTokenTransfers } from "../utils/explorer.js";

export interface SocialGraphParams {
  address: string;
  network?: string;
}

export interface SocialConnection {
  address: string;
  interactionCount: number;
  lastSeen: string;
  relationshipType: "FREQUENT" | "REGULAR" | "OCCASIONAL";
}

export interface SocialSignal {
  signal: string;
  value: string | number;
  interpretation: string;
}

export interface SocialGraphResult {
  address: string;
  network: string;
  socialScore: number;
  communityLevel: "ISOLATED" | "PARTICIPANT" | "CONNECTOR" | "INFLUENCER";
  uniqueInteractions: number;
  topConnections: SocialConnection[];
  socialSignals: SocialSignal[];
  isContractDeployer: boolean;
  communityCategories: string[];
  summary: string;
}

function getCommunityLevel(
  unique: number,
  contractInteractions: number
): SocialGraphResult["communityLevel"] {
  if (unique >= 50 || contractInteractions >= 100) return "INFLUENCER";
  if (unique >= 20 || contractInteractions >= 30)  return "CONNECTOR";
  if (unique >= 5  || contractInteractions >= 5)   return "PARTICIPANT";
  return "ISOLATED";
}

export const socialGraphAnalyzer: Skill<SocialGraphParams, SocialGraphResult> = {
  name: "socialGraphAnalyzer",
  description:
    "Maps a wallet's on-chain social graph and community participation. Analyzes unique peer interactions, recurring relationships, contract community engagement (DEX/DAO/NFT), and social influence level. Returns a social score (0–100), community level (ISOLATED → INFLUENCER), top connections, and social signals. The social intelligence layer for Pharos AI agents operating in the on-chain social economy.",
  parameters: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "Wallet address to map social graph for",
      },
      network: {
        type: "string",
        description: "Network: pharos_testnet, pharos_mainnet, ethereum, polygon, bsc, arbitrum",
        default: "pharos_testnet",
      },
    },
    required: ["address"],
  },

  async execute({ address, network = "pharos_testnet" }): Promise<SkillResult<SocialGraphResult>> {
    try {
      if (!ethers.isAddress(address)) {
        return { success: false, error: "Invalid wallet address" };
      }

      const provider = getProvider(network);
      const config   = getNetworkConfig(network);

      const [transactions, tokenTransfers, latestBlock] = await Promise.all([
        getTransactionList(config.explorerApi, address, 200),
        getTokenTransfers(config.explorerApi, address, 200),
        provider.getBlockNumber().catch(() => 0),
      ]);

      const socialSignals: SocialSignal[] = [];
      const communityCategories: Set<string> = new Set();

      // ── Map unique peer addresses ──────────────────────────────────
      const peerCounts: Record<string, number> = {};
      const peerLastSeen: Record<string, number> = {};

      for (const tx of transactions) {
        const peer = tx.from.toLowerCase() === address.toLowerCase()
          ? tx.to?.toLowerCase()
          : tx.from.toLowerCase();
        if (!peer || peer === address.toLowerCase()) continue;
        peerCounts[peer] = (peerCounts[peer] ?? 0) + 1;
        const ts = parseInt(tx.timeStamp || "0");
        if (!peerLastSeen[peer] || ts > peerLastSeen[peer]) peerLastSeen[peer] = ts;
      }

      // ── Token transfer peers ───────────────────────────────────────
      for (const tt of tokenTransfers) {
        const peer = tt.from.toLowerCase() === address.toLowerCase()
          ? tt.to.toLowerCase()
          : tt.from.toLowerCase();
        if (!peer || peer === address.toLowerCase()) continue;
        peerCounts[peer] = (peerCounts[peer] ?? 0) + 1;
        peerLastSeen[peer] = peerLastSeen[peer] ?? Math.floor(Date.now() / 1000);
      }

      const uniqueInteractions = Object.keys(peerCounts).length;

      // Top 5 connections
      const topConnections: SocialConnection[] = Object.entries(peerCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([addr, count]) => {
          const ts = peerLastSeen[addr] ?? 0;
          const daysAgo = ts > 0 ? Math.floor((Date.now() / 1000 - ts) / 86400) : null;
          return {
            address: addr,
            interactionCount: count,
            lastSeen: daysAgo !== null ? (daysAgo === 0 ? "Today" : `${daysAgo}d ago`) : "Unknown",
            relationshipType: count >= 10 ? "FREQUENT" : count >= 3 ? "REGULAR" : "OCCASIONAL",
          };
        });

      // ── Contract interaction categories ────────────────────────────
      const contractTxs = transactions.filter(tx => tx.input && tx.input !== "0x");
      const contractAddrs = new Set(contractTxs.map(tx => tx.to?.toLowerCase()).filter(Boolean));
      const isContractDeployer = transactions.some(tx => !tx.to || tx.to === "");

      if (isContractDeployer) communityCategories.add("Builder / Developer");

      // Infer community type from token transfer names
      const tokenNames = tokenTransfers.map(t => (t.tokenName || t.tokenSymbol || "").toLowerCase());
      if (tokenNames.some(n => n.includes("lp") || n.includes("pool") || n.includes("uni") || n.includes("swap")))
        communityCategories.add("DEX / Liquidity Provider");
      if (tokenNames.some(n => n.includes("nft") || n.includes("token") || n.includes("art") || n.includes("pixel")))
        communityCategories.add("NFT Collector");
      if (tokenNames.some(n => n.includes("dao") || n.includes("gov") || n.includes("vote")))
        communityCategories.add("DAO / Governance");
      if (tokenTransfers.some(t => t.tokenSymbol === "PHRS" || t.tokenSymbol === "PROS"))
        communityCategories.add("Pharos Ecosystem");
      if (tokenNames.some(n => n.includes("usdc") || n.includes("usdt") || n.includes("dai")))
        communityCategories.add("DeFi / Payments");

      // ── Social signals ─────────────────────────────────────────────
      socialSignals.push({
        signal: "Unique Peers",
        value: uniqueInteractions,
        interpretation:
          uniqueInteractions === 0 ? "No peer interactions found"
          : uniqueInteractions < 5  ? "Very limited social footprint"
          : uniqueInteractions < 20 ? "Active participant in community"
          : "Strong social presence with broad network",
      });

      socialSignals.push({
        signal: "Contract Communities",
        value: contractAddrs.size,
        interpretation:
          contractAddrs.size === 0 ? "No contract interactions — not engaged with protocols"
          : contractAddrs.size < 5  ? "Participates in a few protocols"
          : "Deeply embedded in on-chain protocol ecosystem",
      });

      socialSignals.push({
        signal: "Recurring Relationships",
        value: topConnections.filter(c => c.relationshipType === "FREQUENT").length,
        interpretation:
          topConnections.filter(c => c.relationshipType === "FREQUENT").length === 0
            ? "No frequent recurring interactions"
            : `Has ${topConnections.filter(c => c.relationshipType === "FREQUENT").length} frequent connections — strong social bonds`,
      });

      socialSignals.push({
        signal: "Token Communities",
        value: communityCategories.size,
        interpretation:
          communityCategories.size === 0 ? "No identifiable community membership"
          : `Member of: ${[...communityCategories].join(", ")}`,
      });

      if (isContractDeployer) {
        socialSignals.push({
          signal: "Builder Status",
          value: "YES",
          interpretation: "Has deployed smart contracts — builder/developer role in the ecosystem",
        });
      }

      // ── Social score (0–100) ───────────────────────────────────────
      let score = 0;
      score += Math.min(30, uniqueInteractions * 1.5);               // max 30: peer diversity
      score += Math.min(20, contractAddrs.size * 2);                  // max 20: protocol engagement
      score += Math.min(20, topConnections.filter(c => c.relationshipType !== "OCCASIONAL").length * 5); // max 20: repeat interactions
      score += Math.min(20, communityCategories.size * 5);            // max 20: community breadth
      if (isContractDeployer) score += 10;                            // +10: builder bonus
      const socialScore = Math.min(100, Math.round(score));

      const communityLevel = getCommunityLevel(uniqueInteractions, contractAddrs.size);

      const summary =
        communityLevel === "INFLUENCER"
          ? `High-influence wallet with ${uniqueInteractions} unique peers across ${communityCategories.size} communities. Social score: ${socialScore}/100.`
          : communityLevel === "CONNECTOR"
          ? `Active connector with ${uniqueInteractions} peers and ${contractAddrs.size} protocol interactions. Social score: ${socialScore}/100.`
          : communityLevel === "PARTICIPANT"
          ? `Community participant with ${uniqueInteractions} unique interactions. Social score: ${socialScore}/100.`
          : `Isolated wallet — ${uniqueInteractions} unique interactions. Limited on-chain social presence. Social score: ${socialScore}/100.`;

      return {
        success: true,
        data: {
          address,
          network: config.name,
          socialScore,
          communityLevel,
          uniqueInteractions,
          topConnections,
          socialSignals,
          isContractDeployer,
          communityCategories: [...communityCategories],
          summary,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};
