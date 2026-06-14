import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider, getNetworkConfig } from "../utils/client.js";
import { getContractSource, getTokenTransfers } from "../utils/explorer.js";

export interface RugPullParams {
  contractAddress: string;
  network?: string;
}

export interface RugSignal {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  signal: string;
  description: string;
}

export interface RugPullResult {
  contractAddress: string;
  contractName: string;
  isVerified: boolean;
  rugRisk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  riskScore: number;
  signals: RugSignal[];
  holderConcentration: number | null;
  summary: string;
  disclaimer: string;
}

const HEURISTIC_DISCLAIMER =
  "Heuristic analysis based on source-code keyword matching and transfer history — NOT a formal security audit. Absence of signals does not guarantee safety.";

const SIGNAL_WEIGHTS: Record<RugSignal["severity"], number> = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
  INFO: 0,
};

export const rugPullDetector: Skill<RugPullParams, RugPullResult> = {
  name: "rugPullDetector",
  description:
    "Scans a token smart contract for rug pull indicators: unverified source, owner mint/pause/blacklist privileges, selfdestruct capability, adjustable fees, non-renounced ownership, and abnormal token holder concentration. Returns a risk level (LOW/MEDIUM/HIGH/CRITICAL) with all detected signals.",
  parameters: {
    type: "object",
    properties: {
      contractAddress: {
        type: "string",
        description: "Token contract address to analyze",
      },
      network: {
        type: "string",
        description: "Network: pharos_testnet, pharos_mainnet, ethereum, polygon, bsc, arbitrum",
        default: "pharos_testnet",
      },
    },
    required: ["contractAddress"],
  },

  async execute({ contractAddress, network = "pharos_testnet" }): Promise<SkillResult<RugPullResult>> {
    try {
      if (!ethers.isAddress(contractAddress)) {
        return { success: false, error: "Invalid contract address" };
      }

      const provider = getProvider(network);
      const config = getNetworkConfig(network);
      const signals: RugSignal[] = [];

      const [bytecode, contractInfo, transfers] = await Promise.all([
        provider.getCode(contractAddress),
        getContractSource(config.explorerApi, contractAddress),
        getTokenTransfers(config.explorerApi, contractAddress, 500),
      ]);

      if (!bytecode || bytecode === "0x") {
        return { success: false, error: "Address is not a deployed contract" };
      }

      // 1. Source code verification
      if (!contractInfo.isVerified) {
        signals.push({
          severity: "HIGH",
          signal: "Unverified Source Code",
          description: "Contract source is not publicly verified. Hidden malicious logic cannot be detected.",
        });
      } else {
        signals.push({
          severity: "INFO",
          signal: "Verified Source Code",
          description: `Contract "${contractInfo.contractName}" source is publicly available and can be audited.`,
        });

        const src = contractInfo.sourceCode.toLowerCase();

        // 2. Unlimited mint
        if (src.includes("function mint") || (src.includes("_mint(") && !src.includes("constructor"))) {
          signals.push({
            severity: "HIGH",
            signal: "Mint Function Detected",
            description: "Owner can mint unlimited tokens at any time, instantly diluting holder value.",
          });
        }

        // 3. Pause
        if (src.includes("function pause") || src.includes("whennotpaused")) {
          signals.push({
            severity: "MEDIUM",
            signal: "Pausable Transfers",
            description: "Owner can pause all token transfers, trapping investors and preventing sells.",
          });
        }

        // 4. Blacklist / blocklist
        if (
          src.includes("blacklist") ||
          src.includes("blocklist") ||
          src.includes("isblacklisted") ||
          src.includes("addtoblacklist")
        ) {
          signals.push({
            severity: "HIGH",
            signal: "Blacklist Capability",
            description: "Owner can blacklist specific wallets, preventing them from selling their tokens.",
          });
        }

        // 5. Adjustable fees / taxes
        if (
          src.includes("setfee") ||
          src.includes("settax") ||
          src.includes("setbuytax") ||
          src.includes("setselltax") ||
          src.includes("setsellfeepercent")
        ) {
          signals.push({
            severity: "MEDIUM",
            signal: "Adjustable Tax/Fee Functions",
            description: "Owner can change buy/sell taxes dynamically. Fees could be raised to 100% (honeypot vector).",
          });
        }

        // 6. Selfdestruct
        if (src.includes("selfdestruct") || src.includes("suicide(")) {
          signals.push({
            severity: "CRITICAL",
            signal: "Selfdestruct Capability",
            description: "Owner can permanently destroy the contract and drain all associated funds.",
          });
        }

        // 7. Ownership status
        const hasOwnable = src.includes("ownable") || src.includes("onlyowner");
        const hasRenounce = src.includes("renounceownership");
        if (hasOwnable && !hasRenounce) {
          signals.push({
            severity: "MEDIUM",
            signal: "Non-Renounced Ownership",
            description: "Contract has centralized owner privileges with no renounce mechanism. Owner retains full control.",
          });
        } else if (hasRenounce) {
          signals.push({
            severity: "INFO",
            signal: "Renounce Mechanism Present",
            description: "Contract includes renounceOwnership. Verify on-chain that it was actually called.",
          });
        }

        // 8. Hidden owner / proxy backdoor
        if (src.includes("_setowner") || src.includes("setadmin(") || src.includes("sethiddenowner")) {
          signals.push({
            severity: "CRITICAL",
            signal: "Hidden Owner/Admin Setter",
            description: "Contract contains suspicious owner/admin override functions that may bypass normal governance.",
          });
        }

        // 9. Max tx / wallet caps (honeypot signal)
        if (src.includes("maxtxamount") || src.includes("maxwallet") || src.includes("maxbuyamount")) {
          signals.push({
            severity: "LOW",
            signal: "Buy/Wallet Limits",
            description: "Max buy or max wallet limits detected. Can restrict selling pressure and create artificial scarcity.",
          });
        }
      }

      // 10. Holder concentration from token transfer analysis
      let holderConcentration: number | null = null;
      if (transfers.length > 0) {
        const balances: Record<string, bigint> = {};
        const ZERO = "0x0000000000000000000000000000000000000000";
        for (const t of transfers) {
          const from = t.from.toLowerCase();
          const to   = t.to.toLowerCase();
          const val  = BigInt(t.value || "0");
          if (from !== ZERO) balances[from] = (balances[from] ?? 0n) - val;
          balances[to] = (balances[to] ?? 0n) + val;
        }
        const positive = Object.entries(balances)
          .filter(([addr, v]) => v > 0n && addr !== ZERO && addr !== contractAddress.toLowerCase())
          .map(([, v]) => v);

        if (positive.length > 0) {
          const total = positive.reduce((s, v) => s + v, 0n);
          const sorted = [...positive].sort((a, b) => (b > a ? 1 : -1));
          const top3Sum = sorted.slice(0, 3).reduce((s, v) => s + v, 0n);
          holderConcentration = total > 0n ? Number((top3Sum * 100n) / total) : null;

          if (holderConcentration !== null) {
            if (holderConcentration > 80) {
              signals.push({
                severity: "CRITICAL",
                signal: "Extreme Holder Concentration",
                description: `Top 3 holders control ~${holderConcentration}% of supply. A single dump could collapse the price.`,
              });
            } else if (holderConcentration > 50) {
              signals.push({
                severity: "HIGH",
                signal: "High Holder Concentration",
                description: `Top 3 holders control ~${holderConcentration}% of circulating supply. High dump risk.`,
              });
            } else {
              signals.push({
                severity: "INFO",
                signal: "Holder Distribution",
                description: `Top 3 holders control ~${holderConcentration}% of supply (from ${transfers.length} tracked transfers).`,
              });
            }
          }
        }
      }

      const riskScore = signals.reduce((s, sig) => s + SIGNAL_WEIGHTS[sig.severity], 0);
      let rugRisk: RugPullResult["rugRisk"] =
        riskScore >= 60 ? "CRITICAL"
        : riskScore >= 35 ? "HIGH"
        : riskScore >= 15 ? "MEDIUM"
        : "LOW";

      // Unverified source means the contract's logic cannot be inspected at all.
      // Never report "LOW" in that case — the heuristic is blind to hidden behaviour,
      // so the floor is raised to MEDIUM to avoid false reassurance.
      if (!contractInfo.isVerified && rugRisk === "LOW") {
        rugRisk = "MEDIUM";
      }

      const summary =
        rugRisk === "CRITICAL" ? "CRITICAL — Multiple severe rug pull indicators detected. Do NOT invest."
        : rugRisk === "HIGH"   ? "HIGH RISK — Significant red flags found. Independent audit required before investing."
        : rugRisk === "MEDIUM" ? (
            contractInfo.isVerified
              ? "MEDIUM RISK — Some concerns detected. Research thoroughly before committing funds."
              : "MEDIUM RISK — Source is unverified, so hidden logic cannot be ruled out. Treat with caution until verified."
          )
        : "LOW RISK — No major rug pull signals detected in verified source. Standard caution still advised.";

      return {
        success: true,
        data: {
          contractAddress,
          contractName: contractInfo.contractName || "Unknown",
          isVerified: contractInfo.isVerified,
          rugRisk,
          riskScore,
          signals,
          holderConcentration,
          summary,
          disclaimer: HEURISTIC_DISCLAIMER,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};
