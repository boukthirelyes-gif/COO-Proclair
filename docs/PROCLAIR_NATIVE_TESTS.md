# Validation native V2000 — 2026-10-14

114 tests serveur réussis, zéro ignoré, PostgreSQL proclair_test avec schémas isolés. Trois nouveaux tests natifs : capacité week-end/créneaux retirés, permissions/validation avant accès DB et snapshot/pagination 26 dossiers en pages 25/1, compteurs exacts et invariance des visites/audits.

Nouveau parcours navigateur utilise proclair_browser_test, distinct de la base principale, et supprime ses propres clients/sites/contrats/visites/technicien. Aucun fournisseur externe contacté. Tests CRM A–F, persistance, dispatch, annulation, transfert de date et mobile : VERIFIED, 17 contrôles réussis, zéro erreur JavaScript. Compilation réussie. Contrats signés : six contrôles réussis, accord, PDF et passages distincts, aucun paiement. Le parcours historique conserve ses fixtures synthétiques uniquement dans la base navigateur.

Les connexions Stripe/Twilio réelles restent BLOCKED. Les tests du fournisseur utilisent les simulations ou événements signés synthétiques. Aucun objectif arbitraire de 2 000 tests revendiqué.

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
