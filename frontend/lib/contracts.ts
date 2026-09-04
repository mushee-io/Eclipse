export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_HEX = "0xaa36a7";
export const PUBLIC_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
export const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";
export const TOKEN_DECIMALS = 6;
export const DRAW_ID = 1n;
export const PUBLIC_CAPACITY = 1_073_741_824n;

export const CONTRACTS = {
  vault: "0x7eE4B6dE21e14ab3a4A0c14d7430742667Ba703f",
  draw: "0x60c5bb2c218aD32415A69368d681B36A33ef7d3e",
  prizeReserve: "0x9287C4cc8c45e4beFe7B86a24735dd9fd0ee3744",
  yieldSimulator: "0x863d0b6D8D76744C60Cc805E26FE83F0616691D8",
  cUsdt: "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
  usdt: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
} as const;

export const VAULT_ABI = [
  "function principalOf(address) view returns (bytes32)",
  "function lastDepositAccepted(address) view returns (bytes32)",
  "function withdraw(bytes32,bytes)",
  "function withdrawalsLocked() view returns (bool)",
  "function participantCount() view returns (uint256)",
  "function participantAt(uint256) view returns (address)",
  "function maxPoolCapacity() view returns (uint64)",
] as const;

export const DRAW_ABI = [
  "function currentDrawId() view returns (uint256)",
  "function state() view returns (uint8)",
  "function finalized(uint256) view returns (bool)",
  "function encryptedResultOf(uint256,address) view returns (bytes32,bytes32)",
  "function authorizeMyResult(uint256) returns (bytes32,bytes32)",
  "function claimPrize(uint256)",
  "function claimed(uint256,address) view returns (bool)",
] as const;

export const CUSDT_ABI = [
  "function wrap(address,uint256) returns (bytes32)",
  "function confidentialTransferAndCall(address,bytes32,bytes,bytes) returns (bytes32)",
] as const;

export const USDT_ABI = [
  "function mint(address,uint256)",
  "function approve(address,uint256) returns (bool)",
] as const;

export function explorerAddress(address: string) {
  return `${SEPOLIA_EXPLORER}/address/${address}`;
}

export function explorerTx(hash: string) {
  return `${SEPOLIA_EXPLORER}/tx/${hash}`;
}
