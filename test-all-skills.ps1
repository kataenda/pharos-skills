param(
    [string]$BaseUrl     = "http://localhost:3000",
    [string]$Wallet      = "0xbac32ad5dd90b9ef4136529dff4d8a2780ace1f9",
    [string]$Network     = "pharos_testnet",
    [string]$Contract    = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    [string]$ContractNet = "ethereum"
)

$pass = 0
$fail = 0

function Invoke-Skill([string]$Label, [string]$Url, [string]$Body) {
    $start = Get-Date
    $elapsed = 0
    $ok = $false
    $detail = ""
    $result = $null

    $response = Invoke-WebRequest -Uri $Url -Method POST -ContentType "application/json" -Body $Body -UseBasicParsing -TimeoutSec 30 -ErrorAction SilentlyContinue
    $elapsed = [int]((Get-Date) - $start).TotalMilliseconds

    if ($response -and $response.StatusCode -eq 200) {
        $json = $response.Content | ConvertFrom-Json
        if ($json.success -eq $true) {
            $ok = $true
            $result = $json.data
        } else {
            $detail = $json.error
        }
    } else {
        $detail = "HTTP $($response.StatusCode)"
    }

    if ($ok) {
        Write-Host ("  [PASS] {0,-35} {1}ms" -f $Label, $elapsed) -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host ("  [FAIL] {0,-35} {1}" -f $Label, $detail) -ForegroundColor Red
        $script:fail++
    }

    return $result
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Pharos Skills API -- Test All 13 Skills" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  URL     : $BaseUrl"
Write-Host "  Wallet  : $Wallet"
Write-Host "  Network : $Network"
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Health check
Write-Host "[0] Health Check" -ForegroundColor Yellow
$health = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -ErrorAction SilentlyContinue
if (-not $health -or $health.StatusCode -ne 200) {
    Write-Host "  [ERR ] Server not reachable at $BaseUrl" -ForegroundColor Red
    Write-Host "         Run: node dist/api/server.js" -ForegroundColor DarkGray
    exit 1
}
$h = $health.Content | ConvertFrom-Json
Write-Host ("  [PASS] Server online -- {0} skills registered" -f $h.skills.Count) -ForegroundColor Green
Write-Host ""

# 1
Write-Host "[1]  Wallet Personality Analyzer" -ForegroundColor Yellow
$d = Invoke-Skill "walletPersonalityAnalyzer" "$BaseUrl/api/wallet-personality" "{`"address`":`"$Wallet`",`"network`":`"$Network`"}"
if ($d) { Write-Host "       Personality : $($d.personality)" -ForegroundColor DarkGray }

# 2
Write-Host "[2]  On-Chain Credit Score" -ForegroundColor Yellow
$d = Invoke-Skill "onChainCreditScore" "$BaseUrl/api/credit-score" "{`"address`":`"$Wallet`",`"network`":`"$Network`"}"
if ($d) { Write-Host "       Score : $($d.score)/1000  Grade : $($d.grade)" -ForegroundColor DarkGray }

# 3
Write-Host "[3]  Smart Contract Risk Auditor" -ForegroundColor Yellow
$d = Invoke-Skill "smartContractRiskAuditor" "$BaseUrl/api/risk-audit" "{`"contractAddress`":`"$Contract`",`"network`":`"$ContractNet`"}"
if ($d) { Write-Host "       Risk : $($d.riskLevel)  Score : $($d.riskScore)" -ForegroundColor DarkGray }

# 4
Write-Host "[4]  Whale Tracking" -ForegroundColor Yellow
$d = Invoke-Skill "whaleTracking" "$BaseUrl/api/whale-tracker" "{`"thresholdNative`":100,`"blockRange`":10,`"network`":`"$Network`"}"
if ($d) { Write-Host "       Whales found : $($d.whaleTransactions.Count)" -ForegroundColor DarkGray }

# 5
Write-Host "[5]  Cross-Chain Portfolio Analyzer" -ForegroundColor Yellow
$d = Invoke-Skill "crossChainPortfolioAnalyzer" "$BaseUrl/api/portfolio" "{`"address`":`"$Wallet`",`"chains`":[`"$Network`"]}"
if ($d) { Write-Host "       Chains : $($d.chains.Count)  Total USD : `$$($d.totalValueUsd)" -ForegroundColor DarkGray }

# 6
Write-Host "[6]  Wallet Reputation Oracle" -ForegroundColor Yellow
$d = Invoke-Skill "walletReputationOracle" "$BaseUrl/api/wallet-reputation" "{`"address`":`"$Wallet`",`"network`":`"$Network`"}"
if ($d) { Write-Host "       Score : $($d.reputationScore)/100  Trust : $($d.trustLevel)" -ForegroundColor DarkGray }

# 7
Write-Host "[7]  Rug Pull Detector" -ForegroundColor Yellow
$d = Invoke-Skill "rugPullDetector" "$BaseUrl/api/rug-pull" "{`"contractAddress`":`"$Contract`",`"network`":`"$ContractNet`"}"
if ($d) { Write-Host "       Rug Risk : $($d.rugRisk)  Signals : $($d.signals.Count)" -ForegroundColor DarkGray }

# 8
Write-Host "[8]  AI Portfolio Rebalancer" -ForegroundColor Yellow
$d = Invoke-Skill "aiPortfolioRebalancer" "$BaseUrl/api/rebalance" "{`"address`":`"$Wallet`",`"riskProfile`":`"moderate`",`"chains`":[`"$Network`"]}"
if ($d) { Write-Host "       Actions : $($d.actions.Count)  Profile : $($d.riskProfile)" -ForegroundColor DarkGray }

# 9
Write-Host "[9]  Pharos Network Intelligence" -ForegroundColor Yellow
$d = Invoke-Skill "pharosNetworkIntelligence" "$BaseUrl/api/network-stats" "{`"network`":`"$Network`",`"blockSample`":5}"
if ($d) { Write-Host "       Block : #$($d.latestBlock)  Load : $($d.networkLoad)  Optimal : $($d.optimalGasWindow)" -ForegroundColor DarkGray }

# 10
Write-Host "[10] On-Chain Payment Advisor" -ForegroundColor Yellow
$d = Invoke-Skill "onChainPaymentAdvisor" "$BaseUrl/api/payment-advice" "{`"from`":`"$Wallet`",`"to`":`"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`",`"amountNative`":0.001,`"network`":`"$Network`"}"
if ($d) { Write-Host "       Payment Risk : $($d.paymentRisk)  Recommended : $($d.recommended)" -ForegroundColor DarkGray }

# 11
Write-Host "[11] Social Graph Analyzer" -ForegroundColor Yellow
$d = Invoke-Skill "socialGraphAnalyzer" "$BaseUrl/api/social-graph" "{`"address`":`"$Wallet`",`"network`":`"$Network`"}"
if ($d) { Write-Host "       Social Score : $($d.socialScore)/100  Level : $($d.communityLevel)" -ForegroundColor DarkGray }

# 12
Write-Host "[12] Agent Decision Engine" -ForegroundColor Yellow
$d = Invoke-Skill "agentDecisionEngine" "$BaseUrl/agent/decide" "{`"wallet`":`"$Wallet`",`"network`":`"$Network`"}"
if ($d) { Write-Host "       Action : $($d.action)  Confidence : $($d.confidence)%  Network : $($d.networkCondition)" -ForegroundColor DarkGray }

# 13
Write-Host "[13] Agent Task Planner" -ForegroundColor Yellow
$d = Invoke-Skill "agentTaskPlanner" "$BaseUrl/agent/plan" "{`"goal`":`"Analyze wallet and make investment decision`",`"context`":{`"wallet`":`"$Wallet`",`"network`":`"$Network`"}}"
if ($d) { Write-Host "       Intent : $($d.intent)  Steps : $($d.steps.Count)" -ForegroundColor DarkGray }

# Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ("  PASS : {0} / 13" -f $pass) -ForegroundColor Green
if ($fail -gt 0) {
    Write-Host ("  FAIL : {0} / 13" -f $fail) -ForegroundColor Red
}
Write-Host "================================================================" -ForegroundColor Cyan
if ($pass -eq 13) {
    Write-Host "  All 13 skills working." -ForegroundColor Green
} else {
    Write-Host "  $fail skill(s) failed." -ForegroundColor Yellow
}
Write-Host ""
