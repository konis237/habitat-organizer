import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listHistoriqueLoyers, enregistrerPaiement } from "@/lib/api/gestion.functions";
import { formatFCFA, formatPeriode } from "@/lib/format";
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

function Page() {
  const qc = useQueryClient();
  const [paying, setPaying] = useState<any>(null);
  const [montant, setMontant] = useState("");
  const [datePaiement, setDatePaiement] = useState(() => new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: loyers = [], isLoading } = useQuery({
    queryKey: ["historique-loyers"],
    queryFn: () => listHistoriqueLoyers(),
  });

  const total = loyers.reduce((a: number, r: any) => a + Number(r.montant), 0);
  const totalPaye = loyers.reduce((a: number, r: any) => a + Number(r.montant_paye), 0);
  const totalReste = loyers.reduce((a: number, r: any) => a + Number(r.reste), 0);

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
      toast.success("Paiement enregistré avec succès");
      qc.invalidateQueries({ queryKey: ["historique-loyers"] });
      setPaying(null);
      setMontant("");
      setObs("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">Historique des Loyers</h1>

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
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loyers.map((r: any) => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">
                      {r.contrat?.locataire?.prenom} {r.contrat?.locataire?.nom}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.contrat?.propriete?.nom}</td>
                    <td className="px-4 py-3 font-mono">{formatPeriode(r.periode)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatFCFA(r.montant)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatutBadge statut={r.statut} />
                      {r.isVirtual && <span className="text-blue-500 text-xs ml-2">(Avance)</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.statut !== "paye" && (
                        <Button size="sm" onClick={() => setPaying(r)}>
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
        )}
      </Card>

      {/* Dialog Paiement */}
      <Dialog open={!!paying} onOpenChange={() => setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement - Loyer</DialogTitle>
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
                placeholder="Paiement avance, etc."
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                Enregistrer
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
