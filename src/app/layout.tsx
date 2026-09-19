import type { Metadata } from "next";

import "./globals.css";

import { ThemeProvider } from "@/components/layout/ThemeProvider";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import PwaRegistry from "@/components/layout/PwaRegistry";

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    template: "%s | BIR Prep",
    default: "BIR Prep — Tu plataforma de preparación BIR",
  },
  description:
    "Plataforma todo en uno para preparar la oposición al BIR: simulacros oficiales, caja de fallos, flashcards con repetición espaciada y mucho más.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BIR Prep",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <PwaRegistry />
        <ThemeProvider>
          <div className="flex min-h-screen">
            <MobileNav />
            <Sidebar />

            <main className="min-w-0 flex-1 pt-14 md:pt-0">
              <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}