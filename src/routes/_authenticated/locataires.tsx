import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLocataires, upsertLocataire, deleteLocataire } from "@/lib/api/gestion.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["locataires"], queryFn: () => listLocataires() });

export const Route = createFileRoute("/_authenticated/locataires")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="text-destructive">{error.message}</div>,
});

type Loc = { id: string; nom: string; prenom: string; telephone: string | null; email: string | null; numero_cni: string | null; contrat_actif: boolean };

function Page() {
  const { data } = useSuspenseQuery(opts);
  const [search, setSearch] = useState("");
  const filtered = data.filter((l) => {
    const t = `${l.prenom} ${l.nom} ${l.numero_cni ?? ""}`.toLowerCase();
    return t.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locataires</h1>
          <p className="text-sm text-muted-foreground">{data.length} personnes enregistrées</p>
        </div>
        <LocSheet />
      </div>
      <Input placeholder="Rechercher par nom, prénom, CNI..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-2">Nom complet</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">CNI</th>
                <th className="px-4 py-2">Contrat actif</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun locataire</td></tr>}
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{l.prenom} {l.nom}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.telephone ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.email ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{l.numero_cni ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      l.contrat_actif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}>{l.contrat_actif ? "Oui" : "Non"}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <LocSheet loc={l} />
                      <DelBtn loc={l} />
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

function LocSheet({ loc }: { loc?: Loc }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    prenom: loc?.prenom ?? "", nom: loc?.nom ?? "",
    telephone: loc?.telephone ?? "", email: loc?.email ?? "", numero_cni: loc?.numero_cni ?? "",
  });
  const qc = useQueryClient();
  const fn = useServerFn(upsertLocataire);
  const mut = useMutation({
    mutationFn: () => fn({ data: { id: loc?.id, ...f } }),
    onSuccess: () => {
      toast.success(loc ? "Modifié" : "Créé");
      qc.invalidateQueries({ queryKey: ["locataires"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const upd = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {loc
          ? <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
          : <Button><Plus className="h-4 w-4 mr-2" />Nouveau locataire</Button>}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader><SheetTitle>{loc ? "Modifier" : "Nouveau"} locataire</SheetTitle></SheetHeader>
        <form className="space-y-4 mt-6 px-4" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Prénom *</Label><Input required value={f.prenom} onChange={(e) => upd("prenom", e.target.value)} /></div>
            <div className="space-y-2"><Label>Nom *</Label><Input required value={f.nom} onChange={(e) => upd("nom", e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Téléphone</Label><Input value={f.telephone} onChange={(e) => upd("telephone", e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => upd("email", e.target.value)} /></div>
          <div className="space-y-2"><Label>Numéro CNI</Label><Input value={f.numero_cni} onChange={(e) => upd("numero_cni", e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={mut.isPending}>Enregistrer</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DelBtn({ loc }: { loc: Loc }) {
  const qc = useQueryClient();
  const fn = useServerFn(deleteLocataire);
  const mut = useMutation({
    mutationFn: () => fn({ data: { id: loc.id } }),
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["locataires"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {loc.prenom} {loc.nom} ?</AlertDialogTitle>
          <AlertDialogDescription>Action irréversible. Impossible si un contrat actif existe.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => mut.mutate()}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
