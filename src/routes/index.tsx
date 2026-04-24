import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useExamSession } from "@/hooks/useExamSession";
import { computeResults, computeStats } from "@/lib/exam";
import { exportPDF, exportExcel } from "@/lib/exports";
import { ClassPicker } from "@/components/ClassPicker";
import { GradeSpreadsheet } from "@/components/GradeSpreadsheet";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  PencilLine,
  LayoutDashboard,
  RotateCcw,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExamTrack — Gestion des examens blancs" },
      {
        name: "description",
        content:
          "Saisissez les notes d'examen blanc et obtenez classements, moyennes et rapports PDF/Excel automatiquement.",
      },
      { property: "og:title", content: "ExamTrack — Gestion des examens blancs" },
      {
        property: "og:description",
        content: "Saisie rapide, calculs et rapports PDF/Excel pour les examens blancs.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, setSession, selectClass, reset, hydrated } = useExamSession();
  const [tab, setTab] = useState<"entry" | "results">("entry");
  const [savedFlash, setSavedFlash] = useState(false);

  const results = useMemo(
    () => computeResults(session.students, session.subjects, session.threshold),
    [session.students, session.subjects, session.threshold],
  );
  const stats = useMemo(() => computeStats(results), [results]);

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!session.className) {
    return (
      <main className="min-h-screen bg-background">
        <ClassPicker
          schoolName={session.schoolName}
          onSchoolNameChange={(v) => setSession({ ...session, schoolName: v })}
          onSelectClass={selectClass}
        />
      </main>
    );
  }

  function handleSave() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4 flex-wrap">
          <button
            onClick={reset}
            className="flex items-center gap-2 text-foreground hover:text-accent transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="leading-tight text-left">
              <div className="font-bold text-sm">ExamTrack</div>
              <div className="text-xs text-muted-foreground">{session.className}</div>
            </div>
          </button>

          <div className="flex-1 min-w-32" />

          <div className="flex rounded-lg border bg-secondary/40 p-1 text-sm">
            <button
              onClick={() => setTab("entry")}
              className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors ${
                tab === "entry"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PencilLine className="h-4 w-4" /> Saisie
            </button>
            <button
              onClick={() => setTab("results")}
              className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors ${
                tab === "results"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" /> Résultats
            </button>
          </div>

          <Button variant="ghost" size="sm" onClick={reset}>
            <ArrowLeft className="h-4 w-4" /> Changer de classe
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <section className="grid gap-3 sm:grid-cols-3 rounded-xl border bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="school" className="text-xs">École</Label>
            <Input
              id="school"
              value={session.schoolName}
              onChange={(e) => setSession({ ...session, schoolName: e.target.value })}
              placeholder="Nom de l'école"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-xs">Date</Label>
            <Input
              id="date"
              type="date"
              value={session.date.slice(0, 10)}
              onChange={(e) =>
                setSession({
                  ...session,
                  date: new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="threshold" className="text-xs">
              Seuil d'admission ({session.threshold}/20)
            </Label>
            <Input
              id="threshold"
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={session.threshold}
              onChange={(e) =>
                setSession({
                  ...session,
                  threshold: Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                })
              }
            />
          </div>
        </section>

        {tab === "entry" ? (
          <GradeSpreadsheet session={session} onChange={setSession} />
        ) : (
          <ResultsDashboard
            results={results}
            stats={stats}
            threshold={session.threshold}
          />
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground mr-auto">
            {savedFlash ? "✓ Enregistré localement" : "Sauvegarde automatique activée"}
          </span>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4" /> Enregistrer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExcel(session, results, stats, session.subjects)}
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button
            size="sm"
            onClick={() => exportPDF(session, results, stats)}
          >
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Effacer toutes les données saisies ?")) reset();
            }}
          >
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </Button>
        </div>
      </div>
    </main>
  );
}
