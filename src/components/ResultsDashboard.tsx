import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, Trophy, TrendingUp, TrendingDown, Users, CheckCircle2, XCircle } from "lucide-react";
import type { StudentResult, ClassStats } from "@/lib/exam";

interface Props {
  results: StudentResult[];
  stats: ClassStats;
  threshold: number;
}

type SortKey = "rank" | "name" | "average" | "total";

export function ResultsDashboard({ results, stats, threshold }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "Admis" | "Ajourné">("all");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const view = useMemo(() => {
    let r = results.filter((s) => s.totalCoef > 0);
    if (filter !== "all") r = r.filter((s) => s.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((s) => s.name.toLowerCase().includes(q));
    }
    r = [...r].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
    });
    return r;
  }, [results, filter, query, sortKey, sortAsc]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(k === "rank" || k === "name");
    }
  }

  const cards = [
    { label: "Effectif noté", value: stats.count, icon: Users, tone: "primary" },
    { label: "Moyenne classe", value: `${stats.classAverage}/20`, icon: TrendingUp, tone: "accent" },
    { label: "Note max", value: `${stats.highest}/20`, icon: Trophy, tone: "success" },
    { label: "Note min", value: `${stats.lowest}/20`, icon: TrendingDown, tone: "warning" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {c.label}
              </span>
              <c.icon className="h-4 w-4 text-accent" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-gradient-to-br from-primary to-accent text-primary-foreground p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm opacity-80">Taux de réussite (seuil {threshold}/20)</div>
          <div className="mt-1 text-4xl font-bold">{stats.successRate}%</div>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span><strong>{stats.passed}</strong> admis</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            <span><strong>{stats.failed}</strong> ajournés</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un élève…"
            className="pl-9"
          />
        </div>
        <div className="flex rounded-lg border bg-card p-1 text-sm">
          {(["all", "Admis", "Ajourné"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Tous" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                {(
                  [
                    ["rank", "Rang"],
                    ["name", "Nom"],
                    ["total", "Total"],
                    ["average", "Moyenne /20"],
                  ] as [SortKey, string][]
                ).map(([k, label]) => (
                  <th key={k} className="p-3 font-semibold">
                    <button
                      onClick={() => toggleSort(k)}
                      className="inline-flex items-center gap-1 hover:text-accent"
                    >
                      {label}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
                <th className="p-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.id} className="border-t hover:bg-secondary/30 transition-colors">
                  <td className="p-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        r.rank === 1
                          ? "bg-warning text-warning-foreground"
                          : r.rank <= 3
                            ? "bg-accent/20 text-accent"
                            : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 tabular-nums text-muted-foreground">
                    {r.total.toFixed(2)}
                  </td>
                  <td className="p-3 tabular-nums font-semibold">
                    {r.average.toFixed(2)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === "Admis"
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {view.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Aucun résultat à afficher. Saisissez d'abord les notes des élèves.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
