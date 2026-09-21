import { ThemeProvider } from "@/components/layout/ThemeProvider";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { PomodoroProvider } from "@/components/pomodoro/PomodoroProvider";
import FloatingPomodoro from "@/components/pomodoro/FloatingPomodoro";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <PomodoroProvider>
        <div className="flex min-h-screen">
          <MobileNav />
          <Sidebar />
          <main className="min-w-0 flex-1 pt-14 md:pt-0">
            <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
          <FloatingPomodoro />
        </div>
      </PomodoroProvider>
    </ThemeProvider>
  );
}
