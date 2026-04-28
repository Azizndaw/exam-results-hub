export interface ChecklistItem {
  id: string;
  label: string;
}

export interface Student {
  id: string;
  fullName: string;
  birthDate: string; // ISO yyyy-mm-dd
  birthPlace: string;
  school: string;
  className?: string;
  createdAt: string;
}

/** Map of dateISO -> studentId -> itemId -> boolean */
export type DailyRecords = Record<string, Record<string, Record<string, boolean>>>;

export interface AppState {
  students: Student[];
  items: ChecklistItem[];
  records: DailyRecords;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: "present", label: "Présent" },
  { id: "uniform", label: "Uniforme correct" },
  { id: "homework", label: "Devoirs faits" },
  { id: "material", label: "Matériel complet" },
  { id: "behavior", label: "Bon comportement" },
  { id: "participation", label: "Participation active" },
];

export function makeStudent(partial: Partial<Student> = {}): Student {
  return {
    id: uid(),
    fullName: "",
    birthDate: "",
    birthPlace: "",
    school: "",
    className: "",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

export function makeItem(label = "Nouvel item"): ChecklistItem {
  return { id: uid(), label };
}

export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateFR(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export interface DayStats {
  date: string;
  studentCount: number;
  presentCount: number;
  attendanceRate: number; // 0-100
  completionRate: number; // 0-100, % of all checked boxes among possible
}

export function getDayStats(
  state: AppState,
  date: string,
): DayStats {
  const dayRec = state.records[date] || {};
  const studentCount = state.students.length;
  const itemCount = state.items.length || 1;
  let present = 0;
  let checked = 0;
  state.students.forEach((st) => {
    const r = dayRec[st.id] || {};
    if (r["present"]) present += 1;
    state.items.forEach((it) => {
      if (r[it.id]) checked += 1;
    });
  });
  return {
    date,
    studentCount,
    presentCount: present,
    attendanceRate: studentCount ? Number(((present / studentCount) * 100).toFixed(1)) : 0,
    completionRate: studentCount
      ? Number(((checked / (studentCount * itemCount)) * 100).toFixed(1))
      : 0,
  };
}

export interface StudentCompletion {
  id: string;
  name: string;
  totalChecks: number;
  totalPossible: number;
  rate: number; // 0-100
  daysTracked: number;
}

export function getStudentCompletion(state: AppState): StudentCompletion[] {
  const dates = Object.keys(state.records);
  return state.students.map((st) => {
    let checks = 0;
    let possible = 0;
    let days = 0;
    dates.forEach((d) => {
      const rec = state.records[d]?.[st.id];
      if (rec) {
        days += 1;
        state.items.forEach((it) => {
          possible += 1;
          if (rec[it.id]) checks += 1;
        });
      }
    });
    return {
      id: st.id,
      name: st.fullName || "—",
      totalChecks: checks,
      totalPossible: possible,
      rate: possible ? Number(((checks / possible) * 100).toFixed(1)) : 0,
      daysTracked: days,
    };
  });
}

export interface TrendPoint {
  date: string;
  attendanceRate: number;
  completionRate: number;
}

export function getTrend(state: AppState, days = 14): TrendPoint[] {
  const points: TrendPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const s = getDayStats(state, iso);
    points.push({
      date: iso,
      attendanceRate: s.attendanceRate,
      completionRate: s.completionRate,
    });
  }
  return points;
}

export function getTrackedDates(state: AppState): string[] {
  return Object.keys(state.records).sort((a, b) => b.localeCompare(a));
}
