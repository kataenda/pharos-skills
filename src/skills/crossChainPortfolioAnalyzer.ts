import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider, getNetworkConfig, NETWORKS } from "../utils/client.js";
import { getTokenTransfers } from "../utils/explorer.js";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
];

export interface PortfolioParams {
  address: string;
  chains?: string[];
}

export interface TokenHolding {
  contractAddress: string;
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  valueUsd: number | null;
}

export interface ChainPortfolio {
  chain: string;
  chainId: number;
  nativeToken: string;
  nativeBalance: string;
  nativeValueUsd: number | null;
  tokens: TokenHolding[];
  chainTotalUsd: number | null;
}

export interface CrossChainPortfolioResult {
  address: string;
  chains: ChainPortfolio[];
  totalValueUsd: number | null;
  dominantChain: string;
  totalTokenCount: number;
}

// CoinGecko IDs for supported native tokens
const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  MATIC: "matic-network",
  BNB: "binancecoin",
  PHRS: "pharos-network",
  PROS: "pharos-network",
};

async function fetchUsdPrices(
  symbols: string[]
): Promise<Record<string, number>> {
  const ids = [
    ...new Set(symbols.map((s) => COINGECKO_IDS[s]).filter(Boolean)),
  ];
  if (ids.length === 0) return {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(
        ","
      )}&vs_currencies=usd`,
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

export const crossChainPortfolioAnalyzer: Skill<
  PortfolioParams,
  CrossChainPortfolioResult
> = {
  name: "crossChainPortfolioAnalyzer",
  description:
    "Analyzes a wallet's complete token portfolio across multiple blockchain networks (Pharos, Ethereum, Polygon, BSC, Arbitrum). Returns native balances, ERC-20 token holdings, USD valuations per chain, and a grand total.",
  parameters: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "The wallet address to analyze",
      },
      chains: {
        type: "array",
        description:
          "Chains to include. Options: pharos_testnet, pharos_mainnet, ethereum, polygon, bsc, arbitrum. Defaults to all supported chains.",
      },
    },
    required: ["address"],
  },

  async execute({
    address,
    chains,
  }: PortfolioParams): Promise<SkillResult<CrossChainPortfolioResult>> {
    try {
      if (!ethers.isAddress(address)) {
        return { success: false, error: "Invalid wallet address" };
      }

      const targetChains =
        chains && chains.length > 0
          ? chains.filter((c) => NETWORKS[c])
          : Object.keys(NETWORKS);

      const allNativeSymbols = targetChains.map((c) => NETWORKS[c].nativeToken);
      const prices = await fetchUsdPrices(allNativeSymbols);

      const portfolioChains: ChainPortfolio[] = await Promise.all(
        targetChains.map(async (chainKey): Promise<ChainPortfolio> => {
          const config = getNetworkConfig(chainKey);
          const provider = getProvider(chainKey);

          const [rawBalance, tokenTransfers] = await Promise.all([
            provider.getBalance(address).catch(() => 0n),
            getTokenTransfers(config.explorerApi, address, 200),
          ]);

          const nativeBal = parseFloat(ethers.formatEther(rawBalance));
          const nativePrice = prices[config.nativeToken] ?? null;
          const nativeValueUsd = nativePrice !== null ? nativeBal * nativePrice : null;

          // Unique token contracts interacted with
          const contracts = [
            ...new Set(
              tokenTransfers.map((t) => t.contractAddress.toLowerCase())
            ),
          ];

          const tokenHoldings: TokenHolding[] = (
            await Promise.all(
              contracts.slice(0, 20).map(async (contractAddress) => {
                try {
                  const erc20 = new ethers.Contract(
                    contractAddress,
                    ERC20_ABI,
                    provider
                  );
                  const [balance, symbol, decimals, name] = (await Promise.all([
                    erc20.balanceOf(address),
                    erc20.symbol(),
                    erc20.decimals(),
                    erc20.name(),
                  ])) as [bigint, string, number, string];

                  if (balance === 0n) return null;

                  const formatted = ethers.formatUnits(balance, decimals);
                  const tokenPrice = prices[symbol] ?? null;
                  const valueUsd =
                    tokenPrice !== null
                      ? parseFloat(formatted) * tokenPrice
                      : null;

                  return {
                    contractAddress,
                    name,
                    symbol,
                    balance: formatted,
                    decimals,
                    valueUsd,
                  } satisfies TokenHolding;
                } catch {
                  return null;
                }
              })
            )
          ).filter((t): t is TokenHolding => t !== null);

          const tokenUsd = tokenHoldings.reduce(
            (s, t) => (t.valueUsd !== null ? s + t.valueUsd : s),
            0
          );
          const chainTotalUsd =
            nativeValueUsd !== null ? nativeValueUsd + tokenUsd : null;

          return {
            chain: config.name,
            chainId: config.chainId,
            nativeToken: config.nativeToken,
            nativeBalance: `${nativeBal.toFixed(6)} ${config.nativeToken}`,
            nativeValueUsd,
            tokens: tokenHoldings,
            chainTotalUsd,
          };
        })
      );

      const allHaveUsd = portfolioChains.every((c) => c.chainTotalUsd !== null);
      const totalValueUsd = allHaveUsd
        ? portfolioChains.reduce((s, c) => s + (c.chainTotalUsd ?? 0), 0)
        : null;

      const dominantChain = portfolioChains.reduce((best, c) =>
        (c.chainTotalUsd ?? 0) > (best.chainTotalUsd ?? 0) ? c : best
      ).chain;

      const totalTokenCount = portfolioChains.reduce(
        (s, c) => s + c.tokens.length,
        0
      );

      return {
        success: true,
        data: {
          address,
          chains: portfolioChains,
          totalValueUsd,
          dominantChain,
          totalTokenCount,
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
