import { useState, useMemo } from "react";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLoyers, listEau, enregistrerPaiement, updateFactureEauIndex } from "@/lib/api/gestion.functions";
import { formatFCFA, formatDate, startOfMonthISO, formatPeriode } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Gauge } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string; periode: string; montant: number; montant_paye: number; reste: number;
  date_echeance: string; statut: string;
  ancien_index?: number | null; nouveau_index?: number | null; prix_unitaire?: number | null;
  contrat: { propriete?: { nom: string } | null; locataire?: { nom: string; prenom: string } | null } | null;
};

function daysBetween(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function JoursBadge({ iso, statut }: { iso: string; statut: string }) {
  if (statut === "paye") return <span className="text-xs text-muted-foreground">—</span>;
  const j = daysBetween(iso);
  const cls = j < 0 ? "bg-destructive/15 text-destructive"
    : j <= 7 ? "bg-warning/15 text-warning"
    : "bg-muted text-muted-foreground";
  const label = j < 0 ? `${Math.abs(j)}j retard` : j === 0 ? "Aujourd'hui" : `${j}j restants`;
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

export function EcheancesPage({ type, title }: { type: "loyer" | "eau"; title: string }) {
  const [periode, setPeriode] = useState(startOfMonthISO());
  const fn = type === "loyer" ? listLoyers : listEau;
  const opts = queryOptions({
    queryKey: [type === "loyer" ? "loyers" : "eau", periode],
    queryFn: () => fn({ data: { periode } }),
  });
  const { data } = useSuspenseQuery(opts);
  const rows = data as Row[];
  const totals = useMemo(() => {
    const du = rows.reduce((a, r) => a + Number(r.montant), 0);
    const enc = rows.reduce((a, r) => a + Number(r.montant_paye), 0);
    return { du, enc, reste: du - enc };
  }, [rows]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Période : {formatPeriode(periode)}</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mois</Label>
          <Input type="month" value={periode.slice(0, 7)} onChange={(e) => setPeriode(e.target.value + "-01")} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="p-3"><div className="text-[10px] sm:text-xs text-muted-foreground uppercase">Total dû</div><div className="font-mono text-sm sm:text-lg font-bold mt-1">{formatFCFA(totals.du)}</div></Card>
        <Card className="p-3"><div className="text-[10px] sm:text-xs text-muted-foreground uppercase">Encaissé</div><div className="font-mono text-sm sm:text-lg font-bold mt-1 text-success">{formatFCFA(totals.enc)}</div></Card>
        <Card className="p-3"><div className="text-[10px] sm:text-xs text-muted-foreground uppercase">Reste</div><div className="font-mono text-sm sm:text-lg font-bold mt-1 text-destructive">{formatFCFA(totals.reste)}</div></Card>
      </div>

      {/* Desktop table */}
      <Card className="p-0 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2">Locataire</th>
                <th className="px-4 py-2">Propriété</th>
                <th className="px-4 py-2 text-right">Montant</th>
                <th className="px-4 py-2 text-right">Payé</th>
                <th className="px-4 py-2 text-right">Reste</th>
                <th className="px-4 py-2">Échéance</th>
                <th className="px-4 py-2">Délai</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Aucune échéance pour cette période</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{r.contrat?.locataire ? `${r.contrat.locataire.prenom} ${r.contrat.locataire.nom}` : "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.contrat?.propriete?.nom ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(r.montant))}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">{formatFCFA(Number(r.montant_paye))}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(r.reste))}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(r.date_echeance)}</td>
                  <td className="px-4 py-2"><JoursBadge iso={r.date_echeance} statut={r.statut} /></td>
                  <td className="px-4 py-2"><StatutBadge s={r.statut} /></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      {type === "eau" && <IndexDialog row={r} />}
                      {r.statut !== "paye" && <PaymentDialog row={r} type={type} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Aucune échéance</Card>}
        {rows.map((r) => (
          <Card key={r.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{r.contrat?.locataire ? `${r.contrat.locataire.prenom} ${r.contrat.locataire.nom}` : "—"}</div>
                <div className="text-xs text-muted-foreground truncate">{r.contrat?.propriete?.nom ?? "—"}</div>
              </div>
              <StatutBadge s={r.statut} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><div className="text-muted-foreground">Montant</div><div className="font-mono">{formatFCFA(Number(r.montant))}</div></div>
              <div><div className="text-muted-foreground">Payé</div><div className="font-mono">{formatFCFA(Number(r.montant_paye))}</div></div>
              <div><div className="text-muted-foreground">Reste</div><div className="font-mono font-semibold">{formatFCFA(Number(r.reste))}</div></div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDate(r.date_echeance)}</span>
                <JoursBadge iso={r.date_echeance} statut={r.statut} />
              </div>
              <div className="flex gap-1">
                {type === "eau" && <IndexDialog row={r} />}
                {r.statut !== "paye" && <PaymentDialog row={r} type={type} />}
              </div>
            </div>
          </Card>
        ))}
      </div>
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
      <DialogTrigger asChild><Button size="sm"><Wallet className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Payer</span></Button></DialogTrigger>
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

function IndexDialog({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const [ancien, setAncien] = useState(String(row.ancien_index ?? ""));
  const [nouveau, setNouveau] = useState(String(row.nouveau_index ?? ""));
  const [prix, setPrix] = useState(String(row.prix_unitaire ?? ""));
  const qc = useQueryClient();
  const fn = useServerFn(updateFactureEauIndex);
  const conso = Math.max(0, (Number(nouveau) || 0) - (Number(ancien) || 0));
  const montant = Math.round(conso * (Number(prix) || 0));

  const mut = useMutation({
    mutationFn: () => fn({ data: {
      id: row.id, ancien_index: Number(ancien), nouveau_index: Number(nouveau), prix_unitaire: Number(prix),
    }}),
    onSuccess: (r) => { toast.success(`Montant mis à jour : ${formatFCFA(r.montant)} (${r.conso} unités)`); qc.invalidateQueries(); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Gauge className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Index</span></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Calcul via index</DialogTitle></DialogHeader>
        <div className="text-sm text-muted-foreground mb-2">
          {row.contrat?.locataire?.prenom} {row.contrat?.locataire?.nom} — {formatPeriode(row.periode)}
        </div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Ancien index *</Label><Input type="number" step="any" required min={0} value={ancien} onChange={(e) => setAncien(e.target.value)} /></div>
            <div className="space-y-2"><Label>Nouvel index *</Label><Input type="number" step="any" required min={0} value={nouveau} onChange={(e) => setNouveau(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Prix unitaire (FCFA) *</Label><Input type="number" step="any" required min={0} value={prix} onChange={(e) => setPrix(e.target.value)} /></div>

          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Consommation</span><span className="font-mono">{conso} unités</span></div>
            <div className="flex justify-between font-semibold"><span>Montant calculé</span><span className="font-mono text-primary">{formatFCFA(montant)}</span></div>
          </div>

          <Button type="submit" className="w-full" disabled={mut.isPending || !ancien || !nouveau || !prix}>Mettre à jour le montant</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
