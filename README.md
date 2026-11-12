# 11Barré

Maquette interactive d'une application de **courses et de livraison** (page unique, installable en PWA, sans serveur).

## Voir la maquette
Ouvrir `index.html` (application client) et `chauffeur.html` (espace chauffeur et livreur) dans un navigateur, de préférence en affichage mobile, ou déployer le dossier tel quel (Vercel, Netlify, GitHub Pages). Les deux pages sont deux applications installables distinctes.

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

## Règles métier (`moteur.js`) — d'après les dossiers fonctionnel et technique V1
Moteur sans interface ni stockage, utilisé par les deux applications et testé seul (`node tests/moteur.js`, 36 contrôles) :
- **Statuts de commande** : cycle `draft → quoted → … → delivered` avec transitions autorisées, événements figés et historisés ; une commande livrée ne revient jamais en arrière ; clôture exigeant la preuve (code de confirmation).
- **Devis paramétrable** : la grille de prix, les vitesses, les options, la validité du devis (15 min) et la commission sont les paramètres d'un **plan daté** (`PLAN_DEFAUT` = grille de démonstration). Le devis détaille ses lignes, expire et conserve la photographie des paramètres. Un autre plan (stocké sous la clé locale `onzebarre_plan`) change les prix sans toucher au code.
- **Journal des mouvements immuable** : écritures gelées, équilibrées (débits = crédits), montants entiers, référence et clé d'idempotence uniques. Les soldes se déduisent du journal, jamais d'une valeur écrasée.
- **Fonds de tiers séparés** : le montant d'un paiement à la livraison dû au fournisseur est une dette envers lui, jamais un revenu de la plateforme.
- **Opérations** : clôture de livraison (numérique, espèces, COD), encaissement idempotent (webhook rejoué = une seule écriture), remboursement plafonné, versement du livreur, règlement, rapprochement qui signale l'écart sans rien corriger.
- Les 7 scénarios financiers obligatoires du dossier technique (§11.2) sont des tests automatiques : paiement numérique, cash, COD, remboursement partiel, webhook doublonné, règlement livreur, écart de rapprochement.
- Parcours complet client ↔ chauffeur dans deux pages : `node tests/parcours.js` (Playwright).
- Limite : tout reste local à l'appareil. Les règles seront reprises côté serveur (base de données, politiques d'accès, fonctions transactionnelles) avant tout usage réel, comme le prévoit le dossier technique.

## Données de démonstration
20 lieux du Grand Abidjan (coordonnées approximatives), grille de prix fictive (base + km × tarif, arrondi à 50 F, minimum par catégorie), chauffeurs et plaques inventés, carte schématique sans tuiles externes. Aucun paiement réel. Seuls l'historique, les adresses récentes et le mode de paiement sont gardés sur l'appareil.

## Pour passer à une vraie application
Compte client et authentification, base de données (commandes, chauffeurs, livreurs), moteur d'adresses et d'itinéraires, grille de prix réelle, affectation automatique, notifications push, paiement mobile intégré (accords opérateurs), application chauffeur/livreur. Les numéros d'urgence affichés (185, 110, 180) sont à vérifier.

## Fichiers
`index.html` (client) · `chauffeur.html` (chauffeur et livreur) · `commun.js` et `commun.css` (socle partagé) · `moteur.js` (règles métier) · `tests/` · `manifest*.webmanifest` · `sw.js` · `vercel.json` · `icons/`

## Déploiement
Site statique : aucune commande de build, dossier racine `./`, aucun framework (preset « Other » sur Vercel). Chaque push sur `main` redéploie automatiquement. `vercel.json` ajoute les en-têtes de sécurité et empêche la mise en cache du service worker.
