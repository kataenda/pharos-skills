import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";

export interface WhaleTrackingParams {
  thresholdNative?: number;
  blockRange?: number;
  watchAddresses?: string[];
  network?: string;
}

export interface WhaleTransaction {
  txHash: string;
  from: string;
  to: string | null;
  value: string;
  valueNative: number;
  blockNumber: number;
  timestamp: number;
  isContractCall: boolean;
}

export interface TopWhale {
  address: string;
  totalSent: number;
  txCount: number;
}

export interface WhaleTrackingResult {
  network: string;
  threshold: string;
  blocksScanned: number;
  latestBlock: number;
  whaleTransactions: WhaleTransaction[];
  totalVolume: number;
  topWhales: TopWhale[];
}

export const whaleTracking: Skill<WhaleTrackingParams, WhaleTrackingResult> = {
  name: "whaleTracking",
  description:
    "Scans recent blocks to detect large on-chain transfers (whale movements) above a configurable threshold. Returns a sorted list of whale transactions and identifies the most active whale addresses by total volume sent.",
  parameters: {
    type: "object",
    properties: {
      thresholdNative: {
        type: "number",
        description:
          "Minimum transfer value in native tokens to qualify as a whale movement (default: 100)",
        default: 100,
      },
      blockRange: {
        type: "number",
        description: "Number of recent blocks to scan, max 100 (default: 20)",
        default: 20,
      },
      watchAddresses: {
        type: "array",
        description:
          "Optional list of specific addresses to monitor regardless of amount threshold",
      },
      network: {
        type: "string",
        description:
          "Network: pharos_testnet, pharos_mainnet, ethereum, polygon, bsc, arbitrum",
        default: "pharos_testnet",
      },
    },
    required: [],
  },

  async execute({
    thresholdNative = 100,
    blockRange = 20,
    watchAddresses = [],
    network = "pharos_testnet",
  }: WhaleTrackingParams): Promise<SkillResult<WhaleTrackingResult>> {
    try {
      const provider = getProvider(network);
      const config = getNetworkConfig(network);

      const threshold = ethers.parseEther(String(thresholdNative));
      const range = Math.min(Math.max(1, blockRange), 100);
      const watchSet = new Set(watchAddresses.map((a) => a.toLowerCase()));

      const latestBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - range + 1);
      const blockNumbers = Array.from(
        { length: latestBlock - fromBlock + 1 },
        (_, i) => fromBlock + i
      );

      const whales: WhaleTransaction[] = [];
      const BATCH = 10;

      for (let i = 0; i < blockNumbers.length; i += BATCH) {
        const batch = blockNumbers.slice(i, i + BATCH);
        const blocks = await Promise.all(
          batch.map((n) => provider.getBlock(n, true).catch(() => null))
        );

        for (const block of blocks) {
          if (!block?.transactions) continue;

          for (const tx of block.transactions as unknown as ethers.TransactionResponse[]) {
            if (tx.value === undefined) continue;

            const fromLower = (tx.from ?? "").toLowerCase();
            const toLower = (tx.to ?? "").toLowerCase();
            const isWatched = watchSet.has(fromLower) || watchSet.has(toLower);
            const isWhale = tx.value >= threshold;

            if (!isWatched && !isWhale) continue;

            whales.push({
              txHash: tx.hash,
              from: tx.from ?? "",
              to: tx.to,
              value: tx.value.toString(),
              valueNative: parseFloat(ethers.formatEther(tx.value)),
              blockNumber: block.number,
              timestamp: block.timestamp,
              isContractCall: !!tx.data && tx.data !== "0x",
            });
          }
        }
      }

      whales.sort((a, b) => b.valueNative - a.valueNative);

      const whaleMap = new Map<string, { total: number; count: number }>();
      for (const tx of whales) {
        const prev = whaleMap.get(tx.from) ?? { total: 0, count: 0 };
        whaleMap.set(tx.from, {
          total: prev.total + tx.valueNative,
          count: prev.count + 1,
        });
      }

      const topWhales: TopWhale[] = Array.from(whaleMap.entries())
        .map(([address, { total, count }]) => ({
          address,
          totalSent: total,
          txCount: count,
        }))
        .sort((a, b) => b.totalSent - a.totalSent)
        .slice(0, 10);

      const totalVolume = whales.reduce((sum, tx) => sum + tx.valueNative, 0);

      return {
        success: true,
        data: {
          network: config.name,
          threshold: `${thresholdNative} ${config.nativeToken}`,
          blocksScanned: blockNumbers.length,
          latestBlock,
          whaleTransactions: whales.slice(0, 50),
          totalVolume,
          topWhales,
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
