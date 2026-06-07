import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listEcheances } from "@/lib/api/gestion.functions";
import { formatFCFA, formatDate, formatPeriode } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock, Calendar } from "lucide-react";

const opts = queryOptions({ queryKey: ["echeances"], queryFn: () => listEcheances() });

export const Route = createFileRoute("/_authenticated/echeances")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="text-destructive">{error.message}</div>,
});

type Row = {
  id: string; type: "loyer" | "eau"; periode: string; reste: number;
  date_echeance: string; statut: string;
  contrat: { propriete?: { nom: string } | null; locataire?: { nom: string; prenom: string } | null } | null;
};

function Page() {
  const { data } = useSuspenseQuery(opts) as { data: Row[] };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7 = new Date(today.getTime() + 7 * 86400000);
  const retards = data.filter((r) => new Date(r.date_echeance) < today);
  const aVenir = data.filter((r) => {
    const d = new Date(r.date_echeance);
    return d >= today && d <= in7;
  });
  const futurs = data.filter((r) => new Date(r.date_echeance) > in7);
  const sumReste = (rows: Row[]) => rows.reduce((a, r) => a + Number(r.reste), 0);

  // group futurs by month
  const futursByMonth = futurs.reduce<Record<string, Row[]>>((acc, r) => {
    const k = r.date_echeance.slice(0, 7);
    (acc[k] ??= []).push(r); return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Échéances</h1>
        <p className="text-sm text-muted-foreground">Vue transversale par urgence</p>
      </div>

      <Section title="Retards" icon={AlertTriangle} count={retards.length} total={sumReste(retards)} tone="destructive">
        <EcheanceTable rows={retards} highlight />
      </Section>

      <Section title="À venir (7 prochains jours)" icon={Clock} count={aVenir.length} total={sumReste(aVenir)} tone="warning">
        <EcheanceTable rows={aVenir} />
      </Section>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Prochains mois</h2>
        </div>
        {Object.keys(futursByMonth).length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Rien de planifié</Card>
        )}
        {Object.entries(futursByMonth).map(([k, rows]) => (
          <div key={k} className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 mt-2">{formatPeriode(k + "-01")}</h3>
            <Card className="p-0 overflow-hidden"><EcheanceTable rows={rows} /></Card>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, count, total, tone, children }: { title: string; icon: typeof AlertTriangle; count: number; total: number; tone: "destructive" | "warning"; children: React.ReactNode }) {
  const c = tone === "destructive" ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5";
  const tc = tone === "destructive" ? "text-destructive" : "text-warning";
  return (
    <Card className={`p-0 overflow-hidden border ${c}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${tone === "destructive" ? "border-destructive/30" : "border-warning/30"}`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${tc}`} />
          <h2 className="font-semibold">{title}</h2>
          <span className={`text-xs px-2 py-0.5 rounded ${tc} bg-background/40`}>{count}</span>
        </div>
        <div className="text-sm font-mono font-semibold">{formatFCFA(total)}</div>
      </div>
      {count === 0
        ? <div className="px-4 py-6 text-center text-sm text-muted-foreground">Rien à signaler</div>
        : children}
    </Card>
  );
}

function EcheanceTable({ rows, highlight }: { rows: Row[]; highlight?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Locataire</th>
            <th className="px-4 py-2">Propriété</th>
            <th className="px-4 py-2">Période</th>
            <th className="px-4 py-2 text-right">Reste</th>
            <th className="px-4 py-2">Échéance</th>
            <th className="px-4 py-2">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const d = new Date(r.date_echeance); d.setHours(0, 0, 0, 0);
            const j = Math.round((d.getTime() - today.getTime()) / 86400000);
            const joursLabel = j < 0 ? `${Math.abs(j)}j retard` : j === 0 ? "Aujourd'hui" : `${j}j restants`;
            const joursCls = j < 0 ? "bg-destructive/15 text-destructive" : j <= 7 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground";
            return (
            <tr key={`${r.type}-${r.id}`} className={`border-b border-border/50 hover:bg-muted/30 ${highlight ? "bg-destructive/5" : ""}`}>
              <td className="px-4 py-2">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  r.type === "loyer" ? "bg-primary/15 text-primary" : "bg-blue-500/15 text-blue-400"
                }`}>{r.type === "loyer" ? "Loyer" : "Eau"}</span>
              </td>
              <td className="px-4 py-2 font-medium">{r.contrat?.locataire ? `${r.contrat.locataire.prenom} ${r.contrat.locataire.nom}` : "—"}</td>
              <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">{r.contrat?.propriete?.nom ?? "—"}</td>
              <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">{formatPeriode(r.periode)}</td>
              <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(r.reste))}</td>
              <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">{formatDate(r.date_echeance)}</td>
              <td className="px-4 py-2"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${joursCls}`}>{joursLabel}</span></td>
              <td className="px-4 py-2 hidden md:table-cell">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  r.statut === "partiel" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                }`}>{r.statut === "partiel" ? "Partiel" : "Impayé"}</span>
              </td>
            </tr>
          );})}
        </tbody>
      </table>
    </div>
  );
}
