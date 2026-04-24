import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ExamSession, StudentResult, ClassStats, Subject } from "./exam";

export function exportPDF(
  session: ExamSession,
  results: StudentResult[],
  stats: ClassStats,
) {
  const doc = new jsPDF();
  const date = new Date(session.date).toLocaleDateString("fr-FR");

  doc.setFontSize(18);
  doc.text("ExamTrack — Résultats Examen Blanc", 14, 18);
  doc.setFontSize(11);
  doc.text(`École : ${session.schoolName || "—"}`, 14, 28);
  doc.text(`Classe : ${session.className}`, 14, 34);
  doc.text(`Date : ${date}`, 14, 40);
  doc.text(`Seuil d'admission : ${session.threshold}/20`, 14, 46);

  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  autoTable(doc, {
    startY: 52,
    head: [["Rang", "Nom", "Total", "Moyenne", "Statut"]],
    body: sorted.map((r) => [
      r.rank,
      r.name,
      r.total.toFixed(2),
      r.average.toFixed(2),
      r.status,
    ]),
    headStyles: { fillColor: [30, 58, 95] },
    styles: { fontSize: 10 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(13);
  doc.text("Statistiques de la classe", 14, finalY);
  doc.setFontSize(10);
  const lines = [
    `Effectif : ${stats.count}`,
    `Moyenne de classe : ${stats.classAverage}/20`,
    `Note la plus haute : ${stats.highest}/20`,
    `Note la plus basse : ${stats.lowest}/20`,
    `Admis : ${stats.passed} | Ajournés : ${stats.failed}`,
    `Taux de réussite : ${stats.successRate}%`,
  ];
  lines.forEach((l, i) => doc.text(l, 14, finalY + 8 + i * 6));

  doc.save(`ExamTrack_${session.className}_${date}.pdf`);
}

export function exportExcel(
  session: ExamSession,
  results: StudentResult[],
  stats: ClassStats,
  subjects: Subject[],
) {
  const wb = XLSX.utils.book_new();
  const date = new Date(session.date).toLocaleDateString("fr-FR");

  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  const studentMap = new Map(session.students.map((s) => [s.id, s]));

  const header = [
    "Rang",
    "Nom",
    ...subjects.map((s) => `${s.name} (coef ${s.coefficient})`),
    "Total",
    "Moyenne",
    "Statut",
  ];
  const rows = sorted.map((r) => {
    const student = studentMap.get(r.id);
    return [
      r.rank,
      r.name,
      ...subjects.map((sub) => student?.grades[sub.id] ?? ""),
      r.total,
      r.average,
      r.status,
    ];
  });

  const meta = [
    ["ExamTrack — Résultats Examen Blanc"],
    ["École", session.schoolName || "—"],
    ["Classe", session.className],
    ["Date", date],
    ["Seuil", `${session.threshold}/20`],
    [],
  ];
  const aoa = [...meta, header, ...rows, [], ["Statistiques"], ["Effectif", stats.count], ["Moyenne", stats.classAverage], ["Note max", stats.highest], ["Note min", stats.lowest], ["Admis", stats.passed], ["Ajournés", stats.failed], ["Taux de réussite (%)", stats.successRate]];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, "Résultats");
  XLSX.writeFile(wb, `ExamTrack_${session.className}_${date}.xlsx`);
}
