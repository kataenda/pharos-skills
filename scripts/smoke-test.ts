/**
 * Smoke Test — runs each Skill against live Pharos Testnet & Ethereum.
 * Usage: npx tsx scripts/smoke-test.ts [walletAddress]
 *
 * If no address provided, uses the default test address.
 */

import {
  walletPersonalityAnalyzer,
  onChainCreditScore,
  smartContractRiskAuditor,
  whaleTracking,
  crossChainPortfolioAnalyzer,
} from "../src/index.js";

const TEST_WALLET =
  process.argv[2] ?? "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // Vitalik

const TEST_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on Ethereum

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function pass(msg: string) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}
function fail(msg: string) {
  console.log(`  ${RED}✗${RESET} ${msg}`);
}
function info(msg: string) {
  console.log(`  ${YELLOW}→${RESET} ${msg}`);
}
function header(msg: string) {
  console.log(`\n${BOLD}${CYAN}━━ ${msg} ━━${RESET}`);
}

async function runTest(
  name: string,
  fn: () => Promise<{ success: boolean; data?: unknown; error?: string }>
): Promise<boolean> {
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = Date.now() - start;
    if (result.success) {
      pass(`${name} (${elapsed}ms)`);
      return true;
    } else {
      fail(`${name}: ${result.error}`);
      return false;
    }
  } catch (e) {
    fail(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

async function main() {
  console.log(`\n${BOLD}Pharos Skills — Smoke Test${RESET}`);
  console.log(`Wallet: ${TEST_WALLET}`);
  console.log(`Contract: ${TEST_CONTRACT}`);

  let passed = 0;
  let failed = 0;

  // ── Skill 1: Wallet Personality Analyzer ────────────────────────────────
  header("Skill 1 · Wallet Personality Analyzer");

  // expect success:false for invalid address
  const r1Invalid = await walletPersonalityAnalyzer.execute({ address: "0xinvalid" });
  if (!r1Invalid.success && r1Invalid.error?.toLowerCase().includes("invalid")) {
    passed++;
    pass("Invalid address correctly rejected");
  } else {
    failed++;
    fail("Should have rejected invalid address");
  }

  // Ethereum network (more reliable data than testnet)
  const r1 = await walletPersonalityAnalyzer.execute({
    address: TEST_WALLET,
    network: "ethereum",
  });
  if (r1.success) {
    passed++;
    pass(`analyze ${TEST_WALLET.slice(0, 10)}…`);
    const d = r1.data!;
    info(`Personality: ${d.emoji} ${d.personality}`);
    info(`Stats: ${d.stats.txCount} txs | ${d.stats.nativeBalance} | ${d.stats.walletAge} old`);
    info(`Traits: ${d.traits.map((t) => t.label).join(", ")}`);
  } else {
    failed++;
    fail(`Ethereum: ${r1.error}`);
  }

  // ── Skill 2: On-Chain Credit Score ──────────────────────────────────────
  header("Skill 2 · On-Chain Credit Score");

  const r2 = await onChainCreditScore.execute({
    address: TEST_WALLET,
    network: "ethereum",
  });
  if (r2.success) {
    passed++;
    pass(`score ${TEST_WALLET.slice(0, 10)}…`);
    const d = r2.data!;
    info(`Score: ${d.score}/1000 (${d.grade})`);
    info(`Summary: ${d.summary}`);
    const b = d.breakdown;
    info(
      `Components: age=${b.walletAge.score} activity=${b.activityLevel.score} balance=${b.balanceStability.score} defi=${b.defiParticipation.score}`
    );
  } else {
    failed++;
    fail(`Ethereum: ${r2.error}`);
  }

  // ── Skill 3: Smart Contract Risk Auditor ────────────────────────────────
  header("Skill 3 · Smart Contract Risk Auditor");

  const r3 = await smartContractRiskAuditor.execute({
    contractAddress: TEST_CONTRACT,
    network: "ethereum",
  });
  if (r3.success) {
    passed++;
    pass(`audit ${TEST_CONTRACT.slice(0, 10)}… (${r3.data!.contractName})`);
    const d = r3.data!;
    info(`Risk Level: ${d.riskLevel} (score: ${d.riskScore})`);
    info(`Verified: ${d.isVerified}`);
    info(`Findings: ${d.findings.length} (${d.findings.map((f) => f.severity).join(", ")})`);
  } else {
    failed++;
    fail(`Ethereum: ${r3.error}`);
  }

  const r3b = await smartContractRiskAuditor.execute({
    contractAddress: TEST_WALLET,
    network: "ethereum",
  });
  if (!r3b.success && r3b.error?.toLowerCase().includes("not a deployed")) {
    passed++;
    pass("EOA address correctly rejected");
  } else {
    failed++;
    fail(`Should have rejected EOA address (got: ${r3b.error ?? "success"})`);
  }

  // ── Skill 4: Whale Tracking ──────────────────────────────────────────────
  header("Skill 4 · Whale Tracking");

  const r4 = await whaleTracking.execute({
    thresholdNative: 100,
    blockRange: 5,
    network: "ethereum",
  });
  if (r4.success) {
    passed++;
    pass(`scan last 5 Ethereum blocks (threshold: 100 ETH)`);
    const d = r4.data!;
    info(`Blocks scanned: ${d.blocksScanned} | Latest: #${d.latestBlock}`);
    info(`Whale txs found: ${d.whaleTransactions.length}`);
    info(`Total volume: ${d.totalVolume.toFixed(2)} ETH`);
    if (d.topWhales.length > 0) {
      info(`Top whale: ${d.topWhales[0].address.slice(0, 10)}… (${d.topWhales[0].totalSent.toFixed(2)} ETH)`);
    }
  } else {
    failed++;
    fail(`Ethereum: ${r4.error}`);
  }

  // ── Skill 5: Cross-Chain Portfolio Analyzer ─────────────────────────────
  header("Skill 5 · Cross-Chain Portfolio Analyzer");

  const r5 = await crossChainPortfolioAnalyzer.execute({
    address: TEST_WALLET,
    chains: ["ethereum", "polygon"],
  });
  if (r5.success) {
    passed++;
    pass(`portfolio ${TEST_WALLET.slice(0, 10)}… (ethereum + polygon)`);
    const d = r5.data!;
    info(`Chains analyzed: ${d.chains.length}`);
    for (const chain of d.chains) {
      info(
        `  ${chain.chain}: ${chain.nativeBalance}${chain.nativeValueUsd ? ` ($${chain.nativeValueUsd.toFixed(2)})` : ""} | ${chain.tokens.length} tokens`
      );
    }
    if (d.totalValueUsd) {
      info(`Total USD value: $${d.totalValueUsd.toFixed(2)}`);
    }
    info(`Dominant chain: ${d.dominantChain}`);
  } else {
    failed++;
    fail(`Multi-chain: ${r5.error}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}━━ Results ━━${RESET}`);
  console.log(`${GREEN}Passed: ${passed}${RESET} | ${RED}Failed: ${failed}${RESET}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Smoke test crashed:", e);
  process.exit(1);
});
