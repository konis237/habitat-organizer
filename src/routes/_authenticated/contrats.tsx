import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listContrats, listProprietes, listLocataires, createContrat, cloturerContrat } from "@/lib/api/gestion.functions";
import { formatFCFA, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["contrats"], queryFn: () => listContrats() });
const propOpts = queryOptions({ queryKey: ["proprietes"], queryFn: () => listProprietes() });
const locOpts = queryOptions({ queryKey: ["locataires"], queryFn: () => listLocataires() });

export const Route = createFileRoute("/_authenticated/contrats")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(opts),
    context.queryClient.ensureQueryData(propOpts),
    context.queryClient.ensureQueryData(locOpts),
  ]),
  component: Page,
  errorComponent: ({ error }) => <div className="text-destructive">{error.message}</div>,
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contrats</h1>
          <p className="text-sm text-muted-foreground">{data.filter((c) => c.statut === "actif").length} actifs · {data.length} au total</p>
        </div>
        <ContratSheet />
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2">Propriété</th>
                <th className="px-4 py-2">Locataire</th>
                <th className="px-4 py-2">Début</th>
                <th className="px-4 py-2 text-right">Loyer</th>
                <th className="px-4 py-2 text-right">Eau</th>
                <th className="px-4 py-2">Prochaine éch.</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Aucun contrat</td></tr>}
              {data.map((c) => {
                const prop = (c.propriete as { nom: string } | null)?.nom ?? "—";
                const loc = (c.locataire as { nom: string; prenom: string } | null);
                return (
                  <tr key={c.id} className={`border-b border-border/50 hover:bg-muted/30 ${c.statut === "cloture" ? "opacity-60" : ""}`}>
                    <td className="px-4 py-2 font-medium">{prop}</td>
                    <td className="px-4 py-2">{loc ? `${loc.prenom} ${loc.nom}` : "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(c.date_debut as string)}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(c.loyer_mensuel))}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(c.eau_mensuelle))}</td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(c.prochaine_echeance as string)}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        c.statut === "actif" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      }`}>{c.statut === "actif" ? "Actif" : "Clôturé"}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {c.statut === "actif" && <CloturerBtn id={c.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ContratSheet() {
  const [open, setOpen] = useState(false);
  const { data: props } = useSuspenseQuery(propOpts);
  const { data: locs } = useSuspenseQuery(locOpts);
  const dispos = props.filter((p) => p.statut === "libre");
  const [f, setF] = useState({
    propriete_id: "", locataire_id: "", date_debut: new Date().toISOString().slice(0, 10),
    date_fin: "", loyer_mensuel: "", eau_mensuelle: "0", premier_mois_paye: false, mois_payes_avance: "0",
  });
  const qc = useQueryClient();
  const fn = useServerFn(createContrat);
  const mut = useMutation({
    mutationFn: () => fn({ data: {
      propriete_id: f.propriete_id, locataire_id: f.locataire_id,
      date_debut: f.date_debut, date_fin: f.date_fin || null,
      loyer_mensuel: Number(f.loyer_mensuel), eau_mensuelle: Number(f.eau_mensuelle),
      premier_mois_paye: f.premier_mois_paye, mois_payes_avance: Number(f.mois_payes_avance),
    }}),
    onSuccess: () => { toast.success("Contrat créé"); qc.invalidateQueries(); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const upd = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nouveau contrat</Button></SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle>Nouveau contrat</SheetTitle></SheetHeader>
        <form className="space-y-4 mt-6 px-4 pb-6" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
          <div className="space-y-2">
            <Label>Propriété (libre) *</Label>
            <Select value={f.propriete_id} onValueChange={(v) => upd("propriete_id", v)}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>{dispos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Locataire *</Label>
            <Select value={f.locataire_id} onValueChange={(v) => upd("locataire_id", v)}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>{locs.map((l) => <SelectItem key={l.id} value={l.id}>{l.prenom} {l.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Date début *</Label><Input type="date" required value={f.date_debut} onChange={(e) => upd("date_debut", e.target.value)} /></div>
            <div className="space-y-2"><Label>Date fin</Label><Input type="date" value={f.date_fin} onChange={(e) => upd("date_fin", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Loyer mensuel (FCFA) *</Label><Input type="number" required min={1} value={f.loyer_mensuel} onChange={(e) => upd("loyer_mensuel", e.target.value)} /></div>
            <div className="space-y-2"><Label>Eau mensuelle (FCFA)</Label><Input type="number" min={0} value={f.eau_mensuelle} onChange={(e) => upd("eau_mensuelle", e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pmp" checked={f.premier_mois_paye} onCheckedChange={(v) => upd("premier_mois_paye", v === true)} />
            <Label htmlFor="pmp" className="cursor-pointer">Premier mois payé à la signature</Label>
          </div>
          <div className="space-y-2"><Label>Mois payés d'avance</Label><Input type="number" min={0} value={f.mois_payes_avance} onChange={(e) => upd("mois_payes_avance", e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={mut.isPending || !f.propriete_id || !f.locataire_id}>Créer le contrat</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function CloturerBtn({ id }: { id: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(cloturerContrat);
  const mut = useMutation({
    mutationFn: () => fn({ data: { id } }),
    onSuccess: () => { toast.success("Contrat clôturé"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return <Button variant="ghost" size="sm" onClick={() => mut.mutate()}><X className="h-4 w-4 mr-1" />Clôturer</Button>;
}
