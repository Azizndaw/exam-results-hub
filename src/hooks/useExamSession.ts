import { useEffect, useState } from "react";
import {
  CLASS_OPTIONS,
  SUBJECT_TEMPLATES,
  makeStudent,
  type ClassKey,
  type ExamSession,
} from "@/lib/exam";

const STORAGE_KEY = "examtrack:session:v1";

function defaultSession(): ExamSession {
  return {
    schoolName: "",
    className: "",
    threshold: 10,
    subjects: [],
    students: [],
    date: new Date().toISOString(),
  };
}

export function useExamSession() {
  const [session, setSession] = useState<ExamSession>(defaultSession);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ExamSession;
        if (parsed && typeof parsed === "object") setSession(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }
  }, [session, hydrated]);

  function selectClass(className: ClassKey) {
    if (!CLASS_OPTIONS.includes(className)) return;
    const subjects = SUBJECT_TEMPLATES[className].map((s) => ({ ...s }));
    const students = Array.from({ length: 5 }, () => makeStudent(subjects));
    setSession((s) => ({ ...s, className, subjects, students }));
  }

  function reset() {
    setSession(defaultSession());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return { session, setSession, selectClass, reset, hydrated };
}
