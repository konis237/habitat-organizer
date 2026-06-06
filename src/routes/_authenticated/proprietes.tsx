import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProprietes, upsertPropriete, deletePropriete } from "@/lib/api/gestion.functions";
import { formatFCFA } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["proprietes"], queryFn: () => listProprietes() });

export const Route = createFileRoute("/_authenticated/proprietes")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="text-destructive">{error.message}</div>,
});

type Propriete = { id: string; nom: string; adresse: string; montant_loyer: number; statut: string };

function Page() {
  const { data } = useSuspenseQuery(opts);
  const [search, setSearch] = useState("");
  const filtered = data.filter((p) =>
    p.nom.toLowerCase().includes(search.toLowerCase()) || p.adresse.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Propriétés</h1>
          <p className="text-sm text-muted-foreground">{data.length} biens enregistrés</p>
        </div>
        <ProprieteSheet />
      </div>
      <Input placeholder="Rechercher par nom ou adresse..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Adresse</th>
                <th className="px-4 py-2 text-right">Loyer réf.</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucune propriété</td></tr>}
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{p.nom}</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.adresse}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatFCFA(p.montant_loyer)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      p.statut === "occupe" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}>{p.statut === "occupe" ? "Occupé" : "Libre"}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <ProprieteSheet propriete={p} />
                      <DeleteBtn p={p} />
                    </div>
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

function ProprieteSheet({ propriete }: { propriete?: Propriete }) {
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState(propriete?.nom ?? "");
  const [adresse, setAdresse] = useState(propriete?.adresse ?? "");
  const [loyer, setLoyer] = useState(propriete?.montant_loyer?.toString() ?? "");
  const qc = useQueryClient();
  const fn = useServerFn(upsertPropriete);
  const mut = useMutation({
    mutationFn: (d: { id?: string; nom: string; adresse: string; montant_loyer: number }) => fn({ data: d }),
    onSuccess: () => {
      toast.success(propriete ? "Propriété modifiée" : "Propriété créée");
      qc.invalidateQueries({ queryKey: ["proprietes"] });
      setOpen(false);
      if (!propriete) { setNom(""); setAdresse(""); setLoyer(""); }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {propriete
          ? <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
          : <Button><Plus className="h-4 w-4 mr-2" />Nouvelle propriété</Button>}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader><SheetTitle>{propriete ? "Modifier" : "Nouvelle"} propriété</SheetTitle></SheetHeader>
        <form className="space-y-4 mt-6 px-4" onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({ id: propriete?.id, nom, adresse, montant_loyer: Number(loyer) });
        }}>
          <div className="space-y-2"><Label>Nom *</Label><Input required value={nom} onChange={(e) => setNom(e.target.value)} /></div>
          <div className="space-y-2"><Label>Adresse *</Label><Textarea required value={adresse} onChange={(e) => setAdresse(e.target.value)} /></div>
          <div className="space-y-2"><Label>Loyer de référence (FCFA) *</Label><Input type="number" required min={0} value={loyer} onChange={(e) => setLoyer(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={mut.isPending}>Enregistrer</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DeleteBtn({ p }: { p: Propriete }) {
  const qc = useQueryClient();
  const fn = useServerFn(deletePropriete);
  const mut = useMutation({
    mutationFn: () => fn({ data: { id: p.id } }),
    onSuccess: () => { toast.success("Supprimée"); qc.invalidateQueries({ queryKey: ["proprietes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {p.nom} ?</AlertDialogTitle>
          <AlertDialogDescription>Cette action est irréversible. Impossible si un contrat actif existe.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => mut.mutate()}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
