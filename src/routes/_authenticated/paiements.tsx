import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPaiements } from "@/lib/api/gestion.functions";
import { formatFCFA, formatDate, formatPeriode, startOfMonthISO, addMonthsISO } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/paiements")({
  component: Page,
  errorComponent: ({ error }) => <div className="text-destructive">{error.message}</div>,
});

function Page() {
  const [mois, setMois] = useState(startOfMonthISO());
  const [type, setType] = useState<"tous" | "loyer" | "eau">("tous");
  const debut = mois;
  const fin = addMonthsISO(mois, 1);
  const finIso = new Date(new Date(fin).getTime() - 86400000).toISOString().slice(0, 10);
  const opts = queryOptions({
    queryKey: ["paiements", debut, finIso, type],
    queryFn: () => listPaiements({ data: { debut, fin: finIso, type } }),
  });
  const { data } = useSuspenseQuery(opts);
  const total = data.reduce((a, p) => a + Number(p.montant), 0);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paiements</h1>
        <p className="text-sm text-muted-foreground">Historique des encaissements</p>
      </div>
      <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Mois</Label><Input type="month" value={mois.slice(0, 7)} onChange={(e) => setMois(e.target.value + "-01")} /></div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous</SelectItem>
              <SelectItem value="loyer">Loyer</SelectItem>
              <SelectItem value="eau">Eau</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex flex-col justify-end">
          <Label className="text-xs">Période</Label>
          <div className="text-sm font-medium">{formatPeriode(mois)}</div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Locataire</th>
                <th className="px-4 py-2">Propriété</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Période</th>
                <th className="px-4 py-2 text-right">Montant</th>
                <th className="px-4 py-2">Observation</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Aucun paiement pour cette période</td></tr>}
              {data.map((p) => {
                const doc = p.doc as { periode?: string; contrat?: { locataire?: { nom: string; prenom: string } | null; propriete?: { nom: string } | null } | null } | null;
                const loc = doc?.contrat?.locataire;
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(p.date_paiement as string)}</td>
                    <td className="px-4 py-2 font-medium">{loc ? `${loc.prenom} ${loc.nom}` : "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{doc?.contrat?.propriete?.nom ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        p.type_document === "loyer" ? "bg-primary/15 text-primary" : "bg-blue-500/15 text-blue-400"
                      }`}>{p.type_document === "loyer" ? "Loyer" : "Eau"}</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{doc?.periode ? formatPeriode(doc.periode) : "—"}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(p.montant))}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{p.observation ?? "—"}</td>
                  </tr>
                );
              })}
              {data.length > 0 && (
                <tr className="bg-muted/40 font-semibold">
                  <td className="px-4 py-3" colSpan={5}>Total encaissé</td>
                  <td className="px-4 py-3 text-right font-mono">{formatFCFA(total)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
