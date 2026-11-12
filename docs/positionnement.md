# 11Barré — Document stratégique de différenciation et de positionnement concurrentiel

*Document de référence fourni par la direction. Les affirmations sur les concurrents sont des hypothèses de positionnement, à vérifier par une étude de marché avant toute communication externe.*

## 1. Identité et positionnement
- **Nom** : 11Barré
- **Secteur** : transport, livraison et logistique
- **Marché initial** : Côte d'Ivoire
- **Positionnement** : plateforme intégrée de mise en relation, de transport et de gestion logistique pour les particuliers et les entreprises.
- **Promesse** : une seule plateforme pour transporter, livrer, expédier et gérer les opérations logistiques.

## 2. Notre différence fondamentale
11Barré ne doit pas chercher à être une copie de Yango ou de Glovo. Il combine :
- livraison express à moto ;
- transport de marchandises par véhicules utilitaires ;
- livraison de commandes commerciales ;
- gestion des fournisseurs et des clients professionnels ;
- collecte et reversement des paiements à la livraison ;
- gestion des transporteurs et des flottes ;
- suivi GPS et preuve de livraison ;
- gestion financière des opérations logistiques.

## 3. Les six axes de différenciation
1. **Moto et Cargo sur une seule plateforme** : plusieurs catégories de véhicules, missions adaptées automatiquement aux capacités disponibles.
2. **Un véritable portail professionnel** : plusieurs commandes, destinataires, suivi, historiques, factures, dépenses, plusieurs utilisateurs.
3. **Une gestion avancée du paiement à la livraison** : prix de la marchandise, frais de livraison, rémunération du livreur, commission de 11Barré et montant revenant au fournisseur distingués. Les fonds des fournisseurs ne sont jamais confondus avec le chiffre d'affaires de 11Barré.
4. **Une gestion professionnelle des transporteurs** : missions, revenus, performances, documents et règlements.
5. **Une logistique adaptée aux entreprises** : contrats professionnels, tarifs négociés, comptes clients, facturation périodique, tableaux de bord.
6. **Une affectation intelligente des missions** : proximité, disponibilité, type de véhicule, capacité de chargement, temps estimé, fiabilité.

## 4. Les espaces fonctionnels
1. Application client
2. Application livreur Moto
3. Application transporteur Cargo
4. Portail fournisseur et entreprise
5. Administration centrale
6. Gestion financière et comptable
7. Gestion des flottes et des partenaires

## 5. Avantage concurrentiel recherché
Être particulièrement performant là où les applications généralistes traitent mal les besoins : marchandises volumineuses, livraison régulière des commerçants, commandes multiples, paiement à la livraison et reversement, flottes partenaires, suivi financier, contrats logistiques avec les entreprises.

## 6. Stratégie de développement
- **Phase 1** : Abidjan, zones commerciales et entreprises.
- **Phase 2** : principales villes de Côte d'Ivoire.
- **Phase 3** : contrats professionnels et partenariats avec les distributeurs.
- **Phase 4** : extension régionale en Afrique de l'Ouest.

## 7. Vision à long terme
Une infrastructure logistique numérique qui connecte particuliers, commerçants, fournisseurs, transporteurs et entreprises. **Du petit colis au transport de marchandises, une seule plateforme.**

> **Point stratégique** : la différenciation la plus défendable est la combinaison **Moto + Cargo + gestion professionnelle + paiement à la livraison**. Le produit se construit sur cette combinaison, pas sur la reproduction des fonctionnalités de Yango.

---

## État de couverture du produit (13 novembre 2026)
Légende : ✅ fait (maquette locale testée) · 🟡 partiel · ❌ à construire. « Maquette locale » = données sur l'appareil, sans serveur.

| Axe / espace | État | Ce qui existe | Ce qui manque |
|---|---|---|---|
| 1. Moto + Cargo | 🟡 | Catégories Moto-taxi, Livraison à moto, Express Cargo, Camion ; **choix automatique Moto ou Cargo selon le poids et le volume** (seuils paramétrables) ; **capacité des véhicules** (poids, volume) vérifiée avant toute offre ; dossier avec documents et assurance contrôlés par l'administration | Dimensions détaillées, gestion d'une flotte de plusieurs véhicules et conducteurs par transporteur, justificatifs en pièces jointes |
| 2. Portail professionnel | 🟡 | Maquette `fournisseur.html` : inscription et validation du compte, points de collecte, création de livraisons avec devis détaillé, **import CSV** avec aperçu, rapport d'erreurs et refus des doublons, suivi en direct avec historique et preuve, factures périodiques imprimables, utilisateurs collaborateurs (administrateur, opérateur, lecture seule) | Carnet de destinataires, livraisons récurrentes, analyse des dépenses, exports XLSX/PDF, programmation à une date |
| 3. Paiement à la livraison | ✅ maquette | Journal immuable ; produit dû au fournisseur, transport, part du livreur, commission, tous distincts ; fonds de tiers jamais comptés en revenu ; 7 scénarios financiers du dossier testés ; **relevé par fournisseur et demande de reversement** dans le portail ; reversement refusé tant que les livreurs n'ont pas remis les fonds | Preuve de collecte (photo, signature), consolidation de plusieurs fournisseurs, rapprochement bancaire |
| 4. Gestion des transporteurs | 🟡 | Dossier validé par l'administration, gains, solde, versements, **règlements par la plateforme avec double approbation**, fiabilité (taux d'acceptation, refus, expirations) | Espace entreprise de transport multi-conducteurs, performances détaillées, documents en pièces jointes |
| 5. Logistique entreprises | 🟡 | Plans tarifaires datés ; **remise de contrat** par client ; transport facturé au compte avec créance ; **facturation périodique** numérotée ; tableau de bord du client | Contrats (durée, conditions), tarifs négociés par zone ou catégorie, plafond de crédit, relances, TVA |
| 6. Affectation intelligente | ✅ maquette | **Répartiteur** : filtres éliminatoires (validé, assurance, type, capacité, en ligne, non refusé) puis score (proximité, fiabilité, charge) ; une offre à la fois, relance au suivant en cas de refus ou d'expiration ; alerte « sans livreur disponible » et relance par l'administration ; affectation manuelle motivée et auditée | Temps de trajet réel (cartographie), positions GPS réelles, optimisation de tournées |

| Espace | État |
|---|---|
| 1. Application client | ✅ maquette complète (prix détaillé avant commande, reprise, reçu, avis) |
| 2. Application livreur Moto | ✅ maquette complète (dossier, offres ciblées, course, codes, photos, encaissement, gains, fiabilité) |
| 3. Application transporteur Cargo | ❌ |
| 4. Portail fournisseur et entreprise | ✅ maquette complète du parcours principal, adaptée au téléphone |
| 5. Administration centrale | ✅ maquette : équipe et rôles, validations (comptes, livreurs, versements, reversements, règlements, factures), affectation manuelle, tarifs versionnés et simulateur, incidents, audit |
| 6. Gestion financière et comptable | ✅ maquette : journal immuable, double approbation, rapprochement, export ; reste le plan SYSCOHADA et la fiscalité |
| 7. Flottes et partenaires | ❌ |

Transversal : suivi GPS et carte **simulés** (aucune vraie position en direct) ; preuves : codes et photo (pas de signature manuscrite) ; **aucune base de données ni authentification serveur** (tout est local à l'appareil) ; aucun paiement mobile réel ; grille de prix, commission et seuils = valeurs de démonstration à valider ; taxes et mentions fiscales à définir avec un conseil.
