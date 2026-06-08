export { walletPersonalityAnalyzer } from "./skills/walletPersonalityAnalyzer.js";
export { onChainCreditScore } from "./skills/onChainCreditScore.js";
export { smartContractRiskAuditor } from "./skills/smartContractRiskAuditor.js";
export { whaleTracking } from "./skills/whaleTracking.js";
export { crossChainPortfolioAnalyzer } from "./skills/crossChainPortfolioAnalyzer.js";
export { walletReputationOracle } from "./skills/walletReputationOracle.js";
export { rugPullDetector } from "./skills/rugPullDetector.js";
export { aiPortfolioRebalancer } from "./skills/aiPortfolioRebalancer.js";
export { pharosNetworkIntelligence } from "./skills/pharosNetworkIntelligence.js";
export { agentDecisionEngine } from "./skills/agentDecisionEngine.js";
export { agentTaskPlanner } from "./skills/agentTaskPlanner.js";
export { onChainPaymentAdvisor } from "./skills/onChainPaymentAdvisor.js";
export { socialGraphAnalyzer } from "./skills/socialGraphAnalyzer.js";

export type { Skill, SkillResult, SkillParameters } from "./types/skill.js";
export { NETWORKS } from "./config/networks.js";

import { walletPersonalityAnalyzer } from "./skills/walletPersonalityAnalyzer.js";
import { onChainCreditScore } from "./skills/onChainCreditScore.js";
import { smartContractRiskAuditor } from "./skills/smartContractRiskAuditor.js";
import { whaleTracking } from "./skills/whaleTracking.js";
import { crossChainPortfolioAnalyzer } from "./skills/crossChainPortfolioAnalyzer.js";
import { walletReputationOracle } from "./skills/walletReputationOracle.js";
import { rugPullDetector } from "./skills/rugPullDetector.js";
import { aiPortfolioRebalancer } from "./skills/aiPortfolioRebalancer.js";
import { pharosNetworkIntelligence } from "./skills/pharosNetworkIntelligence.js";
import { agentDecisionEngine } from "./skills/agentDecisionEngine.js";
import { agentTaskPlanner } from "./skills/agentTaskPlanner.js";
import { onChainPaymentAdvisor } from "./skills/onChainPaymentAdvisor.js";
import { socialGraphAnalyzer } from "./skills/socialGraphAnalyzer.js";

export const ALL_SKILLS = [
  walletPersonalityAnalyzer,
  onChainCreditScore,
  smartContractRiskAuditor,
  whaleTracking,
  crossChainPortfolioAnalyzer,
  walletReputationOracle,
  rugPullDetector,
  aiPortfolioRebalancer,
  pharosNetworkIntelligence,
  agentDecisionEngine,
  agentTaskPlanner,
  onChainPaymentAdvisor,
  socialGraphAnalyzer,
] as const;

/** Returns skill definitions in OpenAI function-calling format for AI agent integration */
export function getSkillDefinitions() {
  return ALL_SKILLS.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
}
