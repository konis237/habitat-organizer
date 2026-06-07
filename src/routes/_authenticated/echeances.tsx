// import { createFileRoute } from "@tanstack/react-router";
// import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
// import { listEcheances, listContrats } from "@/lib/api/gestion.functions";
// import { formatFCFA, formatDate, formatPeriode } from "@/lib/format";
// import { Card } from "@/components/ui/card";
// import { AlertTriangle, Clock, Calendar, Building2, User, TrendingDown } from "lucide-react";

// const echeancesOpts = queryOptions({ queryKey: ["echeances"], queryFn: () => listEcheances() });
// const contratsOpts = queryOptions({ queryKey: ["contrats"], queryFn: () => listContrats() });

// export const Route = createFileRoute("/_authenticated/echeances")({
//   loader: ({ context }) =>
//     Promise.all([
//       context.queryClient.ensureQueryData(echeancesOpts),
//       context.queryClient.ensureQueryData(contratsOpts),
//     ]),
//   component: Page,
//   errorComponent: ({ error }) => <div className="text-destructive p-4">{error.message}</div>,
// });

// type Row = {
//   id: string;
//   type: "loyer" | "eau";
//   periode: string;
//   reste: number;
//   date_echeance: string;
//   statut: string;
//   contrat: {
//     propriete?: { nom: string } | null;
//     locataire?: { nom: string; prenom: string } | null;
//   } | null;
// };

// type Contrat = {
//   id: string;
//   statut: string;
//   date_fin: string | null;
//   date_debut: string;
//   locataire: { nom: string; prenom: string } | null;
//   propriete: { nom: string } | null;
// };

// function daysDiff(a: Date, b: Date) {
//   return Math.round((b.getTime() - a.getTime()) / 86400000);
// }

// function BailBadge({ dateFin }: { dateFin: string | null }) {
//   if (!dateFin) return <span className="text-xs text-muted-foreground">Sans terme</span>;
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const fin = new Date(dateFin);
//   fin.setHours(0, 0, 0, 0);
//   const j = daysDiff(today, fin);
//   if (j < 0) {
//     return (
//       <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-destructive/15 text-destructive">
//         Expiré {Math.abs(j)}j
//       </span>
//     );
//   }
//   if (j === 0) {
//     return (
//       <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-destructive/15 text-destructive">
//         Expire aujourd'hui
//       </span>
//     );
//   }
//   if (j <= 30) {
//     return (
//       <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-orange-500/15 text-orange-400">
//         {j}j restants
//       </span>
//     );
//   }
//   if (j <= 90) {
//     return (
//       <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-warning/15 text-yellow-400">
//         {j}j restants
//       </span>
//     );
//   }
//   return (
//     <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
//       {j}j restants
//     </span>
//   );
// }

// function Page() {
//   const { data } = useSuspenseQuery(echeancesOpts) as { data: Row[] };
//   const { data: contrats } = useSuspenseQuery(contratsOpts) as { data: Contrat[] };

//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const in7 = new Date(today.getTime() + 7 * 86400000);

//   const retards = data.filter((r) => new Date(r.date_echeance) < today);
//   const aVenir = data.filter((r) => {
//     const d = new Date(r.date_echeance);
//     return d >= today && d <= in7;
//   });
//   const futurs = data.filter((r) => new Date(r.date_echeance) > in7);
//   const sumReste = (rows: Row[]) => rows.reduce((a, r) => a + Number(r.reste), 0);

//   const futursByMonth = futurs.reduce<Record<string, Row[]>>((acc, r) => {
//     const k = r.date_echeance.slice(0, 7);
//     (acc[k] ??= []).push(r);
//     return acc;
//   }, {});

//   // Contrats actifs avec date_fin
//   const contratsAvecFin = contrats
//     .filter((c) => c.statut === "actif" && c.date_fin)
//     .sort((a, b) => new Date(a.date_fin!).getTime() - new Date(b.date_fin!).getTime());

//   const bientotExpires = contratsAvecFin.filter((c) => {
//     const j = daysDiff(today, new Date(c.date_fin!));
//     return j >= 0 && j <= 90;
//   });

//   return (
//     <div className="space-y-6 max-w-7xl mx-auto">
//       <div>
//         <h1 className="text-2xl font-bold tracking-tight">Échéances</h1>
//         <p className="text-sm text-muted-foreground">Vue transversale par urgence + fin de baux</p>
//       </div>

//       {/* Fin de baux */}
//       {contratsAvecFin.length > 0 && (
//         <Card className="p-0 overflow-hidden border border-border/60">
//           <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
//             <TrendingDown className="h-4 w-4 text-muted-foreground" />
//             <h2 className="font-semibold">Fin de baux</h2>
//             {bientotExpires.length > 0 && (
//               <span className="text-xs px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium">
//                 {bientotExpires.length} dans 90j
//               </span>
//             )}
//           </div>
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
//                   <th className="px-4 py-2">Locataire</th>
//                   <th className="px-4 py-2 hidden md:table-cell">Propriété</th>
//                   <th className="px-4 py-2 hidden sm:table-cell">Début</th>
//                   <th className="px-4 py-2">Fin de bail</th>
//                   <th className="px-4 py-2">Temps restant</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {contratsAvecFin.map((c) => (
//                   <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
//                     <td className="px-4 py-2 font-medium">
//                       <div className="flex items-center gap-1.5">
//                         <User className="h-3.5 w-3.5 text-muted-foreground" />
//                         {c.locataire ? `${c.locataire.prenom} ${c.locataire.nom}` : "—"}
//                       </div>
//                     </td>
//                     <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">
//                       <div className="flex items-center gap-1.5">
//                         <Building2 className="h-3.5 w-3.5" />
//                         {c.propriete?.nom ?? "—"}
//                       </div>
//                     </td>
//                     <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell text-sm">
//                       {formatDate(c.date_debut)}
//                     </td>
//                     <td className="px-4 py-2 text-sm font-medium">{formatDate(c.date_fin!)}</td>
//                     <td className="px-4 py-2">
//                       <BailBadge dateFin={c.date_fin} />
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </Card>
//       )}

//       <Section
//         title="Retards"
//         icon={AlertTriangle}
//         count={retards.length}
//         total={sumReste(retards)}
//         tone="destructive"
//       >
//         <EcheanceTable rows={retards} highlight />
//       </Section>

//       <Section
//         title="À venir (7 prochains jours)"
//         icon={Clock}
//         count={aVenir.length}
//         total={sumReste(aVenir)}
//         tone="warning"
//       >
//         <EcheanceTable rows={aVenir} />
//       </Section>

//       <div>
//         <div className="flex items-center gap-2 mb-3">
//           <Calendar className="h-4 w-4 text-muted-foreground" />
//           <h2 className="font-semibold">Prochains mois</h2>
//         </div>
//         {Object.keys(futursByMonth).length === 0 && (
//           <Card className="p-6 text-center text-sm text-muted-foreground">Rien de planifié</Card>
//         )}
//         {Object.entries(futursByMonth).map(([k, rows]) => (
//           <div key={k} className="mb-4">
//             <h3 className="text-sm font-semibold text-muted-foreground mb-2 mt-2">
//               {formatPeriode(k + "-01")}
//             </h3>
//             <Card className="p-0 overflow-hidden">
//               <EcheanceTable rows={rows} />
//             </Card>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function Section({
//   title,
//   icon: Icon,
//   count,
//   total,
//   tone,
//   children,
// }: {
//   title: string;
//   icon: typeof AlertTriangle;
//   count: number;
//   total: number;
//   tone: "destructive" | "warning";
//   children: React.ReactNode;
// }) {
//   const c =
//     tone === "destructive"
//       ? "border-destructive/40 bg-destructive/5"
//       : "border-warning/40 bg-warning/5";
//   const tc = tone === "destructive" ? "text-destructive" : "text-warning";
//   return (
//     <Card className={`p-0 overflow-hidden border ${c}`}>
//       <div
//         className={`px-4 py-3 border-b flex items-center justify-between ${tone === "destructive" ? "border-destructive/30" : "border-warning/30"}`}
//       >
//         <div className="flex items-center gap-2">
//           <Icon className={`h-4 w-4 ${tc}`} />
//           <h2 className="font-semibold">{title}</h2>
//           <span className={`text-xs px-2 py-0.5 rounded ${tc} bg-background/40`}>{count}</span>
//         </div>
//         <div className="text-sm font-mono font-semibold">{formatFCFA(total)}</div>
//       </div>
//       {count === 0 ? (
//         <div className="px-4 py-6 text-center text-sm text-muted-foreground">Rien à signaler</div>
//       ) : (
//         children
//       )}
//     </Card>
//   );
// }

// function EcheanceTable({ rows, highlight }: { rows: Row[]; highlight?: boolean }) {
//   if (rows.length === 0) return null;
//   return (
//     <div className="overflow-x-auto">
//       <table className="w-full">
//         <thead>
//           <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
//             <th className="px-4 py-2">Type</th>
//             <th className="px-4 py-2">Locataire</th>
//             <th className="px-4 py-2 hidden md:table-cell">Propriété</th>
//             <th className="px-4 py-2 hidden sm:table-cell">Période</th>
//             <th className="px-4 py-2 text-right">Reste</th>
//             <th className="px-4 py-2 hidden sm:table-cell">Échéance</th>
//             <th className="px-4 py-2">Délai</th>
//             <th className="px-4 py-2 hidden md:table-cell">Statut</th>
//           </tr>
//         </thead>
//         <tbody>
//           {rows.map((r) => {
//             const today = new Date();
//             today.setHours(0, 0, 0, 0);
//             const d = new Date(r.date_echeance);
//             d.setHours(0, 0, 0, 0);
//             const j = daysDiff(today, d);
//             const joursLabel =
//               j < 0 ? `${Math.abs(j)}j retard` : j === 0 ? "Aujourd'hui" : `${j}j restants`;
//             const joursCls =
//               j < 0
//                 ? "bg-destructive/15 text-destructive"
//                 : j <= 7
//                   ? "bg-warning/15 text-warning"
//                   : "bg-muted text-muted-foreground";
//             return (
//               <tr
//                 key={`${r.type}-${r.id}`}
//                 className={`border-b border-border/30 hover:bg-muted/30 ${highlight ? "bg-destructive/5" : ""}`}
//               >
//                 <td className="px-4 py-2">
//                   <span
//                     className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${r.type === "loyer" ? "bg-primary/15 text-primary" : "bg-blue-500/15 text-blue-400"}`}
//                   >
//                     {r.type === "loyer" ? "Loyer" : "Eau"}
//                   </span>
//                 </td>
//                 <td className="px-4 py-2 font-medium">
//                   {r.contrat?.locataire
//                     ? `${r.contrat.locataire.prenom} ${r.contrat.locataire.nom}`
//                     : "—"}
//                 </td>
//                 <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">
//                   {r.contrat?.propriete?.nom ?? "—"}
//                 </td>
//                 <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">
//                   {formatPeriode(r.periode)}
//                 </td>
//                 <td className="px-4 py-2 text-right font-mono">{formatFCFA(Number(r.reste))}</td>
//                 <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">
//                   {formatDate(r.date_echeance)}
//                 </td>
//                 <td className="px-4 py-2">
//                   <span
//                     className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${joursCls}`}
//                   >
//                     {joursLabel}
//                   </span>
//                 </td>
//                 <td className="px-4 py-2 hidden md:table-cell">
//                   <span
//                     className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${r.statut === "partiel" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`}
//                   >
//                     {r.statut === "partiel" ? "Partiel" : "Impayé"}
//                   </span>
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   );
// }
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { listEcheances, listContrats } from "@/lib/api/gestion.functions";
import { formatFCFA, formatDate, formatPeriode } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Clock, Calendar, Building2, User, TrendingDown, Eye } from "lucide-react";
import { useState } from "react";

const echeancesOpts = queryOptions({ queryKey: ["echeances"], queryFn: () => listEcheances() });
const contratsOpts = queryOptions({ queryKey: ["contrats"], queryFn: () => listContrats() });

export const Route = createFileRoute("/_authenticated/echeances")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(echeancesOpts),
      context.queryClient.ensureQueryData(contratsOpts),
    ]),
  component: Page,
});

type Row = {
  id: string;
  type: "loyer" | "eau";
  periode: string;
  reste: number;
  date_echeance: string;
  statut: string;
  contrat: {
    propriete?: { nom: string } | null;
    locataire?: { nom: string; prenom: string } | null;
  } | null;
};

function daysDiff(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function Page() {
  const { data: echeances = [] } = useSuspenseQuery(echeancesOpts);
  const { data: contrats = [] } = useSuspenseQuery(contratsOpts);

  const [selectedRow, setSelectedRow] = useState<Row | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today.getTime() + 7 * 86400000);

  const retards = echeances.filter((r: Row) => new Date(r.date_echeance) < today);
  const aVenir = echeances.filter((r: Row) => {
    const d = new Date(r.date_echeance);
    return d >= today && d <= in7;
  });
  const futurs = echeances.filter((r: Row) => new Date(r.date_echeance) > in7);

  const sumReste = (rows: Row[]) => rows.reduce((a, r) => a + Number(r.reste), 0);

  const futursByMonth = futurs.reduce<Record<string, Row[]>>((acc, r) => {
    const k = r.date_echeance.slice(0, 7);
    (acc[k] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Échéances</h1>
        <p className="text-sm text-muted-foreground">Vue transversale par urgence</p>
      </div>

      {/* Sections existantes (Retards, À venir, etc.) */}
      <Section
        title="Retards"
        icon={AlertTriangle}
        count={retards.length}
        total={sumReste(retards)}
        tone="destructive"
      >
        <EcheanceTable rows={retards} highlight onDetails={setSelectedRow} />
      </Section>

      <Section
        title="À venir (7 prochains jours)"
        icon={Clock}
        count={aVenir.length}
        total={sumReste(aVenir)}
        tone="warning"
      >
        <EcheanceTable rows={aVenir} onDetails={setSelectedRow} />
      </Section>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Prochains mois</h2>
        </div>
        {Object.entries(futursByMonth).map(([k, rows]) => (
          <div key={k} className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              {formatPeriode(k + "-01")}
            </h3>
            <EcheanceTable rows={rows} onDetails={setSelectedRow} />
          </div>
        ))}
      </div>

      {/* Modal Détails */}
      <Dialog open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de l'échéance</DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm text-muted-foreground">Locataire</p>
                <p className="font-medium">
                  {selectedRow.contrat?.locataire
                    ? `${selectedRow.contrat.locataire.prenom} ${selectedRow.contrat.locataire.nom}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Propriété</p>
                <p>{selectedRow.contrat?.propriete?.nom ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{selectedRow.type === "loyer" ? "Loyer" : "Eau"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Période</p>
                  <p className="font-medium">{formatPeriode(selectedRow.periode)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Montant restant</p>
                  <p className="text-xl font-bold text-destructive">
                    {formatFCFA(selectedRow.reste)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Échéance</p>
                  <p>{formatDate(selectedRow.date_echeance)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-sm ${selectedRow.statut === "partiel" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}
                >
                  {selectedRow.statut === "partiel" ? "Paiement partiel" : "Impayé"}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ==================== COMPOSANTS ==================== */

function Section({ title, icon: Icon, count, total, tone, children }: any) {
  const c =
    tone === "destructive"
      ? "border-destructive/40 bg-destructive/5"
      : "border-warning/40 bg-warning/5";
  const tc = tone === "destructive" ? "text-destructive" : "text-warning";

  return (
    <Card className={`p-0 overflow-hidden border ${c}`}>
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${tone === "destructive" ? "border-destructive/30" : "border-warning/30"}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${tc}`} />
          <h2 className="font-semibold">{title}</h2>
          <span className={`text-xs px-2 py-0.5 rounded ${tc} bg-background/40`}>{count}</span>
        </div>
        <div className="text-sm font-mono font-semibold">{formatFCFA(total)}</div>
      </div>
      {count === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">Rien à signaler</div>
      ) : (
        children
      )}
    </Card>
  );
}

function EcheanceTable({
  rows,
  highlight,
  onDetails,
}: {
  rows: Row[];
  highlight?: boolean;
  onDetails: (row: Row) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
            <th className="px-4 py-3">Locataire</th>
            <th className="px-4 py-3 text-right">Reste</th>
            <th className="px-4 py-3 hidden sm:table-cell">Délai</th>
            <th className="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const d = new Date(r.date_echeance);
            d.setHours(0, 0, 0, 0);
            const j = daysDiff(today, d);
            const joursLabel = j < 0 ? `${Math.abs(j)}j retard` : j === 0 ? "Aujourd'hui" : `${j}j`;

            return (
              <tr
                key={`${r.type}-${r.id}`}
                className={`border-b border-border/30 hover:bg-muted/30 ${highlight ? "bg-destructive/5" : ""}`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {r.contrat?.locataire
                      ? `${r.contrat.locataire.prenom} ${r.contrat.locataire.nom}`
                      : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.type === "loyer" ? "Loyer" : "Eau"} • {formatPeriode(r.periode)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-destructive">
                  {formatFCFA(Number(r.reste))}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${j < 0 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}
                  >
                    {joursLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={() => onDetails(r)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
