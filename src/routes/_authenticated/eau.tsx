import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  enregistrerPaiement,
  listEcheances,
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
    id: string;
    propriete?: { nom: string };
    locataire?: { nom: string; prenom: string };
  };
};

function Page() {
  const qc = useQueryClient();
  const [paying, setPaying] = useState<EauRow | null>(null);
  const [indexing, setIndexing] = useState<EauRow | null>(null);

  // États pour index
  const [ancienIdx, setAncienIdx] = useState("");
  const [nouveauIdx, setNouveauIdx] = useState("");
  const [prixUnit, setPrixUnit] = useState("");

  const { data: allEcheances = [] } = useQuery({
    queryKey: ["eau-historique"],
    queryFn: () => listEcheances(),
  });

  const eaux = allEcheances
    .filter((e: any) => e.type === "eau")
    .sort((a, b) => new Date(a.date_echeance).getTime() - new Date(b.date_echeance).getTime());

  // ... calculs totaux similaires

  // Fonctions handlePay et handleIndex (identiques à celles que tu avais, adaptées)

  function openIndex(r: EauRow) {
    setIndexing(r);
    setAncienIdx(r.ancien_index?.toString() || "");
    setNouveauIdx(r.nouveau_index?.toString() || "");
    setPrixUnit(r.prix_unitaire?.toString() || "500"); // valeur par défaut
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Droplets className="h-8 w-8 text-blue-500" />
        Factures d'Eau - Historique
      </h1>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3 text-left">Locataire</th>
              <th className="px-4 py-3 text-left">Propriété</th>
              <th className="px-4 py-3 text-left">Période</th>
              <th className="px-4 py-3 text-right">Montant</th>
              <th className="px-4 py-3 text-right">Index</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {eaux.map((r: EauRow) => {
              const hasIndex = r.ancien_index != null && r.nouveau_index != null;
              return (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {r.contrat?.locataire
                      ? `${r.contrat.locataire.prenom} ${r.contrat.locataire.nom}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.contrat?.propriete?.nom}</td>
                  <td className="px-4 py-3 font-mono">{formatPeriode(r.periode)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatFCFA(r.montant)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-center">
                    {hasIndex ? `${r.ancien_index} → ${r.nouveau_index}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatutBadge statut={r.statut} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openIndex(r)}>
                        <Gauge className="h-4 w-4" />
                      </Button>
                      {r.statut !== "paye" && (
                        <Button size="sm" variant="outline" onClick={() => setPaying(r)}>
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
      </Card>

      {/* Dialog Index + Dialog Paiement (à compléter comme dans ta version précédente) */}
    </div>
  );
}
