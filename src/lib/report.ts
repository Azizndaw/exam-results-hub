import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CATEGORIES,
  formatDateFR,
  getDayStats,
  type AppState,
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

  let cursorY = 36;

  CATEGORIES.forEach((cat) => {
    const items = state.items.filter((i) => i.category === cat);
    if (items.length === 0) return;

    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text(cat, 14, cursorY);
    doc.setTextColor(0, 0, 0);

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
      startY: cursorY + 3,
      head,
      body,
      headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
      styles: { fontSize: 8, halign: "center", cellPadding: 1.5 },
      columnStyles: { 0: { halign: "left" }, 1: { halign: "left" } },
    });

    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    if (cursorY > 180) {
      doc.addPage();
      cursorY = 20;
    }
  });

  doc.save(`Rapport_${date}.pdf`);
}
