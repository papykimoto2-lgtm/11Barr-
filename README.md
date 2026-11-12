# 11Barré

Plateforme de **transport et de logistique** pour la Côte d'Ivoire : **Moto + Cargo + portail professionnel + paiement à la livraison**. Quatre applications installables (PWA) qui partagent le même stockage local et les mêmes règles métier. **Maquette fonctionnelle sans serveur** : tout reste sur l'appareil, aucun paiement réel.

| Espace | Page | Pour qui |
|---|---|---|
| Visite guidée | `demo.html` | Découvrir en 5 minutes, charger un jeu de données de démonstration |
| Client | `index.html` | Commander une course ou une livraison |
| Chauffeur et livreur | `chauffeur.html` | Recevoir des offres, livrer, suivre ses gains |
| Entreprise | `fournisseur.html` | Créer, importer et suivre ses livraisons, ses paiements et ses factures |
| Administration | `admin.html` | Valider, affecter, payer, régler les tarifs, auditer (non listée publiquement) |

## Démarrer
1. Ouvrir **`demo.html`** (Visite guidée) puis « Charger un jeu de données de démonstration » : entreprises, livreurs validés, livraisons à tous les statuts, journal financier équilibré, incident, facture, reversement en attente.
2. Suivre le parcours conseillé : administration → client → livreur → entreprise. Les pages doivent être ouvertes dans **le même navigateur** (stockage local partagé) ; plusieurs onglets suffisent.
3. « Tout réinitialiser » efface uniquement les données `onzebarre_`.
Déploiement : dossier statique tel quel (Vercel, Netlify, GitHub Pages), sans compilation.

## Application client (`index.html`)
- Accueil : Courses, Moto-taxi, Livraison, Cargo (Food et Interurbain « bientôt »), recherche de destination, adresses récentes.
- Commande : prix et délai **avant** de commander, carte de l'itinéraire, options (instructions, commander pour quelqu'un d'autre, message uniquement), modes de paiement (espèces, Orange Money, Wave, MTN MoMo ; carte « bientôt »).
- Livraison et Cargo : destinataire et colis, qui paie, vitesse (Express, Standard, Un peu plus long, Dans 2 heures), porte à porte (+200 F), montant à encaisser.
- Suivi : recherche, approche du chauffeur, code de confirmation, trajet, notation, historique, SOS, partage du trajet.

## Espace chauffeur et livreur (`chauffeur.html`)
- **Profils** : chauffeur (courses de personnes, cargo) ou livreur à moto (moto-taxi, livraison). Le profil se change depuis « Profil ».
- **En ligne / hors ligne**, puis **demandes** avec compte à rebours de 30 s : trajet, distance, **gain net avant d'accepter**, mode de paiement, somme à encaisser. Pour une livraison : colis, destinataire (numéro masqué) et montant du colis à encaisser. Refus avec motif.
- **Déroulé d'une course** : rejoindre le client (navigation et appel), « je suis arrivé », **code de confirmation à 4 chiffres** du client, démarrage, fin, **encaissement** (case à cocher obligatoire quand de l'argent est à recevoir), enregistrement. Annulation avec motif, SOS.
- **Gains** : gain net du jour, courses, commission (15 %, valeur de démonstration), total. **Solde avec 11Barré** : en espèces le chauffeur garde l'argent et reverse la commission (plus le montant des colis encaissés) ; en paiement mobile, 11Barré lui reverse son gain. **Déclaration de versement** (espèces, Wave, Orange, MTN) avec référence unique, « en validation ».
- **Lien avec l'application client** : si les deux pages sont ouvertes sur le même appareil, une commande du client arrive en direct chez le chauffeur en ligne ; son acceptation, son arrivée, le démarrage et la fin sont suivis en direct côté client, avec le vrai nom du chauffeur. Sans chauffeur en ligne, le client retombe sur une course de démonstration après 20 s. Sans client, « Simuler une demande » génère une demande fictive.

## Administration (`admin.html`)
Portail d'administration (dossier fonctionnel §5.1) : il remplace toutes les validations « démo ».
- **Équipe et droits** : administrateur, opérations, comptable, support ; chaque onglet et chaque action respecte le rôle.
- **Entreprises** : valider, demander un complément, refuser, suspendre, réactiver, fixer la remise de contrat. **Livreurs** : contrôle du dossier (identité, permis, véhicule, assurance), validation, suspension (mise hors ligne immédiate), alerte d'assurance expirée.
- **Commandes** : recherche, historique, **affectation manuelle** (livreurs éligibles uniquement : validé, assurance valide, bon type de véhicule), réaffectation, annulation ; **motif obligatoire** ; alerte de commande sans affectation après le délai paramétré.
- **Finance** : validation ou rejet des versements des livreurs, **reversements fournisseurs et règlements livreurs avec double approbation au-delà du seuil**, exécution refusée tant que les fonds n'ont pas été remis, paiement des factures avec référence, soldes séparés (revenu propre, fonds de tiers, gains des livreurs, créances), rapprochement qui signale l'écart, journal exportable.
- **Tarifs et commissions** : modification de la grille avec **versions datées**, validations (commission plafonnée à 50 %), motif obligatoire, historique, **simulateur** (prix, part du livreur, commission).
- **Incidents** (alerte SOS des livreurs) et **journal d'audit** en ajout seul (auteur, rôle, action, motif, valeurs avant/après, export CSV).
- Test : `node tests/admin.js` (54 contrôles, trois pages). Authentification réelle à brancher avant mise en service.

## Portail fournisseur et entreprise (`fournisseur.html`)
Portail pour les marchands et les entreprises clientes (dossier fonctionnel §5.2), d'écran large, installable :
- **Compte** : inscription (type, raison sociale, RCCM, contact, facturation, premier point de collecte) puis validation par 11Barré ; un compte non validé ne peut rien créer. Trois rôles : administrateur, opérateur (crée, importe, annule), lecture seule (consulte livraisons et finance).
- **Nouvelle livraison** : point de collecte, destinataire, destination, colis (poids, volume), vitesse, porte à porte, montant à encaisser, transport payé par le compte ou par le destinataire. Le **devis** se met à jour en direct avec ses lignes, le mode (Moto ou Cargo, choisi par le poids et le volume) et la **remise de contrat**. Deux codes sont générés : code de collecte (remis au livreur) et code de livraison (donné au destinataire).
- **Import CSV** : collage ou fichier, aperçu ligne par ligne (destinataire, téléphone, destination connue, poids, montant, vitesse), **doublons refusés** (dans le fichier et avec l'existant), création des seules lignes valides, rapport d'erreurs téléchargeable.
- **Suivi en direct** : les statuts du moteur (recherche d'un livreur, en route vers la collecte, en transit, livré…) reviennent du livreur avec historique horodaté, preuve (code du destinataire vérifié) et annulation selon le statut.
- **Paiements à la livraison** : encaissé pour le compte du fournisseur, reversé, solde ; relevé par commande ; demande de reversement plafonnée au dû ; exécution refusée tant que les livreurs n'ont pas remis les fonds.
- **Factures** : facturation périodique du transport facturé au compte, numérotée, imprimable ; paiement enregistré par le comptable.
- **Lien avec l'espace livreur** : une livraison créée ici est proposée aux livreurs en ligne du bon type ; collecte et livraison exigent les codes ; la clôture alimente le journal financier. Les validations de 11Barré (compte, versement, reversement, paiement de facture) sont simulées par des boutons « démo ».
- Test : `node tests/portail.js` (42 contrôles, deux pages).

## Règles métier (`moteur.js`) — d'après les dossiers fonctionnel et technique V1
Moteur sans interface ni stockage, utilisé par les deux applications et testé seul (`node tests/moteur.js`, 91 contrôles) :
- **Statuts de commande** : cycle `draft → quoted → … → delivered` avec transitions autorisées, événements figés et historisés ; une commande livrée ne revient jamais en arrière ; clôture exigeant la preuve (code de confirmation).
- **Devis paramétrable** : la grille de prix, les vitesses, les options, la validité du devis (15 min) et la commission sont les paramètres d'un **plan daté** (`PLAN_DEFAUT` = grille de démonstration). Le devis détaille ses lignes, expire et conserve la photographie des paramètres. Un autre plan (stocké sous la clé locale `onzebarre_plan`) change les prix sans toucher au code.
- **Journal des mouvements immuable** : écritures gelées, équilibrées (débits = crédits), montants entiers, référence et clé d'idempotence uniques. Les soldes se déduisent du journal, jamais d'une valeur écrasée.
- **Fonds de tiers séparés** : le montant d'un paiement à la livraison dû au fournisseur est une dette envers lui, jamais un revenu de la plateforme.
- **Opérations** : clôture de livraison (numérique, espèces, COD), encaissement idempotent (webhook rejoué = une seule écriture), remboursement plafonné, versement du livreur, règlement, rapprochement qui signale l'écart sans rien corriger.
- Les 7 scénarios financiers obligatoires du dossier technique (§11.2) sont des tests automatiques : paiement numérique, cash, COD, remboursement partiel, webhook doublonné, règlement livreur, écart de rapprochement.
- Parcours complet client ↔ chauffeur dans deux pages : `node tests/parcours.js` (Playwright).
- Limite : tout reste local à l'appareil. Les règles seront reprises côté serveur (base de données, politiques d'accès, fonctions transactionnelles) avant tout usage réel, comme le prévoit le dossier technique.

## Affectation intelligente et preuves (`moteur.js`, `chauffeur.html`)
- **Répartiteur** : une commande du portail est proposée à UN SEUL livreur à la fois, le meilleur candidat ; refus ou expiration (délai paramétrable, 30 s par défaut) → candidat suivant ; plus personne → `sans_candidat` (alerte administration, bouton « Relancer l'affectation »). Chaque offre est historisée (`order.offres`).
- **Filtres éliminatoires** : dossier validé, assurance valide, bon type de véhicule, **capacité de charge** (poids, volume ; jamais déduite de la seule catégorie), en ligne, pas déjà refusé, pas déjà occupé. **Score** : proximité au point de collecte, fiabilité (taux d'acceptation), charge actuelle. Pondérations et seuils dans le plan tarifaire.
- **Dossier livreur** : identité, permis, véhicule, assurance, catégorie, capacités, zone habituelle ; validé par l'administration avant toute mise en ligne ; suspension = mise hors ligne immédiate.
- **Preuves** : code de collecte et code de livraison ; **photo** à la collecte et à la livraison (réduite à 640 px / 120 Ko, exigence de photo de livraison paramétrable) visible dans le portail et l'administration.
- Test : `node tests/dispatch.js` (27 contrôles).

## Finition, accessibilité, démonstration
- Portail et administration : adaptés au téléphone (onglets en bas, tableaux en cartes), fenêtres accessibles (focus piégé, Échap), validation en ligne, confirmations avant actions irréversibles, « voir plus », tri, export CSV, impression propre, parcours « Pour bien démarrer ». Test : `node tests/pro-ux.js` (85 contrôles).
- Application client : accueil de première ouverture, géolocalisation facultative, reprise après rechargement, reçu, pourboire et avis rapides. Test : `node tests/client.js` (74 contrôles).
- Visite guidée `demo.html`. Test : `node tests/demo.js` (48 contrôles, les quatre espaces).
- Lancer les suites **une par une** (en parallèle elles dépassent les délais) : `node tests/moteur.js` puis `NODE_PATH=$(npm root -g) node tests/<parcours|portail|admin|dispatch|pro-ux|client|demo>.js`.

## Données de démonstration
20 lieux du Grand Abidjan (coordonnées approximatives), grille de prix fictive (base + km × tarif, arrondi à 50 F, minimum par catégorie), chauffeurs et plaques inventés, carte schématique sans tuiles externes. Aucun paiement réel. Seuls l'historique, les adresses récentes et le mode de paiement sont gardés sur l'appareil.

## Pour passer à une vraie application
Compte client et authentification, base de données (commandes, chauffeurs, livreurs), moteur d'adresses et d'itinéraires, grille de prix réelle, affectation automatique, notifications push, paiement mobile intégré (accords opérateurs), application chauffeur/livreur. Les numéros d'urgence affichés (185, 110, 180) sont à vérifier.

## Fichiers
`demo.html` (visite guidée) · `index.html` (client) · `chauffeur.html` (chauffeur et livreur) · `fournisseur.html` (portail entreprise) · `admin.html` (administration) · `commun.js` et `commun.css` (socle partagé) · `moteur.js` (règles métier) · `tests/` · `manifest*.webmanifest` · `sw.js` · `vercel.json` · `icons/`

## Déploiement
Site statique : aucune commande de build, dossier racine `./`, aucun framework (preset « Other » sur Vercel). Chaque push sur `main` redéploie automatiquement. `vercel.json` ajoute les en-têtes de sécurité et empêche la mise en cache du service worker.
