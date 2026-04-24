import { CLASS_OPTIONS, type ClassKey } from "@/lib/exam";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, BookOpen } from "lucide-react";

interface Props {
  schoolName: string;
  onSchoolNameChange: (v: string) => void;
  onSelectClass: (c: ClassKey) => void;
}

const CLASS_META: Record<ClassKey, { icon: string; desc: string }> = {
  "Terminale S": { icon: "🧪", desc: "Série Scientifique" },
  "Terminale L": { icon: "📚", desc: "Série Littéraire" },
  "Terminale L'": { icon: "🌍", desc: "Littéraire option Arabe" },
  "3ème": { icon: "🎓", desc: "Cycle moyen" },
};

export function ClassPicker({ schoolName, onSchoolNameChange, onSelectClass }: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div className="text-center space-y-3">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Bienvenue sur ExamTrack
        </h1>
        <p className="text-muted-foreground">
          Saisie rapide des notes d'examen blanc et calcul automatique des résultats.
        </p>
      </div>

      <Card className="p-6 space-y-2">
        <Label htmlFor="school" className="text-sm font-medium">
          Nom de l'école
        </Label>
        <Input
          id="school"
          value={schoolName}
          onChange={(e) => onSchoolNameChange(e.target.value)}
          placeholder="Ex : Lycée Blaise Diagne"
          className="h-11"
        />
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-accent" />
          Choisissez une classe
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CLASS_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => onSelectClass(c)}
              className="group flex items-center gap-4 rounded-xl border bg-card p-5 text-left transition-all hover:border-accent hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="text-3xl">{CLASS_META[c].icon}</span>
              <div>
                <div className="font-semibold text-foreground group-hover:text-accent transition-colors">
                  {c}
                </div>
                <div className="text-xs text-muted-foreground">{CLASS_META[c].desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
