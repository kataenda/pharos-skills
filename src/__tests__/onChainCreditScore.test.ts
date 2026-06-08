import { vi, describe, it, expect, beforeEach } from "vitest";
import { ethers } from "ethers";

vi.mock("../utils/client.js", () => ({
  getProvider: vi.fn(),
  getNetworkConfig: vi.fn(),
}));

vi.mock("../utils/explorer.js", () => ({
  getTransactionList: vi.fn(),
  getTokenTransfers: vi.fn(),
}));

import { onChainCreditScore } from "../skills/onChainCreditScore.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";
import { getTransactionList, getTokenTransfers } from "../utils/explorer.js";

const VALID_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const MOCK_CONFIG = {
  name: "Pharos Atlantic Testnet",
  chainId: 688689,
  rpcUrl: "",
  explorerApi: "",
  nativeToken: "PHRS",
  nativeTokenDecimals: 18,
};

const OLD_TIMESTAMP = String(Math.floor(Date.now() / 1000) - 800 * 86400); // 800 days ago

function makeTx(input = "0x", isError = "0") {
  return {
    hash: "0xabc",
    from: VALID_ADDRESS,
    to: "0xdef",
    value: ethers.parseEther("1").toString(),
    blockNumber: "100",
    timeStamp: OLD_TIMESTAMP,
    gasUsed: "21000",
    isError,
    input,
  };
}

describe("onChainCreditScore", () => {
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
    mockProvider.getBalance.mockResolvedValue(0n);
    mockProvider.getTransactionCount.mockResolvedValue(0);
  });

  it("returns error for invalid address", async () => {
    const result = await onChainCreditScore.execute({ address: "not-an-address" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid wallet address/i);
  });

  it("returns low score for empty new wallet", async () => {
    const result = await onChainCreditScore.execute({ address: VALID_ADDRESS });
    expect(result.success).toBe(true);
    expect(result.data!.score).toBeLessThan(200);
    expect(result.data!.grade).toBe("D");
  });

  it("score breakdown components sum to total", async () => {
    mockProvider.getBalance.mockResolvedValue(ethers.parseEther("5"));
    mockProvider.getTransactionCount.mockResolvedValue(120);
    vi.mocked(getTransactionList).mockResolvedValue(
      Array(120).fill(null).map(() => makeTx("0xdeadbeef"))
    );
    vi.mocked(getTokenTransfers).mockResolvedValue(
      Array(10).fill({ contractAddress: "0x" + "a".repeat(40) }).map((_, i) => ({
        ...({ contractAddress: `0x${"abcdef1234567890".repeat(2).slice(0, 40)}${i}` }),
        hash: "0x1",
        from: VALID_ADDRESS,
        to: "0xdef",
        value: "1000",
        tokenName: "Token",
        tokenSymbol: "TKN",
        tokenDecimal: "18",
      }))
    );

    const result = await onChainCreditScore.execute({ address: VALID_ADDRESS });
    expect(result.success).toBe(true);

    const { breakdown, score } = result.data!;
    const componentSum =
      breakdown.walletAge.score +
      breakdown.activityLevel.score +
      breakdown.balanceStability.score +
      breakdown.defiParticipation.score +
      breakdown.transactionSuccess.score +
      breakdown.tokenDiversity.score;

    expect(componentSum).toBe(score);
  });

  it("penalizes high failed transaction ratio", async () => {
    mockProvider.getBalance.mockResolvedValue(ethers.parseEther("1"));
    mockProvider.getTransactionCount.mockResolvedValue(40);
    const txs = [
      ...Array(30).fill(null).map(() => makeTx("0x", "1")), // 75% failed
      ...Array(10).fill(null).map(() => makeTx()),
    ];
    vi.mocked(getTransactionList).mockResolvedValue(txs);

    const result = await onChainCreditScore.execute({ address: VALID_ADDRESS });
    expect(result.success).toBe(true);
    expect(result.data!.breakdown.transactionSuccess.score).toBeLessThan(50);
  });

  it("grade AAA for high-scoring veteran wallet", async () => {
    mockProvider.getBalance.mockResolvedValue(ethers.parseEther("200"));
    mockProvider.getTransactionCount.mockResolvedValue(900);
    vi.mocked(getTransactionList).mockResolvedValue(
      Array(200).fill(null).map(() => makeTx("0xdeadbeef")) // all contract txs, old timestamp
    );
    vi.mocked(getTokenTransfers).mockResolvedValue(
      Array(15).fill(null).map((_, i) => ({
        contractAddress: `0x${"0".repeat(39)}${i.toString(16)}`,
        hash: "0x1",
        from: VALID_ADDRESS,
        to: "0xdef",
        value: "1000",
        tokenName: `Token${i}`,
        tokenSymbol: `TK${i}`,
        tokenDecimal: "18",
      }))
    );

    const result = await onChainCreditScore.execute({ address: VALID_ADDRESS });
    expect(result.success).toBe(true);
    expect(result.data!.score).toBeGreaterThanOrEqual(700);
    expect(["A", "AA", "AAA", "BBB"]).toContain(result.data!.grade);
  });
});
