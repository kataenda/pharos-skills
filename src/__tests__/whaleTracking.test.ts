import { vi, describe, it, expect, beforeEach } from "vitest";
import { ethers } from "ethers";

vi.mock("../utils/client.js", () => ({
  getProvider: vi.fn(),
  getNetworkConfig: vi.fn(),
}));

import { whaleTracking } from "../skills/whaleTracking.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";

const MOCK_CONFIG = {
  name: "Pharos Atlantic Testnet",
  chainId: 688689,
  rpcUrl: "",
  explorerApi: "",
  nativeToken: "PHRS",
  nativeTokenDecimals: 18,
};

const WHALE_ADDR = "0x1111111111111111111111111111111111111111";
const SMALL_ADDR = "0x2222222222222222222222222222222222222222";
const NOW_TS = Math.floor(Date.now() / 1000);

function makeBlock(
  number: number,
  txs: Array<{ from: string; to: string; value: bigint; data?: string }>
) {
  return {
    number,
    timestamp: NOW_TS,
    transactions: txs.map((tx, i) => ({
      hash: `0x${number.toString(16).padStart(4, "0")}${i.toString(16).padStart(4, "0")}`,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      data: tx.data ?? "0x",
    })),
  };
}

describe("whaleTracking", () => {
  const mockProvider = {
    getBlockNumber: vi.fn(),
    getBlock: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getProvider).mockReturnValue(
      mockProvider as unknown as ethers.JsonRpcProvider
    );
    vi.mocked(getNetworkConfig).mockReturnValue(MOCK_CONFIG);
    mockProvider.getBlockNumber.mockResolvedValue(1000);
    mockProvider.getBlock.mockResolvedValue(
      makeBlock(1000, [
        { from: SMALL_ADDR, to: WHALE_ADDR, value: ethers.parseEther("0.1") },
      ])
    );
  });

  it("returns empty list when no transactions exceed threshold", async () => {
    const result = await whaleTracking.execute({
      thresholdNative: 100,
      blockRange: 1,
    });
    expect(result.success).toBe(true);
    expect(result.data!.whaleTransactions).toHaveLength(0);
    expect(result.data!.totalVolume).toBe(0);
  });

  it("detects transaction above threshold", async () => {
    mockProvider.getBlock.mockResolvedValue(
      makeBlock(1000, [
        { from: WHALE_ADDR, to: SMALL_ADDR, value: ethers.parseEther("500") },
        { from: SMALL_ADDR, to: WHALE_ADDR, value: ethers.parseEther("5") },
      ])
    );

    const result = await whaleTracking.execute({
      thresholdNative: 100,
      blockRange: 1,
    });
    expect(result.success).toBe(true);
    expect(result.data!.whaleTransactions).toHaveLength(1);
    expect(result.data!.whaleTransactions[0].valueNative).toBe(500);
    expect(result.data!.whaleTransactions[0].from).toBe(WHALE_ADDR);
  });

  it("tracks watched address regardless of amount", async () => {
    const watchedAddr = "0x3333333333333333333333333333333333333333";
    mockProvider.getBlock.mockResolvedValue(
      makeBlock(1000, [
        // tiny amount but from watched address
        { from: watchedAddr, to: SMALL_ADDR, value: ethers.parseEther("0.001") },
      ])
    );

    const result = await whaleTracking.execute({
      thresholdNative: 100,
      blockRange: 1,
      watchAddresses: [watchedAddr],
    });
    expect(result.success).toBe(true);
    expect(result.data!.whaleTransactions).toHaveLength(1);
    expect(result.data!.whaleTransactions[0].from.toLowerCase()).toBe(
      watchedAddr.toLowerCase()
    );
  });

  it("sorts results by value descending", async () => {
    mockProvider.getBlock.mockResolvedValue(
      makeBlock(1000, [
        { from: WHALE_ADDR, to: SMALL_ADDR, value: ethers.parseEther("200") },
        { from: SMALL_ADDR, to: WHALE_ADDR, value: ethers.parseEther("1000") },
        { from: WHALE_ADDR, to: SMALL_ADDR, value: ethers.parseEther("500") },
      ])
    );

    const result = await whaleTracking.execute({
      thresholdNative: 100,
      blockRange: 1,
    });
    expect(result.success).toBe(true);
    const values = result.data!.whaleTransactions.map((t) => t.valueNative);
    expect(values).toEqual([1000, 500, 200]);
  });

  it("clamps blockRange to max 100", async () => {
    mockProvider.getBlockNumber.mockResolvedValue(50);
    mockProvider.getBlock.mockResolvedValue(makeBlock(50, []));

    const result = await whaleTracking.execute({
      thresholdNative: 100,
      blockRange: 9999,
    });
    expect(result.success).toBe(true);
    expect(result.data!.blocksScanned).toBeLessThanOrEqual(100);
  });
});
