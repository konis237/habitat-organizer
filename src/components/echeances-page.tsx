import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLoyers, listEau, enregistrerPaiement } from "@/lib/api/gestion.functions";
import { formatFCFA, formatDate, startOfMonthISO, formatPeriode } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string; periode: string; montant: number; montant_paye: number; reste: number;
  date_echeance: string; statut: string;
  contrat: { propriete?: { nom: string } | null; locataire?: { nom: string; prenom: string } | null } | null;
};

export function EcheancesPage({ type, title }: { type: "loyer" | "eau"; title: string }) {
  const [periode, setPeriode] = useState(startOfMonthISO());
  const fn = type === "loyer" ? listLoyers : listEau;
  const opts = queryOptions({
    queryKey: [type === "loyer" ? "loyers" : "eau", periode],
    queryFn: () => fn({ data: { periode } }),
  });
  const { data } = useSuspenseQuery(opts);
  const totalDu = (data as Row[]).reduce((a, r) => a + Number(r.montant), 0);
  const totalEnc = (data as Row[]).reduce((a, r) => a + Number(r.montant_paye), 0);
  const totalReste = totalDu - totalEnc;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Période : {formatPeriode(periode)}</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mois</Label>
          <Input type="month" value={periode.slice(0, 7)} onChange={(e) => setPeriode(e.target.value + "-01")} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground uppercase">Total dû</div><div className="font-mono text-lg font-bold mt-1">{formatFCFA(totalDu)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground uppercase">Encaissé</div><div className="font-mono text-lg font-bold mt-1 text-success">{formatFCFA(totalEnc)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground uppercase">Reste</div><div className="font-mono text-lg font-bold mt-1 text-destructive">{formatFCFA(totalReste)}</div></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2">Locataire</th>
                <th className="px-4 py-2">Propriété</th>
                <th className="px-4 py-2 text-right">Montant</th>
                <th className="px-4 py-2 text-right">Payé</th>
                <th className="px-4 py-2 text-right">Reste</th>
                <th className="px-4 py-2">Échéance</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data as Row[]).length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Aucune échéance pour cette période</td></tr>}
              {(data as Row[]).map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{r.contrat?.locataire ? `${r.contrat.locataire.prenom} ${r.contrat.locataire.nom}` : "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.contrat?.propriete?.nom ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(r.montant))}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">{formatFCFA(Number(r.montant_paye))}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(r.reste))}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(r.date_echeance)}</td>
                  <td className="px-4 py-2"><StatutBadge s={r.statut} /></td>
                  <td className="px-4 py-2 text-right">
                    {r.statut !== "paye" && <PaymentDialog row={r} type={type} />}
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

function StatutBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    paye: "bg-success/15 text-success",
    partiel: "bg-warning/15 text-warning",
    impaye: "bg-destructive/15 text-destructive",
  };
  const label: Record<string, string> = { paye: "Payé", partiel: "Partiel", impaye: "Impayé" };
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[s] ?? ""}`}>{label[s] ?? s}</span>;
}

function PaymentDialog({ row, type }: { row: Row; type: "loyer" | "eau" }) {
  const [open, setOpen] = useState(false);
  const [montant, setMontant] = useState(row.reste.toString());
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const qc = useQueryClient();
  const fn = useServerFn(enregistrerPaiement);
  const mut = useMutation({
    mutationFn: () => fn({ data: {
      document_id: row.id, type_document: type, montant: Number(montant), date_paiement: date, observation: obs || null,
    }}),
    onSuccess: () => { toast.success("Paiement enregistré"); qc.invalidateQueries(); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Wallet className="h-4 w-4 mr-1" />Payer</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
        <div className="text-sm text-muted-foreground mb-2">
          {row.contrat?.locataire?.prenom} {row.contrat?.locataire?.nom} — reste {formatFCFA(Number(row.reste))}
        </div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
          <div className="space-y-2"><Label>Montant *</Label><Input type="number" required min={1} max={Number(row.reste)} value={montant} onChange={(e) => setMontant(e.target.value)} /></div>
          <div className="space-y-2"><Label>Date *</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Observation</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Optionnel" /></div>
          <Button type="submit" className="w-full" disabled={mut.isPending}>Enregistrer</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
