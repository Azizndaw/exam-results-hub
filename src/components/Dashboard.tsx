import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatDateFR,
  getDayStats,
  getStudentCompletion,
  getTrackedDates,
  getTrend,
  todayISO,
  type AppState,
} from "@/lib/checklist";
import { exportDailyPDF } from "@/lib/report";
import {
  Users,
  CheckCircle2,
  TrendingUp,
  FileText,
  History,
  CalendarCheck,
} from "lucide-react";

interface Props {
  state: AppState;
}

export function Dashboard({ state }: Props) {
  const today = todayISO();
  const todayStats = useMemo(() => getDayStats(state, today), [state, today]);
  const completion = useMemo(() => getStudentCompletion(state), [state]);
  const trend = useMemo(() => getTrend(state, 14), [state]);
  const trackedDates = useMemo(() => getTrackedDates(state), [state]);

  const sortedCompletion = [...completion].sort((a, b) => b.rate - a.rate);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Élèves enregistrés"
          value={state.students.length}
        />
        <KpiCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label={`Présents aujourd'hui`}
          value={`${todayStats.presentCount}/${todayStats.studentCount}`}
          sub={`${todayStats.attendanceRate}% de présence`}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Complétion du jour"
          value={`${todayStats.completionRate}%`}
          accent
        />
        <KpiCard
          icon={<History className="h-5 w-5" />}
          label="Jours suivis"
          value={trackedDates.length}
        />
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <TrendingUp className="h-5 w-5 text-accent" /> Évolution (14 derniers jours)
        </div>
        <TrendChart trend={trend} />
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Legend color="bg-accent" label="Présence" />
          <Legend color="bg-success" label="Complétion checklist" />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 space-y-3">
          <div className="font-semibold">Taux de complétion par élève</div>
          {sortedCompletion.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pas encore de données.</p>
          ) : (
            <div className="space-y-2">
              {sortedCompletion.map((s) => (
                <div key={s.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground">
                      {s.rate}% · {s.daysTracked} j
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${s.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <div className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" /> Historique des rapports
          </div>
          {trackedDates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun jour enregistré. Coche au moins un item pour générer un rapport.
            </p>
          ) : (
            <div className="divide-y max-h-80 overflow-y-auto">
              {trackedDates.map((d) => {
                const s = getDayStats(state, d);
                return (
                  <div key={d} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{formatDateFR(d)}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.presentCount}/{s.studentCount} présents · {s.completionRate}% complétion
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportDailyPDF(state, d)}
                    >
                      <FileText className="h-4 w-4" /> PDF
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <span className={accent ? "text-accent" : ""}>{icon}</span>
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}

function TrendChart({
  trend,
}: {
  trend: { date: string; attendanceRate: number; completionRate: number }[];
}) {
  const w = 600;
  const h = 160;
  const pad = 24;
  const stepX = (w - pad * 2) / Math.max(trend.length - 1, 1);
  const toY = (v: number) => h - pad - (v / 100) * (h - pad * 2);

  const path = (key: "attendanceRate" | "completionRate") =>
    trend
      .map((p, i) => `${i === 0 ? "M" : "L"} ${pad + i * stepX} ${toY(p[key])}`)
      .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
        {[0, 25, 50, 75, 100].map((g) => (
          <line
            key={g}
            x1={pad}
            x2={w - pad}
            y1={toY(g)}
            y2={toY(g)}
            stroke="currentColor"
            className="text-border"
            strokeDasharray="2 3"
          />
        ))}
        <path
          d={path("attendanceRate")}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.5}
        />
        <path
          d={path("completionRate")}
          fill="none"
          stroke="var(--success)"
          strokeWidth={2.5}
        />
        {trend.map((p, i) => (
          <g key={p.date}>
            <circle cx={pad + i * stepX} cy={toY(p.attendanceRate)} r={3} fill="var(--accent)" />
            <circle cx={pad + i * stepX} cy={toY(p.completionRate)} r={3} fill="var(--success)" />
          </g>
        ))}
        {trend.map((p, i) =>
          i % 2 === 0 ? (
            <text
              key={p.date}
              x={pad + i * stepX}
              y={h - 6}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={9}
            >
              {p.date.slice(5)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
