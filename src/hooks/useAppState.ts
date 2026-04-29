import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppState, ChecklistItem, Student } from "@/lib/checklist";

function emptyState(): AppState {
  return { students: [], items: [], records: {} };
}

interface DbStudent {
  id: string;
  full_name: string;
  birth_date: string | null;
  birth_place: string;
  school: string;
  class_name: string;
  created_at: string;
}
interface DbItem {
  id: string;
  label: string;
  category: string;
  position: number;
}
interface DbRecord {
  record_date: string;
  student_id: string;
  checks: Record<string, boolean>;
}

const mapStudent = (r: DbStudent): Student => ({
  id: r.id,
  fullName: r.full_name,
  birthDate: r.birth_date ?? "",
  birthPlace: r.birth_place,
  school: r.school,
  className: r.class_name,
  createdAt: r.created_at,
});

const mapItem = (r: DbItem): ChecklistItem => ({
  id: r.id,
  label: r.label,
  category: r.category as ChecklistItem["category"],
});

export function useAppState() {
  const [state, setStateInternal] = useState<AppState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const reload = useCallback(async () => {
    const [s, i, r] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: true }),
      supabase.from("checklist_items").select("*").order("position", { ascending: true }),
      supabase.from("daily_records").select("record_date, student_id, checks"),
    ]);
    const records: AppState["records"] = {};
    (r.data as DbRecord[] | null)?.forEach((row) => {
      records[row.record_date] ??= {};
      records[row.record_date][row.student_id] = row.checks || {};
    });
    setStateInternal({
      students: ((s.data as DbStudent[] | null) ?? []).map(mapStudent),
      items: ((i.data as DbItem[] | null) ?? []).map(mapItem),
      records,
    });
    setHydrated(true);
  }, []);

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("examtrack-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_items" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_records" }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [reload]);

  // Reconcile a target AppState with the DB by diffing against current state
  const setState = useCallback(async (next: AppState | ((p: AppState) => AppState)) => {
    const prev = stateRef.current;
    const target = typeof next === "function" ? (next as (p: AppState) => AppState)(prev) : next;

    // Optimistic UI
    setStateInternal(target);

    // ----- Students diff -----
    const prevStudents = new Map(prev.students.map((s) => [s.id, s]));
    const nextStudents = new Map(target.students.map((s) => [s.id, s]));

    const studentInserts: Student[] = [];
    const studentUpdates: Student[] = [];
    target.students.forEach((s) => {
      const old = prevStudents.get(s.id);
      if (!old) studentInserts.push(s);
      else if (JSON.stringify(old) !== JSON.stringify(s)) studentUpdates.push(s);
    });
    const studentDeletes = prev.students.filter((s) => !nextStudents.has(s.id));

    for (const s of studentInserts) {
      await supabase.from("students").insert({
        id: s.id,
        full_name: s.fullName,
        birth_date: s.birthDate || null,
        birth_place: s.birthPlace,
        school: s.school,
        class_name: s.className ?? "",
      });
    }
    for (const s of studentUpdates) {
      await supabase.from("students").update({
        full_name: s.fullName,
        birth_date: s.birthDate || null,
        birth_place: s.birthPlace,
        school: s.school,
        class_name: s.className ?? "",
      }).eq("id", s.id);
    }
    if (studentDeletes.length)
      await supabase.from("students").delete().in("id", studentDeletes.map((s) => s.id));

    // ----- Items diff -----
    const prevItems = new Map(prev.items.map((i) => [i.id, i]));
    const nextItems = new Map(target.items.map((i) => [i.id, i]));

    const itemInserts: { item: ChecklistItem; pos: number }[] = [];
    const itemUpdates: ChecklistItem[] = [];
    target.items.forEach((it, idx) => {
      const old = prevItems.get(it.id);
      if (!old) itemInserts.push({ item: it, pos: (idx + 1) * 10 });
      else if (old.label !== it.label || old.category !== it.category) itemUpdates.push(it);
    });
    const itemDeletes = prev.items.filter((i) => !nextItems.has(i.id));

    for (const { item, pos } of itemInserts) {
      await supabase.from("checklist_items").insert({
        id: item.id,
        label: item.label,
        category: item.category,
        position: pos,
      });
    }
    for (const it of itemUpdates) {
      await supabase.from("checklist_items").update({
        label: it.label,
        category: it.category,
      }).eq("id", it.id);
    }
    if (itemDeletes.length)
      await supabase.from("checklist_items").delete().in("id", itemDeletes.map((i) => i.id));

    // ----- Records diff (per date+student) -----
    const allDates = new Set([...Object.keys(prev.records), ...Object.keys(target.records)]);
    for (const date of allDates) {
      const oldDay = prev.records[date] || {};
      const newDay = target.records[date] || {};
      const studentIds = new Set([...Object.keys(oldDay), ...Object.keys(newDay)]);
      for (const sid of studentIds) {
        const oldChecks = oldDay[sid];
        const newChecks = newDay[sid];
        const oldStr = oldChecks ? JSON.stringify(oldChecks) : null;
        const newStr = newChecks ? JSON.stringify(newChecks) : null;
        if (oldStr === newStr) continue;
        if (newChecks) {
          await supabase.from("daily_records").upsert(
            { record_date: date, student_id: sid, checks: newChecks },
            { onConflict: "record_date,student_id" },
          );
        } else {
          await supabase.from("daily_records")
            .delete()
            .eq("record_date", date)
            .eq("student_id", sid);
        }
      }
    }
  }, []);

  const reset = useCallback(async () => {
    await Promise.all([
      supabase.from("daily_records").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    ]);
    await reload();
  }, [reload]);

  return { state, setState, reset, hydrated };
}
