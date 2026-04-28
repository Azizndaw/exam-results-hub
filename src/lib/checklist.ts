export type ChecklistCategory =
  | "Identité & Présence"
  | "Salle & Installation"
  | "Matériel & Documents"
  | "Surveillance"
  | "Déroulement"
  | "Fin d'épreuve";

export interface ChecklistItem {
  id: string;
  label: string;
  category: ChecklistCategory;
}

export const CATEGORIES: ChecklistCategory[] = [
  "Identité & Présence",
  "Salle & Installation",
  "Matériel & Documents",
  "Surveillance",
  "Déroulement",
  "Fin d'épreuve",
];

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
  // Identité & Présence
  { id: "present", label: "Présent", category: "Identité & Présence" },
  { id: "id_checked", label: "Pièce d'identité vérifiée", category: "Identité & Présence" },
  { id: "convocation", label: "Convocation présentée", category: "Identité & Présence" },
  { id: "signed_in", label: "Émargement signé (entrée)", category: "Identité & Présence" },
  { id: "uniform", label: "Tenue / uniforme correct", category: "Identité & Présence" },

  // Salle & Installation
  { id: "table_numbered", label: "Table numérotée attribuée", category: "Salle & Installation" },
  { id: "seating_plan", label: "Plan de salle respecté", category: "Salle & Installation" },
  { id: "spacing_ok", label: "Espacement réglementaire respecté", category: "Salle & Installation" },
  { id: "phone_off", label: "Téléphone éteint et déposé", category: "Salle & Installation" },
  { id: "bag_stored", label: "Sac / effets personnels rangés", category: "Salle & Installation" },

  // Matériel & Documents
  { id: "material", label: "Matériel autorisé complet (stylo, règle…)", category: "Matériel & Documents" },
  { id: "calculator", label: "Calculatrice conforme (si autorisée)", category: "Matériel & Documents" },
  { id: "subject_received", label: "Sujet d'examen reçu", category: "Matériel & Documents" },
  { id: "answer_sheet", label: "Copie / feuille d'examen reçue", category: "Matériel & Documents" },
  { id: "scratch_paper", label: "Brouillon distribué", category: "Matériel & Documents" },
  { id: "anonymity", label: "En-tête anonymisé correctement rempli", category: "Matériel & Documents" },
  { id: "numbering", label: "Numéro de table / matricule reporté", category: "Matériel & Documents" },

  // Surveillance
  { id: "surveillance_assigned", label: "Surveillant assigné à la salle", category: "Surveillance" },
  { id: "instructions_read", label: "Consignes lues à voix haute", category: "Surveillance" },
  { id: "id_verified_during", label: "Identité contrôlée pendant l'épreuve", category: "Surveillance" },
  { id: "no_cheating", label: "Aucune tentative de fraude observée", category: "Surveillance" },
  { id: "incident_logged", label: "Incident éventuel consigné", category: "Surveillance" },

  // Déroulement
  { id: "on_time", label: "Arrivé(e) à l'heure", category: "Déroulement" },
  { id: "start_time", label: "Heure de début respectée", category: "Déroulement" },
  { id: "behavior", label: "Comportement correct", category: "Déroulement" },
  { id: "bathroom_logged", label: "Sortie WC consignée (si applicable)", category: "Déroulement" },
  { id: "extra_sheet", label: "Feuille supplémentaire fournie (si demandée)", category: "Déroulement" },

  // Fin d'épreuve
  { id: "copy_handed", label: "Copie remise au surveillant", category: "Fin d'épreuve" },
  { id: "copy_numbered", label: "Copie numérotée et paginée", category: "Fin d'épreuve" },
  { id: "signed_out", label: "Émargement signé (sortie)", category: "Fin d'épreuve" },
  { id: "room_clean", label: "Place laissée propre", category: "Fin d'épreuve" },
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

export function makeItem(
  label = "Nouvel item",
  category: ChecklistCategory = "Déroulement",
): ChecklistItem {
  return { id: uid(), label, category };
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
