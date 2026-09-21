import { ThemeProvider } from "@/components/layout/ThemeProvider";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        {children}
      </div>
    </ThemeProvider>
  );
}
