import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/feedback/toaster";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CashPilot", template: "%s · CashPilot" },
  description: "Gestion et prévision de trésorerie pour les petites entreprises.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#070b15" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme class is set before hydration by ThemeScript.
    <html lang="fr" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
