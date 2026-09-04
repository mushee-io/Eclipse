import "dotenv/config";
import { ethers } from "ethers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

const rpc = process.env.SEPOLIA_RPC_URL;
const key = process.env.SEPOLIA_PRIVATE_KEY;
if (!rpc || !key) throw new Error("Missing local Sepolia environment");
const provider = new ethers.JsonRpcProvider(rpc);
const owner = new ethers.Wallet(key, provider);
const vaultAddress = "0x7eE4B6dE21e14ab3a4A0c14d7430742667Ba703f";
const reserveAddress = "0x9287C4cc8c45e4beFe7B86a24735dd9fd0ee3744";
const drawAddress = "0x60c5bb2c218aD32415A69368d681B36A33ef7d3e";
const simulatorAddress = "0x863d0b6D8D76744C60Cc805E26FE83F0616691D8";
const cUsdt = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";
const usdt = "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0";
const B = ethers.Wallet.createRandom().connect(provider);
const C = ethers.Wallet.createRandom().connect(provider);
const instance = await createInstance({ ...SepoliaConfig, network: rpc });
const erc20Abi = ["function mint(address,uint256)", "function approve(address,uint256) returns (bool)"];
const tokenAbi = ["function wrap(address,uint256) returns (bytes32)", "function setOperator(address,uint48)", "function confidentialTransferAndCall(address,bytes32,bytes,bytes) returns (bytes32)"];
const vaultAbi = ["function withdraw(bytes32,bytes)", "function principalOf(address) view returns (bytes32)"];
const drawAbi = ["function startDraw()", "function beginProcessing()", "function processDrawBatch(uint256)", "function finalizeDraw()", "function authorizeMyResult(uint256) returns (bytes32,bytes32)", "function encryptedResultOf(uint256,address) view returns (bytes32,bytes32)", "function claimPrize(uint256)"];
const simAbi = ["function contributeYield(bytes32,bytes)"];
const send = async (label, tx) => { const t = await tx; const r = await t.wait(); if (!r || r.status !== 1) throw new Error(`${label} reverted`); console.log(`${label}: ${t.hash}`); await new Promise((x) => setTimeout(x, 2500)); return t; };
const encrypt = async (contract, signer, amount) => instance.createEncryptedInput(contract, signer.address).add64(amount).encrypt();
const deposit = async (wallet, amount) => { const e = await encrypt(cUsdt, wallet, amount); return send("CONFIDENTIAL_DEPOSIT", new ethers.Contract(cUsdt, tokenAbi, wallet).confidentialTransferAndCall(vaultAddress,e.handles[0],e.inputProof,"0x")); };
console.log(`PARTICIPANT_B: ${B.address}`); console.log(`PARTICIPANT_C: ${C.address}`);
for (const participant of [B, C]) await send("ETH_FUND", owner.sendTransaction({to: participant.address, value: ethers.parseEther("0.008")}));
const publicToken = new ethers.Contract(usdt, erc20Abi, owner);
for (const [wallet, amount] of [[B,400_000_000n],[C,400_000_000n]]) { await send("MINT_UNDERLYING", publicToken.mint(wallet.address,amount)); await send("APPROVE_WRAPPER", new ethers.Contract(usdt,erc20Abi,wallet).approve(cUsdt,amount)); await send("WRAP_CUSDT", new ethers.Contract(cUsdt,tokenAbi,wallet).wrap(wallet.address,amount)); await deposit(wallet,amount); }
const prize=16_000_000n;
await send("MINT_PRIZE_UNDERLYING", publicToken.mint(owner.address,prize)); await send("APPROVE_PRIZE_WRAPPER", new ethers.Contract(usdt,erc20Abi,owner).approve(cUsdt,prize)); await send("WRAP_PRIZE", new ethers.Contract(cUsdt,tokenAbi,owner).wrap(owner.address,prize)); await send("SET_YIELD_OPERATOR", new ethers.Contract(cUsdt,tokenAbi,owner).setOperator(simulatorAddress,2**32));
const yi=await encrypt(simulatorAddress,owner,prize); await send("YIELD_CONTRIBUTION",new ethers.Contract(simulatorAddress,simAbi,owner).contributeYield(yi.handles[0],yi.inputProof));
const draw=new ethers.Contract(drawAddress,drawAbi,owner); await send("START_DRAW",draw.startDraw()); await send("BEGIN_PROCESSING",draw.beginProcessing()); await send("PROCESS_BATCH",draw.processDrawBatch(3)); await send("FINALIZE_DRAW",draw.finalizeDraw());
for(const wallet of [owner,B,C]) { await send("AUTHORIZE_RESULT",new ethers.Contract(drawAddress,drawAbi,wallet).authorizeMyResult(1)); const [won,prizeHandle]=await draw.encryptedResultOf(1,wallet.address); const kp=instance.generateKeypair(), st=Math.floor(Date.now()/1000), contracts=[drawAddress]; const typed=instance.createEIP712(kp.publicKey,contracts,st,10); const sig=await wallet.signTypedData(typed.domain,{UserDecryptRequestVerification:typed.types.UserDecryptRequestVerification},typed.message); const values=await instance.userDecrypt([{handle:won,contractAddress:drawAddress},{handle:prizeHandle,contractAddress:drawAddress}],kp.privateKey,kp.publicKey,sig.slice(2),contracts,wallet.address,st,10); if (values[won] === undefined || values[prizeHandle] === undefined) throw new Error("User-specific result decryption failed"); }
for(const wallet of [owner,B,C]) await send("CLAIM",new ethers.Contract(drawAddress,drawAbi,wallet).claimPrize(1));
const before = await new ethers.Contract(vaultAddress,vaultAbi,B).principalOf(B.address); const wi=await encrypt(vaultAddress,B,1_000_000n); await send("PRINCIPAL_WITHDRAW",new ethers.Contract(vaultAddress,vaultAbi,B).withdraw(wi.handles[0],wi.inputProof)); console.log("LIVE_DARK_DRAW_COMPLETE");
