# PROCLAIR OS — inventaire Rotor et ROTOR FEATURE PARITY

Date d'inspection : 2026-10-09. Source métier : directive utilisateur OMEGA GODMODE V20. Ce document distingue une exigence demandée d'une fonctionnalité réellement observée chez Rotor.

## Sources et limites de preuve

- Dépôt initial inspecté : application Python/SQLite, `app.py`, `static/index.html`, `static/app.js`, `tests/test_app.py`, `README.md`. Le prototype contient contacts/prospects, recherche locale, notes, tâches et assistant déterministe. Ce n'est pas une réplique validée de Rotor.
- Aucun écran, capture, export métier ou session Rotor autorisée n'a été fourni. Les menus, champs, couleurs, filtres, dialogues et interactions exacts de Rotor sont donc **inconnus**.
- Le cahier OMEGA TITAN V10 n'est pas présent. Les paliers de commissions et toute règle V10 non reprise dans V20 restent inconnus; aucune règle financière n'est inventée.
- Vérification en lecture seule de `https://mcp.getrotor.com/mcp` : tentative JSON-RPC `initialize` (protocole 2025-03-26), bloquée par le proxy avant la connexion à Rotor : `CONNECT tunnel failed, response 403`, réponse `server: envoy`. Aucun jeton n'a été utilisé. Aucun `tools/list` ne peut être effectué sans initialisation réussie.
- Vérification en lecture seule de `https://www.getrotor.com` : même blocage CONNECT 403. La documentation publique n'a pas été accessible.
- Ces réponses ne prouvent ni une erreur d'authentification Rotor ni l'absence d'une intégration. Les capacités, droits et exigences d'authentification MCP restent inconnus. Domaines nécessaires à vérifier/ajouter dans les paramètres réseau : `mcp.getrotor.com`, `www.getrotor.com`, `getrotor.com`. Conserver les autres domaines déjà autorisés; ne pas remplacer une liste inconnue.

## Convention d'état

**Initial** = présent dans le prototype inspecté; **tranche V1** = implémentation locale présente; **à construire** = absent; **non observé** = pas de preuve Rotor. « Testé » signifie un résultat exécuté, jamais une simple existence de test. Validation exécutée rapportée par le responsable de livraison : 26 tests TypeScript réussis (règles, permissions, PostgreSQL et worker), 3 tests Python historiques réussis. Le détail reproductible appartient à `docs/validation.md`. Parcours Chromium exécuté : création métier, calendrier jour, planification OMEGA, modification, navigation et worker réussis; détails dans docs/validation.md. La cible V20 de 1 500 tests n’est pas atteinte.

## État réel de la première tranche livrée

L’application existante est prolongée dans ce dépôt par Next.js/React, TypeScript et PostgreSQL avec schéma et migrations Prisma. Prisma utilise officiellement le mode client JavaScript avec adaptateur PostgreSQL : aucun contournement de vérification TLS/checksum ni dépendance à un téléchargement de moteur binaire n’est requis. Le prototype historique reste conservé; l’import SQLite lit une source immuable et conserve les correspondances sans écraser les données source.

Fonctions locales implémentées : clients, propriétés, contrats, prestations/jobs, visites et trois techniciens; calendrier jour/semaine/mois; fiches éditables; transitions d’état contrôlées; contrôle des chevauchements et passages; journal d’audit; session administrateur signée (ce n’est **pas OAuth**); OMEGA déterministe avec prévisualisation, approbation explicite et application idempotente. Le worker PostgreSQL persiste les jobs, produit uniquement des propositions, reste désactivé par défaut et expose activation/kill switch, verrouillage, retentatives et dead-letter. Il ne confirme pas un client, n’envoie pas de communications, ne synchronise pas Rotor et ne calcule pas de trajets réels.

## Navigation et inventaire par page

Ordre ci-dessous : catégories de la directive V20, **pas un ordre Rotor vérifié**. La nouvelle navigation doit utiliser de vraies URL, l'état actif, et des filtres URL conservés. Les pages hors tranche V1 doivent annoncer leur indisponibilité plutôt que simuler des boutons de mutation.

| Élément Rotor / page demandée | Implémenté | Fonctionnel | Testé | Différence / inconnu |
|---|---|---|---|---|
| Dashboard | Initial : compteurs contacts/tâches | Local SQLite | À revalider | KPI Rotor et disposition inconnus |
| Customers | V1 : création, liste, recherche, notes, fiche | Création, consultation et édition versionnée PostgreSQL | Tests métier; parcours Chromium réussi | Onglets Rotor non observés; messages absents; factures locales accessibles depuis le client |
| Leads | Initial : statut Prospect/En discussion | Filtrage commercial limité | Inclus dans test initial | Pipeline distinct, qualification et conversions à construire |
| Jobs | V1 PostgreSQL | Oui, local | Tests TypeScript | Entité distincte de visite/contrat; workflows Rotor inconnus |
| Visits | V1 PostgreSQL | Oui, local | Tests TypeScript | Création, affectation et transitions auditées prioritaires |
| Schedule | V1 jour/semaine/mois | Oui, local | Règles testées; parcours Chromium réussi | Planning opérationnel initial; fidélité visuelle non vérifiable |
| Dispatch | À construire / capacité V1 limitée | Pas de dispatch carte complet | Non | Carte, drag/drop et orchestration temps réel restants |
| Quotes | À construire | Non | Non | Conditions commerciales et conversion inconnues |
| Contracts | V1 PostgreSQL avec édition versionnée | Oui, local | Tests TypeScript + Chromium | Passages restants, client/propriété/job distincts |
| Invoices | Brouillons, édition, émission, annulation et CSV | Oui, PostgreSQL | Tests métier et Chromium | Impression et PDF navigateur livrés ; PDF serveur et envoi externe restants ; Rotor non observé |
| Payments | Paiements manuels et contrepassations auditées | Oui, ledger local | Tests métier et Chromium | Aucun encaissement ou remboursement bancaire connecté |
| Team | Trois techniciens V1 | Oui, local | Tests TypeScript liés au planning | Damien, Ricardo, Lucas demandés; rôles applicatifs détaillés restants |
| Communications | À construire | Aucun envoi externe | Non | Connecteurs et permissions absents |
| Reports | Totaux facturés, paiements nets, soldes et CSV | Oui, snapshot PostgreSQL cohérent | Tests export et Chromium | Dépenses payées et trésorerie enregistrée livrées ; profitabilité et rapports fiscaux complets restants |
| Settings | Configuration opérationnelle V1 limitée | À valider | À consigner | Horaires/capacité; gestion fine des permissions restante |
| OMEGA AI | Initial : règles de suivi; V1 : dispatch déterministe | Prévisualisation/approbation/application locales | Tests TypeScript | Exécution backend explicable, distincte de génération de texte |
| Maps | À construire | Non | Non | Géocodage, trajets, licences et carte clients nécessaires |
| Sales Territories | À construire | Non | Non | Territoires, historique mobile et représentants nécessaires |
| Automations | Fill contrôlé et worker PostgreSQL | Propositions persistées; désactivé par défaut | Tests worker PostgreSQL | Pas de communication ni réservation autonome |

## Champs, interactions et composants prioritaires

### Clients et propriétés

Le prototype expose nom, entreprise, courriel, statut, notes. La V1 sépare client et adresse desservie, stocke le téléphone et expose une fiche avec données locales et audit. Onglets demandés : Overview, Jobs, Visits, Contracts, Invoices, Payments, Messages, Activity, Notes, Files, Photos. Seuls les onglets alimentés par des données persistées peuvent être annoncés comme opérationnels. Création de visite/contrat depuis un client prioritaire; factures locales accessibles; devis et envoi de messages restent à construire. Modales, menus contextuels, placement des boutons, tags et états Rotor : non observés.

### Contrats, travaux et visites

CUSTOMER ≠ PROPERTY ≠ CONTRACT ≠ JOB ≠ VISIT ≠ INVOICE ≠ PAYMENT. Une visite doit porter identifiant, liens métier, service, statut, durée prévue/réelle, créneau, technicien, prix, notes, création, historique, source externe et synchronisation. Priorité V1 : liens métier, planning, durée, transitions et audit. États demandés : PENDING, PROPOSED, CONFIRMED, SCHEDULED, IN_PROGRESS, COMPLETED; branches CANCELLED, RESCHEDULED, NO_ACCESS, FAILED, NEEDS_FOLLOWUP. La présence d'un enum ne suffit pas : matrice de transitions validée côté serveur, droits, conflits et transaction nécessaires.

### Calendrier et dispatch

| Élément Rotor demandé (non observé) | Implémenté | Fonctionnel | Testé | Différence |
|---|---|---|---|---|
| Jour : colonnes par technicien, horaires, cartes, durée/statut | V1 | Affichage local | Affichage implémenté; contrôles Chromium détaillés dans validation.md | Interaction et apparence Rotor inconnues |
| Semaine : charge, filtres, disponibilités | Vue semaine V1 | Affichage local | Affichage implémenté; contrôles Chromium détaillés dans validation.md | Parité complète non revendiquée |
| Mois : volumes, capacité, retards | Vue mois V1 | Affichage des visites | Affichage implémenté; contrôles Chromium détaillés dans validation.md | Vue présente; agrégations avancées restantes |
| Dispatch : techniciens, non planifiées, carte, conflits | Partiel V1 sans carte | À valider | À consigner | Carte et optimisation routière restantes |
| Détails de visite, changement date/heure/technicien | V1 | Oui, mutations PostgreSQL | Tests métier; parcours Chromium réussi | Audit, validation et conflits implémentés |
| Annuler, reporter, confirmer, terminer | Transitions V1 | Validées côté serveur | Tests TypeScript | Statut local; aucune confirmation client externe |
| Copier, route, communications, glisser-déposer | À construire | Non | Non | Aucun bouton factice acceptable |
| FILL EMPTY SLOTS WITH OMEGA : prévisualiser/appliquer | V1 | Oui, approbation et idempotence | Tests PostgreSQL | Pas de confirmation externe ni de sync Rotor |

Contraintes Proclair demandées : lundi-vendredi 08:00–17:00; cible 4 interventions/technicien/jour, vendredi 2; communications à partir de 09:00. Une cible de volume n'est pas une preuve de faisabilité routière. Ne jamais déplacer une visite existante implicitement, dépasser les passages restants ou confondre proposition et confirmation client. Fuseau horaire explicite, contrôle des chevauchements, autorisation, concurrence et idempotence doivent être vérifiés dans la tranche V1.

### OMEGA

Pipeline cible : intent → validation → authorization → data fetch → plan → preconditions → execution → verification → audit → result. Chaque résultat doit distinguer proposition, mutation locale persistée et synchronisation externe. Le panneau explicatif doit afficher WHAT, WHY, DATA, PERMISSION, RESULT, VERIFICATION, ERROR, NEXT avec données réelles. V1 : moteur déterministe de sélection/planification avec exécution locale approuvée et idempotente, aucune intelligence générale ou communication autonome revendiquée. Les sous-agents communication, finance, routes, ventes, qualité, données et exécutif sont des modules à construire, pas des agents déployés simplement parce qu'ils portent un nom.

### Inbox, cartes et finance

Inbox trois panneaux, classification bilingue, autoreply, désabonnement, pièces jointes : à construire après choix des connecteurs et permissions. Les brouillons ne sont pas des messages envoyés. Customer Map et Sales Map sont distinctes. États vente demandés : SOLD, NO HOME, NOT INTERESTED, CALLBACK, NOT KNOCKED, FOLLOW UP, ACTIVE, CANCELLED, DO NOT CONTACT. Taxes explicites, factures, paiements manuels, dépenses payées et export CSV : livrés localement. Ledger de commissions et calculs de rentabilité : à construire ; paliers V10 requis avant commissions progressives.

## ROTOR FEATURE PARITY

| Fonctionnalité | Référence Rotor observée | Proclair | Visuel / interactions | Couverture fonctionnelle | Tests / intégration | Bugs ou limites | Priorité |
|---|---|---|---|---|---|---|---|
| Clients | Aucune | Initial + V1 | Inconnue | CRUD initial partiel | Résultats à consigner; local | Fiche complète restante | Critique |
| Contrats / jobs / visites | Aucune | Tranche V1 | Inconnue | À mesurer sur parcours exécutés | À consigner; PostgreSQL local prévu | Validation de livraison requise | Critique |
| Planning / fill | Aucune | V1 | Inconnue | Prévisualisation puis mutations locales | Tests TypeScript/PostgreSQL | Routes/confirmation externe absentes | Critique |
| Audit et permissions | Aucune | V1 | Sans référence | Session admin signée, droits métier, audit | Tests TypeScript/PostgreSQL | Production et identité à durcir | Critique |
| Synchronisation Rotor | MCP non joignable | Pas de sync vérifiée | Inconnue | Aucune | Bloquée réseau avant origine | Auth et capabilities inconnues | Critique |
| Communications | Aucune | Pas de connecteur | Inconnue | Brouillon initial uniquement | Aucun envoi | Accès fournisseurs à établir | Haute |
| Finance / commissions | Fonctions annoncées publiquement, aucun écran du compte | Factures, paiements manuels, dépenses et impression locaux | Inconnue | Commissions absentes | 26 tests métier et 17 étapes financières navigateur | V10 et connexion compte manquants | Haute |
| Routes / cartes / territoires | Aucune | Absents | Inconnue | Aucune | Aucun | Géocodage et optimisation à fournir | Haute |
| Rapports / workflows 24/7 | Fonctions annoncées publiquement | Worker de propositions et rapports financiers locaux | Inconnue | Jobs persistés, locks, retry, kill switch ; totaux et CSV | Tests worker et parcours financier | Désactivé par défaut ; supervision production restante | Haute |

**Score global de parité Rotor : non calculable.** Le dénominateur des fonctionnalités observées est vide; publier un pourcentage serait trompeur. Après accès autorisé : attribuer un poids à chaque workflow observé (critique 5, haute 3, standard 1), définir des critères reproductibles, puis calculer `somme(poids × critères validés / critères attendus) / somme(poids)`. Conserver séparément couverture V20, fidélité visuelle et intégration; pas de score basé sur des pages de navigation seules.

## Trajectoire d'implémentation et dépendances

1. Première tranche locale implémentée et testée dans le dépôt existant : Next.js/TypeScript, PostgreSQL, migrations, clients/propriétés/contrats/jobs/visites, planning, validations de chevauchement et passages restants, audit, OMEGA fill prévisualisé/appliqué. Préserver le prototype et ses données, migrer explicitement sans écraser la source SQLite.
2. Fiabiliser : permissions métier, identité production, contrôles de concurrence/idempotence, worker persistant avec locks/retries/backoff/dead-letter/kill switch, sauvegarde-restauration vérifiée, monitoring, tests API/E2E/Safari/accessibilité et CI. Un serveur démarré n'est pas un déploiement public.
3. Obtenir les références Rotor autorisées et V10; reprendre MCP initialize puis tools/list seulement après connectivité; inventorier les schémas/outils autorisés avant tout adaptateur. Ajouter import CSV/JSON contrôlé, mappings d'identifiants, déduplication, transactions, rapport de comptage et réconciliation.
4. Ajouter inbox et canaux autorisés, réponses bilingues, consentement, idempotence externe; routes réelles puis cartes/territoires mobiles.
5. Ajouter devis, factures, paiements et ledger de commissions après règles commerciales/taxes/V10 vérifiées; rapports et automatisations transversales.
6. Compléter les 1 500 tests significatifs demandés progressivement sur fonctionnalités existantes. Aucun test vide, compteur gonflé ou résultat supposé. Les comparaisons de captures nécessitent les écrans Rotor accessibles.

Les étapes 2–6 restent à compléter; la queue persistante et ses contrôles de base de l’étape 2 existent déjà en V1, sans prétendre constituer l’exploitation production complète. Ce document ne transforme pas la première tranche en définition de done V20 accomplie.

## Nouveau contrôle Rotor — 9 octobre 2026

Le blocage CONNECT403 consigné ci-dessus décrit le premier contrôle historique. Nouveau contrôle : `https://www.getrotor.com` répond HTTP200 ; `initialize` vers `https://mcp.getrotor.com/mcp` répond HTTP401 avec `invalid_token`, `Authorization required`. Cette fois, le serveur Rotor est atteint. Aucune clé ni session utilisée, aucune donnée métier lue, aucune mutation distante.

Métadonnées publiques observées :

- Ressource OAuth : `https://mcp.getrotor.com/.well-known/oauth-protected-resource/mcp`, HTTP200 ; bearer dans l’en-tête.
- Serveur OAuth : `https://mcp.getrotor.com/.well-known/oauth-authorization-server`, HTTP200 ; authorization code, PKCE S256, refresh token, client public, registration et révocation annoncés.
- Autorisation : `https://mcp.getrotor.com/oauth/authorize`. Aucun client enregistré ou flux lancé dans ce contrôle.
- Lectures annoncées : contacts, membres, prospects, clients, prestations, visites, tâches, boîte de réception, campagnes, modèles, plans de service, pins, factures, devis, paiements, paie, pipelines et feuilles de temps. Les scopes annoncés ne constituent pas une liste d’outils vérifiée ; `tools/list` attend une session autorisée.
- Écritures annoncées : prospects, clients, visites, tâches, campagnes et modèles. Elles ne sont pas autorisées ou exécutées par ce contrôle.

Le site public décrit : capture et notation de prospects, territoires/carte, pipelines et automatisations, plans récurrents avec accords signés, SMS/courriel, planning équipe, analyses, factures/paiements, portail client, campagnes et suivi du temps. Il s’agit de descriptions commerciales publiques, sans preuve de disposition visuelle ni de configuration du compte Proclair.

Le site lie `https://docs.api.getrotor.com/` et `https://helpcenter.getrotor.com`. Ces deux domaines répondent encore CONNECT403 via le proxy dans cette instance. Ils sont proposés dans le brouillon réseau sans suppression des domaines existants. Un enregistrement du brouillon ne les active pas dans cette session.

Prochaine dépendance : connecter le MCP Rotor avec OAuth depuis le client qui héberge cette conversation, au compte Proclair autorisé, puis découvrir les outils en lecture seule et inventorier les écrans/données accessibles avant un adaptateur. Ne jamais demander un mot de passe, un token ou un cookie dans le chat. Sans cette connexion, aucune synchronisation Proclair–Rotor n’est établie.

## Parcours OAuth intégré au CRM — 12 octobre 2026

La page Intégrations permet désormais de commencer une connexion OAuth depuis Proclair, après configuration de son origine publique HTTPS. Client public enregistré dynamiquement, PKCE S256, scopes de lecture uniquement, jetons chiffrés côté serveur et découverte tools/list. Aucun compte Rotor n’est connecté à cette instance, aucun outil métier n’est exécuté et aucun import n’est livré. Ne pas confondre le parcours implémenté/testé sur serveur simulé avec une intégration distante validée. Connexion réelle, inventaire du compte, pagination complète, renouvellement automatique et mapping/import restent à réaliser.
