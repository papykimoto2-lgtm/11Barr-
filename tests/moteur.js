/* Tests du moteur métier : node tests/moteur.js (aucune dépendance). Reprend les scénarios financiers obligatoires du dossier technique V1 (§11.2). */
const M = require("../moteur.js");
let ok = 0, ko = 0;
const t = (nom, cond, detail) => { if (cond) { ok++; console.log("PASS", nom); } else { ko++; console.log("FAIL", nom, detail === undefined ? "" : "→ " + JSON.stringify(detail)); } };
const leve = (f, code) => { try { f(); return false; } catch (e) { return e.code === code; } };
const FIXE = (v) => ({ id: "p", version: 1, commission: { type: "fixe", valeur: v } });

/* --- Statuts de commande --- */
{
  const c = { id: "C1", statut: "draft" };
  ["quoted", "ready_for_assignment", "assigned", "courier_to_pickup", "picked_up", "in_transit", "arrived", "delivered"].forEach((s) => M.changerStatut(c, s, "test"));
  t("statuts : cycle complet jusqu'à delivered", c.statut === "delivered" && c.evenements.length === 8);
  t("statuts : une commande livrée ne revient jamais en arrière", leve(() => M.changerStatut(c, "in_transit", "test"), "TRANSITION_INTERDITE"));
  t("statuts : saut interdit (draft → delivered)", leve(() => M.changerStatut({ id: "C2", statut: "draft" }, "delivered", "x"), "TRANSITION_INTERDITE"));
  t("statuts : statut inconnu refusé", leve(() => M.changerStatut({ id: "C3", statut: "draft" }, "inconnu", "x"), "STATUT_INCONNU"));
  t("statuts : événement figé (append-only)", Object.isFrozen(c.evenements[0]));
  const a = { id: "C4", statut: "assigned" }; M.changerStatut(a, "ready_for_assignment", "ops", "réaffectation");
  t("statuts : réaffectation autorisée avant collecte", a.statut === "ready_for_assignment");
  t("statuts : annulation impossible après livraison", !M.peutPasser("delivered", "cancelled"));
  t("preuve : code exigé pour clôturer", M.preuveValide({ code: "4829" }, "4829") && !M.preuveValide({ code: "4829" }, "0000"));
}

/* --- Devis : équivalence avec les prix de la maquette, lignes, expiration --- */
{
  const P = M.PLAN_DEFAUT, r50 = (n) => Math.round(n / 50) * 50;
  let bons = 0, total = 0;
  Object.entries(P.categories).forEach(([cat, c]) => [0.8, 3.2, 7.9, 11.8, 24.4].forEach((km) => Object.keys(P.vitesses).forEach((v) => [false, true].forEach((porte) => {
    let ref = Math.max(c.min, r50(c.base + c.km * km));
    if (c.liv) { ref = Math.max(300, r50(ref * P.vitesses[v])); if (porte) ref += 200; }
    const d = M.devis(P, { cat, km, vitesse: v, porte }); total++;
    if (d.total === ref && d.lignes.reduce((s, l) => s + l.montant, 0) === d.total) bons++;
  }))));
  t("devis : total identique à la grille actuelle et lignes qui somment au total (" + total + " cas)", bons === total, bons + "/" + total);
  const d = M.devis(P, { cat: "confort", km: 11.8 }, 1000);
  t("devis : expire après " + P.validite_devis_min + " min et reste valide avant", M.devisValide(d, 1000 + 60000) && !M.devisValide(d, 1000 + P.validite_devis_min * 60000 + 1));
  t("devis : photographie des paramètres conservée", d.plan_id === "plan-demo" && d.snapshot.cat === "confort");
  t("devis : catégorie inconnue refusée", leve(() => M.devis(P, { cat: "x", km: 1 }), "CATEGORIE_INCONNUE"));
  const P2 = JSON.parse(JSON.stringify(P)); P2.categories.confort.base = 1000; P2.version = 2;
  t("devis : un autre plan donne un autre prix sans toucher au code", M.devis(P2, { cat: "confort", km: 11.8 }).total > d.total);
  t("plan par défaut gelé (non modifiable par erreur)", Object.isFrozen(P) && Object.isFrozen(P.categories.eco));
}

/* --- Scénarios financiers obligatoires (§11.2) --- */
{
  /* 1. Paiement numérique : tarif 3 000, livreur 2 300, commission 700 */
  const L = M.nouveauLivre(); M.cloturer(L, { ref: "O1", plan: FIXE(700), total: 3000, paiement: "numerique", livreur: "L1" });
  t("F1 paiement numérique : encaissé 3 000, dette livreur 2 300, commission 700", M.solde(L, "caisse").debit === 3000 && M.solde(L, "dette_livreur:L1").net === 2300 && M.solde(L, "produit_commission").net === 700 && M.equilibre(L));
}
{
  /* 2. Cash collecté par le livreur : 2 000, part livreur 1 500 → il doit 500 à la plateforme */
  const L = M.nouveauLivre(); M.cloturer(L, { ref: "O2", plan: FIXE(500), total: 2000, paiement: "cash", livreur: "L1" });
  const s = M.soldeLivreur(L, "L1");
  t("F2 cash : gains 1 500, espèces détenues 2 000, le livreur doit 500", s.gains === 1500 && s.especes === 2000 && s.solde === -500 && M.revenuPropre(L) === 500, s);
}
{
  /* 3. COD : produit 25 000 + transport 2 000 = 27 000 collectés */
  const L = M.nouveauLivre(); M.cloturer(L, { ref: "O3", plan: FIXE(500), total: 2000, produit: 25000, paiement: "cod", livreur: "L1", fournisseur: "S1" });
  t("F3 COD : dette fournisseur 25 000, revenu plateforme 500 seulement, collecte 27 000", M.fondsTiers(L) === 25000 && M.revenuPropre(L) === 500 && M.solde(L, "especes:L1").debit === 27000 && M.soldeLivreur(L, "L1").gains === 1500 && M.equilibre(L));
  t("F3 COD : les 25 000 ne sont pas comptés comme revenu", M.revenuPropre(L) !== 27000 && M.revenuPropre(L) < 2000);
  const L2 = M.nouveauLivre(); M.cloturer(L2, { ref: "O3c", plan: FIXE(500), total: 2000, produit: 25000, paiement: "cod", transport: "numerique", livreur: "L1", fournisseur: "S1" });
  t("F3 COD, transport payé en ligne : le livreur n'encaisse que 25 000 ; caisse 2 000", M.solde(L2, "especes:L1").debit === 25000 && M.solde(L2, "caisse").debit === 2000 && M.fondsTiers(L2) === 25000 && M.equilibre(L2));
  t("F3 COD : fournisseur et produit obligatoires", leve(() => M.cloturer(L, { ref: "O3b", plan: FIXE(500), total: 2000, paiement: "cod", livreur: "L1" }), "COD_INVALIDE"));
}
{
  /* 4. Remboursement partiel : paiement 10 000, remboursement 3 000 */
  const L = M.nouveauLivre(); M.encaisser(L, { ref: "P1", montant: 10000 }); M.rembourser(L, { ref: "R1", paiement: "P1", montant: 3000 });
  t("F4 remboursement : solde remboursable 7 000, écritures compensatoires liées", leve(() => M.rembourser(L, { ref: "R2", paiement: "P1", montant: 7001 }), "REMBOURSEMENT_EXCESSIF") && M.rembourser(L, { ref: "R3", paiement: "P1", montant: 7000 }).tx.meta.paiement === "P1");
  t("F4 remboursement : un paiement inconnu est refusé", leve(() => M.rembourser(L, { ref: "R4", paiement: "X", montant: 1 }), "PAIEMENT_INTROUVABLE"));
}
{
  /* 5. Webhook doublonné : même événement reçu deux fois */
  const L = M.nouveauLivre(); const a = M.encaisser(L, { ref: "P1", montant: 5000, evenement: "evt_123" }), b = M.encaisser(L, { ref: "P1bis", montant: 5000, evenement: "evt_123" });
  t("F5 webhook doublonné : une seule transaction", a.doublon === false && b.doublon === true && L.tx.length === 1 && M.solde(L, "caisse").debit === 5000);
}
{
  /* 6. Règlement livreur : gains validés 20 000, paiement 15 000 → reste 5 000 */
  const L = M.nouveauLivre(); M.cloturer(L, { ref: "O6", plan: FIXE(0), total: 20000, paiement: "numerique", livreur: "L1" });
  M.regler(L, { ref: "G1", livreur: "L1", montant: 15000, reference: "OM-778899" });
  t("F6 règlement : solde dû 5 000, référence conservée", M.solde(L, "dette_livreur:L1").net === 5000 && L.tx[L.tx.length - 1].meta.reference === "OM-778899");
  t("F6 règlement : jamais au-delà de ce qui est dû", leve(() => M.regler(L, { ref: "G2", livreur: "L1", montant: 5001 }), "REGLEMENT_EXCESSIF"));
}
{
  /* 7. Rapprochement : prestataire 100 000, journal 98 000 → écart 2 000 signalé, rien n'est corrigé */
  const L = M.nouveauLivre(); M.encaisser(L, { ref: "P1", montant: 98000 }); const avant = L.tx.length;
  const r = M.rapprocher(L, 100000);
  t("F7 rapprochement : écart 2 000 signalé sans correction silencieuse", r.ecart === 2000 && r.statut === "ecart" && L.tx.length === avant, r);
  t("F7 rapprochement : concordance", M.rapprocher(L, 98000).statut === "ok");
}

/* --- Intégrité du journal --- */
{
  const L = M.nouveauLivre(); const { tx } = M.cloturer(L, { ref: "O9", plan: M.PLAN_DEFAUT, total: 2950, paiement: "cash", livreur: "L1" });
  t("journal : 15 % de 2 950 = 442 pour la plateforme, 2 508 pour le livreur", M.solde(L, "produit_commission").net === 442 && M.solde(L, "dette_livreur:L1").net === 2508);
  t("journal : écriture gelée (aucune modification possible)", Object.isFrozen(tx) && Object.isFrozen(tx.lignes[0]) && (() => { "use strict"; try { tx.lignes[0].credit = 1; return false; } catch (e) { return true; } })());
  t("journal : transaction déséquilibrée refusée", leve(() => M.poster(L, { ref: "X1", lignes: [{ compte: "a", debit: 100, credit: 0 }, { compte: "b", debit: 0, credit: 99 }] }), "DESEQUILIBRE"));
  t("journal : montant décimal refusé", leve(() => M.poster(L, { ref: "X2", lignes: [{ compte: "a", debit: 10.5, credit: 0 }, { compte: "b", debit: 0, credit: 10.5 }] }), "LIGNE_INVALIDE"));
  t("journal : référence en double refusée", leve(() => M.poster(L, { ref: "CL-O9", lignes: [{ compte: "a", debit: 1, credit: 0 }, { compte: "b", debit: 0, credit: 1 }] }), "REFERENCE_INVALIDE"));
  t("journal : une clôture rejouée ne double rien", M.cloturer(L, { ref: "O9", plan: M.PLAN_DEFAUT, total: 2950, paiement: "cash", livreur: "L1" }).doublon === true && L.tx.length === 1);
  const R = M.chargerLivre(JSON.parse(JSON.stringify(L)));
  t("journal : rechargé depuis le stockage, identique, regelé et idempotent", M.soldeLivreur(R, "L1").solde === M.soldeLivreur(L, "L1").solde && Object.isFrozen(R.tx[0]) && M.cloturer(R, { ref: "O9", plan: M.PLAN_DEFAUT, total: 2950, paiement: "cash", livreur: "L1" }).doublon);
  M.verser(L, { ref: "V1", livreur: "L1", montant: 442 });
  const apres = M.soldeLivreur(L, "L1");
  t("versement : après avoir reversé 442, le livreur détient 2 508 pour 2 508 de gains : solde 0", apres.especes === 2508 && apres.gains === 2508 && apres.solde === 0, apres);
  t("versement : au-delà de l'espèces détenue refusé", leve(() => M.verser(L, { ref: "V2", livreur: "L1", montant: 99999 }), "VERSEMENT_EXCESSIF"));
}

/* --- Portail fournisseur : choix Moto/Cargo, remise de contrat, compte pro, relevé, reversement, facture --- */
{
  const P = M.PLAN_DEFAUT;
  t("catégorie : 3 kg → moto", M.choisirCategorie(P, { poids_kg: 3, volume_m3: 0.02 }).mode === "moto");
  t("catégorie : 40 kg → camionnette (Cargo)", M.choisirCategorie(P, { poids_kg: 40 }).cat === "ex");
  t("catégorie : 800 kg → camion", M.choisirCategorie(P, { poids_kg: 800 }).cat === "ca");
  t("catégorie : léger mais volumineux → pas de moto", M.choisirCategorie(P, { poids_kg: 2, volume_m3: 0.5 }).mode === "cargo");
  t("catégorie : valeurs négatives refusées", leve(() => M.choisirCategorie(P, { poids_kg: -1 }), "DIMENSIONS_INVALIDES"));
  const sans = M.devis(P, { cat: "lm", km: 8 }), avec = M.devis(P, { cat: "lm", km: 8, remise: 0.1 });
  t("contrat : remise 10 % visible en ligne négative et total réduit", avec.total < sans.total && avec.lignes.some((l) => l.code === "remise_contrat" && l.montant < 0) && avec.lignes.reduce((s, l) => s + l.montant, 0) === avec.total, avec.lignes);

  const L = M.nouveauLivre();
  M.cloturer(L, { ref: "B1", plan: FIXE(500), total: 2000, paiement: "compte", client: "S1", livreur: "L1" });
  t("compte pro : transport facturé = créance 2 000, aucun encaissement ni espèces", M.creance(L, "S1") === 2000 && M.solde(L, "caisse").debit === 0 && M.soldeLivreur(L, "L1").gains === 1500 && M.equilibre(L));
  t("compte pro : client obligatoire", leve(() => M.cloturer(L, { ref: "B2", plan: FIXE(500), total: 2000, paiement: "compte", livreur: "L1" }), "CLIENT_OBLIGATOIRE"));
  M.cloturer(L, { ref: "B3", plan: FIXE(500), total: 2000, produit: 25000, paiement: "cod", transport: "compte", client: "S1", fournisseur: "S1", livreur: "L1" });
  t("COD + transport facturé : le livreur n'encaisse que 25 000 ; fonds de tiers 25 000 ; revenu 1 000", M.solde(L, "especes:L1").debit === 25000 && M.fondsTiers(L) === 25000 && M.revenuPropre(L) === 1000 && M.creance(L, "S1") === 4000 && M.equilibre(L));
  M.verser(L, { ref: "VB", livreur: "L1", montant: 25000 });
  const rel = M.releveFournisseur(L, "S1");
  t("relevé fournisseur : une ligne COD de 25 000 rattachée à la commande, solde 25 000", rel.lignes.length === 1 && rel.lignes[0].commande === "B3" && rel.solde === 25000, rel);
  M.reverserFournisseur(L, { ref: "RV1", fournisseur: "S1", montant: 10000, reference: "WV-001" });
  t("reversement fournisseur : solde 15 000, référence conservée, relevé à jour", M.fondsTiers(L) === 15000 && M.releveFournisseur(L, "S1").lignes[1].reference === "WV-001");
  t("reversement : jamais au-delà de ce qui est dû", leve(() => M.reverserFournisseur(L, { ref: "RV2", fournisseur: "S1", montant: 15001 }), "REVERSEMENT_EXCESSIF"));
  M.encaisserCreance(L, { ref: "F1", client: "S1", montant: 4000, facture: "FAC-1", reference: "VIR-77" });
  t("facture payée : créance soldée, caisse créditée ; surpaiement refusé", M.creance(L, "S1") === 0 && leve(() => M.encaisserCreance(L, { ref: "F2", client: "S1", montant: 1 }), "PAIEMENT_EXCESSIF") && M.equilibre(L));
  const f = M.facture({ numero: "FAC-2026-0001", client: "S1", clientNom: "Boutique Test", periode: "2026-11", lignes: [{ ref: "B1", libelle: "Livraison B1", montant: 2000 }, { ref: "B3", libelle: "Livraison B3", montant: 2000 }] });
  t("facture : total = somme des lignes, gelée, taxes à paramétrer", f.total === 4000 && Object.isFrozen(f) && Object.isFrozen(f.lignes[0]) && f.statut === "emise");
  t("facture : sans ligne ou montant décimal refusée", leve(() => M.facture({ numero: "X", client: "S1", lignes: [] }), "FACTURE_INVALIDE") && leve(() => M.facture({ numero: "X", client: "S1", lignes: [{ ref: "a", libelle: "a", montant: 1.5 }] }), "FACTURE_INVALIDE"));
  const c = { id: "R1", statut: "courier_to_pickup" }; M.changerStatut(c, "ready_for_assignment", "livreur", "réaffectation");
  t("statuts : réaffectation possible tant que le colis n'est pas collecté", c.statut === "ready_for_assignment" && !M.peutPasser("picked_up", "ready_for_assignment"));
}

/* --- Administration : éligibilité des livreurs, double approbation --- */
{
  const now = Date.parse("2026-11-12T10:00:00Z");
  const L = [{ id: "a", type: "livreur", statut: "valide", dossier: { assurance_exp: "2027-01-01" } }, { id: "b", type: "chauffeur", statut: "valide", dossier: { assurance_exp: "2027-01-01" } },
    { id: "c", type: "livreur", statut: "en_verification", dossier: { assurance_exp: "2027-01-01" } }, { id: "d", type: "livreur", statut: "valide", dossier: { assurance_exp: "2026-10-01" } }, { id: "e", type: "livreur", statut: "suspendu", dossier: { assurance_exp: "2027-01-01" } }, { id: "f", type: "livreur", statut: "valide" }];
  t("éligibilité : une commande moto n'est proposée qu'aux livreurs validés, assurés, non suspendus", JSON.stringify(M.eligibles(L, { mode: "moto" }, now).map((x) => x.id)) === '["a"]');
  t("éligibilité : une commande cargo n'est proposée qu'aux chauffeurs", JSON.stringify(M.eligibles(L, { mode: "cargo" }, now).map((x) => x.id)) === '["b"]');
  t("documents : assurance expirée ou absente refusée", !M.docsValides(L[3], now) && !M.docsValides(L[5], now) && M.docsValides(L[0], now));
  const d1 = { m: 50000 }, u1 = { id: "u1", nom: "Compta", role: "finance" }, u2 = { id: "u2", nom: "Direction", role: "admin" };
  t("approbation : jusqu'au seuil, un contrôle suffit", M.approuver(d1, u1, 100000).pret === true);
  const d2 = { m: 250000 };
  t("approbation : au-delà du seuil, deux approbateurs distincts", M.approuver(d2, u1, 100000).pret === false && leve(() => M.approuver(d2, u1, 100000), "DEJA_APPROUVE") && M.approuver(d2, u2, 100000).pret === true);
  t("approbation : approbateur obligatoire", leve(() => M.approuver({ m: 1 }, null, 100000), "APPROBATEUR_INCONNU"));
}
console.log(ok + " PASS, " + ko + " FAIL");
process.exit(ko ? 1 : 0);
