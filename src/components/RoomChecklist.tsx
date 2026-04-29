import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useExamData } from "@/hooks/useExamData";
import { todayISO, formatDateFR } from "@/lib/checklist";
import { ShieldCheck, FileText, CalendarDays } from "lucide-react";
import { exportRoomChecklistPDF } from "@/lib/report";

export function RoomChecklist() {
  const exam = useExamData();
  const { data } = exam;
  const [date, setDate] = useState(todayISO());
  const [classId, setClassId] = useState<string>("");
  const [roomLabel, setRoomLabel] = useState("Salle 1");

  const existing = useMemo(
    () => data.roomRecords.find(
      (r) => r.recordDate === date && r.classId === (classId || null) && r.roomLabel === roomLabel,
    ),
    [data.roomRecords, date, classId, roomLabel],
  );

  const checks = existing?.checks || {};
  const notes = existing?.notes || "";

  const categories = useMemo(() => {
    const set = new Set<string>();
    data.roomItems.forEach((i) => set.add(i.category));
    return Array.from(set);
  }, [data.roomItems]);

  const total = data.roomItems.length;
  const checkedCount = data.roomItems.filter((i) => checks[i.id]).length;

  async function toggle(itemId: string) {
    const next = { ...checks, [itemId]: !checks[itemId] };
    await exam.upsertRoomRecord({
      recordDate: date, classId: classId || null, roomLabel, checks: next, notes,
    });
  }

  async function saveNotes(value: string) {
    await exam.upsertRoomRecord({
      recordDate: date, classId: classId || null, roomLabel, checks, notes: value,
    });
  }

  const className = data.classes.find((c) => c.id === classId)?.name || "Toutes classes";

  return (
    <div className="space-y-5">
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
            <Card key={cat} className="p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-accent flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> {cat}
              </div>
              <ul className="space-y-1.5">
                {items.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => toggle(it.id)}
                      className={`w-full text-left flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition ${
                        checks[it.id]
                          ? "bg-success/10 border-success text-foreground"
                          : "bg-background hover:bg-secondary"
                      }`}
                    >
                      <span
                        className={`h-5 w-5 inline-flex items-center justify-center rounded border ${
                          checks[it.id]
                            ? "bg-success text-success-foreground border-success"
                            : "border-input"
                        }`}
                      >
                        {checks[it.id] ? "✓" : ""}
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
          defaultValue={notes}
          onBlur={(e) => saveNotes(e.target.value)}
          placeholder="Remarques sur le déroulement, incidents éventuels…"
          rows={3}
        />
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() =>
            exportRoomChecklistPDF({
              date, className, roomLabel,
              items: data.roomItems, checks, notes,
            })
          }
        >
          <FileText className="h-4 w-4" /> PV de salle PDF — {formatDateFR(date)}
        </Button>
      </div>
    </div>
  );
}
