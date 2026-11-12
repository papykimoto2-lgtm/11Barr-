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

/* --- Affectation intelligente : capacités, filtres, score, répartiteur --- */
{
  const NOW = Date.parse("2026-11-12T10:00:00Z"), PL = M.PLAN_DEFAUT, S = (n) => NOW - n * 1000;
  const liv = (id, o) => Object.assign({ id, nom: id, type: "livreur", statut: "valide", en_ligne_a: S(2), dossier: { identite: "I1234", permis: "P1234", plaque: "1234 GH 01", assurance_exp: "2099-12-31", position: { n: "Cocody Angré", la: 5.392, lo: -3.988 } } }, o || {});
  const cmd = (o) => Object.assign({ id: "C1", mode: "moto", statut: "ready_for_assignment", de: { n: "Cocody Angré", la: 5.392, lo: -3.988 }, colis: { poids: 3, volume: 0 }, offres: [] }, o || {});
  const ids = (r) => r.retenus.map((x) => x.livreur.id).join(",");
  const ctx = (c) => ({ plan: PL, now: NOW, commandes: c || [] });
  t("affectation : seuils paramétrés dans le plan (délai d'offre 30 s)", M.seuil(PL, "delai_offre_s") === 30 && M.seuil({ seuils: {} }, "delai_offre_s") === 30 && M.seuil({ seuils: { delai_offre_s: 5 } }, "delai_offre_s") === 5);
  t("capacité : moto sans capacité déclarée = valeurs du plan (10 kg)", M.capaciteOk(liv("a"), cmd()) && !M.capaciteOk(liv("a"), cmd({ colis: { poids: 12, volume: 0 } })));
  t("capacité : volume trop grand refusé", !M.capaciteOk(liv("a"), cmd({ colis: { poids: 2, volume: 0.5 } })) && M.capaciteRaison(liv("a"), cmd({ colis: { poids: 2, volume: 0.5 } })).includes("Volume"));
  t("capacité : capacité déclarée dans le dossier prise en compte", M.capaciteOk(liv("a", { dossier: { capacite_kg: 25, capacite_m3: 0.2 } }), cmd({ colis: { poids: 20, volume: 0.1 } })));
  const camion = (o) => liv("v", Object.assign({ type: "chauffeur" }, o || {}));
  t("capacité : jamais sur la seule catégorie (camionnette sans capacité déclarée → refusée)", !M.capaciteOk(camion({ dossier: { categorie: "utilitaire" } }), cmd({ mode: "cargo", colis: { poids: 40, volume: 0 } })));
  t("capacité : camionnette avec capacité déclarée suffisante acceptée, insuffisante refusée", M.capaciteOk(camion({ dossier: { capacite_kg: 500, capacite_m3: 4 } }), cmd({ mode: "cargo", colis: { poids: 40, volume: 1 } })) && !M.capaciteOk(camion({ dossier: { capacite_kg: 30, capacite_m3: 4 } }), cmd({ mode: "cargo", colis: { poids: 40, volume: 1 } })));
  t("présence : en ligne seulement si l'horodatage est récent", M.enLigne(liv("a"), NOW, PL) && !M.enLigne(liv("a", { en_ligne_a: S(60) }), NOW, PL) && !M.enLigne(liv("a", { en_ligne_a: 0 }), NOW, PL));
  const pres = liv("proche"), loin = liv("loin", { dossier: Object.assign({}, liv("x").dossier, { position: { n: "Grand-Bassam", la: 5.2, lo: -3.74 } }) });
  let r = M.classer([loin, pres], cmd(), ctx());
  t("score : le plus proche du point de collecte passe en premier", ids(r) === "proche,loin" && r.retenus[0].distance_km === 0, r.retenus.map((x) => [x.livreur.id, x.score]));
  r = M.classer([liv("nv", { statut: "en_verification" }), liv("susp", { statut: "suspendu" }), liv("exp", { dossier: Object.assign({}, liv("x").dossier, { assurance_exp: "2020-01-01" }) }), liv("cargo", { type: "chauffeur" }), liv("hors", { en_ligne_a: S(300) }), liv("ok")], cmd(), ctx());
  t("filtres : non validé, suspendu, assurance expirée, mauvais type, hors ligne éliminés", ids(r) === "ok" && r.elimines.length === 5, r.elimines.map((e) => [e.livreur.id, e.motifs]));
  t("filtres : motif d'élimination expliqué", r.elimines.find((e) => e.livreur.id === "exp").motifs.includes("documents") && r.elimines.find((e) => e.livreur.id === "cargo").motifs.includes("type"));
  r = M.classer([liv("petit", { dossier: Object.assign({}, liv("x").dossier, { capacite_kg: 2 }) }), liv("grand")], cmd(), ctx());
  t("filtres : capacité insuffisante éliminée", ids(r) === "grand" && r.elimines[0].motifs.includes("capacite"));
  const hist = cmd({ offres: [{ livreur: "a", at: S(50), statut: "refusee", motif: "Trop loin" }, { livreur: "b", at: S(40), statut: "expiree" }] });
  r = M.classer([liv("a"), liv("b"), liv("c")], hist, ctx());
  t("filtres : déjà refusé ou expiré pour cette commande jamais reproposé", ids(r) === "c");
  t("filtres : une relance (relance_at) rouvre la commande aux anciens refus", ids(M.classer([liv("a"), liv("b")], Object.assign({}, hist, { relance_at: S(10) }), ctx())) === "a,b");
  const occ = [{ id: "X", statut: "in_transit", chauffeur: { id: "busy" } }, { id: "Y", statut: "ready_for_assignment", offre_courante: { livreur: "pending", at: S(3) } }];
  r = M.classer([liv("busy"), liv("pending"), liv("libre")], cmd(), ctx(occ));
  t("filtres : livreur en mission ou déjà sollicité sur une autre commande non proposé", ids(r) === "libre");
  const stats = [{ id: "H1", statut: "delivered", chauffeur: { id: "fiable" }, offres: [{ livreur: "fiable", statut: "acceptee" }] }, { id: "H2", statut: "delivered", chauffeur: { id: "fiable" }, offres: [{ livreur: "fiable", statut: "acceptee" }] }, { id: "H3", statut: "delivered", chauffeur: { id: "fiable" }, offres: [{ livreur: "fiable", statut: "acceptee" }] },
    { id: "H4", statut: "ready_for_assignment", offres: [{ livreur: "capricieux", statut: "refusee", motif: "Trop loin" }, { livreur: "capricieux", statut: "refusee", motif: "Pause" }, { livreur: "capricieux", statut: "expiree" }] }];
  const sf = M.statsLivreur("fiable", stats, PL), sc = M.statsLivreur("capricieux", stats, PL);
  t("fiabilité : taux d'acceptation et de réussite déduits de l'historique", sf.taux_acceptation === 1 && sf.livrees === 3 && sc.taux_acceptation === 0 && sc.refusees === 2 && sc.expirees === 1 && sf.fiabilite > sc.fiabilite, [sf, sc]);
  t("fiabilité : sans historique, valeur par défaut du plan", M.statsLivreur("inconnu", [], PL).fiabilite === 0.8 * 0.6 + 0.4 && M.statsLivreur("inconnu", [], PL).taux_acceptation === null);
  r = M.classer([liv("capricieux"), liv("fiable")], cmd(), ctx(stats));
  t("score : à distance égale, le plus fiable passe devant", ids(r) === "fiable,capricieux", r.retenus.map((x) => [x.livreur.id, x.score]));
  t("score : pondérations paramétrables (proximité seule)", ids(M.classer([loin, pres], cmd(), { plan: { seuils: { score_proximite: 1, score_fiabilite: 0, score_charge: 0 } }, now: NOW, commandes: [] })) === "proche,loin");
  t("prochainCandidat : aucun candidat → null", M.prochainCandidat([liv("x", { statut: "suspendu" })], cmd(), ctx()) === null && M.prochainCandidat([pres], cmd(), ctx()).livreur.id === "proche");
  /* répartiteur */
  const L = [loin, pres, liv("milieu", { dossier: Object.assign({}, liv("x").dossier, { position: { n: "Plateau", la: 5.3197, lo: -4.0197 } }) })];
  const c1 = cmd(); let st = M.repartir(c1, L, ctx());
  t("répartiteur : une seule offre, au meilleur candidat, historisée", st.action === "proposee" && c1.offre_courante.livreur === "proche" && c1.offres.length === 1 && c1.offres[0].statut === "proposee" && c1.offres[0].nom === "proche" && c1.sans_candidat === false);
  st = M.repartir(c1, L, ctx());
  t("répartiteur : idempotent tant que l'offre est en attente", st.changed === false && c1.offres.length === 1);
  M.repondreOffre(c1, "proche", "refusee", "Trop loin", ctx());
  t("répartiteur : refus enregistré avec motif, offre courante vidée", c1.offre_courante === null && c1.offres[0].statut === "refusee" && c1.offres[0].motif === "Trop loin");
  M.repartir(c1, L, ctx());
  t("répartiteur : après un refus, candidat suivant", c1.offre_courante.livreur === "milieu" && c1.offres.length === 2);
  t("répartiteur : un autre livreur ne peut pas répondre à l'offre", leve(() => M.repondreOffre(c1, "loin", "acceptee", "", ctx()), "OFFRE_INDISPONIBLE"));
  const apres = { plan: PL, now: NOW + 31000, commandes: [] }, L2 = L.map((l) => Object.assign({}, l, { en_ligne_a: NOW + 30000 }));
  t("répartiteur : réponse tardive refusée (expirée)", leve(() => M.repondreOffre(JSON.parse(JSON.stringify(c1)), "milieu", "acceptee", "", apres), "OFFRE_EXPIREE"));
  st = M.repartir(c1, L2, apres);
  t("répartiteur : expiration enregistrée puis candidat suivant", c1.offres[1].statut === "expiree" && c1.offres[1].motif.includes("Délai") && c1.offre_courante.livreur === "loin" && st.action === "proposee");
  M.repondreOffre(c1, "loin", "refusee", "Pause", { plan: PL, now: NOW + 32000 });
  st = M.repartir(c1, L2, { plan: PL, now: NOW + 33000, commandes: [] });
  t("répartiteur : plus de candidat → sans_candidat", c1.sans_candidat === true && c1.offre_courante === null && st.sans_candidat === true && c1.offres.length === 3);
  t("répartiteur : sans_candidat stable (aucune écriture inutile)", M.repartir(c1, L2, { plan: PL, now: NOW + 34000, commandes: [] }).changed === false);
  const c2 = cmd({ id: "C2", sans_candidat: true }); M.repartir(c2, [liv("nouveau")], ctx());
  t("répartiteur : un candidat qui arrive en ligne lève l'alerte sans_candidat", c2.sans_candidat === false && c2.offre_courante.livreur === "nouveau");
  const c3 = cmd({ id: "C3" }); M.repartir(c3, [pres], ctx()); M.repondreOffre(c3, "proche", "acceptee", "", ctx());
  t("répartiteur : acceptation enregistrée", c3.offres[0].statut === "acceptee" && c3.offre_courante === null);
  const c4 = cmd({ id: "C4" }); M.repartir(c4, [pres], ctx()); c4.statut = "assigned"; M.repartir(c4, [pres], ctx());
  t("répartiteur : commande affectée ailleurs (opérations) → offre close, plus de proposition", c4.offre_courante === null && c4.offres[0].statut === "expiree");
  const c5 = cmd({ id: "C5" }); M.repartir(c5, [pres], ctx()); const off = Object.assign({}, pres, { en_ligne_a: S(100) });
  M.repartir(c5, [off, liv("autre")], ctx());
  t("répartiteur : livreur passé hors ligne pendant l'offre → offre suivante sans attendre", c5.offres[0].statut === "expiree" && c5.offre_courante.livreur === "autre");
  t("répartiteur : commande cargo jamais proposée à une moto", (() => { const c = cmd({ id: "C6", mode: "cargo", colis: { poids: 40, volume: 0 } }); M.repartir(c, [pres], ctx()); return c.sans_candidat === true && c.offres.length === 0; })());
}
console.log(ok + " PASS, " + ko + " FAIL");
process.exit(ko ? 1 : 0);
