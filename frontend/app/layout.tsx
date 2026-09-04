import type { Metadata } from "next";
import "./styles.css";
import { Shell } from "../components/Shell";

export const metadata: Metadata = { title: "Eclipse — Confidential Prize Savings", description: "Save privately. Win invisibly. Verify everything." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Shell>{children}</Shell></body></html>; }
