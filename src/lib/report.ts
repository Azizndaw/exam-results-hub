import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CATEGORIES,
  formatDateFR,
  getDayStats,
  type AppState,
} from "./checklist";
import type {
  ExamSession,
  Grade,
  RoomChecklistItem,
  StudentResult,
  Subject,
} from "./exam";

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

interface SessionPDFArgs {
  session: ExamSession;
  className: string;
  subjects: Subject[];
  results: StudentResult[];
  grades: Grade[];
}

export function exportSessionPDF({ session, className, subjects, results, grades }: SessionPDFArgs) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.text("ExamTrack — Relevé de notes", 14, 16);
  doc.setFontSize(11);
  doc.text(`Session : ${session.name}`, 14, 24);
  doc.text(`Date : ${formatDateFR(session.sessionDate)}    Classe : ${className}`, 14, 30);

  const head = [[
    "Rang", "Élève",
    ...subjects.map((s) => `${s.label}\n(coef ${s.coefficient})`),
    "Moy. /20", "Mention",
  ]];

  const sortedResults = [...results].sort((a, b) => {
    if (a.rank === 0 && b.rank === 0) return 0;
    if (a.rank === 0) return 1;
    if (b.rank === 0) return -1;
    return a.rank - b.rank;
  });

  const body = sortedResults.map((r) => {
    const cells = subjects.map((sub) => {
      const g = grades.find((x) => x.studentId === r.studentId && x.subjectId === sub.id);
      return g?.score == null ? "—" : Number(g.score).toFixed(2);
    });
    return [
      r.rank > 0 ? String(r.rank) : "—",
      r.studentName,
      ...cells,
      r.filled ? r.average.toFixed(2) : "—",
      r.mention,
    ];
  });

  autoTable(doc, {
    startY: 36,
    head, body,
    headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
    styles: { fontSize: 8, halign: "center", cellPadding: 1.5 },
    columnStyles: { 0: { halign: "center" }, 1: { halign: "left" } },
  });

  // class statistics
  const filled = results.filter((r) => r.filled > 0);
  const classAvg = filled.length
    ? (filled.reduce((s, r) => s + r.average, 0) / filled.length).toFixed(2)
    : "—";
  const passRate = filled.length
    ? Math.round((filled.filter((r) => r.average >= 10).length / filled.length) * 100)
    : 0;
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.text(
    `Moyenne générale de la classe : ${classAvg}/20    Taux de réussite (≥10) : ${passRate}%    Effectif noté : ${filled.length}/${results.length}`,
    14, finalY,
  );

  doc.save(`Releve_${session.name.replace(/\s+/g, "_")}_${session.sessionDate}.pdf`);
}

interface RoomChecklistPDFArgs {
  date: string;
  className: string;
  roomLabel: string;
  items: RoomChecklistItem[];
  checks: Record<string, boolean>;
  notes: string;
}

export function exportRoomChecklistPDF({
  date, className, roomLabel, items, checks, notes,
}: RoomChecklistPDFArgs) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("ExamTrack — PV de salle", 14, 16);
  doc.setFontSize(11);
  doc.text(`Date : ${formatDateFR(date)}`, 14, 24);
  doc.text(`Classe : ${className}    Salle : ${roomLabel}`, 14, 30);

  const checkedCount = items.filter((i) => checks[i.id]).length;
  doc.text(
    `Vérifications : ${checkedCount}/${items.length} (${items.length ? Math.round((checkedCount / items.length) * 100) : 0}%)`,
    14, 36,
  );

  const cats = Array.from(new Set(items.map((i) => i.category)));
  let cursorY = 42;
  cats.forEach((cat) => {
    const list = items.filter((i) => i.category === cat);
    if (list.length === 0) return;
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text(cat, 14, cursorY);
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: cursorY + 2,
      head: [["Vérification", "Fait"]],
      body: list.map((it) => [it.label, checks[it.id] ? "✓" : "—"]),
      headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 1.5 },
      columnStyles: { 1: { halign: "center", cellWidth: 20 } },
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    if (cursorY > 260) { doc.addPage(); cursorY = 20; }
  });

  if (notes.trim()) {
    if (cursorY > 240) { doc.addPage(); cursorY = 20; }
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Observations", 14, cursorY);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(notes, 180);
    doc.text(lines, 14, cursorY + 6);
    cursorY += 6 + lines.length * 5;
  }

  doc.text("Signature du surveillant : ________________________", 14, cursorY + 14);

  doc.save(`PV_${roomLabel.replace(/\s+/g, "_")}_${date}.pdf`);
}
