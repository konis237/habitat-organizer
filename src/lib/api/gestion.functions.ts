import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ============ PROPRIETES ============
export const listProprietes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("proprietes").select("*").order("nom");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const proprieteSchema = z.object({
  id: z.string().uuid().optional(),
  nom: z.string().min(2),
  adresse: z.string().min(3),
  montant_loyer: z.number().nonnegative(),
});

export const upsertPropriete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => proprieteSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("proprietes")
        .update({ nom: data.nom, adresse: data.adresse, montant_loyer: data.montant_loyer })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("proprietes").insert({
        nom: data.nom,
        adresse: data.adresse,
        montant_loyer: data.montant_loyer,
        statut: "libre",
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deletePropriete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("proprietes").delete().eq("id", data.id);
    if (error)
      throw new Error("Suppression impossible : un contrat existe peut-être pour ce bien.");
    return { ok: true };
  });

// ============ LOCATAIRES ============
export const listLocataires = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("locataires").select("*").order("nom");
    if (error) throw new Error(error.message);
    // Aussi contrats actifs pour badge
    const { data: actifs } = await context.supabase
      .from("contrats")
      .select("locataire_id")
      .eq("statut", "actif");
    const set = new Set((actifs ?? []).map((c: { locataire_id: string }) => c.locataire_id));
    return (data ?? []).map((l) => ({ ...l, contrat_actif: set.has(l.id) }));
  });

const locataireSchema = z.object({
  id: z.string().uuid().optional(),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  telephone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  numero_cni: z.string().optional().nullable(),
});

export const upsertLocataire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => locataireSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      nom: data.nom,
      prenom: data.prenom,
      telephone: data.telephone || null,
      email: data.email || null,
      numero_cni: data.numero_cni || null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("locataires").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("locataires").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteLocataire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: actifs } = await context.supabase
      .from("contrats")
      .select("id")
      .eq("locataire_id", data.id)
      .eq("statut", "actif");
    if (actifs && actifs.length > 0)
      throw new Error("Locataire avec contrat actif — impossible de supprimer.");
    const { error } = await context.supabase.from("locataires").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getLocataireDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: locataire } = await context.supabase
      .from("locataires")
      .select("*")
      .eq("id", data.id)
      .single();
    const { data: contrats } = await context.supabase
      .from("contrats")
      .select("*, propriete:proprietes(nom, adresse)")
      .eq("locataire_id", data.id)
      .order("date_debut", { ascending: false });
    return { locataire, contrats: contrats ?? [] };
  });

// ============ CONTRATS ============
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export const listContrats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("contrats")
      .select("*, propriete:proprietes(nom), locataire:locataires(nom, prenom)")
      .order("statut", { ascending: true })
      .order("date_debut", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const contratSchema = z.object({
  propriete_id: z.string().uuid(),
  locataire_id: z.string().uuid(),
  date_debut: z.string(),
  date_fin: z.string().optional().nullable(),
  loyer_mensuel: z.number().positive(),
  eau_mensuelle: z.number().nonnegative(),
  premier_mois_paye: z.boolean(),
  mois_payes_avance: z.number().int().nonnegative(),
});

export const createContrat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => contratSchema.parse(d))
  .handler(async ({ data, context }) => {
    const debut = new Date(data.date_debut);
    const decalage = (data.premier_mois_paye ? 1 : 0) + data.mois_payes_avance;
    const prochaine = addMonths(debut, decalage);
    const prochaineISO = toISO(prochaine);

    const { data: contrat, error } = await context.supabase
      .from("contrats")
      .insert({
        propriete_id: data.propriete_id,
        locataire_id: data.locataire_id,
        date_debut: data.date_debut,
        date_fin: data.date_fin || null,
        loyer_mensuel: data.loyer_mensuel,
        eau_mensuelle: data.eau_mensuelle,
        premier_mois_paye: data.premier_mois_paye,
        mois_payes_avance: data.mois_payes_avance,
        prochaine_echeance: prochaineISO,
        statut: "actif",
      })
      .select()
      .single();
    if (error || !contrat) throw new Error(error?.message ?? "Erreur création contrat");

    await context.supabase
      .from("proprietes")
      .update({ statut: "occupe" })
      .eq("id", data.propriete_id);

    // Génère 1ère échéance si due
    if (prochaine <= new Date()) {
      const periode = toISO(startOfMonth(prochaine));
      await context.supabase.from("loyers").insert({
        contrat_id: contrat.id,
        periode,
        montant: data.loyer_mensuel,
        date_echeance: prochaineISO,
      });
      if (data.eau_mensuelle > 0) {
        await context.supabase.from("factures_eau").insert({
          contrat_id: contrat.id,
          periode,
          montant: data.eau_mensuelle,
          date_echeance: prochaineISO,
        });
      }
    }
    return { ok: true };
  });

export const cloturerContrat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: c } = await context.supabase
      .from("contrats")
      .select("propriete_id")
      .eq("id", data.id)
      .single();
    await context.supabase.from("contrats").update({ statut: "cloture" }).eq("id", data.id);
    if (c)
      await context.supabase
        .from("proprietes")
        .update({ statut: "libre" })
        .eq("id", c.propriete_id);
    return { ok: true };
  });

// Génération manuelle des échéances du mois courant
export const genererEcheancesMois = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date();
    const { data: contrats } = await context.supabase
      .from("contrats")
      .select("*")
      .eq("statut", "actif");
    let created = 0;
    for (const c of contrats ?? []) {
      const prochaine = new Date(c.prochaine_echeance as string);
      if (prochaine > today) continue;
      const periode = toISO(startOfMonth(prochaine));
      const echISO = toISO(prochaine);
      const { error: e1 } = await context.supabase
        .from("loyers")
        .upsert(
          { contrat_id: c.id, periode, montant: c.loyer_mensuel, date_echeance: echISO },
          { onConflict: "contrat_id,periode", ignoreDuplicates: true },
        );
      if (!e1) created++;
      if (Number(c.eau_mensuelle) > 0) {
        await context.supabase
          .from("factures_eau")
          .upsert(
            { contrat_id: c.id, periode, montant: c.eau_mensuelle, date_echeance: echISO },
            { onConflict: "contrat_id,periode", ignoreDuplicates: true },
          );
      }
      const next = toISO(addMonths(prochaine, 1));
      await context.supabase.from("contrats").update({ prochaine_echeance: next }).eq("id", c.id);
    }
    return { created };
  });

// ============ LOYERS / EAU ============
// ====================== HISTORIQUE LOYERS ======================
// ====================== HISTORIQUE LOYERS ======================
export const listHistoriqueLoyers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: contrats } = await context.supabase
      .from("contrats")
      .select(
        `
        *,
        propriete:proprietes(nom),
        locataire:locataires(nom, prenom),
        loyers(*)
      `,
      )
      .eq("statut", "actif")
      .order("date_debut", { ascending: false });

    if (!contrats) return [];

    return contrats
      .flatMap((c: any) => {
        const loyerBase = Number(c.loyer_mensuel);
        const moisPayesAvance = (c.premier_mois_paye ? 1 : 0) + Number(c.mois_payes_avance || 0);

        const historique: any[] = [];
        const moisAGenerer = Math.max(moisPayesAvance + 12, 24); // avance exacte + 12 mois futur

        for (let i = 0; i < moisAGenerer; i++) {
          const periodeDate = addMonths(new Date(c.date_debut), i);
          const periode = toISO(startOfMonth(periodeDate));

          const existing = (c.loyers || []).find((l: any) => l.periode === periode);

          if (existing) {
            historique.push({
              ...existing,
              contrat: c,
              type: "loyer",
              isVirtual: false,
            });
          } else {
            const estPayeAvance = i < moisPayesAvance;
            historique.push({
              id: `virtual-loyer-${c.id}-${periode}`,
              contrat_id: c.id,
              periode,
              montant: loyerBase,
              montant_paye: estPayeAvance ? loyerBase : 0,
              reste: estPayeAvance ? 0 : loyerBase,
              date_echeance: toISO(periodeDate),
              statut: estPayeAvance ? "paye" : "impaye",
              contrat: c,
              isVirtual: true,
              type: "loyer",
            });
          }
        }
        return historique;
      })
      .sort((a, b) => a.periode.localeCompare(b.periode));
  });

// ====================== HISTORIQUE EAU ======================
export const listHistoriqueEau = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: contrats } = await context.supabase
      .from("contrats")
      .select(
        `
        *,
        propriete:proprietes(nom),
        locataire:locataires(nom, prenom),
        factures_eau(*)
      `,
      )
      .eq("statut", "actif")
      .order("date_debut", { ascending: false });

    if (!contrats) return [];

    return contrats
      .flatMap((c: any) => {
        const eauBase = Number(c.eau_mensuelle);
        if (eauBase <= 0) return [];

        const moisPayesAvance = (c.premier_mois_paye ? 1 : 0) + Number(c.mois_payes_avance || 0);
        const historique: any[] = [];
        const moisAGenerer = Math.max(moisPayesAvance + 12, 24);

        for (let i = 0; i < moisAGenerer; i++) {
          const periodeDate = addMonths(new Date(c.date_debut), i);
          const periode = toISO(startOfMonth(periodeDate));

          const existing = (c.factures_eau || []).find((f: any) => f.periode === periode);

          if (existing) {
            historique.push({
              ...existing,
              contrat: c,
              type: "eau",
              isVirtual: false,
            });
          } else {
            const estPayeAvance = i < moisPayesAvance;
            historique.push({
              id: `virtual-eau-${c.id}-${periode}`,
              contrat_id: c.id,
              periode,
              montant: eauBase,
              montant_paye: estPayeAvance ? eauBase : 0,
              reste: estPayeAvance ? 0 : eauBase,
              date_echeance: toISO(periodeDate),
              statut: estPayeAvance ? "paye" : "impaye",
              ancien_index: null,
              nouveau_index: null,
              prix_unitaire: null,
              contrat: c,
              isVirtual: true,
              type: "eau",
            });
          }
        }
        return historique;
      })
      .sort((a, b) => a.periode.localeCompare(b.periode));
  });
function buildEcheanceListFn(table: "loyers" | "factures_eau") {
  return createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d) => z.object({ periode: z.string() }).parse(d))
    .handler(async ({ data, context }) => {
      const { data: rows, error } = await context.supabase
        .from(table)
        .select("*, contrat:contrats(propriete:proprietes(nom), locataire:locataires(nom, prenom))")
        .eq("periode", data.periode)
        .order("date_echeance");
      if (error) throw new Error(error.message);
      return rows ?? [];
    });
}
export const listLoyers = buildEcheanceListFn("loyers");
export const listEau = buildEcheanceListFn("factures_eau");

const paiementSchema = z.object({
  document_id: z.string().uuid(),
  type_document: z.enum(["loyer", "eau"]),
  montant: z.number().positive(),
  date_paiement: z.string(),
  observation: z.string().optional().nullable(),
});

export const enregistrerPaiement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => paiementSchema.parse(d))
  .handler(async ({ data, context }) => {
    const table = data.type_document === "loyer" ? "loyers" : "factures_eau";
    const { data: ech } = await context.supabase
      .from(table)
      .select("*")
      .eq("id", data.document_id)
      .single();
    if (!ech) throw new Error("Échéance introuvable");
    const nouveauPaye = Number(ech.montant_paye) + data.montant;
    const reste = Number(ech.montant) - nouveauPaye;
    const statut = reste <= 0 ? "paye" : nouveauPaye > 0 ? "partiel" : "impaye";
    const { error: e1 } = await context.supabase
      .from(table)
      .update({ montant_paye: nouveauPaye, statut })
      .eq("id", data.document_id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await context.supabase.from("paiements").insert({
      document_id: data.document_id,
      type_document: data.type_document,
      montant: data.montant,
      date_paiement: data.date_paiement,
      observation: data.observation || null,
    });
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

// Mise à jour du montant d'une facture d'eau via index
const eauIndexSchema = z.object({
  id: z.string().uuid(),
  ancien_index: z.number().nonnegative(),
  nouveau_index: z.number().nonnegative(),
  prix_unitaire: z.number().nonnegative(),
});
export const updateFactureEauIndex = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => eauIndexSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.nouveau_index < data.ancien_index)
      throw new Error("Le nouvel index doit être ≥ à l'ancien");
    const conso = data.nouveau_index - data.ancien_index;
    const montant = Math.round(conso * data.prix_unitaire);
    const { data: ech } = await context.supabase
      .from("factures_eau")
      .select("montant_paye")
      .eq("id", data.id)
      .single();
    if (!ech) throw new Error("Facture introuvable");
    const paye = Number(ech.montant_paye);
    const reste = montant - paye;
    const statut = reste <= 0 ? "paye" : paye > 0 ? "partiel" : "impaye";
    const { error } = await context.supabase
      .from("factures_eau")
      .update({
        ancien_index: data.ancien_index,
        nouveau_index: data.nouveau_index,
        prix_unitaire: data.prix_unitaire,
        montant,
        statut,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, montant, conso };
  });

// ============ PAIEMENTS LISTING ============
export const listPaiements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        debut: z.string(),
        fin: z.string(),
        type: z.enum(["tous", "loyer", "eau"]).default("tous"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("paiements")
      .select("*")
      .gte("date_paiement", data.debut)
      .lte("date_paiement", data.fin)
      .order("date_paiement", { ascending: false });
    if (data.type !== "tous") q = q.eq("type_document", data.type);
    const { data: paiements, error } = await q;
    if (error) throw new Error(error.message);

    // Enrichir avec locataire/propriete/periode
    const enriched = await Promise.all(
      (paiements ?? []).map(async (p) => {
        const table = p.type_document === "loyer" ? "loyers" : "factures_eau";
        const { data: doc } = await context.supabase
          .from(table)
          .select(
            "periode, contrat:contrats(locataire:locataires(nom, prenom), propriete:proprietes(nom))",
          )
          .eq("id", p.document_id)
          .single();
        return { ...p, doc };
      }),
    );
    return enriched;
  });

// ============ ECHEANCES ============
export const listEcheances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const fetchAll = async (table: "loyers" | "factures_eau", type: "loyer" | "eau") => {
      const { data } = await context.supabase
        .from(table)
        .select(
          "id, periode, montant, montant_paye, reste, date_echeance, statut, contrat:contrats(propriete:proprietes(nom), locataire:locataires(nom, prenom))",
        )
        .neq("statut", "paye")
        .order("date_echeance");
      return (data ?? []).map((r) => ({ ...r, type }));
    };
    const [loyers, eau] = await Promise.all([
      fetchAll("loyers", "loyer"),
      fetchAll("factures_eau", "eau"),
    ]);
    return [...loyers, ...eau].sort(
      (a, b) =>
        new Date(a.date_echeance as string).getTime() -
        new Date(b.date_echeance as string).getTime(),
    );
  });

// ============ DASHBOARD ============
export const dashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const today = new Date();
    const periode = toISO(startOfMonth(today));
    const in7 = toISO(addMonths(today, 0)); // not used
    void in7;
    const todayISO = toISO(today);
    const sevenISO = toISO(new Date(today.getTime() + 7 * 86400000));

    const [
      { count: nProp },
      { count: nLoc },
      { count: nContrats },
      loyersMois,
      eauMois,
      impayesLoyers,
      impayesEau,
      prochaines,
      derniersPaiements,
    ] = await Promise.all([
      s.from("proprietes").select("*", { count: "exact", head: true }),
      s.from("locataires").select("*", { count: "exact", head: true }),
      s.from("contrats").select("*", { count: "exact", head: true }).eq("statut", "actif"),
      s.from("loyers").select("montant").eq("periode", periode),
      s.from("factures_eau").select("montant").eq("periode", periode),
      s.from("loyers").select("reste").neq("statut", "paye"),
      s.from("factures_eau").select("reste").neq("statut", "paye"),
      s
        .from("loyers")
        .select(
          "id, montant, reste, date_echeance, contrat:contrats(propriete:proprietes(nom), locataire:locataires(nom, prenom))",
        )
        .gte("date_echeance", todayISO)
        .lte("date_echeance", sevenISO)
        .neq("statut", "paye"),
      s.from("paiements").select("*").order("date_paiement", { ascending: false }).limit(5),
    ]);

    const sum = (
      rows: { montant?: number | string | null; reste?: number | string | null }[] | null,
      key: "montant" | "reste",
    ) => (rows ?? []).reduce((a, r) => a + Number(r[key] ?? 0), 0);

    return {
      nProprietes: nProp ?? 0,
      nLocataires: nLoc ?? 0,
      nContrats: nContrats ?? 0,
      loyersMois: sum(loyersMois.data, "montant"),
      eauMois: sum(eauMois.data, "montant"),
      impayes: sum(impayesLoyers.data, "reste") + sum(impayesEau.data, "reste"),
      prochaines: prochaines.data ?? [],
      derniersPaiements: derniersPaiements.data ?? [],
    };
  });

// ============ REVENUS ============
export const revenusData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ annee: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const debut = `${data.annee}-01-01`;
    const fin = `${data.annee}-12-31`;
    const today = new Date();
    const periodeMois = toISO(startOfMonth(today));

    const [loyersM, eauM, impLoyers, impEau, paiementsAnnee, loyersDus, eauDus] = await Promise.all(
      [
        s.from("loyers").select("montant_paye").eq("periode", periodeMois),
        s.from("factures_eau").select("montant_paye").eq("periode", periodeMois),
        s.from("loyers").select("reste").neq("statut", "paye"),
        s.from("factures_eau").select("reste").neq("statut", "paye"),
        s
          .from("paiements")
          .select("montant, date_paiement, type_document")
          .gte("date_paiement", debut)
          .lte("date_paiement", fin),
        s.from("loyers").select("montant, periode").gte("periode", debut).lte("periode", fin),
        s.from("factures_eau").select("montant, periode").gte("periode", debut).lte("periode", fin),
      ],
    );

    const sum = (
      rows:
        | {
            montant_paye?: number | string | null;
            reste?: number | string | null;
            montant?: number | string | null;
          }[]
        | null,
      key: string,
    ) => (rows ?? []).reduce((a, r) => a + Number((r as Record<string, unknown>)[key] ?? 0), 0);

    // Mensuel
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, "0");
      return {
        key: `${data.annee}-${m}`,
        label: new Date(data.annee, i, 1).toLocaleDateString("fr-FR", { month: "short" }),
      };
    });
    const monthly = months.map((m) => {
      const loy = (paiementsAnnee.data ?? [])
        .filter((p) => p.type_document === "loyer" && (p.date_paiement as string).startsWith(m.key))
        .reduce((a, p) => a + Number(p.montant), 0);
      const eau = (paiementsAnnee.data ?? [])
        .filter((p) => p.type_document === "eau" && (p.date_paiement as string).startsWith(m.key))
        .reduce((a, p) => a + Number(p.montant), 0);
      const dusLoy = (loyersDus.data ?? [])
        .filter((l) => (l.periode as string).startsWith(m.key))
        .reduce((a, l) => a + Number(l.montant), 0);
      const dusEau = (eauDus.data ?? [])
        .filter((l) => (l.periode as string).startsWith(m.key))
        .reduce((a, l) => a + Number(l.montant), 0);
      const totalEnc = loy + eau;
      const totalDu = dusLoy + dusEau;
      return {
        mois: m.label,
        loy,
        eau,
        totalEnc,
        dusLoy,
        dusEau,
        totalDu,
        taux: totalDu > 0 ? Math.round((totalEnc / totalDu) * 100) : 0,
      };
    });

    return {
      encLoyersMois: sum(loyersM.data, "montant_paye"),
      encEauMois: sum(eauM.data, "montant_paye"),
      restant: sum(impLoyers.data, "reste") + sum(impEau.data, "reste"),
      monthly,
    };
  });
