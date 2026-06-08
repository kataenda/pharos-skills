import { vi, describe, it, expect, beforeEach } from "vitest";
import { ethers } from "ethers";

// ── Mocks (hoisted by Vitest) ──────────────────────────────────────────────
vi.mock("../utils/client.js", () => ({
  getProvider: vi.fn(),
  getNetworkConfig: vi.fn(),
}));

vi.mock("../utils/explorer.js", () => ({
  getTransactionList: vi.fn(),
  getTokenTransfers: vi.fn(),
}));

import { walletPersonalityAnalyzer } from "../skills/walletPersonalityAnalyzer.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";
import { getTransactionList, getTokenTransfers } from "../utils/explorer.js";

// ── Shared fixtures ────────────────────────────────────────────────────────
// Vitalik's address — valid EIP-55 checksum, safe to use in tests
const VALID_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const MOCK_CONFIG = {
  name: "Pharos Atlantic Testnet",
  chainId: 688689,
  rpcUrl: "",
  explorerApi: "",
  nativeToken: "PHRS",
  nativeTokenDecimals: 18,
};

function makeTx(overrides: Partial<{
  input: string; isError: string; value: string; timeStamp: string;
}> = {}) {
  return {
    hash: "0xabc",
    from: VALID_ADDRESS,
    to: "0xdef",
    value: ethers.parseEther("0.1").toString(),
    blockNumber: "100",
    timeStamp: String(Math.floor(Date.now() / 1000) - 400 * 86400), // 400 days ago
    gasUsed: "21000",
    isError: "0",
    input: "0x",
    ...overrides,
  };
}

describe("walletPersonalityAnalyzer", () => {
  const mockProvider = {
    getBalance: vi.fn(),
    getTransactionCount: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getProvider).mockReturnValue(
      mockProvider as unknown as ethers.JsonRpcProvider
    );
    vi.mocked(getNetworkConfig).mockReturnValue(MOCK_CONFIG);
    vi.mocked(getTransactionList).mockResolvedValue([]);
    vi.mocked(getTokenTransfers).mockResolvedValue([]);
    mockProvider.getBalance.mockResolvedValue(ethers.parseEther("1"));
    mockProvider.getTransactionCount.mockResolvedValue(10);
  });

  it("returns error for invalid address", async () => {
    const result = await walletPersonalityAnalyzer.execute({
      address: "0xinvalid",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid wallet address/i);
  });

  it("labels wallet with ≤5 txs as New Explorer", async () => {
    mockProvider.getBalance.mockResolvedValue(ethers.parseEther("0.05"));
    mockProvider.getTransactionCount.mockResolvedValue(3);

    const result = await walletPersonalityAnalyzer.execute({
      address: VALID_ADDRESS,
    });
    expect(result.success).toBe(true);
    expect(result.data?.personality).toBe("New Explorer");
    expect(result.data?.emoji).toBe("🌱");
  });

  it("labels large-balance wallet as Crypto Whale", async () => {
    mockProvider.getBalance.mockResolvedValue(ethers.parseEther("500"));
    mockProvider.getTransactionCount.mockResolvedValue(50);
    vi.mocked(getTransactionList).mockResolvedValue(
      Array(50).fill(null).map(() => makeTx({ input: "0x" }))
    );

    const result = await walletPersonalityAnalyzer.execute({
      address: VALID_ADDRESS,
    });
    expect(result.success).toBe(true);
    expect(result.data?.personality).toBe("Crypto Whale");
  });

  it("labels high contract-interaction wallet as DeFi Degen", async () => {
    mockProvider.getBalance.mockResolvedValue(ethers.parseEther("2"));
    mockProvider.getTransactionCount.mockResolvedValue(300);
    // 80% contract interactions
    const txs = [
      ...Array(240).fill(null).map(() => makeTx({ input: "0xdeadbeef" })),
      ...Array(60).fill(null).map(() => makeTx({ input: "0x" })),
    ];
    vi.mocked(getTransactionList).mockResolvedValue(txs);

    const result = await walletPersonalityAnalyzer.execute({
      address: VALID_ADDRESS,
    });
    expect(result.success).toBe(true);
    expect(result.data?.personality).toBe("DeFi Degen");
  });

  it("returns correct stats shape", async () => {
    mockProvider.getBalance.mockResolvedValue(ethers.parseEther("1.5"));
    mockProvider.getTransactionCount.mockResolvedValue(25);

    const result = await walletPersonalityAnalyzer.execute({
      address: VALID_ADDRESS,
      network: "pharos_testnet",
    });
    expect(result.success).toBe(true);
    expect(result.data?.stats).toMatchObject({
      txCount: expect.any(Number),
      nativeBalance: expect.stringContaining("PHRS"),
      contractInteractions: expect.any(Number),
      uniqueTokens: expect.any(Number),
      walletAge: expect.any(String),
      avgTxValue: expect.any(String),
    });
  });
});
