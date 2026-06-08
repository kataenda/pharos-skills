import { ethers } from "ethers";
import { NETWORKS, type NetworkConfig } from "../config/networks.js";

export { NETWORKS };
export type { NetworkConfig };

const providerCache = new Map<string, ethers.JsonRpcProvider>();

export function getProvider(network = "pharos_testnet"): ethers.JsonRpcProvider {
  if (!NETWORKS[network]) throw new Error(`Unknown network: ${network}`);
  if (providerCache.has(network)) return providerCache.get(network)!;
  const provider = new ethers.JsonRpcProvider(
    NETWORKS[network].rpcUrl,
    NETWORKS[network].chainId,
    { batchMaxCount: 1, staticNetwork: true }
  );
  providerCache.set(network, provider);
  return provider;
}

export function getNetworkConfig(network = "pharos_testnet"): NetworkConfig {
  if (!NETWORKS[network]) throw new Error(`Unknown network: ${network}`);
  return NETWORKS[network];
}
