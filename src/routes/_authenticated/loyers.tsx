import { createFileRoute } from "@tanstack/react-router";
import { EcheancesPage } from "@/components/echeances-page";

export const Route = createFileRoute("/_authenticated/loyers")({
  component: () => <EcheancesPage type="loyer" title="Loyers" />,
});
