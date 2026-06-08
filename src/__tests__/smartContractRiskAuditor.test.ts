import { vi, describe, it, expect, beforeEach } from "vitest";
import { ethers } from "ethers";

vi.mock("../utils/client.js", () => ({
  getProvider: vi.fn(),
  getNetworkConfig: vi.fn(),
}));

vi.mock("../utils/explorer.js", () => ({
  getContractSource: vi.fn(),
}));

import { smartContractRiskAuditor } from "../skills/smartContractRiskAuditor.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";
import { getContractSource } from "../utils/explorer.js";

const VALID_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const MOCK_CONFIG = {
  name: "Pharos Atlantic Testnet",
  chainId: 688689,
  rpcUrl: "",
  explorerApi: "",
  nativeToken: "PHRS",
  nativeTokenDecimals: 18,
};
const ZERO_SLOT = "0x" + "0".repeat(64);
// Minimal ERC-20 bytecode containing all relevant selectors
const MOCK_BYTECODE =
  "0x" + "a9059cbb" + "095ea7b3" + "23b872dd" + "70a08231" + "00".repeat(100);

describe("smartContractRiskAuditor", () => {
  const mockProvider = {
    getCode: vi.fn(),
    getStorage: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getProvider).mockReturnValue(
      mockProvider as unknown as ethers.JsonRpcProvider
    );
    vi.mocked(getNetworkConfig).mockReturnValue(MOCK_CONFIG);
    mockProvider.getCode.mockResolvedValue(MOCK_BYTECODE);
    mockProvider.getStorage.mockResolvedValue(ZERO_SLOT);
    vi.mocked(getContractSource).mockResolvedValue({
      isVerified: true,
      sourceCode: "pragma solidity ^0.8.0; contract Safe {}",
      contractName: "SafeToken",
    });
  });

  it("returns error for invalid address", async () => {
    const result = await smartContractRiskAuditor.execute({
      contractAddress: "0xinvalid",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid contract address/i);
  });

  it("returns error for EOA (no bytecode)", async () => {
    mockProvider.getCode.mockResolvedValue("0x");
    const result = await smartContractRiskAuditor.execute({
      contractAddress: VALID_CONTRACT,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not a deployed contract/i);
  });

  it("flags unverified contract as HIGH risk finding", async () => {
    vi.mocked(getContractSource).mockResolvedValue({
      isVerified: false,
      sourceCode: "",
      contractName: "",
    });

    const result = await smartContractRiskAuditor.execute({
      contractAddress: VALID_CONTRACT,
    });
    expect(result.success).toBe(true);

    const highFindings = result.data!.findings.filter(
      (f) => f.severity === "HIGH" && f.category === "Transparency"
    );
    expect(highFindings.length).toBeGreaterThan(0);
  });

  it("flags selfdestruct in source as CRITICAL", async () => {
    vi.mocked(getContractSource).mockResolvedValue({
      isVerified: true,
      sourceCode: `pragma solidity ^0.8.0;
        contract Dangerous {
          function kill() external { selfdestruct(payable(msg.sender)); }
        }`,
      contractName: "Dangerous",
    });
    // bytecode with 'ff' to trigger opcode check
    mockProvider.getCode.mockResolvedValue(MOCK_BYTECODE + "ff");

    const result = await smartContractRiskAuditor.execute({
      contractAddress: VALID_CONTRACT,
    });
    expect(result.success).toBe(true);

    const criticalFindings = result.data!.findings.filter(
      (f) => f.severity === "CRITICAL"
    );
    expect(criticalFindings.length).toBeGreaterThan(0);
    expect(result.data!.riskLevel).toBe("CRITICAL");
  });

  it("detects EIP-1967 proxy and reports MEDIUM finding", async () => {
    // Non-zero impl slot = proxy detected
    const nonZeroSlot =
      "0x" + "0".repeat(24) + "742d35Cc6634C0532925a3b8D4b9d3f4F4b2F7f";
    mockProvider.getStorage.mockResolvedValue(nonZeroSlot);

    const result = await smartContractRiskAuditor.execute({
      contractAddress: VALID_CONTRACT,
    });
    expect(result.success).toBe(true);

    const proxyFindings = result.data!.findings.filter(
      (f) => f.category === "Upgradeability"
    );
    expect(proxyFindings.length).toBeGreaterThan(0);
    expect(proxyFindings[0].severity).toBe("MEDIUM");
  });

  it("returns LOW risk for clean verified contract", async () => {
    const result = await smartContractRiskAuditor.execute({
      contractAddress: VALID_CONTRACT,
    });
    expect(result.success).toBe(true);
    expect(result.data!.riskLevel).toBe("LOW");
    expect(result.data!.isVerified).toBe(true);
  });
});
