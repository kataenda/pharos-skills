import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider } from "../utils/client.js";

export interface PharosNetworkParams {
  network?: "pharos_testnet" | "pharos_mainnet";
  blockSample?: number;
}

export interface BlockStat {
  blockNumber: number;
  timestamp: number;
  gasUsed: string;
  gasLimit: string;
  txCount: number;
  baseFeePerGas: string | null;
}

export interface PharosNetworkResult {
  network: string;
  chainId: number;
  latestBlock: number;
  gasPriceGwei: string;
  avgBlockTimeMs: number;
  estimatedTps: number;
  networkLoad: "LOW" | "MODERATE" | "HIGH" | "CONGESTED";
  recentBlocks: BlockStat[];
  optimalGasWindow: boolean;
  summary: string;
}

function networkLoad(tps: number, gasRatio: number): PharosNetworkResult["networkLoad"] {
  if (gasRatio > 0.9 || tps > 100) return "CONGESTED";
  if (gasRatio > 0.7 || tps > 50)  return "HIGH";
  if (gasRatio > 0.4 || tps > 20)  return "MODERATE";
  return "LOW";
}

export const pharosNetworkIntelligence: Skill<PharosNetworkParams, PharosNetworkResult> = {
  name: "pharosNetworkIntelligence",
  description:
    "Provides real-time Pharos Network intelligence: latest block, gas price, estimated TPS, average block time, network load level, and optimal transaction window detection. Exclusively designed for Pharos Atlantic Testnet and Pharos Pacific Mainnet — the ideal skill for agents deciding when and how to execute on-chain transactions on Pharos.",
  parameters: {
    type: "object",
    properties: {
      network: {
        type: "string",
        description: "Pharos network to monitor: pharos_testnet or pharos_mainnet",
        enum: ["pharos_testnet", "pharos_mainnet"],
        default: "pharos_testnet",
      },
      blockSample: {
        type: "number",
        description: "Number of recent blocks to sample for TPS and block time calculation (5–20, default: 10)",
        default: 10,
      },
    },
    required: [],
  },

  async execute({
    network = "pharos_testnet",
    blockSample = 10,
  }: PharosNetworkParams): Promise<SkillResult<PharosNetworkResult>> {
    if (network !== "pharos_testnet" && network !== "pharos_mainnet") {
      return { success: false, error: "pharosNetworkIntelligence only supports pharos_testnet and pharos_mainnet" };
    }

    const NETWORK_NAMES: Record<string, string> = {
      pharos_testnet: "Pharos Atlantic Testnet",
      pharos_mainnet: "Pharos Pacific Mainnet",
    };
    const CHAIN_IDS: Record<string, number> = {
      pharos_testnet: 688689,
      pharos_mainnet: 1672,
    };

    try {
      const provider = getProvider(network);
      const sample = Math.max(5, Math.min(20, blockSample));

      const [latestBlockNum, feeData] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData(),
      ]);

      const gasPriceWei = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;
      const gasPriceGwei = parseFloat(ethers.formatUnits(gasPriceWei, "gwei")).toFixed(4);

      // Sample recent blocks in parallel
      const blockNums = Array.from({ length: sample }, (_, i) => latestBlockNum - i);
      const blocks = (
        await Promise.all(blockNums.map(n => provider.getBlock(n).catch(() => null)))
      ).filter((b): b is NonNullable<typeof b> => b !== null);

      const recentBlocks: BlockStat[] = blocks.map(b => ({
        blockNumber: b.number,
        timestamp: b.timestamp,
        gasUsed: b.gasUsed.toString(),
        gasLimit: b.gasLimit.toString(),
        txCount: b.transactions.length,
        baseFeePerGas: b.baseFeePerGas !== null && b.baseFeePerGas !== undefined
          ? parseFloat(ethers.formatUnits(b.baseFeePerGas, "gwei")).toFixed(4)
          : null,
      }));

      // Block time: avg ms between consecutive blocks
      let avgBlockTimeMs = 2000;
      if (blocks.length >= 2) {
        const times: number[] = [];
        for (let i = 0; i < blocks.length - 1; i++) {
          const dt = (blocks[i].timestamp - blocks[i + 1].timestamp) * 1000;
          if (dt > 0) times.push(dt);
        }
        if (times.length > 0) avgBlockTimeMs = times.reduce((s, t) => s + t, 0) / times.length;
      }

      // TPS: total txs across sample / total time
      const totalTxs = recentBlocks.reduce((s, b) => s + b.txCount, 0);
      const timeSpanSec = avgBlockTimeMs * sample / 1000;
      const estimatedTps = timeSpanSec > 0 ? parseFloat((totalTxs / timeSpanSec).toFixed(2)) : 0;

      // Gas utilization ratio (latest block)
      const latestBlock = recentBlocks[0];
      const gasRatio = latestBlock && latestBlock.gasLimit !== "0"
        ? parseInt(latestBlock.gasUsed) / parseInt(latestBlock.gasLimit)
        : 0;

      const load = networkLoad(estimatedTps, gasRatio);
      const optimalGasWindow = load === "LOW" || load === "MODERATE";

      const summary =
        load === "CONGESTED"
          ? `Network is congested (TPS: ${estimatedTps}, gas util: ${(gasRatio * 100).toFixed(0)}%). Consider delaying non-urgent transactions.`
          : load === "HIGH"
          ? `Network load is high (TPS: ${estimatedTps}). Monitor before submitting high-value transactions.`
          : load === "MODERATE"
          ? `Network is moderately loaded (TPS: ${estimatedTps}). Conditions are acceptable for most transactions.`
          : `Network is in optimal state (TPS: ${estimatedTps}). Ideal window for agent transaction execution.`;

      return {
        success: true,
        data: {
          network: NETWORK_NAMES[network],
          chainId: CHAIN_IDS[network],
          latestBlock: latestBlockNum,
          gasPriceGwei,
          avgBlockTimeMs: Math.round(avgBlockTimeMs),
          estimatedTps,
          networkLoad: load,
          recentBlocks: recentBlocks.slice(0, 5),
          optimalGasWindow,
          summary,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};
