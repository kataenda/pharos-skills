import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider, getNetworkConfig, NETWORKS } from "../utils/client.js";
import { getTokenTransfers } from "../utils/explorer.js";

export interface RebalancerParams {
  address: string;
  riskProfile?: "conservative" | "moderate" | "aggressive";
  chains?: string[];
}

export interface AssetAllocation {
  symbol: string;
  name: string;
  category: "stablecoin" | "bluechip" | "native" | "altcoin";
  chain: string;
  balanceUsd: number;
  currentPct: number;
}

export interface RebalanceAction {
  action: "HOLD" | "REDUCE" | "INCREASE" | "EXIT";
  asset: string;
  chain: string;
  reason: string;
  targetPct: number;
  currentPct: number;
  deltaPct: number;
}

export interface RebalancerResult {
  address: string;
  riskProfile: string;
  totalValueUsd: number | null;
  currentAllocations: AssetAllocation[];
  targetAllocations: { stablecoin: number; bluechip: number; native: number; altcoin: number };
  actions: RebalanceAction[];
  summary: string;
}

const STABLECOINS = new Set([
  "usdc", "usdt", "dai", "busd", "tusd", "frax", "usdd", "lusd", "gusd", "usdp",
]);

const BLUECHIPS = new Set([
  "eth", "weth", "btc", "wbtc", "bnb", "wbnb", "matic", "wmatic", "avax", "wavax", "sol",
]);

const RISK_TARGETS: Record<string, { stablecoin: number; bluechip: number; native: number; altcoin: number }> = {
  conservative: { stablecoin: 45, bluechip: 35, native: 15, altcoin: 5 },
  moderate:     { stablecoin: 25, bluechip: 40, native: 20, altcoin: 15 },
  aggressive:   { stablecoin: 10, bluechip: 30, native: 20, altcoin: 40 },
};

function categorize(symbol: string): AssetAllocation["category"] {
  const s = symbol.toLowerCase();
  if (STABLECOINS.has(s)) return "stablecoin";
  if (BLUECHIPS.has(s))   return "bluechip";
  return "altcoin";
}

const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum", WETH: "ethereum",
  MATIC: "matic-network", WMATIC: "matic-network",
  BNB: "binancecoin", WBNB: "binancecoin",
  USDC: "usd-coin", USDT: "tether", DAI: "dai",
  WBTC: "wrapped-bitcoin",
  PHRS: "pharos-network", PROS: "pharos-network",
};

async function fetchPrices(symbols: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(symbols.map(s => COINGECKO_IDS[s]).filter(Boolean))];
  if (ids.length === 0) return {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, { usd: number }>;
    const prices: Record<string, number> = {};
    for (const [id, { usd }] of Object.entries(data)) {
      const sym = Object.entries(COINGECKO_IDS).find(([, v]) => v === id)?.[0];
      if (sym) prices[sym] = usd;
    }
    return prices;
  } catch {
    return {};
  }
}

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
];

export const aiPortfolioRebalancer: Skill<RebalancerParams, RebalancerResult> = {
  name: "aiPortfolioRebalancer",
  description:
    "Analyzes a wallet's current token portfolio across chains, categorizes assets (stablecoins, bluechips, native tokens, altcoins), and generates AI-driven rebalancing recommendations based on a chosen risk profile (conservative/moderate/aggressive). Returns current vs target allocations and specific HOLD/REDUCE/INCREASE/EXIT actions per asset.",
  parameters: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "Wallet address to analyze and rebalance",
      },
      riskProfile: {
        type: "string",
        description: "Risk appetite: conservative, moderate, or aggressive",
        enum: ["conservative", "moderate", "aggressive"],
        default: "moderate",
      },
      chains: {
        type: "array",
        description: "Chains to include. Defaults to pharos_testnet and ethereum.",
      },
    },
    required: ["address"],
  },

  async execute({ address, riskProfile = "moderate", chains }: RebalancerParams): Promise<SkillResult<RebalancerResult>> {
    try {
      if (!ethers.isAddress(address)) {
        return { success: false, error: "Invalid wallet address" };
      }

      const targetChains = chains && chains.length > 0
        ? chains.filter(c => NETWORKS[c])
        : ["pharos_testnet", "ethereum"];

      const allSymbols: string[] = [];
      for (const c of targetChains) allSymbols.push(NETWORKS[c].nativeToken);
      const prices = await fetchPrices(allSymbols);

      const rawAllocations: AssetAllocation[] = [];

      await Promise.all(targetChains.map(async chainKey => {
        const config = getNetworkConfig(chainKey);
        const provider = getProvider(chainKey);

        const [rawBal, tokenTxs] = await Promise.all([
          provider.getBalance(address).catch(() => 0n),
          getTokenTransfers(config.explorerApi, address, 100),
        ]);

        // Native token
        const nativeBal = parseFloat(ethers.formatEther(rawBal));
        const nativePrice = prices[config.nativeToken] ?? null;
        if (nativePrice !== null && nativeBal > 0) {
          rawAllocations.push({
            symbol: config.nativeToken,
            name: config.nativeToken,
            category: "native",
            chain: config.name,
            balanceUsd: nativeBal * nativePrice,
            currentPct: 0,
          });
        }

        // ERC-20 tokens
        const contracts = [...new Set(tokenTxs.map(t => t.contractAddress.toLowerCase()))];
        await Promise.all(contracts.slice(0, 15).map(async ca => {
          try {
            const erc20 = new ethers.Contract(ca, ERC20_ABI, provider);
            const [balance, symbol, decimals, name] = (await Promise.all([
              erc20.balanceOf(address),
              erc20.symbol(),
              erc20.decimals(),
              erc20.name(),
            ])) as [bigint, string, number, string];

            if (balance === 0n) return;
            const formatted = parseFloat(ethers.formatUnits(balance, decimals));
            const tokenPrice = prices[symbol.toUpperCase()] ?? null;
            if (tokenPrice === null || formatted * tokenPrice < 0.01) return;

            rawAllocations.push({
              symbol: symbol.toUpperCase(),
              name,
              category: categorize(symbol),
              chain: config.name,
              balanceUsd: formatted * tokenPrice,
              currentPct: 0,
            });
          } catch {
            // skip unreadable tokens
          }
        }));
      }));

      const totalUsd = rawAllocations.reduce((s, a) => s + a.balanceUsd, 0);

      // Compute current percentages
      const allocations: AssetAllocation[] = rawAllocations.map(a => ({
        ...a,
        currentPct: totalUsd > 0 ? (a.balanceUsd / totalUsd) * 100 : 0,
      }));

      // Current category breakdown
      const currentByCategory = { stablecoin: 0, bluechip: 0, native: 0, altcoin: 0 };
      for (const a of allocations) {
        currentByCategory[a.category] += a.currentPct;
      }

      const targets = RISK_TARGETS[riskProfile];

      // Generate per-asset rebalancing actions
      const actions: RebalanceAction[] = allocations.map(a => {
        const targetCatPct = targets[a.category];
        const assetsInCat = allocations.filter(x => x.category === a.category).length;
        const targetPct = assetsInCat > 0 ? targetCatPct / assetsInCat : 0;
        const delta = targetPct - a.currentPct;

        let action: RebalanceAction["action"];
        let reason: string;

        if (delta < -10) {
          action = "REDUCE";
          reason = `${a.category} allocation (${currentByCategory[a.category].toFixed(1)}%) exceeds target (${targetCatPct}%) for ${riskProfile} profile.`;
        } else if (delta > 10) {
          action = "INCREASE";
          reason = `${a.category} allocation (${currentByCategory[a.category].toFixed(1)}%) is below target (${targetCatPct}%) for ${riskProfile} profile.`;
        } else if (a.currentPct < 0.5 && a.category === "altcoin") {
          action = "EXIT";
          reason = `Very small altcoin position (<0.5%) — consider consolidating to reduce portfolio noise.`;
        } else {
          action = "HOLD";
          reason = `Allocation is within acceptable range of the ${riskProfile} target.`;
        }

        return { action, asset: `${a.symbol} (${a.chain})`, chain: a.chain, reason, targetPct: parseFloat(targetPct.toFixed(1)), currentPct: parseFloat(a.currentPct.toFixed(1)), deltaPct: parseFloat(delta.toFixed(1)) };
      });

      const holdCount    = actions.filter(a => a.action === "HOLD").length;
      const reduceCount  = actions.filter(a => a.action === "REDUCE").length;
      const increaseCount = actions.filter(a => a.action === "INCREASE").length;
      const exitCount    = actions.filter(a => a.action === "EXIT").length;

      const summary = allocations.length === 0
        ? "No priced assets found in this wallet across the selected chains."
        : `${riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1)} profile analysis complete. ${holdCount} HOLD, ${increaseCount} INCREASE, ${reduceCount} REDUCE, ${exitCount} EXIT actions recommended across ${allocations.length} positions.`;

      return {
        success: true,
        data: {
          address,
          riskProfile,
          totalValueUsd: totalUsd > 0 ? totalUsd : null,
          currentAllocations: allocations,
          targetAllocations: targets,
          actions,
          summary,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};
