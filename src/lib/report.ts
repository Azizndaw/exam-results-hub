import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatDateFR,
  getDayStats,
  type AppState,
  type ChecklistItem,
} from "./checklist";

export function exportDailyPDF(state: AppState, date: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const stats = getDayStats(state, date);
  const dayRec = state.records[date] || {};

  doc.setFontSize(18);
  doc.text("ExamTrack — Rapport journalier", 14, 16);
  doc.setFontSize(11);
  doc.text(`Date : ${formatDateFR(date)}`, 14, 24);
  doc.text(
    `Effectif : ${stats.studentCount}  |  Présents : ${stats.presentCount}  |  Présence : ${stats.attendanceRate}%  |  Complétion : ${stats.completionRate}%`,
    14,
    30,
  );

  const items: ChecklistItem[] = state.items;
  const head = [["Élève", "École", ...items.map((i) => i.label), "Score"]];
  const body = state.students.map((st) => {
    const r = dayRec[st.id] || {};
    const checks = items.map((it) => (r[it.id] ? "✓" : "—"));
    const score = items.filter((it) => r[it.id]).length;
    return [
      st.fullName || "—",
      st.school || "—",
      ...checks,
      `${score}/${items.length}`,
    ];
  });

  autoTable(doc, {
    startY: 36,
    head,
    body,
    headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
    styles: { fontSize: 9, halign: "center" },
    columnStyles: { 0: { halign: "left" }, 1: { halign: "left" } },
  });

  doc.save(`Rapport_${date}.pdf`);
}
