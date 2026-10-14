# Avancement natif — 2026-10-14

Reprise de la branche demandée, sans perdre les commits précédents. Premier module native-operations inspecté avant modifications. Corrections : objectifs nuls le week-end, créneaux RESCHEDULED exclus de la journée et rendez-vous futurs limités aux visites réellement confirmées/planifiées.

Ajout Dispatch indépendant de Rotor : snapshot PostgreSQL, compteurs exacts, file paginée de 25 dossiers, contrats actifs pour visites sans créneau, file distincte FAILED/NO_ACCESS/NEEDS_FOLLOWUP, objectifs par technicien. Lecture CRM obligatoire côté API ; l’ouverture d’un dossier utilise les droits de modification existants. Pas de réservation, message ou calcul routier automatique.

Navigation : Messages Rotor ne figure plus deux fois ni dans les fonctions natives principales ; les outils d’import et archives sont conservés. Nouvelle entrée Dispatch dans Opérations.

Audit navigateur initial : création/modification client, site, contrat, prestation, visite, technicien et créneau réussis avant l’assertion finale. L’assertion attendait un courriel effacé sous forme chaîne vide ; la base stocke NULL conformément au service. Attente corrigée, parcours complet à repasser.

Compilation de production réussie. Parcours natif complet : 17 contrôles navigateur réussis, sans erreur JavaScript, fixtures propres nettoyées. Contrats signés : six contrôles navigateur réussis, deux passages PENDING distincts et PDF conservé ; aucun encaissement.

Finances natives : 17 contrôles navigateur réussis, zéro erreur JavaScript. Paiements manuels synthétiques, contrepassation, impayés, dépenses corrigées, CSV et PDF vérifiés ; aucun mouvement Stripe réel.

## Deuxième lot : sauvegarde atomique des interventions

116 tests serveur réussis, zéro ignoré ; compilation finale réussie. Deux nouveaux tests : droits/prix immuables puis transaction PostgreSQL (transition invalide sans écriture ni audit, créneau obligatoire, version obsolète, concurrence, report explicite et annulation malgré technicien/contrat inactifs). Le formulaire utilise un endpoint de sauvegarde unique ; les API existantes restent disponibles.

22 contrôles navigateur natifs réussis, zéro erreur JavaScript. Le parcours vérifie l’absence de notes/audit partiellement enregistrés après transition interdite, le report qui libère le créneau et la confirmation humaine sans planification automatique. Les champs vidés sont transmis comme NULL. Aucune communication ou facture générée par cette correction.

## Troisième lot : synthèse financière PostgreSQL

Remplacement du chargement de toutes les factures/lignes/clients/paiements du dashboard par des agrégats PostgreSQL en snapshot. Totaux CAD en centimes, paiements contrepassés exclus des reçus nets, 14 jours de mouvements maximum, dates Toronto. Les factures d’autres devises sont exclues explicitement plutôt que converties ou mélangées.

Deux tests ciblés réussis : droits avant lecture et registre réel PostgreSQL avec paiements partiels, contrepassations, brouillons/annulations, devise étrangère, exclusion de Stripe PAID_TEST, limite de dates et absence d’exposition des dossiers. TypeScript réussi. Compilation finale et vérification navigateur du dashboard réussies avec le lot leaderboard.

## Quatrième lot : commissions et classement

Politique explicitement confirmée par l’utilisateur : ventes signées hors taxes après remises ; année civile, du 1er janvier au 1er janvier suivant à Toronto ; taux rétroactif appliqué à toute l’assiette annuelle du vendeur (20/25/30/35/40 % aux seuils 0/100/200/300/400 k CAD). Arrondi HALF_UP au centime en arithmétique entière. Calcul uniquement, aucun paiement de commission créé.

Leaderboard paginé de 25 vendeurs, rangs ex æquo, compteurs complets et comptes historiques inactifs conservés. Classement global avec sales.write + leads.all + finance ; sinon seules les données personnelles sont consultables. Les ventes sans attribution sont signalées au superviseur et ne sont pas attribuées arbitrairement au créateur. Seuls les accords natifs SIGNED avec date d’accord dans la période sont inclus ; archives Rotor, devis et paiements ne sont pas des ventes signées dans cette assiette.

Validation finale : 121 tests serveur réussis, zéro ignoré ; compilation et TypeScript réussis. Trois tests commissions couvrent seuils, centimes, droits, changement d’année Toronto, ex æquo, exclusions, chiffres personnels et absence d’écriture. Sept groupes navigateur leaderboard réussis (API, montants, année, mobile, vendeur privé/rechargement, anonyme, absence de paiement). La préparation initiale d’un compte de fixture sans leads.read a été refusée conformément aux restrictions ; la fixture a été corrigée sans modifier ces restrictions.

Régressions finales : 23 groupes natifs CRM/Dispatch/dashboard, 17 finances, six contrats signés, dix OMEGA et 14 Superhub réussis, zéro erreur JavaScript. Avec les sept leaderboard, 77 groupes navigateur validés. Deux inspections Stripe du Superhub sont simulées ; aucun appel fournisseur réel. Les anciens parcours de finance/contrats conservent leurs fixtures synthétiques uniquement dans la base navigateur ; les nouveaux parcours nettoient leurs propres fixtures.

## Finition : états guidés et dossiers terminaux

Le formulaire propose uniquement l’état courant et les transitions autorisées. Les visites annulées/terminées sont consultables en lecture seule. Le serveur conserve ses contrôles : le test navigateur falsifie un état dans la requête et vérifie le refus sans changement de notes ni audit.

Compilation finale réussie, 25 contrôles natifs navigateur réussis et dix contrôles OMEGA repassés, zéro erreur JavaScript. Deux contrôles natifs supplémentaires vérifient absence d’option interdite et lecture seule d’une visite annulée. Bilan de couverture navigateur de la livraison : 79 groupes (25 natifs, 7 leaderboard, 17 finance, 6 contrats, 10 OMEGA, 14 Superhub), chaque groupe compté une seule fois. Suite serveur : 121 réussis. Production inchangée.

## Intégration des changements distants

La branche distante a avancé jusqu’à 63c9aba avec l’archive historique Rotor. Fusion conservatrice sans conflit : fonctions natives et outils d’export préservés. Garde-fous ajoutés : noms d’outils réellement allowlistés, répertoire privé lié au projet, noms de lots sans traversée, diagnostics sans messages bruts de fournisseur ou de base.

Dernière validation après fusion : 123 tests serveur réussis, zéro ignoré ; compilation de production et TypeScript réussis. Les 25 contrôles natifs et sept du leaderboard ont été repassés sur ce build, sans erreur JavaScript. La couverture navigateur métier de la livraison reste 79 groupes, sans recompter les répétitions. Aucun fichier private-exports suivi par Git et aucun export réel exécuté. L’archive externe complète n’est pas déclarée VERIFIED.

## Endpoint d’archive facultatif préservé et protégé

Changement distant 0f85058 fusionné sans écrasement. Endpoint authentifié d’archive en lecture seule conservé ; contrôle CRM/intégrations/export et droits additionnels par catégorie (finance, employés, pins/prospects globaux, devis). Codes d’erreur bornés et erreurs de validation retournées en 400. Aucune donnée réelle demandée.

Validation finale : 124 tests serveur réussis, zéro ignoré ; compilation finale et TypeScript réussis. Trois contrôles HTTP d’archive (anonyme refusé, catégorie inconnue refusée, intervalle invalide refusé avant transport) réussis sans appel externe ni enregistrement exporté. Couverture totale de livraison : 82 groupes navigateur/HTTP, sans compter deux fois les répétitions. Le job CI remet à zéro les seuls compteurs de connexion de proclair_browser_test entre suites, pour isoler les fixtures en conservant la limite réelle de connexion ; jamais pendant un test de cette limite. Exécution CI distante non certifiée.

## Superviseur OMEGA — livraison du 14 octobre 2026

Quatre scénarios configurables, missions PostgreSQL persistantes, reprise par curseur, déduplication, validation humaine et arrêt sont livrés. Migration additive `20261014030000_omega_supervisor`. Suite serveur : 127 réussites sans tests ignorés ; compilation finale réussie ; 20 groupes navigateur OMEGA réussis. Voir [le parcours et ses limites](OMEGA_SUPERVISOR.md). Les publications sur main sont désormais autorisées par les demandes ultérieures de déploiement ; les mentions historiques de main inchangée décrivent les étapes précédentes.

## Cockpit OMEGA — amélioration du 14 octobre 2026

Indicateurs sur toute la file autorisée, tri global des urgences, recherche littérale et filtres serveur, décisions groupées atomiques (25 maximum), analyse continue avec pause et plafond de vingt cycles. Les brouillons de configuration survivent à la recherche ; une modification concurrente bloque leur enregistrement. Migration additive `20261014031000_omega_mission_priority`. Validation : 127 tests serveur, compilation finale et 28 groupes navigateur OMEGA réussis. Les tests de pause et plafond utilisent un transport simulé ; aucun fournisseur externe appelé.

## Fiches de missions OMEGA — 14 octobre 2026

Explication de la règle, vérification actuelle de la source et chronologie de décisions avec droit audit ajoutées. Lecture seule et projection limitée des événements ; notes et décisions restent privées. Navigation clavier/mobile vérifiée, formulaire de décision mis au premier plan. Validation : 127 tests serveur, compilation finale et 32 groupes navigateur OMEGA. Aucune migration ou clé nouvelle. Le statut Vercel Ready reste à confirmer après publication main. Voir `OMEGA_SUPERVISOR.md`.
