/* Moteur métier 11Barré — règles des dossiers fonctionnel et technique V1, sans interface ni stockage.
   Fonctionne dans le navigateur (global M) et sous Node (module.exports) ; testé par tests/moteur.js.
   Principes appliqués :
   - les tarifs, la commission et les délais sont des PARAMÈTRES d'un plan daté (PLAN_DEFAUT = grille de démonstration, à remplacer) ;
   - les soldes ne sont jamais écrasés : ils se déduisent d'un journal de mouvements immuable (écritures gelées, équilibrées, idempotentes) ;
   - les fonds encaissés pour un fournisseur (COD) sont une dette envers lui, jamais un revenu de la plateforme ;
   - un statut de commande ne change que par une transition autorisée, historisée. */
(function (root) {
  "use strict";
  const M = {};
  const err = (code, message) => { const e = new Error(message); e.code = code; return e; };
  const gel = (o) => { Object.values(o).forEach((v) => { if (v && typeof v === "object" && !Object.isFrozen(v)) gel(v); }); return Object.freeze(o); };

  /* ---------- 1. Statuts de commande (annexe A du dossier technique) ---------- */
  M.TRANSITIONS = {
    draft: ["quoted", "cancelled"],
    quoted: ["draft", "awaiting_payment", "ready_for_assignment", "cancelled"],
    awaiting_payment: ["ready_for_assignment", "cancelled"],
    ready_for_assignment: ["assigned", "cancelled"],
    assigned: ["ready_for_assignment", "courier_to_pickup", "cancelled"],
    courier_to_pickup: ["picked_up", "cancelled", "failed_delivery"],
    picked_up: ["in_transit", "failed_delivery"],
    in_transit: ["arrived", "failed_delivery"],
    arrived: ["delivered", "failed_delivery"],
    delivered: [], cancelled: [],
    failed_delivery: ["return_required"], return_required: ["returned"], returned: []
  };
  M.STATUTS = Object.keys(M.TRANSITIONS);
  M.peutPasser = (de, vers) => (M.TRANSITIONS[de] || []).includes(vers);
  /** Change le statut d'une commande et ajoute l'événement (jamais modifié ensuite). */
  M.changerStatut = (cmd, vers, acteur, note, at) => {
    if (!M.TRANSITIONS[vers]) throw err("STATUT_INCONNU", "Statut inconnu : " + vers);
    if (!M.peutPasser(cmd.statut, vers)) throw err("TRANSITION_INTERDITE", cmd.statut + " → " + vers + " n'est pas autorisé");
    const ev = Object.freeze({ commande: cmd.id, ancien: cmd.statut, nouveau: vers, acteur: acteur || "système", note: note || "", at: at || Date.now() });
    cmd.statut = vers; (cmd.evenements = cmd.evenements || []).push(ev);
    return ev;
  };
  /** Une livraison ne se clôture qu'avec la preuve exigée (code de confirmation ici ; photo/signature à venir). */
  M.preuveValide = (cmd, saisie) => !!cmd && !!cmd.code && String(saisie) === String(cmd.code);

  /* ---------- 2. Tarification paramétrable (plans datés, devis avec photographie des paramètres) ---------- */
  M.PLAN_DEFAUT = gel({
    id: "plan-demo", version: 1, nom: "Grille de démonstration", demonstration: true, actif_depuis: "2026-11-11", devise: "FCFA",
    arrondi: 50, validite_devis_min: 15, plancher_vitesse: 300,
    categories: {
      eco: { mode: "courses", base: 500, km: 150, min: 1000 }, confort: { mode: "courses", base: 700, km: 190, min: 1300 }, fam: { mode: "courses", base: 1500, km: 300, min: 3000 },
      mt: { mode: "moto", base: 300, km: 100, min: 500 },
      lm: { mode: "livraison", liv: true, base: 300, km: 80, min: 400 }, cod: { mode: "livraison", liv: true, base: 300, km: 80, min: 500 },
      ex: { mode: "cargo", liv: true, base: 2500, km: 300, min: 4200 }, ca: { mode: "cargo", liv: true, base: 6000, km: 600, min: 12000 }
    },
    vitesses: { exp: 1.6, std: 1, grp: 0.85, diff: 0.7 },
    options: { porte_a_porte: 200 },
    commission: { type: "pourcentage", valeur: 0.15 }
  });
  const arr = (n, pas) => Math.round(n / pas) * pas;
  /** Calcule un devis : lignes explicatives, total, expiration, photographie des paramètres. */
  M.devis = (plan, e, now) => {
    const c = plan.categories[e.cat];
    if (!c) throw err("CATEGORIE_INCONNUE", "Catégorie inconnue : " + e.cat);
    const km = Math.max(0, +e.km || 0), dist = Math.round(c.km * km), base = Math.max(c.min, arr(c.base + c.km * km, plan.arrondi));
    const lignes = [{ code: "base", libelle: "Frais de base", montant: c.base }, { code: "distance", libelle: "Distance " + km.toFixed(1) + " km", montant: dist }];
    const aj = base - c.base - dist; if (aj) lignes.push({ code: "ajustement", libelle: base === c.min ? "Minimum de course" : "Arrondi", montant: aj });
    let total = base;
    if (c.liv && e.vitesse && e.vitesse !== "std") {
      const m = plan.vitesses[e.vitesse]; if (m == null) throw err("VITESSE_INCONNUE", "Vitesse inconnue : " + e.vitesse);
      const t2 = Math.max(plan.plancher_vitesse, arr(total * m, plan.arrondi));
      if (t2 !== total) lignes.push({ code: "vitesse", libelle: "Vitesse « " + e.vitesse + " »", montant: t2 - total }); total = t2;
    }
    if (c.liv && e.porte) { lignes.push({ code: "porte_a_porte", libelle: "Porte à porte", montant: plan.options.porte_a_porte }); total += plan.options.porte_a_porte; }
    const t0 = now || Date.now();
    return { plan_id: plan.id, plan_version: plan.version, devise: plan.devise, lignes, sous_total: base, total, expire_le: t0 + plan.validite_devis_min * 60000, snapshot: { cat: e.cat, km, vitesse: e.vitesse || "std", porte: !!e.porte } };
  };
  M.devisValide = (d, now) => !!d && (now || Date.now()) < d.expire_le;
  /** Répartition d'un montant de transport entre le prestataire et la plateforme (règle du plan). */
  M.repartition = (plan, total) => {
    const r = plan.commission; let pf;
    if (r.type === "pourcentage") pf = total - Math.round(total * (1 - r.valeur));
    else if (r.type === "fixe") pf = Math.min(total, r.valeur);
    else throw err("COMMISSION_INCONNUE", "Type de commission inconnu");
    return { livreur: total - pf, plateforme: pf };
  };

  /* ---------- 3. Journal des mouvements : immuable, équilibré, idempotent ---------- */
  M.nouveauLivre = () => ({ tx: [], idem: {} });
  /** Recharge un journal sérialisé (écritures regelées). */
  M.chargerLivre = (o) => { const L = M.nouveauLivre(); ((o && o.tx) || []).forEach((t) => { const g = gel(JSON.parse(JSON.stringify(t))); L.tx.push(g); if (g.idem) L.idem[g.idem] = g; }); return L; };
  /** Enregistre une transaction : somme des débits = somme des crédits, montants entiers, clé d'idempotence unique. */
  M.poster = (L, t) => {
    if (t.idem && L.idem[t.idem]) return { tx: L.idem[t.idem], doublon: true };
    if (!t.ref || L.tx.some((x) => x.ref === t.ref)) throw err("REFERENCE_INVALIDE", "Référence absente ou déjà utilisée");
    if (!Array.isArray(t.lignes) || t.lignes.length < 2) throw err("ECRITURE_INCOMPLETE", "Une transaction comporte au moins deux lignes");
    let d = 0, c = 0;
    t.lignes.forEach((l) => {
      if (!l.compte || !Number.isInteger(l.debit) || !Number.isInteger(l.credit) || l.debit < 0 || l.credit < 0 || (l.debit > 0) === (l.credit > 0)) throw err("LIGNE_INVALIDE", "Ligne invalide : un seul sens, montant entier positif");
      d += l.debit; c += l.credit;
    });
    if (d !== c || d === 0) throw err("DESEQUILIBRE", "Transaction déséquilibrée : débit " + d + " ≠ crédit " + c);
    const tx = gel({ seq: L.tx.length + 1, ref: t.ref, type: t.type || "autre", idem: t.idem || null, at: t.at || Date.now(), lignes: t.lignes.map((l) => ({ compte: l.compte, debit: l.debit, credit: l.credit })), meta: JSON.parse(JSON.stringify(t.meta || {})) });
    L.tx.push(tx); if (tx.idem) L.idem[tx.idem] = tx;
    return { tx, doublon: false };
  };
  /** Solde d'un compte (ou de tous les comptes commençant par le préfixe « xxx: »). net = crédits − débits. */
  M.solde = (L, compte, prefixe) => {
    let debit = 0, credit = 0;
    L.tx.forEach((t) => t.lignes.forEach((l) => { if (prefixe ? l.compte.startsWith(compte) : l.compte === compte) { debit += l.debit; credit += l.credit; } }));
    return { debit, credit, net: credit - debit };
  };
  M.equilibre = (L) => { let d = 0, c = 0; L.tx.forEach((t) => t.lignes.forEach((l) => { d += l.debit; c += l.credit; })); return d === c; };
  /** Fonds détenus pour des tiers (fournisseurs) : dette, jamais revenu. */
  M.fondsTiers = (L) => M.solde(L, "dette_fournisseur:", true).net;
  /** Revenu propre de la plateforme (commissions, frais de service) net des remboursements. */
  M.revenuPropre = (L) => M.solde(L, "produit_", true).net - M.solde(L, "remboursements").debit;
  /** Position d'un livreur : ce que la plateforme lui doit (gains) moins l'espèces qu'il détient. Négatif = il doit reverser. */
  M.soldeLivreur = (L, id) => {
    const dette = M.solde(L, "dette_livreur:" + id).net, esp = M.solde(L, "especes:" + id);
    return { gains: dette, especes: esp.debit - esp.credit, solde: dette - (esp.debit - esp.credit) };
  };

  /* ---------- 4. Opérations financières ---------- */
  /** Clôture d'une livraison : paiement numérique (déjà encaissé), espèces encaissées par le livreur, ou COD (produit + transport). */
  M.cloturer = (L, o) => {
    const rep = M.repartition(o.plan, o.total);
    if (!Number.isInteger(o.total) || o.total <= 0) throw err("MONTANT_INVALIDE", "Montant de transport invalide");
    let lignes;
    if (o.paiement === "numerique") lignes = [{ compte: "caisse", debit: o.total, credit: 0 }];
    else if (o.paiement === "cash") lignes = [{ compte: "especes:" + o.livreur, debit: o.total, credit: 0 }];
    else if (o.paiement === "cod") {
      if (!o.fournisseur || !(o.produit > 0) || !Number.isInteger(o.produit)) throw err("COD_INVALIDE", "COD : fournisseur et montant du produit obligatoires");
      const encaisse = o.transport === "numerique"   /* transport déjà payé en ligne : le livreur n'encaisse que le produit */
        ? [{ compte: "caisse", debit: o.total, credit: 0 }, { compte: "especes:" + o.livreur, debit: o.produit, credit: 0 }]
        : [{ compte: "especes:" + o.livreur, debit: o.total + o.produit, credit: 0 }];
      lignes = encaisse.concat([{ compte: "dette_fournisseur:" + o.fournisseur, debit: 0, credit: o.produit }]);
    } else throw err("PAIEMENT_INCONNU", "Mode de paiement inconnu : " + o.paiement);
    if (rep.livreur > 0) lignes.push({ compte: "dette_livreur:" + o.livreur, debit: 0, credit: rep.livreur });
    if (rep.plateforme > 0) lignes.push({ compte: "produit_commission", debit: 0, credit: rep.plateforme });
    return M.poster(L, { ref: "CL-" + o.ref, type: "cloture_livraison", idem: o.idem || "cloture:" + o.ref, at: o.at, lignes, meta: { commande: o.ref, paiement: o.paiement, transport: o.total, produit: o.produit || 0, livreur: o.livreur, regle: o.plan.commission, plan: o.plan.id + "@" + o.plan.version } });
  };
  /** Encaissement d'un paiement (webhook ou validation) : écrit une seule fois par événement (idempotence). */
  M.encaisser = (L, o) => M.poster(L, { ref: "PAY-" + o.ref, type: "paiement", idem: o.evenement || "paiement:" + o.ref, at: o.at, lignes: [{ compte: "caisse", debit: o.montant, credit: 0 }, { compte: "produit_transport", debit: 0, credit: o.montant }], meta: { paiement: o.ref, montant: o.montant } });
  /** Remboursement : jamais au-delà de ce qui a été encaissé, déduction faite des remboursements précédents. */
  M.rembourser = (L, o) => {
    const p = L.tx.find((t) => t.type === "paiement" && t.meta.paiement === o.paiement); if (!p) throw err("PAIEMENT_INTROUVABLE", "Paiement d'origine introuvable");
    const deja = L.tx.filter((t) => t.type === "remboursement" && t.meta.paiement === o.paiement).reduce((s, t) => s + t.meta.montant, 0);
    if (!(o.montant > 0) || o.montant + deja > p.meta.montant) throw err("REMBOURSEMENT_EXCESSIF", "Restant remboursable : " + (p.meta.montant - deja));
    return M.poster(L, { ref: "RMB-" + o.ref, type: "remboursement", idem: o.idem || "remboursement:" + o.ref, at: o.at, lignes: [{ compte: "remboursements", debit: o.montant, credit: 0 }, { compte: "caisse", debit: 0, credit: o.montant }], meta: { paiement: o.paiement, montant: o.montant } });
  };
  /** Le livreur remet de l'espèces (versement validé par le comptable). */
  M.verser = (L, o) => {
    const esp = M.solde(L, "especes:" + o.livreur); if (!(o.montant > 0) || o.montant > esp.debit - esp.credit) throw err("VERSEMENT_EXCESSIF", "Le versement dépasse l'espèces détenue");
    return M.poster(L, { ref: "VRS-" + o.ref, type: "versement_livreur", idem: o.idem || "versement:" + o.ref, at: o.at, lignes: [{ compte: "caisse", debit: o.montant, credit: 0 }, { compte: "especes:" + o.livreur, debit: 0, credit: o.montant }], meta: { livreur: o.livreur, mode: o.mode || "cash", reference: o.reference || "" } });
  };
  /** Règlement d'un livreur par la plateforme : jamais au-delà de ce qui lui est dû ; la référence de paiement est conservée. */
  M.regler = (L, o) => {
    const du = M.solde(L, "dette_livreur:" + o.livreur).net; if (!(o.montant > 0) || o.montant > du) throw err("REGLEMENT_EXCESSIF", "Montant dû : " + du);
    return M.poster(L, { ref: "REG-" + o.ref, type: "reglement_livreur", idem: o.idem || "reglement:" + o.ref, at: o.at, lignes: [{ compte: "dette_livreur:" + o.livreur, debit: o.montant, credit: 0 }, { compte: "caisse", debit: 0, credit: o.montant }], meta: { livreur: o.livreur, reference: o.reference || "" } });
  };
  /** Rapprochement : compare le prestataire et la caisse du journal. Signale l'écart, ne corrige rien. */
  M.rapprocher = (L, montantPrestataire) => {
    const c = M.solde(L, "caisse"), journal = c.debit - c.credit, ecart = montantPrestataire - journal;
    return { journal, prestataire: montantPrestataire, ecart, statut: ecart === 0 ? "ok" : "ecart" };
  };

  if (typeof module !== "undefined" && module.exports) module.exports = M; else root.M = M;
})(typeof self !== "undefined" ? self : this);
