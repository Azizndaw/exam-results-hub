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
  doc.text("ExamTrack — Procès-verbal de délibération", 14, 16);
  doc.setFontSize(11);
  doc.text(`Session : ${session.name}`, 14, 24);
  doc.text(`Date : ${formatDateFR(session.sessionDate)}    Classe : ${className}`, 14, 30);
  const totalCoefMax = subjects.reduce((s, x) => s + x.coefficient, 0);
  doc.text(`Matières : ${subjects.length}    Total coefficients : ${totalCoefMax}    Notation : /20`, 14, 36);

  const head = [[
    "Rang", "Élève",
    ...subjects.map((s) => `${s.label}\n(coef ${s.coefficient})`),
    "Total", "Coef", "Moy. /20", "Mention", "Décision",
  ]];

  const sortedResults = [...results].sort((a, b) => {
    if (a.rank === 0 && b.rank === 0) return 0;
    if (a.rank === 0) return 1;
    if (b.rank === 0) return -1;
    return a.rank - b.rank;
  });

  const decision = (avg: number, filled: number) => {
    if (filled === 0) return "Non noté";
    if (avg >= 10) return "Admis";
    if (avg >= 8) return "Repêchable";
    return "Ajourné";
  };

  const body = sortedResults.map((r) => [
    r.rank > 0 ? String(r.rank) : "—",
    r.studentName,
    ...subjects.map((sub) => {
      const g = grades.find((x) => x.studentId === r.studentId && x.subjectId === sub.id);
      return g?.score == null ? "—" : Number(g.score).toFixed(2);
    }),
    r.filled ? r.total.toFixed(2) : "—",
    r.filled ? String(r.totalCoef) : "—",
    r.filled ? r.average.toFixed(2) : "—",
    r.mention,
    decision(r.average, r.filled),
  ]);

  const moyColIndex = head[0].length - 3;

  autoTable(doc, {
    startY: 42,
    head, body,
    headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
    styles: { fontSize: 8, halign: "center", cellPadding: 1.5 },
    columnStyles: { 0: { halign: "center" }, 1: { halign: "left" } },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === moyColIndex) {
        const v = parseFloat(d.cell.raw as string);
        if (!Number.isNaN(v)) {
          d.cell.styles.fontStyle = "bold";
          d.cell.styles.textColor = v >= 10 ? [22, 101, 52] : [153, 27, 27];
        }
      }
    },
  });

  const filled = results.filter((r) => r.filled > 0);
  const classAvg = filled.length ? filled.reduce((s, r) => s + r.average, 0) / filled.length : 0;
  const passCount = filled.filter((r) => r.average >= 10).length;
  const passRate = filled.length ? Math.round((passCount / filled.length) * 100) : 0;
  const minAvg = filled.length ? Math.min(...filled.map((r) => r.average)) : 0;
  const maxAvg = filled.length ? Math.max(...filled.map((r) => r.average)) : 0;

  let cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (cursorY > 170) { doc.addPage(); cursorY = 20; }

  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("Statistiques par matière", 14, cursorY);
  doc.setTextColor(0, 0, 0);

  const subjectStats = subjects.map((sub) => {
    const scores = grades
      .filter((g) => g.subjectId === sub.id && g.score != null)
      .map((g) => Number(g.score));
    const noted = scores.length;
    const avg = noted ? scores.reduce((a, b) => a + b, 0) / noted : 0;
    const mn = noted ? Math.min(...scores) : 0;
    const mx = noted ? Math.max(...scores) : 0;
    const pass = scores.filter((s) => s >= 10).length;
    return [
      sub.label,
      String(sub.coefficient),
      `${noted}/${results.length}`,
      noted ? avg.toFixed(2) : "—",
      noted ? mn.toFixed(2) : "—",
      noted ? mx.toFixed(2) : "—",
      noted ? `${pass} (${Math.round((pass / noted) * 100)}%)` : "—",
    ];
  });

  autoTable(doc, {
    startY: cursorY + 3,
    head: [["Matière", "Coef", "Notés", "Moy.", "Min", "Max", "Réussite (≥10)"]],
    body: subjectStats,
    headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: { 0: { halign: "left" } },
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (cursorY > 160) { doc.addPage(); cursorY = 20; }

  const mentions = ["Très Bien", "Bien", "Assez Bien", "Passable", "Insuffisant"];
  const mentionRows = mentions.map((m) => {
    const n = filled.filter((r) => r.mention === m).length;
    const pct = filled.length ? Math.round((n / filled.length) * 100) : 0;
    return [m, String(n), `${pct}%`];
  });

  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("Répartition des mentions", 14, cursorY);
  doc.setTextColor(0, 0, 0);
  autoTable(doc, {
    startY: cursorY + 3,
    head: [["Mention", "Nombre", "Pourcentage"]],
    body: mentionRows,
    headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: { 0: { halign: "left" } },
    tableWidth: 100,
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (cursorY > 150) { doc.addPage(); cursorY = 20; }

  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("Synthèse de la classe", 14, cursorY);
  doc.setTextColor(0, 0, 0);

  const top3 = sortedResults.filter((r) => r.filled > 0).slice(0, 3);
  const synthRows: string[][] = [
    ["Effectif total", String(results.length)],
    ["Élèves notés", `${filled.length}/${results.length}`],
    ["Moyenne générale de la classe", `${classAvg.toFixed(2)} / 20`],
    ["Moyenne la plus haute", maxAvg.toFixed(2)],
    ["Moyenne la plus basse", minAvg.toFixed(2)],
    ["Admis (≥ 10)", `${passCount} (${passRate}%)`],
    ["Ajournés (< 10)", `${filled.length - passCount} (${filled.length ? 100 - passRate : 0}%)`],
    ...top3.map((r, i) => [`Major ${i + 1}`, `${r.studentName} — ${r.average.toFixed(2)}/20`]),
  ];

  autoTable(doc, {
    startY: cursorY + 3,
    body: synthRows,
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
    theme: "grid",
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  if (cursorY > 180) { doc.addPage(); cursorY = 30; }

  doc.setFontSize(10);
  doc.text("Le Président du jury : ____________________", 14, cursorY);
  doc.text("Le Secrétaire : ____________________", 110, cursorY);
  doc.text("Le Chef d'établissement : ____________________", 200, cursorY);

  doc.save(`Deliberation_${session.name.replace(/\s+/g, "_")}_${session.sessionDate}.pdf`);
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
