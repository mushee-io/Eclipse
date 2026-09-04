"use client";

import { useEffect, useState } from "react";
import { account, depositCusdt, friendlyError, mintTestUsdt, unlockPrincipal, withdrawPrincipal, wrapTestUsdt } from "../../lib/eclipse";

export default function Pool() {
  const [user,setUser]=useState<string>(); const [balance,setBalance]=useState<string>(); const [amount,setAmount]=useState("25"); const [step,setStep]=useState(""); const [error,setError]=useState("");
  useEffect(()=>{ account().then(setUser).catch(()=>{}); },[]);
  const run=async(fn:()=>Promise<unknown>)=>{ try{setError("");await fn();}catch(e){setError(friendlyError(e));} };
  return <section className="page"><p className="eyebrow">YOUR PRIVATE SAVINGS</p><h1 className="page-title">YOUR POSITION<br/>BELONGS TO YOU.</h1><p className="lede">Unlock private state only when you need it. Decrypted values stay in this page's memory and are never persisted.</p>
  {!user && <div className="notice">Connect your wallet in the navigation to access your confidential position.</div>}
  <div className="private-grid"><article><span>BALANCE</span><strong>{balance ? `${balance} cUSDT` : "•••••••• cUSDT"}</strong><button className="text-button" onClick={()=>run(async()=>{const u=await account();setUser(u);const p=await unlockPrincipal(u);setBalance(p.formatted);})}>UNLOCK PRIVATE DATA →</button></article><article><span>DRAW WEIGHT</span><strong>PRIVATE</strong><small>No public TVL-derived odds.</small></article><article><span>PRIZE</span><strong>•••••••• cUSDT</strong><small>Unlock per draw.</small></article></div>
  <div className="panel-grid"><article className="panel"><p className="eyebrow">DEPOSIT PRIVATELY</p><h2>ADD SAVINGS</h2><label>AMOUNT · cUSDT<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></label><div className="quick">{["25","50","100"].map(x=><button key={x} onClick={()=>setAmount(x)}>{x}</button>)}</div><button className="button primary full" onClick={()=>run(async()=>{await depositCusdt(amount,setStep);setBalance(undefined);})}>ENCRYPT & DEPOSIT</button></article>
  <article className="panel"><p className="eyebrow">WITHDRAW SAVINGS</p><h2>PRINCIPAL IS YOURS</h2><label>AMOUNT · cUSDT<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></label><p className="muted">The withdrawal request is encrypted before it reaches Eclipse.</p><button className="button full" onClick={()=>run(async()=>{await withdrawPrincipal(amount,setStep);setBalance(undefined);})}>ENCRYPT & WITHDRAW</button></article></div>
  <article className="test-funds"><div><p className="eyebrow">TESTNET ONLY</p><h2>GET TEST FUNDS</h2><p>Mint Sepolia test USDT, then wrap it into canonical confidential cUSDT.</p></div><div className="actions"><button className="button" onClick={()=>run(()=>mintTestUsdt("100"))}>MINT 100 TEST USDT</button><button className="button" onClick={()=>run(()=>wrapTestUsdt("100"))}>WRAP 100 → cUSDT</button></div></article>
  {step&&<div className="notice success">{step}</div>}{error&&<div className="notice error">{error}</div>}</section>;
}
