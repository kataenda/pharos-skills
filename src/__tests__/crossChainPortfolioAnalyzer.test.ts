import { vi, describe, it, expect, beforeEach } from "vitest";
import { ethers } from "ethers";

vi.mock("../utils/client.js", () => ({
  getProvider: vi.fn(),
  getNetworkConfig: vi.fn(),
  NETWORKS: {
    pharos_testnet: {
      name: "Pharos Atlantic Testnet",
      chainId: 688689,
      rpcUrl: "",
      explorerApi: "",
      nativeToken: "PHRS",
      nativeTokenDecimals: 18,
    },
    ethereum: {
      name: "Ethereum Mainnet",
      chainId: 1,
      rpcUrl: "",
      explorerApi: "",
      nativeToken: "ETH",
      nativeTokenDecimals: 18,
    },
  },
}));

vi.mock("../utils/explorer.js", () => ({
  getTokenTransfers: vi.fn(),
}));

import { crossChainPortfolioAnalyzer } from "../skills/crossChainPortfolioAnalyzer.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";
import { getTokenTransfers } from "../utils/explorer.js";

const VALID_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const MOCK_CONFIG = {
  name: "Pharos Atlantic Testnet",
  chainId: 688689,
  rpcUrl: "",
  explorerApi: "",
  nativeToken: "PHRS",
  nativeTokenDecimals: 18,
};

describe("crossChainPortfolioAnalyzer", () => {
  const mockProvider = {
    getBalance: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getProvider).mockReturnValue(
      mockProvider as unknown as ethers.JsonRpcProvider
    );
    vi.mocked(getNetworkConfig).mockReturnValue(MOCK_CONFIG);
    vi.mocked(getTokenTransfers).mockResolvedValue([]);
    mockProvider.getBalance.mockResolvedValue(ethers.parseEther("1.5"));

    // Mock global fetch for CoinGecko (returns empty — no price data)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );
  });

  it("returns error for invalid address", async () => {
    const result = await crossChainPortfolioAnalyzer.execute({
      address: "not-valid",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid wallet address/i);
  });

  it("returns portfolio for single chain", async () => {
    const result = await crossChainPortfolioAnalyzer.execute({
      address: VALID_ADDRESS,
      chains: ["pharos_testnet"],
    });
    expect(result.success).toBe(true);
    expect(result.data!.chains).toHaveLength(1);
    expect(result.data!.chains[0].nativeToken).toBe("PHRS");
    expect(result.data!.chains[0].nativeBalance).toContain("1.500000");
  });

  it("correct structure returned for each chain", async () => {
    const result = await crossChainPortfolioAnalyzer.execute({
      address: VALID_ADDRESS,
      chains: ["pharos_testnet"],
    });
    expect(result.success).toBe(true);
    const chain = result.data!.chains[0];
    expect(chain).toMatchObject({
      chain: expect.any(String),
      chainId: expect.any(Number),
      nativeToken: expect.any(String),
      nativeBalance: expect.any(String),
      tokens: expect.any(Array),
    });
  });

  it("nativeValueUsd is null when price API fails", async () => {
    const result = await crossChainPortfolioAnalyzer.execute({
      address: VALID_ADDRESS,
      chains: ["pharos_testnet"],
    });
    expect(result.success).toBe(true);
    expect(result.data!.chains[0].nativeValueUsd).toBeNull();
    expect(result.data!.totalValueUsd).toBeNull();
  });

  it("handles multiple chains in parallel", async () => {
    vi.mocked(getNetworkConfig)
      .mockReturnValueOnce(MOCK_CONFIG)
      .mockReturnValueOnce({
        ...MOCK_CONFIG,
        name: "Ethereum Mainnet",
        chainId: 1,
        nativeToken: "ETH",
      });

    const result = await crossChainPortfolioAnalyzer.execute({
      address: VALID_ADDRESS,
      chains: ["pharos_testnet", "ethereum"],
    });
    expect(result.success).toBe(true);
    expect(result.data!.chains).toHaveLength(2);
    expect(result.data!.dominantChain).toBeDefined();
  });
});
