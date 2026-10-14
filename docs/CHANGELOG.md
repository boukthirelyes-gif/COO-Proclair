## Interventions : sauvegarde atomique — 2026-10-14

- Champs et état sauvegardés dans une seule transaction, sans écriture partielle en cas de transition refusée.
- Report explicite avec libération du créneau ; annulation sans déplacement ni blocage causé par une configuration devenue inactive.
- Droits, versions concurrentes, audit unique et prix immuables ; formulaire transmet les suppressions comme NULL.
- 116 tests serveur, compilation et 22 contrôles navigateur natifs réussis. Aucune migration ni modification directe de production.

## Premier lot natif V2000 — 2026-10-14

- Reprise de feature/proclair-native-operations-20261014 et du module existant.
- Dispatch PostgreSQL indépendant de Rotor, compteurs exacts, file paginée, objectifs et dossiers modifiables selon les droits.
- Capacité nulle le week-end et visites retirées exclues ; navigation Rotor dédoublonnée et réservée aux outils historiques.
- 114 tests serveur, compilation, 17 contrôles navigateur CRM/Dispatch et six contrats signés réussis. Production inchangée.

## Accès Vercel et intégration agenda — 2026-10-14

- Connexion : slash final accepté, domaine exact de déploiement Vercel autorisé sans wildcard, cookies HTTPS derrière proxy et diagnostics distincts. Mot de passe existant conservé.
- Message réel des identifiants invalides et double soumission du formulaire bloquée.
- Planning iCalendar pour Google Agenda, Outlook et Apple Calendar : droits CRM/intégrations/export, 31 jours maximum, compteur d’omissions, UID stable et statut TENTATIVE pour visites non confirmées. Import ponctuel sans synchronisation automatique.
- Bornes Toronto corrigées pour les changements d’heure de 23/25 heures.
- 111 tests serveur, trois tests ciblés agenda repassés après finalisation, compilation et 34 groupes navigateur réussis. Production non vérifiée ; aucune migration ni nouvelle clé requise.

## OMEGA : priorités, briefing et capacité — 2026-10-14

- Cockpit PostgreSQL : retards, confirmations, visites à placer, suivis, factures et worker selon les droits ; compte exact, dix dossiers affichés et accès aux dossiers.
- Briefing opérationnel dans l’assistant, avec catégories non autorisées masquées.
- Analyse quotidienne sans écriture : équipe active, objectifs, horaires 8–17, scénario de 60 minutes et marge de 30 minutes ; report de date au planificateur sans création automatique de plan.
- 104 tests serveur, dix groupes navigateur OMEGA, 14 groupes Superhub, TypeScript, compilation et trois tests Python réussis. Aucune migration, clé supplémentaire ou activation externe.

## Filtres SMS et appels manqués — 2026-10-13

- Canal SMS/Appels filtré côté serveur avec compteur exact avant pagination.
- Appels manqués à examiner : dernier appel entrant sans réponse, occupé ou échoué, sans communication plus récente.
- Recherche combinée au canal sans contournement et sélection du fil réinitialisée au changement de filtre.
- Tests PostgreSQL ciblés et 14 groupes navigateur Superhub réussis ; compilation réussie. Aucun contact externe, migration ou clé supplémentaire.

## Équipe configurable et marges OMEGA — 2026-10-13

- Écran Équipe fonctionnel : création, activation et objectifs lundi-jeudi/vendredi, droits Paramètres et versions.
- Désactivation/réduction incompatible avec les rendez-vous refusée, audit conservé.
- Premier créneau avec 30 minutes avant/après ; un candidat long ne masque plus un créneau court.
- Configuration et marge revérifiées avant application, sans déplacement partiel.
- Migration additive technician_versions ; 100 tests serveur, 5 groupes navigateur Équipe et compilation réussis. Routage routier et déploiement distant non vérifiés.

## Suivis persistants de communications — 2026-10-13

- Création depuis un SMS entrant ou appel manqué, validation humaine, report, clôture avec note et audit.
- Déduplication, versions concurrentes, STOP et communications plus récentes contrôlés avant chaque action.
- Tableau OMEGA paginé et compte réel dans l’assistant ; lectures groupées et index pour les dernières activités.
- Export métier des suivis et des messages Rotor ; correction du débordement du tableau worker sur mobile.
- 94 tests serveur réussis et 13 groupes navigateur Superhub réussis ; compilation validée. Aucune communication ou opération financière réelle.

## Centres Stripe, SMS et Appels — 2026-10-13

- Branches Rotor SMS, lectures paiements/factures et thème sombre récupérés avec historique Git préservé.
- Conversations natives recherchables et paginées, correspondances client uniques ou ambiguës, historiques SMS/appels et liens dossiers.
- Brouillons OMEGA locaux, STOP bloquant, formulaire individuel repliable et droits conservés.
- Suivi Stripe local par devise/statut et consultation manuelle du compte Stripe test via SDK officiel, sans opération comptable.
- 93 tests serveur, 11 groupes Superhub et 11 groupes fournisseurs navigateur réussis ; compilation et contrôle des secrets réussis.
- Voir les six rapports OMEGA_V1000. Mise en ligne et connexions externes non vérifiées ; périmètre V1000 restant documenté.

## Recherche et filtres de revue Rotor — 2026-10-13

- Recherche serveur dans tous les clients d'un import : nom, coordonnées, adresse et référence, avec compteur exact avant pagination.
- États À rapprocher, Déjà rapproché et Source à revérifier ; les données sources modifiées bloquent la promotion.
- Pagination conservant les critères, actualisation après rapprochement et réponses d'anciennes recherches ignorées.
- Correspondance native masquée sans lecture CRM ; droits de promotion conservés.
- Aucune migration ou nouvelle clé. Voir TRANSFERT_ROTOR.md.

## Contrôle de la migration et historique client — 2026-10-13

- Compteurs PostgreSQL cohérents sur tous les clients du miroir : staging, rapprochements, attente et sources modifiées.
- Contrôle des archives financières selon les droits : références client non rapprochées, identifiants absents et factures source manquantes.
- Actualisation après rapprochement et onglet Historique Rotor dans les fiches clients autorisées à consulter les finances.
- Rubriques du dossier en français. Aucun changement du registre comptable ou des droits, aucune migration ou clé supplémentaire.
- Voir TRANSFERT_ROTOR.md ; les compteurs ne certifient pas le transfert complet des données de la source.

## Interface de migration Rotor et vérification des fournisseurs — 2026-10-13

- Centre de transfert CSV en tête d'Intégrations, étapes visibles, association explicite des colonnes, aperçu et conflits bloquants.
- Clients en staging puis rapprochement natif approuvé ; coordonnées et notes existantes conservées.
- Archives de factures/paiements consultables et paginées dans Finances, montants signés exacts et références client conservées ; aucun paiement comptable ou prélèvement créé.
- Contrôles Stripe/Twilio en lecture seule, compte masqué, erreur réseau distincte d'un refus d'identifiants et webhooks non déclarés vérifiés.
- Autorisations OAuth repliables, cartes fournisseur et interface mobile améliorées.
- Modifications GitHub de la limite annuelle et diagnostics PostgreSQL conservées ; migration et lecteur alignés à 366 jours.
- Voir TRANSFERT_ROTOR.md et STRIPE_TWILIO.md. Connexions réelles, import réel et statut Vercel restent non vérifiés.

## Priorités des suivis OMEGA — 2026-10-13

- Suivis ouverts chargés avant l'historique, classement par échéance et repérage des retards.
- Recherche sans distinction de casse ou accents, filtres d'état et compteurs explicites sur la liste chargée.
- Report manuel d'échéance conservant l'approbation, contrôlé par version, dossier et permissions ; audit avant/après.
- Consultation des comptes rendus clôturés. Aucun envoi, paiement ou rendez-vous automatique.
- Aucune migration ou nouvelle clé API. Voir OMEGA_SUIVIS_VENTES.md.

## Corrections des devis personnels — 2026-10-13

- Édition des services, quantités, prix, taxes et validité d'un brouillon dans Mes ventes.
- Recalcul serveur en cents, versions concurrentes et propriétaire actuel contrôlés, historique avant/après.
- Devis émis immuables ; émission, accord, contrat et signature restent des actions distinctes.
- Aucune migration ou nouvelle variable d'environnement. Voir DEVIS_PERSONNELS_CORRECTIONS.md.

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
## OMEGA : suivis commerciaux supervisés — 2026-10-13

- Propositions pour rappels échus, devis en attente, signatures et ventes à transmettre ou préparer.
- Espace personnel dans Mes ventes et supervision globale selon les droits existants.
- Brouillon, approbation humaine, compte rendu manuel et rejet ; versions, propriétaire et restrictions revérifiés à chaque étape.
- Aucun message, paiement ou rendez-vous exécuté par ce module ; migration additive et aucune nouvelle clé API.
- Voir OMEGA_SUIVIS_VENTES.md pour les limites et le déploiement.
