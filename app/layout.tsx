import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/app/context/StoreContext";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrderCatch — AI 주문 관리 대시보드",
  description: "카카오·인스타 주문을 AI가 자동 파싱하여 스마트하게 관리하는 B2B SaaS",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "OrderCatch" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
