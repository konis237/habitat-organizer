import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  enregistrerPaiement,
  listHistoriqueEau,
  updateFactureEauIndex,
} from "@/lib/api/gestion.functions";
import { formatFCFA, formatPeriode } from "@/lib/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Droplets, Gauge } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/eau")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();

  const [paying, setPaying] = useState<any>(null);
  const [indexing, setIndexing] = useState<any>(null);

  // États pour le formulaire Index
  const [ancienIdx, setAncienIdx] = useState("");
  const [nouveauIdx, setNouveauIdx] = useState("");
  const [prixUnit, setPrixUnit] = useState("500");
  const [loadingPay, setLoadingPay] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(false);

  const { data: eaux = [], isLoading } = useQuery({
    queryKey: ["historique-eau"],
    queryFn: () => listHistoriqueEau(),
  });

  const total = eaux.reduce((a: number, r: any) => a + Number(r.montant), 0);
  const totalPaye = eaux.reduce((a: number, r: any) => a + Number(r.montant_paye), 0);
  const totalReste = eaux.reduce((a: number, r: any) => a + Number(r.reste), 0);

  // Calcul consommation et montant
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
    const m = parseFloat(paying.montantPay || ""); // On utilise le reste par défaut
    if (isNaN(m) || m <= 0) return toast.error("Montant invalide");

    setLoadingPay(true);
    try {
      await enregistrerPaiement({
        data: {
          document_id: paying.id,
          type_document: "eau",
          montant: m,
          date_paiement: new Date().toISOString().slice(0, 10),
          observation: null,
        },
      });
      toast.success("Paiement enregistré");
      qc.invalidateQueries({ queryKey: ["historique-eau"] });
      setPaying(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingPay(false);
    }
  }

  async function handleIndex(e: React.FormEvent) {
    e.preventDefault();
    if (!indexing || conso === null || montantCalc === null) {
      return toast.error("Veuillez remplir correctement les index");
    }

    setLoadingIdx(true);
    try {
      await updateFactureEauIndex({
        data: {
          id: indexing.id,
          ancien_index: ancienN,
          nouveau_index: nouveauN,
          prix_unitaire: prixN,
        },
      });
      toast.success(`Index mis à jour — ${conso} m³ = ${formatFCFA(montantCalc)}`);
      qc.invalidateQueries({ queryKey: ["historique-eau"] });
      setIndexing(null);
      setAncienIdx("");
      setNouveauIdx("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingIdx(false);
    }
  }

  function openPay(r: any) {
    setPaying(r);
  }

  function openIndex(r: any) {
    setIndexing(r);
    setAncienIdx(r.ancien_index?.toString() || "");
    setNouveauIdx(r.nouveau_index?.toString() || "");
    setPrixUnit(r.prix_unitaire?.toString() || "500");
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Droplets className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold">Historique des Factures d'Eau</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total dû", val: formatFCFA(total) },
          { label: "Encaissé", val: formatFCFA(totalPaye), cls: "text-green-600" },
          { label: "Restant", val: formatFCFA(totalReste), cls: "text-red-600" },
          {
            label: "Taux",
            val: total > 0 ? `${Math.round((totalPaye / total) * 100)}%` : "—",
            cls: "text-blue-600",
          },
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.cls || ""}`}>{s.val}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">Chargement de l'historique...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left">Locataire</th>
                  <th className="px-4 py-3 text-left">Propriété</th>
                  <th className="px-4 py-3 text-left">Période</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-center">Index</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {eaux.map((r: any) => {
                  const hasIndex = r.ancien_index != null && r.nouveau_index != null;
                  return (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">
                        {r.contrat?.locataire?.prenom} {r.contrat?.locataire?.nom}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.contrat?.propriete?.nom}
                      </td>
                      <td className="px-4 py-3 font-mono">{formatPeriode(r.periode)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatFCFA(r.montant)}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">
                        {hasIndex ? `${r.ancien_index} → ${r.nouveau_index}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatutBadge statut={r.statut} />
                        {r.isVirtual && (
                          <span className="text-blue-500 text-xs ml-2">(Avance)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => openIndex(r)}>
                            <Gauge className="h-4 w-4" />
                          </Button>
                          {r.statut !== "paye" && (
                            <Button size="sm" variant="outline" onClick={() => openPay(r)}>
                              <Banknote className="h-4 w-4" />
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

      {/* Dialog Index Eau */}
      <Dialog open={!!indexing} onOpenChange={() => setIndexing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saisie des Index d'Eau</DialogTitle>
          </DialogHeader>
          {indexing && (
            <p className="text-sm text-muted-foreground">
              {indexing.contrat?.locataire?.prenom} {indexing.contrat?.locataire?.nom} —{" "}
              {formatPeriode(indexing.periode)}
            </p>
          )}
          <form onSubmit={handleIndex} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ancien Index (m³)</Label>
                <Input
                  type="number"
                  value={ancienIdx}
                  onChange={(e) => setAncienIdx(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Nouvel Index (m³)</Label>
                <Input
                  type="number"
                  value={nouveauIdx}
                  onChange={(e) => setNouveauIdx(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Prix par m³ (FCFA)</Label>
              <Input
                type="number"
                value={prixUnit}
                onChange={(e) => setPrixUnit(e.target.value)}
                required
              />
            </div>

            {conso !== null && montantCalc !== null && (
              <div className="bg-blue-50 p-4 rounded-md">
                <p>
                  Consommation : <strong>{conso} m³</strong>
                </p>
                <p>
                  Montant calculé : <strong>{formatFCFA(montantCalc)}</strong>
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIndexing(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loadingIdx}>
                Enregistrer Index
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Paiement Eau */}
      <Dialog open={!!paying} onOpenChange={() => setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paiement Facture Eau</DialogTitle>
          </DialogHeader>
          {paying && (
            <p className="text-sm text-muted-foreground">
              {paying.contrat?.locataire?.prenom} {paying.contrat?.locataire?.nom} —{" "}
              {formatPeriode(paying.periode)}
            </p>
          )}
          <form onSubmit={handlePay} className="space-y-4">
            <div>
              <Label>Montant à payer (FCFA)</Label>
              <Input type="number" defaultValue={paying?.reste || ""} required />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loadingPay}>
                Enregistrer Paiement
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
    return <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">Payé</span>;
  if (statut === "partiel")
    return (
      <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">Partiel</span>
    );
  return <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-700">Impayé</span>;
}
