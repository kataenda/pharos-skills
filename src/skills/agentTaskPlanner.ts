import { Skill, SkillResult } from "../types/skill.js";

export interface TaskPlannerParams {
  goal: string;
  context?: {
    wallet?: string;
    network?: string;
    riskProfile?: string;
  };
}

export interface PlannedStep {
  order: number;
  action: string;
  skill: string;
  description: string;
  inputHint: string;
}

export interface TaskPlannerResult {
  goal: string;
  intent: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  estimatedDuration: string;
  steps: PlannedStep[];
  skillSequence: string[];
  summary: string;
}

interface GoalTemplate {
  keywords: string[];
  intent: string;
  priority: TaskPlannerResult["priority"];
  estimatedDuration: string;
  steps: Omit<PlannedStep, "order">[];
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    keywords: ["yield", "earn", "income", "profit", "apy", "return", "generate"],
    intent: "Maximize portfolio yield",
    priority: "HIGH",
    estimatedDuration: "3–5 minutes",
    steps: [
      { action: "Analyze current portfolio", skill: "crossChainPortfolioAnalyzer", description: "Fetch all token holdings and USD values across chains", inputHint: '{"address":"<wallet>","chains":["pharos_testnet","ethereum"]}' },
      { action: "Check wallet reputation", skill: "walletReputationOracle", description: "Ensure the wallet has sufficient on-chain history to act", inputHint: '{"address":"<wallet>","network":"pharos_testnet"}' },
      { action: "Assess rebalancing needs", skill: "aiPortfolioRebalancer", description: "Generate HOLD/INCREASE/REDUCE actions for yield optimization", inputHint: '{"address":"<wallet>","riskProfile":"aggressive"}' },
      { action: "Check network timing", skill: "pharosNetworkIntelligence", description: "Verify Pharos network load before executing rebalance", inputHint: '{"network":"pharos_testnet","blockSample":10}' },
      { action: "Execute when optimal", skill: "agentDecisionEngine", description: "Final confirmation: BUY/HOLD decision with confidence score", inputHint: '{"wallet":"<wallet>","network":"pharos_testnet"}' },
    ],
  },
  {
    keywords: ["rebalance", "rebalancing", "allocate", "allocation", "diversify"],
    intent: "Rebalance portfolio allocation",
    priority: "MEDIUM",
    estimatedDuration: "2–3 minutes",
    steps: [
      { action: "Map current holdings", skill: "crossChainPortfolioAnalyzer", description: "Get current token distribution across all chains", inputHint: '{"address":"<wallet>"}' },
      { action: "Generate rebalancing plan", skill: "aiPortfolioRebalancer", description: "Calculate target vs current allocation and produce action list", inputHint: '{"address":"<wallet>","riskProfile":"moderate"}' },
      { action: "Check execution window", skill: "pharosNetworkIntelligence", description: "Confirm network is not congested before executing swaps", inputHint: '{"network":"pharos_testnet"}' },
    ],
  },
  {
    keywords: ["risk", "safe", "danger", "secure", "protect", "loss", "audit"],
    intent: "Assess and mitigate risk",
    priority: "HIGH",
    estimatedDuration: "2–4 minutes",
    steps: [
      { action: "Score wallet trustworthiness", skill: "walletReputationOracle", description: "Evaluate wallet's on-chain reputation and red flags", inputHint: '{"address":"<wallet>","network":"pharos_testnet"}' },
      { action: "Calculate credit standing", skill: "onChainCreditScore", description: "Multi-dimensional credit score to gauge financial reliability", inputHint: '{"address":"<wallet>","network":"pharos_testnet"}' },
      { action: "Scan for rug pull signals", skill: "rugPullDetector", description: "Check interacted token contracts for scam indicators", inputHint: '{"contractAddress":"<token_contract>","network":"ethereum"}' },
      { action: "Audit smart contracts", skill: "smartContractRiskAuditor", description: "Deep security audit of contracts the wallet uses", inputHint: '{"contractAddress":"<contract>","network":"ethereum"}' },
    ],
  },
  {
    keywords: ["whale", "track", "monitor", "watch", "large", "big", "accumulate", "accumulation"],
    intent: "Track whale activity and accumulation patterns",
    priority: "HIGH",
    estimatedDuration: "1–2 minutes",
    steps: [
      { action: "Detect whale movements", skill: "whaleTracking", description: "Scan recent blocks for large native token transfers", inputHint: '{"thresholdNative":100,"blockRange":20,"network":"pharos_testnet"}' },
      { action: "Profile whale wallet", skill: "walletPersonalityAnalyzer", description: "Determine behavioral archetype of detected whale", inputHint: '{"address":"<whale_address>","network":"pharos_testnet"}' },
      { action: "Oracle reputation check", skill: "walletReputationOracle", description: "Score the whale's trustworthiness before following their moves", inputHint: '{"address":"<whale_address>"}' },
      { action: "Make follow decision", skill: "agentDecisionEngine", description: "BUY/HOLD/AVOID based on aggregated whale intelligence", inputHint: '{"wallet":"<whale_address>","network":"pharos_testnet"}' },
    ],
  },
  {
    keywords: ["buy", "invest", "purchase", "opportunity", "entry", "enter"],
    intent: "Identify optimal buy opportunity",
    priority: "HIGH",
    estimatedDuration: "2–3 minutes",
    steps: [
      { action: "Check network conditions", skill: "pharosNetworkIntelligence", description: "Confirm Pharos is in an optimal transaction window", inputHint: '{"network":"pharos_testnet","blockSample":10}' },
      { action: "Evaluate wallet credit", skill: "onChainCreditScore", description: "Assess target wallet's financial credibility", inputHint: '{"address":"<wallet>","network":"pharos_testnet"}' },
      { action: "Scan for whale accumulation", skill: "whaleTracking", description: "Detect if smart money is accumulating", inputHint: '{"thresholdNative":50,"blockRange":30,"network":"pharos_testnet"}' },
      { action: "Run decision engine", skill: "agentDecisionEngine", description: "Aggregate all signals into final BUY/HOLD/MONITOR decision", inputHint: '{"wallet":"<wallet>","network":"pharos_testnet"}' },
    ],
  },
  {
    keywords: ["sell", "exit", "liquidate", "reduce", "withdraw"],
    intent: "Evaluate exit / sell opportunity",
    priority: "HIGH",
    estimatedDuration: "2–3 minutes",
    steps: [
      { action: "Analyze portfolio value", skill: "crossChainPortfolioAnalyzer", description: "Get current USD valuation across all holdings", inputHint: '{"address":"<wallet>"}' },
      { action: "Check rug pull risk", skill: "rugPullDetector", description: "Verify held token contracts before exiting to avoid losses", inputHint: '{"contractAddress":"<token>","network":"ethereum"}' },
      { action: "Network timing check", skill: "pharosNetworkIntelligence", description: "Find low-gas window on Pharos for optimal exit", inputHint: '{"network":"pharos_testnet"}' },
      { action: "Final sell decision", skill: "agentDecisionEngine", description: "Confirm SELL signal with confidence score", inputHint: '{"wallet":"<wallet>","network":"pharos_testnet"}' },
    ],
  },
  {
    keywords: ["reputation", "trust", "reliable", "verify", "identity", "profile"],
    intent: "Build a complete wallet reputation profile",
    priority: "MEDIUM",
    estimatedDuration: "1–2 minutes",
    steps: [
      { action: "Reputation oracle check", skill: "walletReputationOracle", description: "Score trust level: UNTRUSTED to EXCELLENT", inputHint: '{"address":"<wallet>","network":"pharos_testnet"}' },
      { action: "Credit score analysis", skill: "onChainCreditScore", description: "Financial reliability score (0–1000, D to AAA)", inputHint: '{"address":"<wallet>"}' },
      { action: "Personality profiling", skill: "walletPersonalityAnalyzer", description: "Behavioral archetype: DeFi Degen, Whale, HODLer, etc.", inputHint: '{"address":"<wallet>"}' },
    ],
  },
  {
    keywords: ["contract", "token", "deploy", "smart", "scam", "rug", "safe"],
    intent: "Full due diligence on a smart contract / token",
    priority: "HIGH",
    estimatedDuration: "2–4 minutes",
    steps: [
      { action: "Rug pull scan", skill: "rugPullDetector", description: "Check for mint, blacklist, fees, selfdestruct, holder concentration", inputHint: '{"contractAddress":"<contract>","network":"ethereum"}' },
      { action: "Security audit", skill: "smartContractRiskAuditor", description: "Bytecode + source analysis for CRITICAL/HIGH/MEDIUM/LOW risk", inputHint: '{"contractAddress":"<contract>","network":"ethereum"}' },
      { action: "Audit deployer wallet", skill: "walletReputationOracle", description: "Check reputation of whoever deployed this contract", inputHint: '{"address":"<deployer>","network":"ethereum"}' },
    ],
  },
];

function matchTemplate(goal: string): GoalTemplate {
  const lower = goal.toLowerCase();
  let bestMatch: GoalTemplate | null = null;
  let bestScore = 0;

  for (const template of GOAL_TEMPLATES) {
    const score = template.keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  // Default fallback: comprehensive analysis
  if (!bestMatch) {
    return {
      keywords: [],
      intent: "Comprehensive wallet intelligence",
      priority: "MEDIUM",
      estimatedDuration: "3–5 minutes",
      steps: [
        { action: "Reputation check", skill: "walletReputationOracle", description: "Trust level assessment", inputHint: '{"address":"<wallet>","network":"pharos_testnet"}' },
        { action: "Credit score", skill: "onChainCreditScore", description: "Financial reliability score", inputHint: '{"address":"<wallet>"}' },
        { action: "Portfolio snapshot", skill: "crossChainPortfolioAnalyzer", description: "Multi-chain holdings and USD value", inputHint: '{"address":"<wallet>"}' },
        { action: "Network conditions", skill: "pharosNetworkIntelligence", description: "Pharos chain health check", inputHint: '{"network":"pharos_testnet"}' },
        { action: "Decision", skill: "agentDecisionEngine", description: "Aggregate into final action recommendation", inputHint: '{"wallet":"<wallet>","network":"pharos_testnet"}' },
      ],
    };
  }

  return bestMatch;
}

export const agentTaskPlanner: Skill<TaskPlannerParams, TaskPlannerResult> = {
  name: "agentTaskPlanner",
  description:
    "Translates a high-level agent goal (natural language) into an ordered sequence of Pharos Skills to execute. Input a goal like 'Increase portfolio yield', 'Track whale accumulation', or 'Audit this contract' — the planner returns the exact skill sequence, execution hints, and estimated duration. The orchestration layer that connects intent to action.",
  parameters: {
    type: "object",
    properties: {
      goal: {
        type: "string",
        description: "High-level goal in natural language, e.g. 'Increase portfolio yield', 'Track whale activity', 'Assess wallet risk', 'Find buy opportunity'",
      },
      context: {
        type: "object",
        description: "Optional context: wallet address, network, riskProfile",
      },
    },
    required: ["goal"],
  },

  async execute({ goal, context }: TaskPlannerParams): Promise<SkillResult<TaskPlannerResult>> {
    try {
      if (!goal || goal.trim().length === 0) {
        return { success: false, error: "goal is required" };
      }

      const template = matchTemplate(goal);

      const steps: PlannedStep[] = template.steps.map((s, i) => {
        let hint = s.inputHint;
        if (context?.wallet)      hint = hint.replace(/<wallet>/g, context.wallet).replace(/<whale_address>/g, context.wallet).replace(/<deployer>/g, context.wallet);
        if (context?.network)     hint = hint.replace(/"pharos_testnet"/g, `"${context.network}"`);
        if (context?.riskProfile) hint = hint.replace(/"moderate"/g, `"${context.riskProfile}"`);
        return { order: i + 1, ...s, inputHint: hint };
      });

      const skillSequence = steps.map(s => s.skill);

      const summary =
        `To achieve "${goal}", execute ${steps.length} skills in sequence: ` +
        skillSequence.join(" → ") +
        `. Estimated completion: ${template.estimatedDuration}.`;

      return {
        success: true,
        data: {
          goal,
          intent: template.intent,
          priority: template.priority,
          estimatedDuration: template.estimatedDuration,
          steps,
          skillSequence,
          summary,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};
