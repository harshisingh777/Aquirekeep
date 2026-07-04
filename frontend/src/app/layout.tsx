// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import "./globals.css";
import MainLayout from "@/components/MainLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Retention Analytics — E-Commerce Intelligence Platform",
  description: "Cohort retention, RFM segmentation, LTV modeling, and channel performance analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider>
          <ReactQueryProvider>
            <MainLayout>{children}</MainLayout>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
