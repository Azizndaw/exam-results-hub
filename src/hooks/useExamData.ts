import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  ExamSession,
  Grade,
  RoomChecklistItem,
  RoomChecklistRecord,
  SchoolClass,
  Subject,
} from "@/lib/exam";

export interface ExamData {
  classes: SchoolClass[];
  subjects: Subject[];
  sessions: ExamSession[];
  grades: Grade[];
  roomItems: RoomChecklistItem[];
  roomRecords: RoomChecklistRecord[];
}

const empty: ExamData = {
  classes: [],
  subjects: [],
  sessions: [],
  grades: [],
  roomItems: [],
  roomRecords: [],
};

export function useExamData() {
  const [data, setData] = useState<ExamData>(empty);
  const [hydrated, setHydrated] = useState(false);

  const reload = useCallback(async () => {
    const [c, s, se, g, ri, rr] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("subjects").select("*").order("position"),
      supabase.from("exam_sessions").select("*").order("session_date", { ascending: false }),
      supabase.from("grades").select("*"),
      supabase.from("room_checklist_items").select("*").order("position"),
      supabase.from("room_checklist_records").select("*"),
    ]);
    setData({
      classes: (c.data ?? []).map((r: any) => ({ id: r.id, name: r.name, level: r.level })),
      subjects: (s.data ?? []).map((r: any) => ({
        id: r.id, classId: r.class_id, label: r.label,
        coefficient: Number(r.coefficient), position: r.position,
      })),
      sessions: (se.data ?? []).map((r: any) => ({
        id: r.id, name: r.name, sessionDate: r.session_date, classId: r.class_id,
      })),
      grades: (g.data ?? []).map((r: any) => ({
        id: r.id, sessionId: r.session_id, studentId: r.student_id,
        subjectId: r.subject_id, score: r.score == null ? null : Number(r.score),
      })),
      roomItems: (ri.data ?? []).map((r: any) => ({
        id: r.id, label: r.label, category: r.category, position: r.position,
      })),
      roomRecords: (rr.data ?? []).map((r: any) => ({
        id: r.id, recordDate: r.record_date, classId: r.class_id,
        roomLabel: r.room_label, checks: r.checks || {}, notes: r.notes || "",
      })),
    });
    setHydrated(true);
  }, []);

  // expose hydrated separately for guards

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("exam-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "classes" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "subjects" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_sessions" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "grades" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_checklist_items" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_checklist_records" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [reload]);

  // ----- mutations -----
  const addClass = async (name: string, level: string) => {
    await supabase.from("classes").insert({ name, level });
  };
  const updateClass = async (id: string, patch: Partial<SchoolClass>) => {
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.level !== undefined) dbPatch.level = patch.level;
    await supabase.from("classes").update(dbPatch).eq("id", id);
  };
  const deleteClass = async (id: string) => {
    await supabase.from("classes").delete().eq("id", id);
  };

  const addSubject = async (s: Omit<Subject, "id" | "position"> & { position?: number }) => {
    await supabase.from("subjects").insert({
      class_id: s.classId, label: s.label,
      coefficient: s.coefficient, position: s.position ?? 0,
    });
  };
  const updateSubject = async (id: string, patch: Partial<Subject>) => {
    const dbPatch: any = {};
    if (patch.label !== undefined) dbPatch.label = patch.label;
    if (patch.coefficient !== undefined) dbPatch.coefficient = patch.coefficient;
    if (patch.position !== undefined) dbPatch.position = patch.position;
    await supabase.from("subjects").update(dbPatch).eq("id", id);
  };
  const deleteSubject = async (id: string) => {
    await supabase.from("subjects").delete().eq("id", id);
  };

  const addSession = async (s: Omit<ExamSession, "id">) => {
    const { data: row } = await supabase.from("exam_sessions").insert({
      name: s.name, session_date: s.sessionDate, class_id: s.classId,
    }).select("id").single();
    return row?.id as string | undefined;
  };
  const updateSession = async (id: string, patch: Partial<ExamSession>) => {
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.sessionDate !== undefined) dbPatch.session_date = patch.sessionDate;
    if (patch.classId !== undefined) dbPatch.class_id = patch.classId;
    await supabase.from("exam_sessions").update(dbPatch).eq("id", id);
  };
  const deleteSession = async (id: string) => {
    await supabase.from("exam_sessions").delete().eq("id", id);
  };

  const setGrade = async (sessionId: string, studentId: string, subjectId: string, score: number | null) => {
    await supabase.from("grades").upsert(
      { session_id: sessionId, student_id: studentId, subject_id: subjectId, score },
      { onConflict: "session_id,student_id,subject_id" },
    );
  };

  const upsertRoomRecord = async (r: Omit<RoomChecklistRecord, "id">) => {
    await supabase.from("room_checklist_records").upsert(
      {
        record_date: r.recordDate,
        class_id: r.classId,
        room_label: r.roomLabel,
        checks: r.checks,
        notes: r.notes,
      },
      { onConflict: "record_date,class_id,room_label" },
    );
  };

  return {
    data, hydrated, reload,
    addClass, updateClass, deleteClass,
    addSubject, updateSubject, deleteSubject,
    addSession, updateSession, deleteSession,
    setGrade,
    upsertRoomRecord,
  };
}
