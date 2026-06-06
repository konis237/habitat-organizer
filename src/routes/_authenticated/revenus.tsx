import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { revenusData } from "@/lib/api/gestion.functions";
import { formatFCFA } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/revenus")({
  component: Page,
  errorComponent: ({ error }) => <div className="text-destructive">{error.message}</div>,
});

function Page() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const opts = queryOptions({ queryKey: ["revenus", annee], queryFn: () => revenusData({ data: { annee } }) });
  const { data } = useSuspenseQuery(opts);
  const total = data.encLoyersMois + data.encEauMois;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenus</h1>
          <p className="text-sm text-muted-foreground">Analyse financière de l'activité locative</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Année</Label>
          <Input type="number" min={2020} max={2100} value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="w-32" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Loyers (mois)</div>
          <div className="font-mono text-xl font-bold mt-2">{formatFCFA(data.encLoyersMois)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Eau (mois)</div>
          <div className="font-mono text-xl font-bold mt-2">{formatFCFA(data.encEauMois)}</div>
        </Card>
        <Card className="p-4 border-primary/40">
          <div className="text-xs uppercase text-primary">Total ce mois</div>
          <div className="font-mono text-xl font-bold mt-2 text-primary">{formatFCFA(total)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-destructive">Restant à encaisser</div>
          <div className="font-mono text-xl font-bold mt-2 text-destructive">{formatFCFA(data.restant)}</div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-4">Encaissements mensuels ({annee})</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="mois" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => (v / 1000) + "k"} />
              <Tooltip
                contentStyle={{ background: "oklch(0.20 0.005 250)", border: "1px solid oklch(0.28 0.005 250)", borderRadius: 8 }}
                formatter={(v: number) => formatFCFA(v)}
              />
              <Legend />
              <Bar dataKey="loy" name="Loyers" fill="oklch(0.82 0.16 88)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="eau" name="Eau" fill="oklch(0.65 0.15 230)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-4">Taux de recouvrement (%)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="mois" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "oklch(0.20 0.005 250)", border: "1px solid oklch(0.28 0.005 250)", borderRadius: 8 }}
                formatter={(v: number) => v + "%"}
              />
              <Line type="monotone" dataKey="taux" stroke="oklch(0.82 0.16 88)" strokeWidth={2} dot={{ fill: "oklch(0.82 0.16 88)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b"><h2 className="font-semibold text-sm">Détail mensuel</h2></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2">Mois</th>
                <th className="px-4 py-2 text-right">Loyers enc.</th>
                <th className="px-4 py-2 text-right">Eau enc.</th>
                <th className="px-4 py-2 text-right">Total enc.</th>
                <th className="px-4 py-2 text-right">Total dû</th>
                <th className="px-4 py-2 text-right">Taux</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((m) => (
                <tr key={m.mois} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium capitalize">{m.mois}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatFCFA(m.loy)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatFCFA(m.eau)}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">{formatFCFA(m.totalEnc)}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">{formatFCFA(m.totalDu)}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    <span className={m.taux >= 80 ? "text-success" : m.taux >= 50 ? "text-warning" : "text-destructive"}>{m.taux}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
