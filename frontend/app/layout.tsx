import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Eclipse — Zero-Disclosure Prize Savings",
  description: "Confidential prize savings powered by fully homomorphic encryption.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
