# Reprise native V2000

1. Inspecter Git et reprendre feature/proclair-native-operations-20261014. Ne pas remplacer le projet ni écrire sur main/production.
2. Lire les quatre rapports natifs et vérifier les résultats réellement exécutés.
3. Sauvegarde atomique champs/état des interventions livrée et vérifiée. Prochaine priorité : réduire le chargement global et développer les fonctions manquantes.
4. Valider clients, contrats signés, visites et finances sur proclair_browser_test ; tester le serveur sur proclair_test. Redémarrer les seuls serveurs démarrés ici après compilation.
5. Conserver imports Rotor, sessions, données et migrations. Fournisseurs réels absents : poursuivre les opérations natives sans attendre les clés.
6. Routes routières, commissions et moteur événementiel restent à développer ; ne pas activer d’autopilot externe ni présenter une interface comme une connexion active.

Dernier état : quatre lots natifs livrés, dont leaderboard annuel conforme aux réponses utilisateur. 121 tests serveur et 77 groupes navigateur réussis, compilation finale réussie. Méthode commissions fixée sur ventes signées HT, rétroactive par vendeur, année civile Toronto. Les ventes sans propriétaire ne doivent jamais être attribuées à partir de createdBy.

Prochaine priorité indépendante des secrets : pagination/recherche des listes CRM et réduction de /api/state, attribution restreinte des conversations, disponibilités individuelles, puis moteur événementiel supervisé. Contrôler les versions et conserver l’approbation humaine des affectations. Préparer une Preview distante seulement quand des accès réels sont disponibles ; production inchangée.

Finition livrée : transitions guidées dans l’éditeur et visites terminales en lecture seule, avec refus serveur des requêtes falsifiées. Dernière couverture : 121 tests serveur et 79 groupes navigateur. L’assiette et les paliers annuels du leaderboard sont confirmés ; ne pas les remplacer par des encaissements ou un calcul progressif.

Point final : changements distants jusqu’à 63c9aba fusionnés sans perdre les opérations natives. Export historique facultatif conservé et durci, mais aucune récupération réelle exécutée. 123 tests serveur réussis, compilation réussie et couverture navigateur de 79 groupes. Reprendre ce point, pas un ancien HEAD de la branche.

Point final après intégration de 0f85058 : endpoint d’archive historique facultatif conservé et protégé par catégorie. 124 tests serveur réussis, compilation finale réussie et couverture de 82 groupes navigateur/HTTP. Aucun export réel exécuté, aucune Preview distante vérifiée, aucune modification de main ou production. Reprendre les commits de cette branche et les TODO du plan.

## État récent : superviseur OMEGA

Le moteur de missions et ses quatre scénarios sont livrés, avec 127 tests serveur, compilation finale et 20 groupes navigateur OMEGA validés. Lire `OMEGA_SUPERVISOR.md`. Vérifier Ready en production puis activer explicitement les scénarios ; aucun fournisseur externe n’est activé. Restent notamment les trajets routiers réels, la téléphonie avancée, le modèle de langage et les opérations financières de production. Ne pas annoncer ces fonctions comme terminées.

## Dernier cockpit validé

127 tests serveur, build final et 28 groupes navigateur OMEGA réussis. Recherche/filtres, indicateurs globaux, urgences, approbation/rejet groupés atomiques et analyse continue sont livrés. Les réglages locaux non enregistrés sont conservés et protégés contre les conflits de version. Aucune action externe, activation automatique ou nouvelle clé. Lire `OMEGA_SUPERVISOR.md` avant les prochains changements ; ne pas confondre analyse de missions et exécution du travail client.
