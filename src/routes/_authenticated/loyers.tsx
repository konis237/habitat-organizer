import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listLoyers, enregistrerPaiement } from "@/lib/api/gestion.functions";
import { formatFCFA, formatDate, formatPeriode } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

function periodeISO(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function loyersOpts(periode: string) {
  return queryOptions({
    queryKey: ["loyers", periode],
    queryFn: () => listLoyers({ data: { periode } }),
  });
}

export const Route = createFileRoute("/_authenticated/loyers")({
  loader: ({ context }) => {
    const now = new Date();
    const p = periodeISO(now.getFullYear(), now.getMonth() + 1);
    return context.queryClient.ensureQueryData(loyersOpts(p));
  },
  component: Page,
  errorComponent: ({ error }) => <div className="text-destructive p-4">{error.message}</div>,
});

type LoyerRow = {
  id: string;
  periode: string;
  montant: number;
  montant_paye: number;
  reste: number;
  date_echeance: string;
  statut: string;
  contrat: {
    propriete?: { nom: string } | null;
    locataire?: { nom: string; prenom: string } | null;
  } | null;
};

function Page() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const periode = periodeISO(year, month);
  const qc = useQueryClient();
  const { data: rows } = useSuspenseQuery(loyersOpts(periode)) as { data: LoyerRow[] };
  const [paying, setPaying] = useState<LoyerRow | null>(null);
  const [montant, setMontant] = useState("");
  const [datePaiement, setDatePaiement] = useState(() => new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const total = rows.reduce((a, r) => a + Number(r.montant), 0);
  const totalPaye = rows.reduce((a, r) => a + Number(r.montant_paye), 0);
  const totalReste = rows.reduce((a, r) => a + Number(r.reste), 0);
  const payes = rows.filter((r) => r.statut === "paye").length;
  const partiels = rows.filter((r) => r.statut === "partiel").length;
  const impayes = rows.filter((r) => r.statut === "impaye").length;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!paying) return;
    const m = parseFloat(montant);
    if (isNaN(m) || m <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (m > Number(paying.reste)) {
      toast.error(`Maximum : ${formatFCFA(Number(paying.reste))}`);
      return;
    }
    setLoading(true);
    try {
      await enregistrerPaiement({
        data: {
          document_id: paying.id,
          type_document: "loyer",
          montant: m,
          date_paiement: datePaiement,
          observation: obs || null,
        },
      });
      toast.success("Paiement enregistré");
      qc.invalidateQueries({ queryKey: ["loyers", periode] });
      qc.invalidateQueries({ queryKey: ["echeances"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setPaying(null);
      setMontant("");
      setObs("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  function openPay(r: LoyerRow) {
    setPaying(r);
    setMontant(String(r.reste));
    setDatePaiement(new Date().toISOString().slice(0, 10));
    setObs("");
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loyers</h1>
          <p className="text-sm text-muted-foreground">Suivi mensuel des loyers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold px-3 min-w-[120px] text-center">
            {formatPeriode(periode)}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total attendu", val: formatFCFA(total), cls: "text-foreground" },
          { label: "Encaissé", val: formatFCFA(totalPaye), cls: "text-green-400" },
          { label: "Restant", val: formatFCFA(totalReste), cls: "text-destructive" },
          {
            label: "Taux",
            val: total > 0 ? `${Math.round((totalPaye / total) * 100)}%` : "—",
            cls: "text-primary",
          },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-lg font-mono font-bold ${s.cls}`}>{s.val}</p>
          </Card>
        ))}
      </div>

      {/* Badges statuts */}
      <div className="flex gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          {payes} payés
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Clock className="h-4 w-4 text-warning" />
          {partiels} partiels
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive" />
          {impayes} impayés
        </span>
      </div>

      {/* Tableau */}
      <Card className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Aucun loyer pour {formatPeriode(periode)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="px-4 py-3">Locataire</th>
                  <th className="px-4 py-3 hidden md:table-cell">Propriété</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-right">Payé</th>
                  <th className="px-4 py-3 text-right">Reste</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Échéance</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {r.contrat?.locataire
                        ? `${r.contrat.locataire.prenom} ${r.contrat.locataire.nom}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {r.contrat?.propriete?.nom ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatFCFA(r.montant)}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-400">
                      {formatFCFA(r.montant_paye)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-destructive">
                      {formatFCFA(Number(r.reste))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm hidden sm:table-cell">
                      {formatDate(r.date_echeance)}
                    </td>
                    <td className="px-4 py-3">
                      <StatutBadge statut={r.statut} />
                    </td>
                    <td className="px-4 py-3">
                      {r.statut !== "paye" && (
                        <Button size="sm" variant="outline" onClick={() => openPay(r)}>
                          <Banknote className="h-3.5 w-3.5 mr-1" />
                          Payer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dialog paiement */}
      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          {paying && (
            <div className="space-y-1 text-sm text-muted-foreground mb-2">
              <p>
                <strong>
                  {paying.contrat?.locataire
                    ? `${paying.contrat.locataire.prenom} ${paying.contrat.locataire.nom}`
                    : "—"}
                </strong>{" "}
                — {paying.contrat?.propriete?.nom}
              </p>
              <p>
                Loyer {formatPeriode(paying.periode)} • Reste :{" "}
                <strong className="text-foreground">{formatFCFA(Number(paying.reste))}</strong>
              </p>
            </div>
          )}
          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="montant-loyer">Montant (FCFA)</Label>
              <Input
                id="montant-loyer"
                type="number"
                min="1"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-loyer">Date de paiement</Label>
              <Input
                id="date-loyer"
                type="date"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obs-loyer">Observation (optionnel)</Label>
              <Input
                id="obs-loyer"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Note…"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  if (statut === "paye")
    return (
      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-500/15 text-green-400">
        Payé
      </span>
    );
  if (statut === "partiel")
    return (
      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-warning/15 text-warning">
        Partiel
      </span>
    );
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-destructive/15 text-destructive">
      Impayé
    </span>
  );
}
