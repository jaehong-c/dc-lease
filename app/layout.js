import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DC Lease Comparator",
  description:
    "Side-by-side economics for publicly disclosed data center leases: $/kW/month, TCV, yield on cost, NPV, and effective counterparty credit.",
};

const wrap = { maxWidth: 1280, margin: "0 auto", padding: "0 24px" };

function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(250,250,250,0.85)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ ...wrap, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Link href="/" style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>DC Lease Comparator</span>
          <span className="eyebrow" style={{ fontSize: 10.5 }}>Lease economics</span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link href="/" className="btn btn-soft btn-sm">Compare</Link>
          <Link href="/about" className="btn btn-ghost btn-sm">About</Link>
          <a href="https://dc-risk.vercel.app" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Risk Register</a>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", marginTop: 48 }}>
      <div style={{ ...wrap, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontSize: 12, color: "var(--ink-3)" }}>
        <span>{"\u00A9"} 2026 Jae Chung. All rights reserved.</span>
        <span className="mono">v0.2.0 / comps limited to publicly disclosed leases</span>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning>
        <Header />
        <main style={{ ...wrap, padding: "28px 24px 0" }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}