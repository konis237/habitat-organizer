import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listEau, enregistrerPaiement, updateFactureEauIndex } from "@/lib/api/gestion.functions";
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
  Gauge,
  CheckCircle2,
  AlertCircle,
  Clock,
  Droplets,
} from "lucide-react";
import { toast } from "sonner";

function periodeISO(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export const Route = createFileRoute("/_authenticated/eau")({
  component: Page,
  errorComponent: ({ error }) => <div className="text-destructive p-4">{error.message}</div>,
});

type EauRow = {
  id: string;
  periode: string;
  montant: number;
  montant_paye: number;
  reste: number;
  date_echeance: string;
  statut: string;
  ancien_index?: number | null;
  nouveau_index?: number | null;
  prix_unitaire?: number | null;
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

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["eau", periode],
    queryFn: () => listEau({ data: { periode } }),
  });

  const [paying, setPaying] = useState<EauRow | null>(null);
  const [montantPay, setMontantPay] = useState("");
  const [datePaiement, setDatePaiement] = useState(() => now.toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [loadingPay, setLoadingPay] = useState(false);

  const [indexing, setIndexing] = useState<EauRow | null>(null);
  const [ancienIdx, setAncienIdx] = useState("");
  const [nouveauIdx, setNouveauIdx] = useState("");
  const [prixUnit, setPrixUnit] = useState("");
  const [loadingIdx, setLoadingIdx] = useState(false);

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

  const typedRows = rows as EauRow[];
  const total = typedRows.reduce((a, r) => a + Number(r.montant), 0);
  const totalPaye = typedRows.reduce((a, r) => a + Number(r.montant_paye), 0);
  const totalReste = typedRows.reduce((a, r) => a + Number(r.reste), 0);
  const payes = typedRows.filter((r) => r.statut === "paye").length;
  const partiels = typedRows.filter((r) => r.statut === "partiel").length;
  const impayes = typedRows.filter((r) => r.statut === "impaye").length;

  const ancienN = parseFloat(ancienIdx);
  const nouveauN = parseFloat(nouveauIdx);
  const prixN = parseFloat(prixUnit);
  const conso =
    !isNaN(ancienN) && !isNaN(nouveauN) && nouveauN >= ancienN ? nouveauN - ancienN : null;
  const montantCalc =
    conso !== null && !isNaN(prixN) && prixN > 0 ? Math.round(conso * prixN) : null;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!paying) return;
    const m = parseFloat(montantPay);
    if (isNaN(m) || m <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (m > Number(paying.reste)) {
      toast.error(`Maximum : ${formatFCFA(Number(paying.reste))}`);
      return;
    }
    setLoadingPay(true);
    try {
      await enregistrerPaiement({
        data: {
          document_id: paying.id,
          type_document: "eau",
          montant: m,
          date_paiement: datePaiement,
          observation: obs || null,
        },
      });
      toast.success("Paiement enregistré");
      qc.invalidateQueries({ queryKey: ["eau", periode] });
      qc.invalidateQueries({ queryKey: ["echeances"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setPaying(null);
      setMontantPay("");
      setObs("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoadingPay(false);
    }
  }

  async function handleIndex(e: React.FormEvent) {
    e.preventDefault();
    if (!indexing || conso === null || montantCalc === null) {
      toast.error("Données d'index invalides");
      return;
    }
    setLoadingIdx(true);
    try {
      const res = await updateFactureEauIndex({
        data: {
          id: indexing.id,
          ancien_index: ancienN,
          nouveau_index: nouveauN,
          prix_unitaire: prixN,
        },
      });
      toast.success(
        `Index enregistré — ${conso} m³ × ${formatFCFA(prixN)} = ${formatFCFA(res.montant)}`,
      );
      qc.invalidateQueries({ queryKey: ["eau", periode] });
      qc.invalidateQueries({ queryKey: ["echeances"] });
      setIndexing(null);
      setAncienIdx("");
      setNouveauIdx("");
      setPrixUnit("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoadingIdx(false);
    }
  }

  function openPay(r: EauRow) {
    setPaying(r);
    setMontantPay(String(r.reste));
    setDatePaiement(now.toISOString().slice(0, 10));
    setObs("");
  }
  function openIndex(r: EauRow) {
    setIndexing(r);
    setAncienIdx(r.ancien_index != null ? String(r.ancien_index) : "");
    setNouveauIdx(r.nouveau_index != null ? String(r.nouveau_index) : "");
    setPrixUnit(r.prix_unitaire != null ? String(r.prix_unitaire) : "");
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Droplets className="h-6 w-6 text-blue-400" />
            Factures d'eau
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivi mensuel · calcul par index (m³ × prix)
          </p>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total attendu", val: formatFCFA(total), cls: "text-foreground" },
          { label: "Encaissé", val: formatFCFA(totalPaye), cls: "text-green-400" },
          { label: "Restant", val: formatFCFA(totalReste), cls: "text-destructive" },
          {
            label: "Taux",
            val: total > 0 ? `${Math.round((totalPaye / total) * 100)}%` : "—",
            cls: "text-blue-400",
          },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-lg font-mono font-bold ${s.cls}`}>{s.val}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          {payes} payés
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Clock className="h-4 w-4 text-yellow-400" />
          {partiels} partiels
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive" />
          {impayes} impayés
        </span>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>
        ) : typedRows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Aucune facture d'eau pour {formatPeriode(periode)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="px-4 py-3">Locataire</th>
                  <th className="px-4 py-3 hidden md:table-cell">Propriété</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Index</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-right">Payé</th>
                  <th className="px-4 py-3 text-right">Reste</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Échéance</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {typedRows.map((r) => {
                  const hasIndex = r.ancien_index != null && r.nouveau_index != null;
                  const consoR = hasIndex ? r.nouveau_index! - r.ancien_index! : null;
                  return (
                    <tr key={r.id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {r.contrat?.locataire
                          ? `${r.contrat.locataire.prenom} ${r.contrat.locataire.nom}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {r.contrat?.propriete?.nom ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm hidden lg:table-cell">
                        {hasIndex ? (
                          <span className="font-mono">
                            {r.ancien_index} → {r.nouveau_index}{" "}
                            <span className="text-blue-400">({consoR} m³)</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
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
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openIndex(r)}
                            title="Saisir index"
                          >
                            <Gauge className="h-3.5 w-3.5" />
                          </Button>
                          {r.statut !== "paye" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPay(r)}
                              title="Paiement"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dialog index */}
      <Dialog open={!!indexing} onOpenChange={(o) => !o && setIndexing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saisir les relevés d'index</DialogTitle>
          </DialogHeader>
          {indexing && (
            <div className="text-sm text-muted-foreground mb-2">
              <p>
                <strong>
                  {indexing.contrat?.locataire
                    ? `${indexing.contrat.locataire.prenom} ${indexing.contrat.locataire.nom}`
                    : "—"}
                </strong>
              </p>
              <p>
                {indexing.contrat?.propriete?.nom} · {formatPeriode(indexing.periode)}
              </p>
            </div>
          )}
          <form onSubmit={handleIndex} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ancien index (m³)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ancienIdx}
                  onChange={(e) => setAncienIdx(e.target.value)}
                  placeholder="ex: 120"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nouvel index (m³)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nouveauIdx}
                  onChange={(e) => setNouveauIdx(e.target.value)}
                  placeholder="ex: 145"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Prix par m³ (FCFA)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={prixUnit}
                onChange={(e) => setPrixUnit(e.target.value)}
                placeholder="ex: 500"
                required
              />
            </div>
            {conso !== null && montantCalc !== null && (
              <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consommation</span>
                  <span className="font-mono font-medium">{conso} m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix unitaire</span>
                  <span className="font-mono">{formatFCFA(prixN)} / m³</span>
                </div>
                <div className="flex justify-between border-t border-blue-500/20 pt-1 mt-1">
                  <span className="font-semibold">Montant calculé</span>
                  <span className="font-mono font-bold text-blue-400">
                    {formatFCFA(montantCalc)}
                  </span>
                </div>
              </div>
            )}
            {!isNaN(ancienN) && !isNaN(nouveauN) && nouveauN < ancienN && (
              <p className="text-destructive text-sm">Le nouvel index doit être ≥ à l'ancien</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIndexing(null)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loadingIdx || conso === null || conso < 0 || montantCalc === null}
              >
                {loadingIdx ? "…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog paiement */}
      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement — Eau</DialogTitle>
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
                Eau {formatPeriode(paying.periode)} • Reste :{" "}
                <strong className="text-foreground">{formatFCFA(Number(paying.reste))}</strong>
              </p>
            </div>
          )}
          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Montant (FCFA)</Label>
              <Input
                type="number"
                min="1"
                value={montantPay}
                onChange={(e) => setMontantPay(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date de paiement</Label>
              <Input
                type="date"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observation (optionnel)</Label>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Note…" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loadingPay}>
                {loadingPay ? "…" : "Enregistrer"}
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
      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/15 text-yellow-400">
        Partiel
      </span>
    );
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-destructive/15 text-destructive">
      Impayé
    </span>
  );
}
