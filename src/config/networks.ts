export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerApi: string;
  nativeToken: string;
  nativeTokenDecimals: number;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  pharos_testnet: {
    name: "Pharos Atlantic Testnet",
    chainId: 688689,
    rpcUrl: "https://atlantic.dplabs-internal.com",
    explorerApi: "https://atlantic.pharosscan.xyz/api",
    nativeToken: "PHRS",
    nativeTokenDecimals: 18,
  },
  pharos_mainnet: {
    name: "Pharos Pacific Mainnet",
    chainId: 1672,
    rpcUrl: "https://rpc.pharos.xyz",
    explorerApi: "https://pharosscan.xyz/api",
    nativeToken: "PROS",
    nativeTokenDecimals: 18,
  },
  ethereum: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://eth.drpc.org",
    explorerApi: "https://api.etherscan.io/api",
    nativeToken: "ETH",
    nativeTokenDecimals: 18,
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpcUrl: "https://polygon.drpc.org",
    explorerApi: "https://api.polygonscan.com/api",
    nativeToken: "MATIC",
    nativeTokenDecimals: 18,
  },
  bsc: {
    name: "BNB Smart Chain",
    chainId: 56,
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerApi: "https://api.bscscan.com/api",
    nativeToken: "BNB",
    nativeTokenDecimals: 18,
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerApi: "https://api.arbiscan.io/api",
    nativeToken: "ETH",
    nativeTokenDecimals: 18,
  },
};
