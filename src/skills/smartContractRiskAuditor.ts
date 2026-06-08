import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";
import { getContractSource } from "../utils/explorer.js";

export interface ContractRiskParams {
  contractAddress: string;
  network?: string;
}

export interface RiskFinding {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: string;
  description: string;
}

export interface ContractRiskResult {
  contractAddress: string;
  contractName: string;
  isVerified: boolean;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  riskScore: number;
  findings: RiskFinding[];
  summary: string;
}

// EIP-1967 proxy storage slots
const IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

// ERC-20 function selectors (4-byte, no 0x prefix)
const ERC20_SELECTORS = ["a9059cbb", "095ea7b3", "23b872dd", "70a08231"];

const SEVERITY_WEIGHTS: Record<RiskFinding["severity"], number> = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
  INFO: 0,
};

export const smartContractRiskAuditor: Skill<ContractRiskParams, ContractRiskResult> = {
  name: "smartContractRiskAuditor",
  description:
    "Audits a smart contract for common security risks: unverified source, dangerous opcodes (SELFDESTRUCT, DELEGATECALL), upgradeability/proxy patterns, tx.origin auth, reentrancy risks. Returns a risk level (LOW/MEDIUM/HIGH/CRITICAL) with detailed findings.",
  parameters: {
    type: "object",
    properties: {
      contractAddress: {
        type: "string",
        description: "The smart contract address to audit",
      },
      network: {
        type: "string",
        description:
          "Network: pharos_testnet, pharos_mainnet, ethereum, polygon, bsc, arbitrum",
        default: "pharos_testnet",
      },
    },
    required: ["contractAddress"],
  },

  async execute({
    contractAddress,
    network = "pharos_testnet",
  }): Promise<SkillResult<ContractRiskResult>> {
    try {
      if (!ethers.isAddress(contractAddress)) {
        return { success: false, error: "Invalid contract address" };
      }

      const provider = getProvider(network);
      const config = getNetworkConfig(network);
      const findings: RiskFinding[] = [];

      const [bytecode, contractInfo, implSlotRaw, adminSlotRaw] = await Promise.all([
        provider.getCode(contractAddress),
        getContractSource(config.explorerApi, contractAddress),
        provider.getStorage(contractAddress, IMPL_SLOT),
        provider.getStorage(contractAddress, ADMIN_SLOT),
      ]);

      if (!bytecode || bytecode === "0x") {
        return {
          success: false,
          error: "Address is not a deployed contract (EOA or self-destructed)",
        };
      }

      const codeHex = bytecode.slice(2).toLowerCase();
      const codeSize = codeHex.length / 2;

      // 1. Verification
      if (!contractInfo.isVerified) {
        findings.push({
          severity: "HIGH",
          category: "Transparency",
          description:
            "Contract source code is NOT verified. Logic cannot be inspected without decompilation.",
        });
      } else {
        findings.push({
          severity: "INFO",
          category: "Transparency",
          description: `Contract is verified. Name: "${contractInfo.contractName || "Unknown"}"`,
        });
      }

      // 2. SELFDESTRUCT opcode (0xff) heuristic
      // We search for the raw opcode sequence; ff appears in data too so also check with source
      const hasSelfdestruct =
        codeHex.includes("ff") &&
        contractInfo.sourceCode.toLowerCase().includes("selfdestruct");
      if (hasSelfdestruct) {
        findings.push({
          severity: "CRITICAL",
          category: "Dangerous Opcode",
          description:
            "Contract contains SELFDESTRUCT. Owner can permanently destroy this contract and drain all funds.",
        });
      }

      // 3. Proxy detection (EIP-1967)
      const implAddr = "0x" + implSlotRaw.slice(-40);
      const adminAddr = "0x" + adminSlotRaw.slice(-40);
      const ZERO_ADDR = "0x" + "0".repeat(40);
      const isProxy = implAddr !== ZERO_ADDR;

      if (isProxy) {
        findings.push({
          severity: "MEDIUM",
          category: "Upgradeability",
          description: `Upgradeable proxy detected (EIP-1967). Implementation: ${implAddr}. Logic can be changed by admin.`,
        });
        if (adminAddr !== ZERO_ADDR) {
          findings.push({
            severity: "MEDIUM",
            category: "Upgradeability",
            description: `Proxy admin: ${adminAddr}. Verify this is a multisig or DAO — not a single EOA.`,
          });
        }
      }

      // 4. Contract size
      if (codeSize > 20000) {
        findings.push({
          severity: "LOW",
          category: "Complexity",
          description: `Large contract (${codeSize.toLocaleString()} bytes). Higher complexity increases attack surface.`,
        });
      }

      // 5. ERC-20 token detection
      const isToken = ERC20_SELECTORS.every((sel) => codeHex.includes(sel));
      if (isToken) {
        findings.push({
          severity: "INFO",
          category: "Token",
          description: "Contract implements ERC-20 interface (transfer, approve, transferFrom detected).",
        });
      }

      // 6. Source-level checks (only when verified)
      if (contractInfo.isVerified && contractInfo.sourceCode) {
        const src = contractInfo.sourceCode.toLowerCase();

        if (src.includes("selfdestruct") || src.includes("suicide(")) {
          findings.push({
            severity: "CRITICAL",
            category: "Dangerous Function",
            description:
              "Source contains selfdestruct/suicide. A privileged caller can destroy this contract.",
          });
        }

        if (src.includes("delegatecall")) {
          findings.push({
            severity: "HIGH",
            category: "Dangerous Function",
            description:
              "Source uses delegatecall. If unguarded, can cause storage collision or arbitrary code execution.",
          });
        }

        if (src.includes("tx.origin")) {
          findings.push({
            severity: "HIGH",
            category: "Authentication",
            description:
              "Source uses tx.origin for authentication. Vulnerable to phishing/relay attacks. Use msg.sender instead.",
          });
        }

        if (
          !src.includes("nonreentrant") &&
          !src.includes("reentrancyguard") &&
          (src.includes("call{value") || src.includes(".call("))
        ) {
          findings.push({
            severity: "MEDIUM",
            category: "Reentrancy",
            description:
              "Contract sends ETH without an obvious reentrancy guard. Review call ordering (CEI pattern).",
          });
        }

        if (src.includes("block.timestamp") || src.includes("now ")) {
          findings.push({
            severity: "LOW",
            category: "Timestamp Dependence",
            description:
              "Source relies on block.timestamp. Miners can manipulate this within ~15 seconds.",
          });
        }
      }

      const riskScore = findings.reduce(
        (sum, f) => sum + SEVERITY_WEIGHTS[f.severity],
        0
      );

      const riskLevel: ContractRiskResult["riskLevel"] =
        riskScore >= 60
          ? "CRITICAL"
          : riskScore >= 35
          ? "HIGH"
          : riskScore >= 15
          ? "MEDIUM"
          : "LOW";

      const summary =
        riskLevel === "CRITICAL"
          ? "CRITICAL RISK — Multiple severe issues detected. Do NOT interact without a full audit."
          : riskLevel === "HIGH"
          ? "HIGH RISK — Significant issues found. Proceed with extreme caution."
          : riskLevel === "MEDIUM"
          ? "MEDIUM RISK — Some concerns detected. Review all findings before interacting."
          : "LOW RISK — No major issues detected. Standard caution still advised.";

      return {
        success: true,
        data: {
          contractAddress,
          contractName: contractInfo.contractName || "Unknown",
          isVerified: contractInfo.isVerified,
          riskLevel,
          riskScore,
          findings,
          summary,
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
