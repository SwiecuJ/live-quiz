import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppBackground from "@/components/ui/AppBackground";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Live Quiz",
  description: "Kahoot-style live quiz app powered by AI-generated questions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppBackground />
        {children}
      </body>
    </html>
  );
}
