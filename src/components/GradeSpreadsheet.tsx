import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { makeStudent, makeSubject, type ExamSession } from "@/lib/exam";
import { Plus, Trash2, UserPlus } from "lucide-react";

interface Props {
  session: ExamSession;
  onChange: (s: ExamSession) => void;
}

export function GradeSpreadsheet({ session, onChange }: Props) {
  const { subjects, students } = session;

  const totalCoef = useMemo(
    () => subjects.reduce((a, s) => a + (Number(s.coefficient) || 0), 0),
    [subjects],
  );

  function updateStudentName(id: string, name: string) {
    onChange({
      ...session,
      students: students.map((s) => (s.id === id ? { ...s, name } : s)),
    });
  }

  function updateGrade(studentId: string, subjectId: string, raw: string) {
    let value: number | "" = "";
    if (raw !== "") {
      const n = Number(raw.replace(",", "."));
      if (!Number.isNaN(n)) value = Math.max(0, Math.min(20, n));
    }
    onChange({
      ...session,
      students: students.map((s) =>
        s.id === studentId ? { ...s, grades: { ...s.grades, [subjectId]: value } } : s,
      ),
    });
  }

  function addStudent() {
    onChange({ ...session, students: [...students, makeStudent(subjects)] });
  }

  function removeStudent(id: string) {
    onChange({ ...session, students: students.filter((s) => s.id !== id) });
  }

  function addSubject() {
    const newSub = makeSubject();
    onChange({
      ...session,
      subjects: [...subjects, newSub],
      students: students.map((s) => ({
        ...s,
        grades: { ...s.grades, [newSub.id]: "" },
      })),
    });
  }

  function removeSubject(id: string) {
    onChange({
      ...session,
      subjects: subjects.filter((s) => s.id !== id),
      students: students.map((s) => {
        const { [id]: _drop, ...rest } = s.grades;
        return { ...s, grades: rest };
      }),
    });
  }

  function updateSubjectName(id: string, name: string) {
    onChange({
      ...session,
      subjects: subjects.map((s) => (s.id === id ? { ...s, name } : s)),
    });
  }

  function updateSubjectCoef(id: string, raw: string) {
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    onChange({
      ...session,
      subjects: subjects.map((s) => (s.id === id ? { ...s, coefficient: n } : s)),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {students.length} élèves · {subjects.length} matières · coef. total{" "}
          <span className="font-semibold text-foreground">{totalCoef}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={addSubject} variant="outline" size="sm">
            <Plus className="h-4 w-4" /> Matière
          </Button>
          <Button onClick={addStudent} size="sm">
            <UserPlus className="h-4 w-4" /> Élève
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-secondary/60 sticky top-0">
              <tr>
                <th className="sticky left-0 z-10 bg-secondary/80 p-2 text-left font-semibold w-56 min-w-56 border-b border-r">
                  Élève
                </th>
                {subjects.map((sub) => (
                  <th key={sub.id} className="p-1.5 border-b border-r min-w-32">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <Input
                          value={sub.name}
                          onChange={(e) => updateSubjectName(sub.id, e.target.value)}
                          className="h-7 text-xs font-semibold border-0 bg-transparent focus-visible:bg-background px-1"
                        />
                        <button
                          onClick={() => removeSubject(sub.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          aria-label="Supprimer matière"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>coef</span>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={sub.coefficient}
                          onChange={(e) => updateSubjectCoef(sub.id, e.target.value)}
                          className="h-6 w-12 text-xs px-1"
                        />
                      </div>
                    </div>
                  </th>
                ))}
                <th className="p-2 border-b w-12"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr key={student.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="sticky left-0 z-10 bg-card p-1.5 border-b border-r">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-right">
                        {idx + 1}
                      </span>
                      <Input
                        value={student.name}
                        onChange={(e) => updateStudentName(student.id, e.target.value)}
                        placeholder="Nom complet"
                        className="h-8 border-0 bg-transparent focus-visible:bg-background"
                      />
                    </div>
                  </td>
                  {subjects.map((sub) => (
                    <td key={sub.id} className="p-1 border-b border-r">
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        step={0.25}
                        value={student.grades[sub.id] === "" ? "" : student.grades[sub.id]}
                        onChange={(e) => updateGrade(student.id, sub.id, e.target.value)}
                        className="h-8 text-center border-0 bg-transparent focus-visible:bg-background"
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="p-1 border-b text-center">
                    <button
                      onClick={() => removeStudent(student.id)}
                      className="text-muted-foreground hover:text-destructive p-1.5 rounded transition-colors"
                      aria-label="Supprimer élève"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td
                    colSpan={subjects.length + 2}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Aucun élève. Cliquez sur « Élève » pour en ajouter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
