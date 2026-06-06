import { createFileRoute } from "@tanstack/react-router";
import { EcheancesPage } from "@/components/echeances-page";

export const Route = createFileRoute("/_authenticated/eau")({
  component: () => <EcheancesPage type="eau" title="Factures d'eau" />,
});
