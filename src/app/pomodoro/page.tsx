import type { Metadata } from "next";
import PomodoroClient from "@/components/pomodoro/PomodoroClient";

export const metadata: Metadata = {
  title: "Pomodoro — BIR Prep",
  description: "Timer Pomodoro para sesiones de estudio BIR",
};

export default function PomodoroPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Pomodoro</h1>
        <p className="mt-2 text-muted-foreground">
          Técnica 25/5 para sesiones de estudio con máxima concentración.
        </p>
      </header>

      <PomodoroClient />
    </div>
  );
}
