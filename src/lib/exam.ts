export interface SchoolClass {
  id: string;
  name: string;
  level: string;
}

export interface Subject {
  id: string;
  classId: string;
  label: string;
  coefficient: number;
  position: number;
}

export interface ExamSession {
  id: string;
  name: string;
  sessionDate: string; // ISO date
  classId: string | null;
}

export interface Grade {
  id: string;
  sessionId: string;
  studentId: string;
  subjectId: string;
  score: number | null;
}

export interface RoomChecklistItem {
  id: string;
  label: string;
  category: string;
  position: number;
}

export interface RoomChecklistRecord {
  id: string;
  recordDate: string;
  classId: string | null;
  roomLabel: string;
  checks: Record<string, boolean>;
  notes: string;
}

export interface StudentResult {
  studentId: string;
  studentName: string;
  total: number; // sum(score * coef)
  totalCoef: number;
  average: number; // 0..20
  rank: number;
  mention: string;
  filled: number; // number of subjects graded
}

export function mention(avg: number): string {
  if (avg >= 16) return "Très Bien";
  if (avg >= 14) return "Bien";
  if (avg >= 12) return "Assez Bien";
  if (avg >= 10) return "Passable";
  if (avg > 0) return "Insuffisant";
  return "—";
}

/** Compute results for all students in a class for a given session. */
export function computeResults(
  studentIds: { id: string; name: string }[],
  subjects: Subject[],
  grades: Grade[],
): StudentResult[] {
  const bySession = new Map<string, Grade>();
  grades.forEach((g) => bySession.set(`${g.studentId}:${g.subjectId}`, g));

  const raw = studentIds.map((st) => {
    let total = 0;
    let totalCoef = 0;
    let filled = 0;
    subjects.forEach((sub) => {
      const g = bySession.get(`${st.id}:${sub.id}`);
      if (g && g.score != null && !Number.isNaN(g.score)) {
        total += g.score * sub.coefficient;
        totalCoef += sub.coefficient;
        filled += 1;
      }
    });
    const average = totalCoef > 0 ? Number((total / totalCoef).toFixed(2)) : 0;
    return {
      studentId: st.id,
      studentName: st.name,
      total: Number(total.toFixed(2)),
      totalCoef,
      average,
      rank: 0,
      mention: filled === 0 ? "—" : mention(average),
      filled,
    };
  });

  // Rank: highest average first; students with no grades go last
  const sorted = [...raw].sort((a, b) => {
    if (a.filled === 0 && b.filled === 0) return 0;
    if (a.filled === 0) return 1;
    if (b.filled === 0) return -1;
    return b.average - a.average;
  });
  let lastAvg: number | null = null;
  let lastRank = 0;
  sorted.forEach((s, i) => {
    if (s.filled === 0) {
      s.rank = 0;
      return;
    }
    if (lastAvg !== null && s.average === lastAvg) {
      s.rank = lastRank;
    } else {
      s.rank = i + 1;
      lastRank = s.rank;
      lastAvg = s.average;
    }
  });

  return raw.map((r) => sorted.find((s) => s.studentId === r.studentId)!);
}

export function defaultSubjectsFor(level: string): { label: string; coefficient: number }[] {
  const lvl = level.toLowerCase();
  if (lvl.includes("term") || lvl.includes("tle")) {
    return [
      { label: "Mathématiques", coefficient: 4 },
      { label: "Physique-Chimie", coefficient: 4 },
      { label: "SVT", coefficient: 3 },
      { label: "Français", coefficient: 3 },
      { label: "Anglais", coefficient: 2 },
      { label: "Histoire-Géo", coefficient: 2 },
      { label: "Philosophie", coefficient: 2 },
      { label: "EPS", coefficient: 1 },
    ];
  }
  if (lvl.includes("col") || /6|5|4|3/.test(lvl)) {
    return [
      { label: "Français", coefficient: 4 },
      { label: "Mathématiques", coefficient: 4 },
      { label: "Anglais", coefficient: 2 },
      { label: "Histoire-Géo", coefficient: 2 },
      { label: "SVT", coefficient: 2 },
      { label: "Physique-Chimie", coefficient: 2 },
      { label: "EPS", coefficient: 1 },
    ];
  }
  return [
    { label: "Français", coefficient: 3 },
    { label: "Mathématiques", coefficient: 3 },
    { label: "Anglais", coefficient: 2 },
  ];
}
