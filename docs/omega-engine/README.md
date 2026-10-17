# OMEGA Operations Engine — capacités réelles

Ce lot part de develop. Il conserve les moteurs existants ; aucun agent supplémentaire ni appel de modèle n'est créé. L'assistant reste déterministe : ne pas le présenter comme une IA générale ou un agent actif 24/7.

## Registre serveur ajouté

| Outil | Module | Entrée stricte | Sortie / effet | Autorisations |
|---|---|---|---|---|
| CUSTOMER_SEARCH | Customer Service | query, 2–100 caractères | 20 références internes maximum, total exact | omega, crm.read |
| VISITS_ON_DATE | Dispatch | date, endDate optionnelle exclusive, statut ALL/UNCONFIRMED/CANCELLED | Références de visites et clients ; dates Toronto ; période bornée | omega, crm.read, dispatch |
| CALLBACKS | Sales | aucun paramètre métier | Rappels échus, propriétaire filtré côté serveur, contacts interdits exclus | omega, crm.read, leads.read ; leads.all pour le périmètre global |
| COMMISSIONS | Finance | année 2000–2100 | Calcul existant SIGNED_HT_ANNUAL_V1, ventes signées HT, rétroactivité annuelle ; aucun versement | omega, crm.read, sales.write ; règles de visibilité du leaderboard conservées |
| TASK_CREATE | Administration | title, clé idempotente | Proposition persistante ; création d'une tâche interne uniquement après approbation | omega, crm.read, crm.write |

Les entrées sont validées par Zod strict : aucun nom d'outil arbitraire, script, SQL ou shell n'est transmis à un exécuteur. Les résultats métier proviennent de requêtes typées/bornées ; les lectures de listes utilisent un snapshot RepeatableRead et un tri stable. Les noms et contenus de dossiers restent des données affichées par React, jamais des instructions de l'interpréteur. Un filtre textuel d'injection n'est pas la frontière de sécurité : les permissions et la liste fermée des outils le sont.

## Modules existants conservés

| Module | Chemin réel | Limite |
|---|---|---|
| Sales | sales-followups.ts, CALLBACKS | suivis soumis aux règles et approbations existantes |
| Dispatch | worker.ts, day-analysis.ts, VISITS_ON_DATE | propositions ; pas de déplacement automatique de rendez-vous confirmés |
| Customer Service | CUSTOMER_SEARCH, dossiers CRM | pas d'interprétation générale des plaintes |
| Finance | assistant impayés existant, COMMISSIONS | aucune transaction/remboursement automatique |
| Communications | CommunicationFollowUps et RotorInboxService | supervision existante ; pas d'envoi externe par ce registre |
| Quality Control | supervisor.ts, contrôle de sources périmées | règles déterministes ; pas d'audit IA général |
| Analytics | operations.ts, métriques et leaderboard | calculs existants ; pas de générateur universel de rapports |
| Administration | TASK_CREATE et tâches internes | propriétaire actuel seulement ; pas encore d'assignation à un autre employé |

## Approbation et persistance

Tables nouvelles : OmegaEngineOperation et OmegaInternalTask, avec lien FK, clé unique (actorId,key) et index. La création d'une proposition n'exécute rien. Le contrôle `omega-engine-internal` est désactivé par défaut. Un administrateur humain peut autoriser ou arrêter les nouvelles mutations depuis la console. Ce contrôle est propre aux tâches internes ; les arrêts du superviseur et du dispatch existants restent distincts.

Exécution : autorisation serveur actuelle, propriété de l'opération, approbation explicite, verrou transactionnel partagé avec l'arrêt, expiration à 24 h. Tâche, résultat et audit sont enregistrés dans une seule transaction. Deux approbations concurrentes donnent le même taskId. Après perte de réponse, répéter la même requête retrouve le résultat persistant ; une interruption avant commit ne laisse pas une demi-action. Maximum 20 nouvelles propositions créées sur 24 h par acteur. Les propositions expirées sont conservées dans l'historique sans être exécutables. Historique personnel limité aux 50 dernières opérations ; ne pas le présenter comme un export exhaustif.

La clôture est une déclaration humaine explicite, auditée `OMEGA_TASK_DONE_BY_HUMAN` ; elle ne prétend pas que le système a exécuté le travail métier décrit dans le titre. Une instruction malveillante placée dans ce titre ne déclenche aucun outil supplémentaire.

API : GET /api/omega/engine/tools, GET /history ; POST /read, /prepare, /execute, /complete, /control. Tous les chemins exigent la session et les permissions existantes. Un acteur OMEGA ne peut pas approuver ou clôturer lui-même une tâche via ce moteur.

## Niveaux et infrastructure

1. Lecture/analyse : outils de lecture et assistant métier existant.
2. Proposition : brouillons de tâches, plans et suivis existants.
3. Exécution : tâches internes explicitement approuvées seulement, moteur désactivé par défaut.
4. Workflows supervisés : moteurs existants de missions/dispatch ; aucune autonomie générale supplémentaire activée.

La queue persistante de dispatch possède retry, idempotence, états, backoff, dead-letter et arrêt. Le script worker existant doit réellement tourner, ou un scheduler autorisé doit l'appeler, pour traiter les cycles. La présence du code ne prouve pas son fonctionnement continu. Aucun scheduler de production ni fournisseur IA n'est configuré ou vérifié par ce lot.

## Limites assumées

Pas encore de moteur de langage général, conversations de chat persistantes (l'historique persistant ajouté concerne les opérations), analyse sémantique complète des plaintes, préparation libre de devis/courriels depuis le chat, revenus hebdomadaires, ventes d'un vendeur nommé, optimisation multi-véhicules ou orchestration autonome de tous les modules. Les demandes non reconnues restent dans les capacités déterministes existantes et ne deviennent pas des opérations sensibles. Les visites sans date ne figurent pas dans un rapport daté et cette exclusion est affichée.

Aucun SMS, appel, courriel, débit ou remboursement réel durant la validation. Ne pas annoncer « GODMODE complet », « IA connectée », « 24/7 » ni « livré en production » sur la seule base des tests locaux.
