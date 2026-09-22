import type { Metadata, Viewport } from "next";

import "./globals.css";

import PwaRegistry from "@/components/layout/PwaRegistry";
import { SCRIPT_TEMA, ThemeProvider } from "@/components/layout/ThemeProvider";

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <PwaRegistry />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
