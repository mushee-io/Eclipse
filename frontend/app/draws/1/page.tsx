"use client";

import { useEffect, useState } from "react";
import { account, claimDrawPrize, currentDraw, friendlyError, runNextDraw, unlockDrawResult } from "../../../lib/eclipse";

const timeline=["Prize locked","Encrypted randomness generated","Confidential balances processed","Encrypted winner predicate evaluated","Shadow predicate evaluated","Draw finalized"];
const stateNames=["OPEN","RANDOMNESS CREATED","PROCESSING","FINALIZED"];
export default function DrawOne(){
  const[result,setResult]=useState<{id:bigint;won:boolean;prize:string}>();
  const[drawId,setDrawId]=useState<bigint>(1n); const[drawState,setDrawState]=useState<number>(3); const[status,setStatus]=useState(""); const[claimed,setClaimed]=useState(false); const[running,setRunning]=useState(false);
  const refresh=async()=>{try{const d=await currentDraw();setDrawId(d.id);setDrawState(d.state);}catch{/* wallet/network UI handles errors */}};
  useEffect(()=>{void refresh();},[]);
  const unlock=async()=>{try{setStatus("REQUESTING ACCESS");const u=await account();setStatus("SIGN PRIVACY REQUEST");const r=await unlockDrawResult(u,drawId);setStatus("RESULT READY");setResult(r);setClaimed(false);}catch(e){setStatus(friendlyError(e));}};
  const claim=async()=>{try{setStatus("WAITING FOR WALLET");await claimDrawPrize(result?.id??drawId);setClaimed(true);setStatus("CLAIM TRANSACTION CONFIRMED");}catch(e){setStatus(friendlyError(e));}};
  const run=async()=>{try{setRunning(true);setResult(undefined);setClaimed(false);const id=await runNextDraw(setStatus);setDrawId(id);setDrawState(3);setStatus(`DRAW #${id} FINALIZED — UNLOCK YOUR RESULT`);}catch(e){setStatus(friendlyError(e));await refresh();}finally{setRunning(false);}};
  return <section className="page"><p className="eyebrow">LIVE ON ETHEREUM SEPOLIA</p><h1 className="page-title">ECLIPSE<br/>DRAW #{drawId.toString()}</h1>
  <div className="notice"><span>Permissionless keeper flow · Current state: <strong>{stateNames[drawState]??"UNKNOWN"}</strong>. Any connected wallet can advance the draw; each step is an onchain Sepolia transaction.</span> <button className="button small primary" disabled={running} onClick={run}>{running?"ADVANCING DRAW…":"RUN / ADVANCE DRAW"}</button></div>
  <div className="draw-grid"><article><p className="eyebrow">PUBLIC</p><dl><dt>DRAW DOMAIN</dt><dd>2³⁰</dd><dt>NETWORK</dt><dd>SEPOLIA</dd><dt>DRAW STATE</dt><dd>{stateNames[drawState]??"UNKNOWN"}</dd></dl></article><article><p className="eyebrow">PRIVATE</p><dl><dt>TOTAL SAVED</dt><dd>ENCRYPTED</dd><dt>RANDOM POSITION</dt><dd>ENCRYPTED</dd><dt>WINNER / PRIZE</dt><dd>ENCRYPTED</dd><dt>SHADOW OUTCOME</dt><dd>ENCRYPTED</dd></dl></article></div>
  <div className="timeline">{timeline.map(x=><div key={x}><span>✓</span>{x}</div>)}</div><article className="result-card"><p className="eyebrow">YOUR RESULT · DRAW #{drawId.toString()}</p>{result?<><h2>{result.won?"YOU WON.":"NOT THIS TIME."}</h2><p>{result.won?`Private prize: ${result.prize} cUSDT`:"Your principal remains yours."}</p><button className="button primary" disabled={claimed} onClick={claim}>{claimed?"CLAIMED":"CLAIM RESULT"}</button><small>Every participant uses the same encrypted claim path; a losing allocation settles as encrypted zero.</small></>:<><h2>████████</h2><p>Only your wallet can authorize decryption of its encrypted result.</p><button className="button primary" disabled={drawState!==3} onClick={unlock}>UNLOCK RESULT</button></>} {status&&<small>{status}</small>}</article></section>;
}
