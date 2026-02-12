import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "PureAir | 空氣淨化器",
  description: "PureAir 家用與商用空氣淨化器，HEPA 濾網、除甲醛、智能控制",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK" className={inter.variable}>
      <body className="min-h-screen antialiased font-sans">
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
