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
console.log(ok + " PASS, " + ko + " FAIL");
process.exit(ko ? 1 : 0);
