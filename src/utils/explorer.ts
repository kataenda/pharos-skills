export interface ExplorerTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: string;
  timeStamp: string;
  gasUsed: string;
  isError: string;
  input: string;
}

export interface ExplorerTokenTransfer {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

async function explorerRequest(
  apiUrl: string,
  params: Record<string, string>
): Promise<unknown> {
  const url = new URL(apiUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Explorer API ${res.status}`);
  const json = (await res.json()) as { status: string; message: string; result: unknown };

  if (json.status === "0" && json.message?.includes("No transactions")) return [];
  if (json.status === "0") throw new Error(String(json.result) || json.message);
  return json.result;
}

/**
 * Result wrapper that distinguishes a genuine fetch failure from a legitimate
 * empty result. `ok: false` means the explorer could not be reached / returned
 * an error — callers should treat the (empty) data as unknown, not as "0 txs".
 */
export interface ExplorerResult<T> {
  ok: boolean;
  data: T[];
}

export async function getTransactionListResult(
  explorerApi: string,
  address: string,
  limit = 100
): Promise<ExplorerResult<ExplorerTransaction>> {
  try {
    const result = await explorerRequest(explorerApi, {
      module: "account",
      action: "txlist",
      address,
      startblock: "0",
      endblock: "99999999",
      page: "1",
      offset: String(limit),
      sort: "desc",
    });
    return { ok: true, data: Array.isArray(result) ? (result as ExplorerTransaction[]) : [] };
  } catch {
    return { ok: false, data: [] };
  }
}

export async function getTokenTransfersResult(
  explorerApi: string,
  address: string,
  limit = 100
): Promise<ExplorerResult<ExplorerTokenTransfer>> {
  try {
    const result = await explorerRequest(explorerApi, {
      module: "account",
      action: "tokentx",
      address,
      page: "1",
      offset: String(limit),
      sort: "desc",
    });
    return { ok: true, data: Array.isArray(result) ? (result as ExplorerTokenTransfer[]) : [] };
  } catch {
    return { ok: false, data: [] };
  }
}

/** Backward-compatible wrapper returning just the array (empty on failure). */
export async function getTransactionList(
  explorerApi: string,
  address: string,
  limit = 100
): Promise<ExplorerTransaction[]> {
  return (await getTransactionListResult(explorerApi, address, limit)).data;
}

/** Backward-compatible wrapper returning just the array (empty on failure). */
export async function getTokenTransfers(
  explorerApi: string,
  address: string,
  limit = 100
): Promise<ExplorerTokenTransfer[]> {
  return (await getTokenTransfersResult(explorerApi, address, limit)).data;
}

export async function getContractSource(
  explorerApi: string,
  address: string
): Promise<{ isVerified: boolean; sourceCode: string; contractName: string }> {
  try {
    const result = await explorerRequest(explorerApi, {
      module: "contract",
      action: "getsourcecode",
      address,
    });
    const info = (Array.isArray(result) ? result[0] : result) as Record<string, string>;
    return {
      isVerified: !!info?.SourceCode && info.SourceCode !== "",
      sourceCode: info?.SourceCode ?? "",
      contractName: info?.ContractName ?? "",
    };
  } catch {
    return { isVerified: false, sourceCode: "", contractName: "" };
  }
}
