"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { browserProvider, friendlyError, switchToSepolia } from "../lib/eclipse";
import { SEPOLIA_CHAIN_ID } from "../lib/contracts";

export function Shell({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string>();
  const [chain, setChain] = useState<number>();
  const [error, setError] = useState("");
  const sync = useCallback(async () => {
    try {
      if (!window.ethereum) return;
      const provider = await browserProvider();
      const accounts = await provider.send("eth_accounts", []);
      const network = await provider.getNetwork();
      setAddress(accounts[0]);
      setChain(Number(network.chainId));
    } catch { /* disconnected */ }
  }, []);
  useEffect(() => {
    sync();
    const p = window.ethereum;
    const listener = () => { setAddress(undefined); sync(); };
    p?.on?.("accountsChanged", listener);
    p?.on?.("chainChanged", listener);
    return () => {
      p?.removeListener?.("accountsChanged", listener);
      p?.removeListener?.("chainChanged", listener);
    };
  }, [sync]);
  const wrong = address && chain !== SEPOLIA_CHAIN_ID;
  return <main className="site-shell">
    <nav className="nav">
      <Link className="wordmark" href="/">ECLIPSE</Link>
      <div className="navlinks">
        <Link href="/pool">Pool</Link><Link href="/draws/1">Draws</Link><Link href="/verify">Verify</Link><Link href="/how-it-works">Protocol</Link>
      </div>
      <div className="wallet-zone">
        <span className={`network-dot ${wrong ? "warn" : ""}`}>● SEPOLIA</span>
        {wrong ? <button className="button small" onClick={() => switchToSepolia().then(sync).catch((e) => setError(friendlyError(e)))}>SWITCH NETWORK</button> : address ? <Link className="button small primary" href="/pool">{`${address.slice(0, 6)}…${address.slice(-4)}`}</Link> : <Link className="button small primary" href="/pool">LAUNCH APP</Link>}
      </div>
    </nav>
    {error && <div className="notice error">{error}</div>}
    {children}
    <footer><span>ECLIPSE · CONFIDENTIAL PRIZE SAVINGS</span><span>BUILT WITH ZAMA FHE · ETHEREUM SEPOLIA</span></footer>
  </main>;
}
