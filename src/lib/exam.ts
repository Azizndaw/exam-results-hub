export type ClassKey = "Terminale S" | "Terminale L" | "Terminale L'" | "3ème";

export interface Subject {
  id: string;
  name: string;
  coefficient: number;
}

export interface Student {
  id: string;
  name: string;
  grades: Record<string, number | "">;
}

export interface ExamSession {
  schoolName: string;
  className: ClassKey | "";
  threshold: number;
  subjects: Subject[];
  students: Student[];
  date: string;
}

export const CLASS_OPTIONS: ClassKey[] = ["Terminale S", "Terminale L", "Terminale L'", "3ème"];

const uid = () => Math.random().toString(36).slice(2, 10);

export const SUBJECT_TEMPLATES: Record<ClassKey, Subject[]> = {
  "Terminale S": [
    { id: uid(), name: "Mathématiques", coefficient: 7 },
    { id: uid(), name: "Physique-Chimie", coefficient: 5 },
    { id: uid(), name: "Sciences de la Vie et de la Terre", coefficient: 4 },
    { id: uid(), name: "Français", coefficient: 2 },
    { id: uid(), name: "Philosophie", coefficient: 2 },
    { id: uid(), name: "Anglais", coefficient: 2 },
    { id: uid(), name: "Histoire-Géographie", coefficient: 2 },
    { id: uid(), name: "EPS", coefficient: 1 },
  ],
  "Terminale L": [
    { id: uid(), name: "Philosophie", coefficient: 6 },
    { id: uid(), name: "Français", coefficient: 4 },
    { id: uid(), name: "Histoire-Géographie", coefficient: 4 },
    { id: uid(), name: "Anglais", coefficient: 4 },
    { id: uid(), name: "LV2", coefficient: 3 },
    { id: uid(), name: "Mathématiques", coefficient: 2 },
    { id: uid(), name: "EPS", coefficient: 1 },
  ],
  "Terminale L'": [
    { id: uid(), name: "Philosophie", coefficient: 5 },
    { id: uid(), name: "Français", coefficient: 4 },
    { id: uid(), name: "Histoire-Géographie", coefficient: 4 },
    { id: uid(), name: "Anglais", coefficient: 4 },
    { id: uid(), name: "Arabe", coefficient: 4 },
    { id: uid(), name: "Mathématiques", coefficient: 2 },
    { id: uid(), name: "EPS", coefficient: 1 },
  ],
  "3ème": [
    { id: uid(), name: "Mathématiques", coefficient: 4 },
    { id: uid(), name: "Français", coefficient: 4 },
    { id: uid(), name: "Anglais", coefficient: 2 },
    { id: uid(), name: "Histoire-Géographie", coefficient: 2 },
    { id: uid(), name: "SVT", coefficient: 2 },
    { id: uid(), name: "Physique-Chimie", coefficient: 2 },
    { id: uid(), name: "EPS", coefficient: 1 },
  ],
};

export function makeStudent(subjects: Subject[]): Student {
  const grades: Record<string, number | ""> = {};
  subjects.forEach((s) => (grades[s.id] = ""));
  return { id: uid(), name: "", grades };
}

export function makeSubject(name = "Nouvelle matière", coefficient = 1): Subject {
  return { id: uid(), name, coefficient };
}

export interface StudentResult {
  id: string;
  name: string;
  total: number;
  totalCoef: number;
  average: number;
  rank: number;
  status: "Admis" | "Ajourné";
}

export function computeResults(
  students: Student[],
  subjects: Subject[],
  threshold: number,
): StudentResult[] {
  const results = students.map((student) => {
    let total = 0;
    let totalCoef = 0;
    subjects.forEach((sub) => {
      const g = student.grades[sub.id];
      if (typeof g === "number" && !Number.isNaN(g)) {
        total += g * sub.coefficient;
        totalCoef += sub.coefficient;
      }
    });
    const average = totalCoef > 0 ? total / totalCoef : 0;
    return {
      id: student.id,
      name: student.name || "—",
      total: Number(total.toFixed(2)),
      totalCoef,
      average: Number(average.toFixed(2)),
      rank: 0,
      status: (average >= threshold ? "Admis" : "Ajourné") as "Admis" | "Ajourné",
    };
  });

  const sorted = [...results].sort((a, b) => b.average - a.average);
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1];
    r.rank = prev && prev.average === r.average ? prev.rank : i + 1;
  });
  return results.map((r) => ({ ...r, rank: sorted.find((s) => s.id === r.id)!.rank }));
}

export interface ClassStats {
  count: number;
  classAverage: number;
  highest: number;
  lowest: number;
  successRate: number;
  passed: number;
  failed: number;
}

export function computeStats(results: StudentResult[]): ClassStats {
  const valid = results.filter((r) => r.totalCoef > 0);
  if (valid.length === 0) {
    return {
      count: 0,
      classAverage: 0,
      highest: 0,
      lowest: 0,
      successRate: 0,
      passed: 0,
      failed: 0,
    };
  }
  const averages = valid.map((r) => r.average);
  const passed = valid.filter((r) => r.status === "Admis").length;
  return {
    count: valid.length,
    classAverage: Number((averages.reduce((a, b) => a + b, 0) / valid.length).toFixed(2)),
    highest: Math.max(...averages),
    lowest: Math.min(...averages),
    successRate: Number(((passed / valid.length) * 100).toFixed(1)),
    passed,
    failed: valid.length - passed,
  };
}
