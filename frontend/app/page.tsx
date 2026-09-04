import Link from "next/link";

export default function Home() { return <div className="editorial-home">
  <section className="editorial-hero">
    <div className="hero-micro hero-micro-left"><span>01</span>PRIVATE<br/>SECURE<br/>ONCHAIN</div>
    <div className="hero-copy"><p className="eyebrow">CONFIDENTIAL PRIZE SAVINGS · ZAMA FHE</p><h1>PRIVACY<br/>BUILDS A<br/>BRIGHTER</h1><div className="kinetic-line"><span>TOMORROW</span><span>TOMORROW</span></div></div>
    <div className="eclipse-stage" aria-label="Animated eclipse"><div className="eclipse-orbit"><div className="eclipse-glow"/></div><span className="cross cross-a">+</span><span className="cross cross-b">+</span></div>
    <div className="hero-micro hero-micro-right">CONFIDENTIAL<br/>SAVINGS<br/>WITHOUT<br/>PUBLIC TVL</div>
  </section>

  <section className="editorial-mission"><div><p className="eyebrow">▶ WHAT ECLIPSE DOES</p><h2>SAVE PRIVATELY.<br/>WIN INVISIBLY.<br/>VERIFY EVERYTHING.</h2></div><div className="mission-copy"><p>Eclipse is confidential prize savings on Ethereum Sepolia. Deposits, balances, aggregate pool size, weighted winner selection and prize values remain encrypted while the draw stays publicly verifiable.</p><div className="actions"><Link className="button primary" href="/pool">ENTER THE POOL ↗</Link><Link className="button" href="/verify">LIVE PROOF</Link></div></div></section>

  <section className="editorial-build"><div className="build-marquee"><span>BUILD</span><span>BUILD</span></div><div className="build-index"><p className="eyebrow">▲ DARK CAPACITY</p><p>FIXED PUBLIC CAPACITY<br/>ENCRYPTED SAVER RANGES<br/>PRIVATE WEIGHTED DRAW<br/>THE SHADOW</p></div><div className="private-marquee"><span>A MORE PRIVATE INTERNET</span><span>A MORE PRIVATE INTERNET</span></div><div className="tech-orbit"><i/><i/><i/></div></section>

  <section className="editorial-proof"><div><span>PUBLIC CAPACITY</span><strong>2³⁰</strong><small>ATOMIC UNITS</small></div><div><span>TOTAL SAVED</span><strong className="outline-value">PRIVATE</strong><small>ENCRYPTED</small></div><div><span>WINNER</span><strong className="outline-value">PRIVATE</strong><small>USER-DECRYPTABLE</small></div><div><span>DRAW #1</span><strong>FINALIZED</strong><small>SEPOLIA VERIFIED</small></div></section>

  <section className="editorial-shadow"><p className="eyebrow">03 · THE SHADOW</p><div className="shadow-title"><span>NO PUBLIC TVL.</span><span>NO PUBLIC ODDS.</span><span>NO PUBLIC WINNER.</span></div><p>If the encrypted random point lands in unused capacity, nobody wins and the prize rolls forward. The unused region is The Shadow — keeping total deposits private without breaking proportional winner selection.</p><Link className="button" href="/how-it-works">HOW IT WORKS ↗</Link></section>
</div>; }
