import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listContrats, listEcheances, enregistrerPaiement } from "@/lib/api/gestion.functions";
import { formatFCFA, formatDate, formatPeriode } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Banknote, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/loyers")({
  component: Page,
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
    id: string;
    propriete?: { nom: string };
    locataire?: { nom: string; prenom: string };
  };
};

function Page() {
  const qc = useQueryClient();
  const [paying, setPaying] = useState<LoyerRow | null>(null);
  const [montant, setMontant] = useState("");
  const [datePaiement, setDatePaiement] = useState(() => new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  // Récupération de tous les loyers non totalement payés + historique
  const { data: allEcheances = [] } = useQuery({
    queryKey: ["loyers-historique"],
    queryFn: () => listEcheances(), // On réutilise la fonction qui ramène tout
  });

  const loyers = allEcheances
    .filter((e: any) => e.type === "loyer")
    .sort((a, b) => new Date(a.date_echeance).getTime() - new Date(b.date_echeance).getTime());

  const total = loyers.reduce((a, r) => a + Number(r.montant), 0);
  const totalPaye = loyers.reduce((a, r) => a + Number(r.montant_paye), 0);
  const totalReste = loyers.reduce((a, r) => a + Number(r.reste), 0);

  const payes = loyers.filter((r) => r.statut === "paye").length;
  const partiels = loyers.filter((r) => r.statut === "partiel").length;
  const impayes = loyers.filter((r) => r.statut === "impaye").length;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!paying) return;
    const m = parseFloat(montant);
    if (isNaN(m) || m <= 0) return toast.error("Montant invalide");

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
      qc.invalidateQueries({ queryKey: ["loyers-historique"] });
      qc.invalidateQueries({ queryKey: ["echeances"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setPaying(null);
      setMontant("");
      setObs("");
    } catch (err: any) {
      toast.error(err.message);
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
      <h1 className="text-3xl font-bold">Loyers - Historique complet</h1>

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
            <p className={`text-2xl font-bold font-mono ${s.cls || ""}`}>{s.val}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 text-left">Locataire</th>
                <th className="px-4 py-3 text-left">Propriété</th>
                <th className="px-4 py-3 text-left">Période</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-right">Payé</th>
                <th className="px-4 py-3 text-right">Reste</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loyers.map((r: LoyerRow) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {r.contrat?.locataire
                      ? `${r.contrat.locataire.prenom} ${r.contrat.locataire.nom}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.contrat?.propriete?.nom}</td>
                  <td className="px-4 py-3 font-mono text-sm">{formatPeriode(r.periode)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatFCFA(r.montant)}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-600">
                    {formatFCFA(r.montant_paye)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">
                    {formatFCFA(r.reste)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatutBadge statut={r.statut} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.statut !== "paye" && (
                      <Button size="sm" variant="outline" onClick={() => openPay(r)}>
                        <Banknote className="mr-2 h-4 w-4" />
                        Payer
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog Paiement */}
      <Dialog open={!!paying} onOpenChange={() => setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paiement Loyer</DialogTitle>
          </DialogHeader>
          {paying && (
            <div className="text-sm text-muted-foreground mb-4">
              {paying.contrat?.locataire?.prenom} {paying.contrat?.locataire?.nom} —{" "}
              {formatPeriode(paying.periode)}
            </div>
          )}
          <form onSubmit={handlePay} className="space-y-4">
            <div>
              <Label>Montant à payer</Label>
              <Input
                type="number"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Date de paiement</Label>
              <Input
                type="date"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
              />
            </div>
            <div>
              <Label>Observation</Label>
              <Input
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex: paiement avance..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  // même composant que avant
}
