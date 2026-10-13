## Améliorations des connexions — 2026-10-13

- Diagnostic des SID/numéros Twilio et des clés Stripe incompatibles ; activation affichée seulement lorsque la configuration est complète.
- Actualisation de configuration, copie des adresses de webhooks et consignes de connexion.
- Dates à l'heure de Toronto, états lisibles en français, filtre sur les appels et retrait du consentement SMS.

## Stripe et Twilio — 2026-10-13

- SDK officiels, webhooks signés et stockage natif des SMS, consentements, appels et sessions Stripe.
- STOP protégé, approbation des envois individuels, callbacks monotones et absence de réessai après envoi incertain.
- Checkout Stripe limité au test ; aucun règlement réel ou modification du registre comptable.
- État de configuration et historique visibles dans Intégrations, liens de test dans Paiements ; droits existants préservés.
- Voir STRIPE_TWILIO.md pour les variables, réglages fournisseur et limites.

# Historique des livraisons

## Territoires natifs — 2026-10-13

- Dessin et modification de polygones, couleur, vendeur, activation et filtre de secteur.
- Affectations contrôlées, refus des conflits, containment des portes, audit et versions ; portes historiques préservées.
- Statistiques de portes par statut et visibilité par vendeur. Migration additive, aucune donnée supprimée.
- Voir TERRITOIRES_VENTES.md pour les règles conservatrices et limites.

## 0.3.0 — première tranche V30 — 2026-10-13

- Reprise vérifiée du thème sombre de la branche design, navigation regroupée, icônes SVG, barre mobile et actions directes.
- Recherche serveur par permissions, dossiers Details / Service / Activity et synthèse financière issue du ledger.
- Staging Rotor reprenable, rapports de progression et promotion client explicitement rapprochée. Aucun import réel dans cette instance.
- Contrats Service / Agree / Schedule avec lignes par passage, prix en dollars, accord horodaté, PDF archivé et jobs/visites PENDING créés explicitement.
- Assistant OMEGA déterministe avec consultation des données et liens vers les actions supervisées.
- AJV 8.20.0, trois migrations additives, PDF Unicode et police Apache-2.0 incluse dans le tracing.

Code de branche, sans preuve de publication distante. Voir PROCLAIR_V30_OVERNIGHT_REPORT.md pour la couverture et les fonctions non livrées.

## 0.2.0 — branche rotor-capabilities-map — 2026-10-13

- Prospects natifs et pipeline commercial de cinq étapes, lien porte → prospect, affectations et restrictions par vendeur.
- Conversion humaine en client, rapprochement de doublons, justification des identités distinctes, versions et idempotence transactionnelle.
- Catalogue initial de 512 capacités candidates, avec origine, preuve, statut, permissions, limites et références de validation.
- Registre dynamique MCP avec snapshots persistés, schémas d’entrée/sortie, protocole, scopes et différences. Isolation des schémas modifiés et outils retirés.
- Consentement progressif pour les lectures Rotor ; scopes demandés et réellement accordés séparés. Aucune écriture distante.
- Cinq catégories de pins Proclair et UUID fournis, conservés avec provenance ; anciens suivis et audits préservés.
- Prévisualisation et import de pages de pins dans un miroir indépendant, avec validation des schémas courants et des coordonnées.
- Carte avec catégories, filtres de dates et calque Rotor réservé aux administrateurs. Never Knock reste protégé côté serveur.
- Santé et compatibilité : contrôle PostgreSQL, migrations, queue, snapshots, blocages et matrice paginée.
- Surveillance quotidienne de découverte MCP, désactivée par défaut, avec bail PostgreSQL. PR de dépendances proposées par Dependabot.

Cette entrée décrit le code de branche. Elle ne constitue pas une preuve de fusion ou de production. Les accès réels Rotor, Stripe, SMS, le fond de carte dans Codex et la fidélité des écrans privés demeurent limités comme indiqué dans INTEGRATION_LIMITATIONS.md.
