import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Dashboard } from "@/components/Dashboard";
import { StudentsManager } from "@/components/StudentsManager";
import { DailyChecklist } from "@/components/DailyChecklist";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  ListChecks,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExamTrack — Suivi journalier des élèves" },
      {
        name: "description",
        content:
          "Gérez vos élèves, remplissez la checklist journalière et générez un rapport PDF par jour avec un tableau de bord clair.",
      },
      { property: "og:title", content: "ExamTrack — Suivi journalier des élèves" },
      {
        property: "og:description",
        content: "Élèves, checklist quotidienne, rapports PDF et statistiques.",
      },
    ],
  }),
  component: Index,
});

type Tab = "dashboard" | "students" | "checklist";

function Index() {
  const { state, setState, reset, hydrated } = useAppState();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!hydrated) return <div className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm">ExamTrack</div>
              <div className="text-xs text-muted-foreground">Suivi journalier</div>
            </div>
          </div>

          <div className="flex-1 min-w-32" />

          <nav className="flex rounded-lg border bg-secondary/40 p-1 text-sm">
            <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
              <LayoutDashboard className="h-4 w-4" /> Tableau de bord
            </TabButton>
            <TabButton active={tab === "students"} onClick={() => setTab("students")}>
              <Users className="h-4 w-4" /> Élèves
            </TabButton>
            <TabButton active={tab === "checklist"} onClick={() => setTab("checklist")}>
              <ListChecks className="h-4 w-4" /> Checklist
            </TabButton>
          </nav>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Effacer toutes les données ?")) reset();
            }}
          >
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {tab === "dashboard" && <Dashboard state={state} />}
        {tab === "students" && (
          <StudentsManager
            students={state.students}
            onChange={(students) => setState({ ...state, students })}
          />
        )}
        {tab === "checklist" && <DailyChecklist state={state} onChange={setState} />}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors ${
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
