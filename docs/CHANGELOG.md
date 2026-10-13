## Carte : recherche serveur et groupes de portes — 2026-10-13

- Filtres PostgreSQL avant pagination : recherche, état, catégorie, vendeur, territoire et dates de Toronto.
- Compteurs exacts pour tous les résultats autorisés ; réponses de filtres précédents ignorées.
- Regroupement des pins natifs chargés au dézoom, agrandissement au clic et retour aux portes individuelles au zoom 18.
- Aucun changement des droits, contrats, règles Never Knock ou calques Rotor.
- Voir CARTE_FILTRES_GROUPES.md pour l'utilisation et les limites.

## Parcours vendeur natif — 2026-10-13

- Mes ventes : devis et contrats depuis ses propres prospects, droit sales.write distinct de l'accès global CRM.
- Portails existants pour acceptation du devis, signature mobile et PDF archivé du contrat ; liaison au devis accepté avec conservation des totaux.
- Création client/site transactionnelle sans écrasement ; correspondances nécessitant le rapprochement d'un gestionnaire.
- Transmission explicite des ventes signées, étape Gagné et pin Made Sale sous contrôle du propriétaire ; passages créés séparément par un responsable.
- Migration additive ; comptes non administrateurs existants sans élévation automatique de permissions.
- Voir PARCOURS_VENDEUR.md pour l'utilisation et les limites.

## Ergonomie CRM et accès — 2026-10-13

- Carte native paginée par lots de 100 : le volume global supérieur à 2 000 portes ne bloque plus son ouverture ; compteurs limités aux portes chargées et actualisation dédiée.
- Menu mobile donnant accès à toutes les rubriques autorisées et recherche globale utilisable avec les flèches et Entrée.
- Choix des permissions cohérents : ajout des droits de lecture nécessaires et retrait des actions qui en dépendent.
- Application d'un plan OMEGA soumise aux droits OMEGA **et** de planification ; décompte des passages réalisés directement par PostgreSQL sans charger chaque visite.

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
