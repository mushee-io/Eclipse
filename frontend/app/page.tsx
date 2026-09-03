const proofItems = [
  "Draw executed onchain",
  "Fixed-capacity randomness",
  "Encrypted range selection",
  "Principal excluded from prizes",
];

export default function Home() {
  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="Eclipse home">ECLIPSE</a>
        <div className="navlinks"><a href="#mechanism">Mechanism</a><a href="#verification">Verify</a><a href="#status">Status</a></div>
      </nav>
      <section id="top" className="hero">
        <p className="eyebrow">ZERO-DISCLOSURE PRIZE SAVINGS</p>
        <h1>Save without<br />being seen.</h1>
        <p className="lede">Confidential prize savings powered by fully homomorphic encryption. Your principal remains yours. Your position remains private. The draw remains verifiable.</p>
        <div className="actions"><a className="button primary" href="#status">VIEW BUILD STATUS</a><a className="button" href="#mechanism">HOW ECLIPSE WORKS</a></div>
      </section>
      <section className="metrics" aria-label="Pool information">
        <div><span>POOL CAPACITY</span><strong>2<sup>30</sup> atomic units</strong><small>Public, fixed, power-of-two domain</small></div>
        <div><span>TOTAL SAVED</span><strong className="encrypted">████████</strong><small>Encrypted</small></div>
        <div><span>PRIZE</span><strong className="encrypted">████████</strong><small>Encrypted</small></div>
        <div><span>NEXT DRAW</span><strong>—</strong><small>Not scheduled</small></div>
      </section>
      <section id="mechanism" className="split">
        <div><p className="eyebrow">THE DARK CAPACITY DRAW</p><h2>Privacy without blind trust.</h2></div>
        <div className="copy"><p>Eclipse draws against a fixed public capacity—not public pool TVL. Savings occupy encrypted ranges inside that capacity. The random position, boundaries, balance, winner, and prize never need to be publicly decrypted.</p><p>If randomness lands in unused capacity, <em>The Shadow</em> wins. Nobody loses principal; the encrypted prize rolls forward.</p></div>
      </section>
      <section className="capacity" aria-label="Conceptual encrypted capacity visualization"><div className="axis"><span>0</span><span>PUBLIC FIXED CAPACITY</span><span>2³⁰</span></div><div className="bar"><i /><i /><i /><b>THE SHADOW</b></div><p>Real distribution encrypted. This illustration does not represent live balances.</p></section>
      <section id="verification" className="verification"><div><p className="eyebrow">VERIFICATION LAYER</p><h2>Hide positions.<br />Expose execution.</h2></div><ul>{proofItems.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul></section>
      <section id="status" className="status"><p className="eyebrow">CURRENT STATUS</p><h2>Local protocol build</h2><p>Confidential deposits, withdrawals, yield isolation, fixed-capacity draw processing, Shadow rollover, and private-result authorization are tested locally with Zama’s FHE mock runtime.</p><p className="muted">Wallet connection and Sepolia deployment are intentionally unavailable until the production admission model and deployment verification are complete.</p></section>
      <footer><span>© ECLIPSE</span><span>TESTNET PROTOCOL IN DEVELOPMENT</span></footer>
    </main>
  );
}
