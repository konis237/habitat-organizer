
-- proprietes
CREATE TABLE public.proprietes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  adresse text NOT NULL,
  montant_loyer numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'libre' CHECK (statut IN ('libre','occupe')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proprietes TO authenticated;
GRANT ALL ON public.proprietes TO service_role;
ALTER TABLE public.proprietes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all proprietes" ON public.proprietes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- locataires
CREATE TABLE public.locataires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prenom text NOT NULL,
  telephone text,
  email text,
  numero_cni text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locataires TO authenticated;
GRANT ALL ON public.locataires TO service_role;
ALTER TABLE public.locataires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all locataires" ON public.locataires FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- contrats
CREATE TABLE public.contrats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propriete_id uuid NOT NULL REFERENCES public.proprietes(id) ON DELETE RESTRICT,
  locataire_id uuid NOT NULL REFERENCES public.locataires(id) ON DELETE RESTRICT,
  date_debut date NOT NULL,
  date_fin date,
  loyer_mensuel numeric NOT NULL,
  eau_mensuelle numeric NOT NULL DEFAULT 0,
  premier_mois_paye boolean NOT NULL DEFAULT false,
  mois_payes_avance integer NOT NULL DEFAULT 0,
  prochaine_echeance date NOT NULL,
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif','cloture')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contrats_propriete ON public.contrats(propriete_id);
CREATE INDEX idx_contrats_locataire ON public.contrats(locataire_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrats TO authenticated;
GRANT ALL ON public.contrats TO service_role;
ALTER TABLE public.contrats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all contrats" ON public.contrats FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- loyers
CREATE TABLE public.loyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrat_id uuid NOT NULL REFERENCES public.contrats(id) ON DELETE CASCADE,
  periode date NOT NULL,
  montant numeric NOT NULL,
  montant_paye numeric NOT NULL DEFAULT 0,
  reste numeric GENERATED ALWAYS AS (montant - montant_paye) STORED,
  date_echeance date NOT NULL,
  statut text NOT NULL DEFAULT 'impaye' CHECK (statut IN ('impaye','partiel','paye')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contrat_id, periode)
);
CREATE INDEX idx_loyers_contrat ON public.loyers(contrat_id);
CREATE INDEX idx_loyers_periode ON public.loyers(periode);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyers TO authenticated;
GRANT ALL ON public.loyers TO service_role;
ALTER TABLE public.loyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all loyers" ON public.loyers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- factures_eau
CREATE TABLE public.factures_eau (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrat_id uuid NOT NULL REFERENCES public.contrats(id) ON DELETE CASCADE,
  periode date NOT NULL,
  montant numeric NOT NULL,
  montant_paye numeric NOT NULL DEFAULT 0,
  reste numeric GENERATED ALWAYS AS (montant - montant_paye) STORED,
  date_echeance date NOT NULL,
  statut text NOT NULL DEFAULT 'impaye' CHECK (statut IN ('impaye','partiel','paye')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contrat_id, periode)
);
CREATE INDEX idx_eau_contrat ON public.factures_eau(contrat_id);
CREATE INDEX idx_eau_periode ON public.factures_eau(periode);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factures_eau TO authenticated;
GRANT ALL ON public.factures_eau TO service_role;
ALTER TABLE public.factures_eau ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all eau" ON public.factures_eau FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- paiements
CREATE TABLE public.paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  type_document text NOT NULL CHECK (type_document IN ('loyer','eau')),
  montant numeric NOT NULL CHECK (montant > 0),
  date_paiement date NOT NULL DEFAULT CURRENT_DATE,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_paiements_doc ON public.paiements(document_id, type_document);
CREATE INDEX idx_paiements_date ON public.paiements(date_paiement);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paiements TO authenticated;
GRANT ALL ON public.paiements TO service_role;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all paiements" ON public.paiements FOR ALL TO authenticated USING (true) WITH CHECK (true);
