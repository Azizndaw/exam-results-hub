import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { makeStudent, type Student } from "@/lib/checklist";
import { Trash2, UserPlus, Users } from "lucide-react";

interface Props {
  students: Student[];
  onChange: (s: Student[]) => void;
}

export function StudentsManager({ students, onChange }: Props) {
  const [draft, setDraft] = useState<Student>(() => makeStudent());

  function addStudent() {
    if (!draft.fullName.trim()) return;
    onChange([...students, { ...draft, id: makeStudent().id, createdAt: new Date().toISOString() }]);
    setDraft(makeStudent());
  }

  function removeStudent(id: string) {
    if (!confirm("Supprimer cet élève ?")) return;
    onChange(students.filter((s) => s.id !== id));
  }

  function updateStudent(id: string, patch: Partial<Student>) {
    onChange(students.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <UserPlus className="h-5 w-5 text-accent" />
          Ajouter un élève
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs">Nom complet</Label>
            <Input
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              placeholder="Ex : Awa Diop"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Date de naissance</Label>
            <Input
              type="date"
              value={draft.birthDate}
              onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lieu de naissance</Label>
            <Input
              value={draft.birthPlace}
              onChange={(e) => setDraft({ ...draft, birthPlace: e.target.value })}
              placeholder="Ex : Dakar"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">École</Label>
            <Input
              value={draft.school}
              onChange={(e) => setDraft({ ...draft, school: e.target.value })}
              placeholder="Ex : Lycée Blaise Diagne"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={addStudent} disabled={!draft.fullName.trim()}>
            <UserPlus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </Card>

      <div>
        <div className="flex items-center gap-2 mb-3 text-foreground font-semibold">
          <Users className="h-5 w-5 text-accent" />
          Élèves enregistrés ({students.length})
        </div>
        {students.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Aucun élève enregistré pour le moment.
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nom complet</th>
                  <th className="text-left px-3 py-2 font-medium">Naissance</th>
                  <th className="text-left px-3 py-2 font-medium">Lieu</th>
                  <th className="text-left px-3 py-2 font-medium">École</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-2 py-1">
                      <Input
                        value={s.fullName}
                        onChange={(e) => updateStudent(s.id, { fullName: e.target.value })}
                        className="h-8 border-transparent hover:border-input"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="date"
                        value={s.birthDate}
                        onChange={(e) => updateStudent(s.id, { birthDate: e.target.value })}
                        className="h-8 border-transparent hover:border-input"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        value={s.birthPlace}
                        onChange={(e) => updateStudent(s.id, { birthPlace: e.target.value })}
                        className="h-8 border-transparent hover:border-input"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        value={s.school}
                        onChange={(e) => updateStudent(s.id, { school: e.target.value })}
                        className="h-8 border-transparent hover:border-input"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStudent(s.id)}
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
      </div>
    </div>
  );
}
