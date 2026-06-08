import { ethers } from "ethers";
import { Skill, SkillResult } from "../types/skill.js";
import { getProvider, getNetworkConfig, NETWORKS } from "../utils/client.js";
import { walletReputationOracle } from "./walletReputationOracle.js";
import { pharosNetworkIntelligence } from "./pharosNetworkIntelligence.js";

export interface PaymentAdvisorParams {
  from: string;
  to: string;
  amountNative: number;
  network?: string;
}

export interface PaymentCheck {
  check: string;
  status: "PASS" | "WARN" | "FAIL";
  detail: string;
}

export interface PaymentAdvisorResult {
  from: string;
  to: string;
  amountNative: number;
  nativeToken: string;
  network: string;
  paymentRisk: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
  recommended: boolean;
  senderBalance: string;
  balanceSufficient: boolean;
  estimatedGasCost: string;
  recipientTrust: string;
  networkOptimal: boolean;
  checks: PaymentCheck[];
  advice: string;
}

export const onChainPaymentAdvisor: Skill<PaymentAdvisorParams, PaymentAdvisorResult> = {
  name: "onChainPaymentAdvisor",
  description:
    "The on-chain payment intelligence layer for AI agents. Before executing any payment on Pharos or any EVM chain, validates: sender balance sufficiency, recipient wallet trustworthiness, network gas conditions, and payment risk level. Returns a clear recommended/not-recommended verdict with actionable advice — enabling agents to transact safely and efficiently.",
  parameters: {
    type: "object",
    properties: {
      from: {
        type: "string",
        description: "Sender wallet address",
      },
      to: {
        type: "string",
        description: "Recipient wallet address",
      },
      amountNative: {
        type: "number",
        description: "Payment amount in native token (PHRS, ETH, MATIC, etc.)",
      },
      network: {
        type: "string",
        description: "Network: pharos_testnet, pharos_mainnet, ethereum, polygon, bsc, arbitrum",
        default: "pharos_testnet",
      },
    },
    required: ["from", "to", "amountNative"],
  },

  async execute({
    from,
    to,
    amountNative,
    network = "pharos_testnet",
  }: PaymentAdvisorParams): Promise<SkillResult<PaymentAdvisorResult>> {
    try {
      if (!ethers.isAddress(from)) return { success: false, error: "Invalid sender address" };
      if (!ethers.isAddress(to))   return { success: false, error: "Invalid recipient address" };
      if (amountNative <= 0)       return { success: false, error: "amountNative must be positive" };
      if (!NETWORKS[network])      return { success: false, error: `Unknown network: ${network}` };

      const provider = getProvider(network);
      const config   = getNetworkConfig(network);
      const isPharos = network === "pharos_testnet" || network === "pharos_mainnet";

      const [senderRaw, recipientRaw, feeData, recipientCode, recipientReputation, networkStats] = await Promise.all([
        provider.getBalance(from).catch(() => 0n),
        provider.getBalance(to).catch(() => 0n),
        provider.getFeeData(),
        provider.getCode(to).catch(() => "0x"),
        walletReputationOracle.execute({ address: to, network }),
        isPharos
          ? pharosNetworkIntelligence.execute({ network: network as "pharos_testnet" | "pharos_mainnet", blockSample: 5 })
          : Promise.resolve(null),
      ]);

      const senderBalance     = parseFloat(ethers.formatEther(senderRaw));
      const amountWei         = ethers.parseEther(amountNative.toString());
      const gasPrice          = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;
      const GAS_LIMIT         = 21000n;
      const gasCostWei        = gasPrice * GAS_LIMIT;
      const gasCostNative     = parseFloat(ethers.formatEther(gasCostWei));
      const totalRequired     = amountNative + gasCostNative;
      const balanceSufficient = senderBalance >= totalRequired;

      const checks: PaymentCheck[] = [];
      let riskPoints = 0;

      // 1. Balance check
      checks.push({
        check: "Sender Balance",
        status: balanceSufficient ? "PASS" : "FAIL",
        detail: balanceSufficient
          ? `${senderBalance.toFixed(6)} ${config.nativeToken} available — sufficient for ${amountNative} + gas`
          : `${senderBalance.toFixed(6)} ${config.nativeToken} available — need ${totalRequired.toFixed(6)} (amount + gas). Insufficient.`,
      });
      if (!balanceSufficient) riskPoints += 40;

      // 2. Recipient is a contract or EOA
      const recipientIsContract = recipientCode !== "0x" && recipientCode !== "";
      checks.push({
        check: "Recipient Type",
        status: recipientIsContract ? "WARN" : "PASS",
        detail: recipientIsContract
          ? "Recipient is a smart contract. Ensure this is intentional — contracts may have transfer hooks."
          : "Recipient is an EOA (regular wallet). Standard payment target.",
      });
      if (recipientIsContract) riskPoints += 10;

      // 3. Recipient reputation
      const trust = recipientReputation.data?.trustLevel ?? "UNKNOWN";
      const reputationStatus =
        trust === "EXCELLENT" || trust === "GOOD" ? "PASS" :
        trust === "FAIR"                           ? "WARN" :
        trust === "UNTRUSTED"                      ? "FAIL" : "WARN";
      checks.push({
        check: "Recipient Reputation",
        status: reputationStatus,
        detail: `Recipient trust level: ${trust} (score: ${recipientReputation.data?.reputationScore ?? "N/A"}/100)${
          recipientReputation.data?.flags?.length ? " — Flags: " + recipientReputation.data.flags.join("; ") : ""
        }`,
      });
      if (trust === "UNTRUSTED") riskPoints += 40;
      else if (trust === "LOW")  riskPoints += 20;
      else if (trust === "FAIR") riskPoints += 5;

      // 4. Self-payment check
      if (from.toLowerCase() === to.toLowerCase()) {
        checks.push({ check: "Self-Transfer", status: "WARN", detail: "Sender and recipient are the same address. This is a self-payment — funds stay in the same wallet." });
        riskPoints += 5;
      }

      // 5. Large payment warning (>10% of balance)
      if (amountNative > senderBalance * 0.5) {
        checks.push({ check: "Large Transfer", status: "WARN", detail: `Payment is >50% of sender's balance. Ensure this is intentional.` });
        riskPoints += 10;
      } else {
        checks.push({ check: "Transfer Size", status: "PASS", detail: `Payment amount is ${((amountNative / senderBalance) * 100).toFixed(1)}% of sender's balance.` });
      }

      // 6. Network condition (Pharos only)
      let networkOptimal = true;
      if (networkStats?.success && networkStats.data) {
        const n = networkStats.data;
        networkOptimal = n.optimalGasWindow;
        checks.push({
          check: "Network Conditions",
          status: n.optimalGasWindow ? "PASS" : "WARN",
          detail: `Pharos load: ${n.networkLoad}, gas: ${n.gasPriceGwei} Gwei, TPS: ${n.estimatedTps}${n.optimalGasWindow ? " — optimal window" : " — consider waiting for lower load"}`,
        });
        if (!n.optimalGasWindow) riskPoints += 5;
      } else {
        checks.push({ check: "Network Conditions", status: "PASS", detail: `Gas: ${parseFloat(ethers.formatUnits(gasPrice, "gwei")).toFixed(4)} Gwei` });
      }

      const paymentRisk: PaymentAdvisorResult["paymentRisk"] =
        riskPoints >= 40 ? "BLOCKED"
        : riskPoints >= 25 ? "HIGH"
        : riskPoints >= 10 ? "MEDIUM"
        : "LOW";

      const recommended = paymentRisk === "LOW" || paymentRisk === "MEDIUM";

      const advice =
        paymentRisk === "BLOCKED"
          ? !balanceSufficient
            ? `Cannot proceed — insufficient balance. Need ${totalRequired.toFixed(6)} ${config.nativeToken} but have ${senderBalance.toFixed(6)}.`
            : `Recipient is flagged as UNTRUSTED. Abort payment and verify recipient identity before proceeding.`
          : paymentRisk === "HIGH"
          ? "High risk factors detected. Double-check recipient address and network conditions before executing."
          : paymentRisk === "MEDIUM"
          ? "Moderate risk — proceed with caution. Verify recipient address matches intended destination."
          : `Payment looks safe. Estimated gas: ${gasCostNative.toFixed(8)} ${config.nativeToken}. ${networkOptimal ? "Network conditions are optimal." : "Consider timing for better gas."}`;

      return {
        success: true,
        data: {
          from,
          to,
          amountNative,
          nativeToken: config.nativeToken,
          network: config.name,
          paymentRisk,
          recommended,
          senderBalance: `${senderBalance.toFixed(6)} ${config.nativeToken}`,
          balanceSufficient,
          estimatedGasCost: `${gasCostNative.toFixed(8)} ${config.nativeToken}`,
          recipientTrust: trust,
          networkOptimal,
          checks,
          advice,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};
