import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dashboardData, genererEcheancesMois } from "@/lib/api/gestion.functions";
import { formatFCFA, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, FileText, Wallet, Droplets, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const dashOpts = queryOptions({ queryKey: ["dashboard"], queryFn: () => dashboardData() });

export const Route = createFileRoute("/_authenticated/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashOpts),
  component: Dashboard,
  errorComponent: ({ error }) => <div className="text-destructive">{error.message}</div>,
});

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Building2; label: string; value: string | number; accent?: string }) {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ?? "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 text-2xl font-bold font-mono tabular-nums">{value}</div>
    </Card>
  );
}

function Dashboard() {
  const { data } = useSuspenseQuery(dashOpts);
  const qc = useQueryClient();
  const generer = useServerFn(genererEcheancesMois);
  const mut = useMutation({
    mutationFn: () => generer(),
    onSuccess: (r) => { toast.success(`${r.created} échéances générées`); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de votre parc locatif</p>
        </div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending} variant="secondary">
          <RefreshCw className={`h-4 w-4 mr-2 ${mut.isPending ? "animate-spin" : ""}`} />
          Générer les échéances du mois
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat icon={Building2} label="Propriétés" value={data.nProprietes} accent="text-primary" />
        <Stat icon={Users} label="Locataires" value={data.nLocataires} />
        <Stat icon={FileText} label="Contrats actifs" value={data.nContrats} accent="text-success" />
        <Stat icon={Wallet} label="Loyers du mois" value={formatFCFA(data.loyersMois)} />
        <Stat icon={Droplets} label="Eau du mois" value={formatFCFA(data.eauMois)} />
        <Stat icon={AlertCircle} label="Impayés" value={formatFCFA(data.impayes)} accent="text-destructive" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Prochaines échéances (7 jours)</h2>
          <Link to="/echeances" className="text-xs text-primary hover:underline">Tout voir</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2">Locataire</th>
                <th className="px-4 py-2">Propriété</th>
                <th className="px-4 py-2 text-right">Restant</th>
                <th className="px-4 py-2">Échéance</th>
              </tr>
            </thead>
            <tbody>
              {data.prochaines.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune échéance dans les 7 jours</td></tr>
              )}
              {data.prochaines.map((p) => {
                const c = p.contrat as { locataire?: { nom: string; prenom: string } | null; propriete?: { nom: string } | null } | null;
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-2">{c?.locataire ? `${c.locataire.prenom} ${c.locataire.nom}` : "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c?.propriete?.nom ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(p.reste))}</td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(p.date_echeance as string)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Derniers paiements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Montant</th>
                <th className="px-4 py-2">Observation</th>
              </tr>
            </thead>
            <tbody>
              {data.derniersPaiements.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun paiement enregistré</td></tr>
              )}
              {data.derniersPaiements.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(p.date_paiement as string)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      p.type_document === "loyer" ? "bg-primary/15 text-primary" : "bg-blue-500/15 text-blue-400"
                    }`}>{p.type_document === "loyer" ? "Loyer" : "Eau"}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(p.montant))}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{p.observation ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
