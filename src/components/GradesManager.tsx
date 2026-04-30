import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExamData } from "@/hooks/useExamData";
import { computeResults, defaultSubjectsFor } from "@/lib/exam";
import type { Student } from "@/lib/checklist";
import { exportSessionPDF } from "@/lib/report";
import {
  BookOpen, Plus, Trash2, GraduationCap, FileText, Trophy, Sparkles,
} from "lucide-react";

interface Props {
  students: Student[];
}

export function GradesManager({ students }: Props) {
  const exam = useExamData();
  const { data } = exam;
  const [classId, setClassId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [newClass, setNewClass] = useState({ name: "", level: "" });
  const [newSubject, setNewSubject] = useState({ label: "", coefficient: 1 });
  const [newSession, setNewSession] = useState({
    name: "",
    sessionDate: new Date().toISOString().slice(0, 10),
  });

  const activeClass = data.classes.find((c) => c.id === classId) || null;
  const subjects = useMemo(
    () => data.subjects.filter((s) => s.classId === classId),
    [data.subjects, classId],
  );
  const sessionsForClass = useMemo(
    () => data.sessions.filter((s) => s.classId === classId || s.classId == null),
    [data.sessions, classId],
  );
  const activeSession = data.sessions.find((s) => s.id === sessionId) || null;
  const classStudents = useMemo(
    () => students.filter((s) => (s as any).classId === classId || (activeClass && (s as any).classId == null && !classId)),
    [students, classId, activeClass],
  );

  const grades = useMemo(
    () => data.grades.filter((g) => g.sessionId === sessionId),
    [data.grades, sessionId],
  );

  const results = useMemo(
    () =>
      sessionId && subjects.length
        ? computeResults(
            classStudents.map((s) => ({ id: s.id, name: s.fullName || "—" })),
            subjects,
            grades,
          )
        : [],
    [sessionId, subjects, grades, classStudents],
  );

  function getScore(studentId: string, subjectId: string): string {
    const g = grades.find((x) => x.studentId === studentId && x.subjectId === subjectId);
    return g?.score == null ? "" : String(g.score);
  }

  async function handleScoreChange(studentId: string, subjectId: string, raw: string) {
    if (!sessionId) return;
    const trimmed = raw.trim();
    let score: number | null;
    if (trimmed === "") score = null;
    else {
      const n = Number(trimmed.replace(",", "."));
      if (Number.isNaN(n) || n < 0 || n > 20) return;
      score = n;
    }
    await exam.setGrade(sessionId, studentId, subjectId, score);
  }

  async function seedSubjects() {
    if (!activeClass) return;
    const tpl = defaultSubjectsFor(activeClass.level || activeClass.name);
    for (let i = 0; i < tpl.length; i++) {
      await exam.addSubject({
        classId: activeClass.id,
        label: tpl[i].label,
        coefficient: tpl[i].coefficient,
        position: (i + 1) * 10,
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-secondary/30 text-sm text-muted-foreground">
        <strong className="text-foreground">Comment ça marche :</strong> 1) Crée une classe · 2) Ajoute (ou pré-remplis) ses matières · 3) Crée une session d'examen blanc · 4) Saisis les notes /20. Moyennes, rangs et mentions sont calculés automatiquement.
      </Card>
      {/* CLASSES */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5 text-accent" /> Classes
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <Input
            placeholder="Nom (ex : Tle S2)"
            value={newClass.name}
            onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
          />
          <Input
            placeholder="Niveau (Terminale, 3e…)"
            value={newClass.level}
            onChange={(e) => setNewClass({ ...newClass, level: e.target.value })}
          />
          <Button
            onClick={async () => {
              if (!newClass.name.trim()) return;
              await exam.addClass(newClass.name.trim(), newClass.level.trim());
              setNewClass({ name: "", level: "" });
            }}
          >
            <Plus className="h-4 w-4" /> Ajouter classe
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.classes.map((c) => (
            <button
              key={c.id}
              onClick={() => { setClassId(c.id); setSessionId(""); }}
              className={`px-3 py-1.5 rounded-full border text-sm transition ${
                classId === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-secondary"
              }`}
            >
              {c.name} <span className="opacity-70">{c.level}</span>
            </button>
          ))}
          {data.classes.length === 0 && (
            <span className="text-sm text-muted-foreground">Aucune classe. Crée-en une pour commencer.</span>
          )}
        </div>
      </Card>

      {!activeClass ? (
        <Card className="p-10 text-center text-muted-foreground">
          Sélectionne une classe pour gérer les matières et les notes.
        </Card>
      ) : (
        <>
          {/* SUBJECTS */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <BookOpen className="h-5 w-5 text-accent" /> Matières — {activeClass.name}
              </div>
              {subjects.length === 0 && (
                <Button variant="outline" size="sm" onClick={seedSubjects}>
                  <Sparkles className="h-4 w-4" /> Pré-remplir matières
                </Button>
              )}
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Matière (ex : Mathématiques)"
                value={newSubject.label}
                onChange={(e) => setNewSubject({ ...newSubject, label: e.target.value })}
              />
              <Input
                type="number" step="0.5" min={0} max={20}
                placeholder="Coefficient"
                value={newSubject.coefficient}
                onChange={(e) =>
                  setNewSubject({ ...newSubject, coefficient: Number(e.target.value) || 1 })
                }
              />
              <Button
                onClick={async () => {
                  if (!newSubject.label.trim()) return;
                  await exam.addSubject({
                    classId: activeClass.id,
                    label: newSubject.label.trim(),
                    coefficient: newSubject.coefficient,
                    position: (subjects.length + 1) * 10,
                  });
                  setNewSubject({ label: "", coefficient: 1 });
                }}
              >
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>
            {subjects.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">Matière</th>
                      <th className="text-left px-3 py-2 w-32">Coefficient</th>
                      <th className="px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="px-2 py-1">
                          <Input
                            value={s.label}
                            onChange={(e) => exam.updateSubject(s.id, { label: e.target.value })}
                            className="h-8 border-transparent hover:border-input"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number" step="0.5" min={0} max={20}
                            value={s.coefficient}
                            onChange={(e) =>
                              exam.updateSubject(s.id, { coefficient: Number(e.target.value) || 0 })
                            }
                            className="h-8 w-24"
                          />
                        </td>
                        <td className="px-2 py-1 text-right">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => confirm("Supprimer cette matière ?") && exam.deleteSubject(s.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* SESSIONS */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5 text-accent" /> Sessions d'examen blanc
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Nom (ex : Examen blanc T1)"
                value={newSession.name}
                onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
              />
              <Input
                type="date"
                value={newSession.sessionDate}
                onChange={(e) => setNewSession({ ...newSession, sessionDate: e.target.value })}
              />
              <Button
                onClick={async () => {
                  if (!newSession.name.trim()) return;
                  const id = await exam.addSession({
                    name: newSession.name.trim(),
                    sessionDate: newSession.sessionDate,
                    classId: activeClass.id,
                  });
                  setNewSession({ name: "", sessionDate: new Date().toISOString().slice(0, 10) });
                  if (id) setSessionId(id);
                }}
              >
                <Plus className="h-4 w-4" /> Créer session
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sessionsForClass.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSessionId(s.id)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition ${
                    sessionId === s.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-secondary"
                  }`}
                >
                  {s.name} · {s.sessionDate}
                </button>
              ))}
              {sessionsForClass.length === 0 && (
                <span className="text-sm text-muted-foreground">Aucune session pour cette classe.</span>
              )}
            </div>
          </Card>

          {/* GRADES GRID */}
          {activeSession && subjects.length > 0 && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold">Saisie des notes — {activeSession.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {classStudents.length} élève(s) · {subjects.length} matière(s) · Notes /20
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive" size="sm"
                    onClick={() => confirm("Supprimer cette session et ses notes ?") && exam.deleteSession(activeSession.id)}
                  >
                    <Trash2 className="h-4 w-4" /> Supprimer session
                  </Button>
                  <Button
                    onClick={() => exportSessionPDF({
                      session: activeSession,
                      className: activeClass.name,
                      subjects,
                      results,
                      grades,
                    })}
                  >
                    <FileText className="h-4 w-4" /> Relevé PDF
                  </Button>
                </div>
              </div>

              {classStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun élève dans cette classe. Va dans l'onglet « Élèves » et choisis cette classe pour eux.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 sticky left-0 bg-secondary/60">Élève</th>
                        {subjects.map((s) => (
                          <th key={s.id} className="px-2 py-2 text-center min-w-24">
                            <div>{s.label}</div>
                            <div className="text-[10px] opacity-70">coef {s.coefficient}</div>
                          </th>
                        ))}
                        <th className="px-2 py-2 text-center">Moy.</th>
                        <th className="px-2 py-2 text-center">Rang</th>
                        <th className="px-2 py-2 text-center">Mention</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.studentId} className="border-t">
                          <td className="px-3 py-1 sticky left-0 bg-card font-medium">
                            {r.studentName}
                          </td>
                          {subjects.map((sub) => (
                            <td key={sub.id} className="px-1 py-1 text-center">
                              <Input
                                inputMode="decimal"
                                placeholder="—"
                                defaultValue={getScore(r.studentId, sub.id)}
                                onBlur={(e) => handleScoreChange(r.studentId, sub.id, e.target.value)}
                                className="h-8 w-16 text-center"
                              />
                            </td>
                          ))}
                          <td className={`px-2 py-1 text-center font-bold ${
                            r.average >= 10 ? "text-success" : r.filled ? "text-destructive" : "text-muted-foreground"
                          }`}>
                            {r.filled ? r.average.toFixed(2) : "—"}
                          </td>
                          <td className="px-2 py-1 text-center">
                            {r.rank > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                {r.rank <= 3 && <Trophy className="h-3.5 w-3.5 text-accent" />}
                                {r.rank}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-2 py-1 text-center text-xs">{r.mention}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
