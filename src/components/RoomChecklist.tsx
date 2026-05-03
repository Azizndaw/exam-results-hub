import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useExamData } from "@/hooks/useExamData";
import { todayISO, formatDateFR } from "@/lib/checklist";
import { ShieldCheck, FileText, CalendarDays, CheckCircle2 } from "lucide-react";
import { exportRoomChecklistPDF } from "@/lib/report";

export function RoomChecklist() {
  const exam = useExamData();
  const { data } = exam;
  const [date, setDate] = useState(todayISO());
  const [classId, setClassId] = useState<string>("");
  const [roomLabel, setRoomLabel] = useState("Salle 1");

  // Local state for optimistic updates
  const [localChecks, setLocalChecks] = useState<Record<string, boolean>>({});
  const [localNotes, setLocalNotes] = useState("");

  const existing = useMemo(
    () => data.roomRecords.find(
      (r) => r.recordDate === date && r.classId === (classId || null) && r.roomLabel === roomLabel,
    ),
    [data.roomRecords, date, classId, roomLabel],
  );

  // Sync local state when the selection changes or external data reloads
  useEffect(() => {
    if (existing) {
      setLocalChecks(existing.checks);
      setLocalNotes(existing.notes);
    } else {
      setLocalChecks({});
      setLocalNotes("");
    }
  }, [existing]);

  const validated = existing?.validated || false;
  const categories = useMemo(() => {
    const set = new Set<string>();
    data.roomItems.forEach((i) => set.add(i.category));
    return Array.from(set);
  }, [data.roomItems]);

  const total = data.roomItems.length;
  const checkedCount = data.roomItems.filter((i) => localChecks[i.id]).length;

  async function toggle(itemId: string) {
    if (validated) return;
    const next = { ...localChecks, [itemId]: !localChecks[itemId] };
    // Update UI immediately
    setLocalChecks(next);
    // Persist in background
    await exam.upsertRoomRecord({
      recordDate: date, classId: classId || null, roomLabel, checks: next, notes: localNotes, validated: false,
    });
  }

  async function saveNotes(value: string) {
    if (validated) return;
    setLocalNotes(value);
    await exam.upsertRoomRecord({
      recordDate: date, classId: classId || null, roomLabel, checks: localChecks, notes: value, validated: false,
    });
  }

  async function handleFinalize() {
    if (window.confirm("Voulez-vous vraiment finaliser ce PV ? Cela verrouillera les modifications.")) {
      await exam.upsertRoomRecord({
        recordDate: date, classId: classId || null, roomLabel, checks: localChecks, notes: localNotes, validated: true,
      });
    }
  }

  const className = data.classes.find((c) => c.id === classId)?.name || "Toutes classes";

  return (
    <div className="space-y-5">
      <Card className="p-4 bg-secondary/30 text-sm text-muted-foreground">
        <strong className="text-foreground">PV de salle :</strong> coche en temps réel les vérifications du jour. Une fois terminé, clique sur "Finaliser" pour verrouiller le rapport.
        {validated && (
          <span className="block mt-1 text-success font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Ce rapport a été finalisé et est maintenant verrouillé.
          </span>
        )}
      </Card>

      <Card className="p-4 grid gap-3 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> Date
          </Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Classe / niveau</Label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            <option value="">— Toutes classes —</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Salle</Label>
          <Input value={roomLabel} onChange={(e) => setRoomLabel(e.target.value)} placeholder="Salle 1" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Avancement</Label>
          <div className="h-9 inline-flex items-center font-semibold">
            {checkedCount}/{total}{" "}
            <span className="ml-2 text-xs text-muted-foreground">
              ({total ? Math.round((checkedCount / total) * 100) : 0}%)
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((cat) => {
          const items = data.roomItems.filter((i) => i.category === cat);
          return (
            <Card key={cat} className={`p-4 space-y-2 ${validated ? "opacity-80" : ""}`}>
              <div className="text-xs font-semibold uppercase tracking-wide text-accent flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> {cat}
              </div>
              <ul className="space-y-1.5">
                {items.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => toggle(it.id)}
                      disabled={validated}
                      className={`w-full text-left flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition ${localChecks[it.id]
                          ? "bg-success/10 border-success text-foreground"
                          : "bg-background hover:bg-secondary"
                        } ${validated ? "cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`h-5 w-5 inline-flex items-center justify-center rounded border ${localChecks[it.id]
                            ? "bg-success text-success-foreground border-success"
                            : "border-input"
                          }`}
                      >
                        {localChecks[it.id] ? "✓" : ""}
                      </span>
                      {it.label}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 space-y-2">
        <Label className="text-xs">Observations / incidents</Label>
        <Textarea
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={(e) => saveNotes(e.target.value)}
          disabled={validated}
          placeholder="Remarques sur le déroulement, incidents éventuels…"
          rows={3}
        />
      </Card>

      <div className="flex justify-between items-center">
        {!validated ? (
          <Button
            variant="default"
            className="bg-accent hover:bg-accent/90"
            onClick={handleFinalize}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Valider et Finaliser
          </Button>
        ) : (
          <div className="text-sm font-medium text-success flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Rapport Finalisé
          </div>
        )}

        <Button
          variant="outline"
          onClick={() =>
            exportRoomChecklistPDF({
              date, className, roomLabel,
              items: data.roomItems, checks: localChecks, notes: localNotes,
            })
          }
        >
          <FileText className="mr-2 h-4 w-4" /> PV de salle PDF — {formatDateFR(date)}
        </Button>
      </div>
    </div>
  );
}
