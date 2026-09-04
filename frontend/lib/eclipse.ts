"use client";

import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import { CONTRACTS, CUSDT_ABI, DRAW_ABI, DRAW_ID, PUBLIC_SEPOLIA_RPC, SEPOLIA_CHAIN_HEX, TOKEN_DECIMALS, USDT_ABI, VAULT_ABI } from "./contracts";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
  providers?: EthereumProvider[];
  isMetaMask?: boolean;
};
type Eip6963Detail = { info: { rdns?: string; name?: string }; provider: EthereumProvider };
type HexHandle = `0x${string}`;
type RelayerSdk = typeof import("@zama-fhe/relayer-sdk/bundle");
type FheInstance = Awaited<ReturnType<RelayerSdk["createInstance"]>>;

declare global { interface Window { ethereum?: EthereumProvider } }

let fhePromise: Promise<FheInstance> | undefined;
let preferredProvider: EthereumProvider | undefined;

function injectedFallback() {
  if (typeof window === "undefined" || !window.ethereum) throw new Error("Install a browser wallet such as MetaMask to continue.");
  const injected = window.ethereum;
  if (Array.isArray(injected.providers) && injected.providers.length) {
    return injected.providers.find((provider) => provider.isMetaMask) ?? injected.providers[0];
  }
  return injected;
}

export async function discoverWalletProvider() {
  if (preferredProvider) return preferredProvider;
  if (typeof window === "undefined") throw new Error("No browser wallet available.");

  const discovered: Eip6963Detail[] = [];
  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963Detail>).detail;
    if (detail?.provider) discovered.push(detail);
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((resolve) => setTimeout(resolve, 150));
  window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);

  const metamask = discovered.find((entry) => entry.info?.rdns === "io.metamask")
    ?? discovered.find((entry) => /metamask/i.test(entry.info?.name ?? ""));
  preferredProvider = metamask?.provider ?? discovered[0]?.provider ?? injectedFallback();
  return preferredProvider;
}

export function ethereum() {
  return preferredProvider ?? injectedFallback();
}

export async function connectWallet() {
  const provider = await discoverWalletProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
  if (!Array.isArray(accounts) || !accounts[0]) throw new Error("Wallet returned no account.");
  return accounts[0];
}

export async function browserProvider() { return new BrowserProvider(await discoverWalletProvider() as never); }
export async function signer() { return (await browserProvider()).getSigner(); }
export async function account() { return (await signer()).getAddress(); }

export async function switchToSepolia() {
  const provider = await discoverWalletProvider();
  try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_HEX }] }); }
  catch (error: unknown) {
    const code = typeof error === "object" && error && "code" in error ? (error as { code?: number }).code : undefined;
    if (code !== 4902) throw error;
    await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_HEX, chainName: "Ethereum Sepolia", nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 }, rpcUrls: [PUBLIC_SEPOLIA_RPC], blockExplorerUrls: ["https://sepolia.etherscan.io"] }] });
  }
}

export async function fhe() {
  if (!fhePromise) {
    fhePromise = (async () => {
      const sdk = await import("@zama-fhe/relayer-sdk/bundle");
      await sdk.initSDK();
      return sdk.createInstance({ ...sdk.SepoliaConfig, network: PUBLIC_SEPOLIA_RPC });
    })();
  }
  return fhePromise;
}

export async function encrypt64(contractAddress: string, userAddress: string, value: bigint) {
  const instance = await fhe();
  return instance.createEncryptedInput(contractAddress, userAddress).add64(value).encrypt();
}

async function decryptHandles(userAddress: string, entries: { handle: HexHandle; contractAddress: string }[]) {
  const instance = await fhe();
  const wallet = await signer();
  const keypair = instance.generateKeypair();
  const contracts = [...new Set(entries.map((entry) => entry.contractAddress))];
  const startTime = Math.floor(Date.now() / 1000);
  const days = 10;
  const typed = instance.createEIP712(keypair.publicKey, contracts, startTime, days);
  const types = { UserDecryptRequestVerification: [...typed.types.UserDecryptRequestVerification] };
  const signature = await wallet.signTypedData(typed.domain, types, typed.message);
  return instance.userDecrypt(entries, keypair.privateKey, keypair.publicKey, signature.slice(2), contracts, userAddress, startTime, days);
}

export async function unlockPrincipal(userAddress: string) {
  const provider = await browserProvider();
  const vault = new Contract(CONTRACTS.vault, VAULT_ABI, provider);
  const handle = String(await vault.principalOf(userAddress)) as HexHandle;
  if (/^0x0{64}$/i.test(handle)) return { raw: 0n, formatted: "0.0" };
  const values = await decryptHandles(userAddress, [{ handle, contractAddress: CONTRACTS.vault }]);
  const raw = BigInt(values[handle] as bigint | number | string);
  return { raw, formatted: formatUnits(raw, TOKEN_DECIMALS) };
}

export async function depositCusdt(amount: string, onStep?: (step: string) => void) {
  const wallet = await signer(); const user = await wallet.getAddress();
  onStep?.("ENCRYPTING AMOUNT");
  const encrypted = await encrypt64(CONTRACTS.cUsdt, user, parseUnits(amount, TOKEN_DECIMALS));
  onStep?.("WAITING FOR WALLET");
  const token = new Contract(CONTRACTS.cUsdt, CUSDT_ABI, wallet);
  const tx = await token.confidentialTransferAndCall(CONTRACTS.vault, encrypted.handles[0], encrypted.inputProof, "0x");
  onStep?.("SUBMITTING TO SEPOLIA"); await tx.wait(); onStep?.("DEPOSIT TRANSACTION CONFIRMED — UNLOCK BALANCE TO VERIFY PRIVATE ACCEPTANCE"); return tx.hash as string;
}

export async function withdrawPrincipal(amount: string, onStep?: (step: string) => void) {
  const wallet = await signer(); const user = await wallet.getAddress();
  const provider = await browserProvider();
  const vaultRead = new Contract(CONTRACTS.vault, VAULT_ABI, provider);
  if (await vaultRead.withdrawalsLocked()) throw new Error("A draw is being finalized. Withdrawals reopen after finalization.");
  onStep?.("ENCRYPTING REQUEST");
  const encrypted = await encrypt64(CONTRACTS.vault, user, parseUnits(amount, TOKEN_DECIMALS));
  const vault = new Contract(CONTRACTS.vault, VAULT_ABI, wallet);
  onStep?.("SUBMITTING"); const tx = await vault.withdraw(encrypted.handles[0], encrypted.inputProof); await tx.wait(); onStep?.("CONFIRMED"); return tx.hash as string;
}

export async function mintTestUsdt(amount: string) {
  const wallet = await signer(); const user = await wallet.getAddress();
  const token = new Contract(CONTRACTS.usdt, USDT_ABI, wallet); const tx = await token.mint(user, parseUnits(amount, TOKEN_DECIMALS)); await tx.wait(); return tx.hash as string;
}

export async function wrapTestUsdt(amount: string) {
  const wallet = await signer(); const user = await wallet.getAddress(); const value = parseUnits(amount, TOKEN_DECIMALS);
  const underlying = new Contract(CONTRACTS.usdt, USDT_ABI, wallet); const approve = await underlying.approve(CONTRACTS.cUsdt, value); await approve.wait();
  const token = new Contract(CONTRACTS.cUsdt, CUSDT_ABI, wallet); const tx = await token.wrap(user, value); await tx.wait(); return tx.hash as string;
}

function asBool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "1";
  return false;
}

export async function unlockDrawResult(userAddress: string) {
  const wallet = await signer(); const draw = new Contract(CONTRACTS.draw, DRAW_ABI, wallet);
  const [wonRaw, prizeRaw] = await draw.encryptedResultOf(DRAW_ID, userAddress);
  const wonHandle = String(wonRaw) as HexHandle;
  const prizeHandle = String(prizeRaw) as HexHandle;
  if (BigInt(wonHandle) === 0n || BigInt(prizeHandle) === 0n) throw new Error("This wallet did not participate in Draw #1.");
  const auth = await draw.authorizeMyResult(DRAW_ID); await auth.wait();
  const values = await decryptHandles(userAddress, [{ handle: wonHandle, contractAddress: CONTRACTS.draw }, { handle: prizeHandle, contractAddress: CONTRACTS.draw }]);
  return { won: asBool(values[wonHandle]), prize: formatUnits(BigInt(values[prizeHandle] as bigint | number | string), TOKEN_DECIMALS) };
}

export function friendlyError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = error instanceof Error ? error.message : String(error);
  if (/user rejected|denied/i.test(message) || code === "4001") return "The wallet request was cancelled.";
  if (/already processing|request.*pending|pending request/i.test(message) || code === "-32002") return "A wallet connection request is already open. Click the MetaMask fox icon and finish or cancel it, then try again.";
  if (/install a browser wallet|no provider|ethereum is not defined/i.test(message)) return "No compatible browser wallet was detected. Install or unlock MetaMask and try again.";
  if (/insufficient funds/i.test(message)) return "You need Sepolia ETH for gas.";
  if (/draw is being finalized|withdrawals.*reopen/i.test(message)) return "A draw is being finalized. Withdrawals reopen after finalization.";
  if (/network|chain/i.test(message)) return "Switch to Ethereum Sepolia and try again.";
  if (/participate/i.test(message)) return "This wallet did not participate in this draw.";
  return `Wallet request failed${code ? ` (${code})` : ""}${message && message !== "[object Object]" ? `: ${message.slice(0, 220)}` : ". Please try again."}`;
}
