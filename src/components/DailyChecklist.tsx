import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  CATEGORIES,
  formatDateFR,
  getDayStats,
  makeItem,
  todayISO,
  type AppState,
  type ChecklistCategory,
  type ChecklistItem,
} from "@/lib/checklist";
import { exportDailyPDF } from "@/lib/report";
import { CalendarDays, FileText, Plus, Trash2, ListChecks } from "lucide-react";

interface Props {
  state: AppState;
  onChange: (s: AppState) => void;
}

export function DailyChecklist({ state, onChange }: Props) {
  const [date, setDate] = useState<string>(todayISO());
  const [newItem, setNewItem] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<ChecklistCategory>("Déroulement");

  const dayRec = state.records[date] || {};
  const stats = getDayStats(state, date);

  function toggle(studentId: string, itemId: string) {
    const current = dayRec[studentId] || {};
    const next: AppState = {
      ...state,
      records: {
        ...state.records,
        [date]: {
          ...dayRec,
          [studentId]: { ...current, [itemId]: !current[itemId] },
        },
      },
    };
    onChange(next);
  }

  function toggleAllForStudent(studentId: string, value: boolean) {
    const current: Record<string, boolean> = {};
    state.items.forEach((it) => (current[it.id] = value));
    onChange({
      ...state,
      records: {
        ...state.records,
        [date]: { ...dayRec, [studentId]: current },
      },
    });
  }

  function addItem() {
    if (!newItem.trim()) return;
    onChange({ ...state, items: [...state.items, makeItem(newItem.trim())] });
    setNewItem("");
  }

  function updateItem(id: string, label: string) {
    onChange({
      ...state,
      items: state.items.map((i) => (i.id === id ? { ...i, label } : i)),
    });
  }

  function removeItem(id: string) {
    if (!confirm("Supprimer cet item de la checklist ?")) return;
    onChange({ ...state, items: state.items.filter((i) => i.id !== id) });
  }

  if (state.students.length === 0) {
    return (
      <Card className="p-10 text-center space-y-2">
        <ListChecks className="h-10 w-10 text-muted-foreground mx-auto" />
        <div className="font-semibold">Aucun élève</div>
        <div className="text-sm text-muted-foreground">
          Ajoute d'abord des élèves dans l'onglet « Élèves ».
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-4 grid gap-3 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> Date du jour
          </Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Stat label="Effectif" value={stats.studentCount} />
        <Stat label="Présents" value={`${stats.presentCount} (${stats.attendanceRate}%)`} />
        <Stat label="Complétion" value={`${stats.completionRate}%`} accent />
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-accent" /> Items de la checklist
        </div>
        <div className="flex flex-wrap gap-2">
          {state.items.map((it) => (
            <ItemChip
              key={it.id}
              item={it}
              onChange={(label) => updateItem(it.id, label)}
              onRemove={() => removeItem(it.id)}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Ajouter un item (ex : Tenue de sport)"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button onClick={addItem} disabled={!newItem.trim()}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-medium sticky left-0 bg-secondary/60">
                Élève
              </th>
              {state.items.map((it) => (
                <th key={it.id} className="px-2 py-2 font-medium text-center min-w-24">
                  {it.label}
                </th>
              ))}
              <th className="px-2 py-2 font-medium text-center">Score</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {state.students.map((st) => {
              const rec = dayRec[st.id] || {};
              const score = state.items.filter((it) => rec[it.id]).length;
              const allChecked = score === state.items.length && state.items.length > 0;
              return (
                <tr key={st.id} className="border-t">
                  <td className="px-3 py-2 sticky left-0 bg-card">
                    <div className="font-medium text-foreground">{st.fullName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{st.school}</div>
                  </td>
                  {state.items.map((it) => (
                    <td key={it.id} className="px-2 py-2 text-center">
                      <button
                        onClick={() => toggle(st.id, it.id)}
                        className={`h-7 w-7 rounded-md border transition-colors inline-flex items-center justify-center ${
                          rec[it.id]
                            ? "bg-success text-success-foreground border-success"
                            : "bg-background hover:bg-secondary"
                        }`}
                        aria-label={`${it.label} pour ${st.fullName}`}
                      >
                        {rec[it.id] ? "✓" : ""}
                      </button>
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-semibold">
                    {score}/{state.items.length}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllForStudent(st.id, !allChecked)}
                      className="text-xs"
                    >
                      {allChecked ? "Décocher" : "Tout cocher"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => exportDailyPDF(state, date)}>
          <FileText className="h-4 w-4" /> Rapport PDF du {formatDateFR(date)}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function ItemChip({
  item,
  onChange,
  onRemove,
}: {
  item: ChecklistItem;
  onChange: (label: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border bg-secondary/40 pl-3 pr-1 py-1">
      <input
        value={item.label}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none text-sm w-auto min-w-20"
        size={Math.max(item.label.length, 8)}
      />
      <button
        onClick={onRemove}
        className="h-6 w-6 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-background"
        aria-label="Supprimer l'item"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
