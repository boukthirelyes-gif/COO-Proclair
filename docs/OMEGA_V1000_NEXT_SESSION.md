# OMEGA V1000 — point de reprise

1. Lire le plan, l'avancement et le rapport de tests de cette livraison ; inspecter Git avant toute modification.
2. Les branches SMS et Rotorlive ont été récupérées (e17a7ad et ed80979) : continuer leurs tests et leurs connexions autorisées plutôt que les réimplémenter.
3. Le thème sombre a été activé en cf82ea0 en conservant les styles récents. Ne pas fusionner les mises à jour majeures Dependabot sans migration et tests.
4. Les centres Stripe/SMS/appels, les liens dossiers et les brouillons locaux OMEGA sont implémentés : compilation et 13 groupes Superhub validés, puis améliorer les workflows supervisés selon le plan.
5. Suite serveur : 94 tests réussis, zéro ignoré ; TypeScript réussi. Compilation, 13 groupes navigateur Superhub, 11 groupes de régression fournisseurs et 3 tests Python réussis ; contrôle des secrets réussi. Vérifier la publication distante dans le rapport final.
6. Configurer Render via les paramètres privés et reprendre la même base/secret de session. Vérifier le nouveau domaine avant d'annoncer le CRM en ligne.
7. Après connexion réelle, tester les fournisseurs en lecture seule, découvrir les permissions Rotor et confirmer le propriétaire du numéro professionnel.

Ne jamais exécuter d'envoi, appel, portage ou débit réel pendant les tests. Ne pas présenter des archives Rotor ou PAID_TEST Stripe comme des encaissements natifs.

Les suivis persistants sont livrés et exportables. Prochain lot indépendant : attributions restreintes des conversations, puis capacité dispatch configurable et simulations. Ne pas recycler SalesFollowUp avec des types inconnus sans adapter son contrôle de sources.

Les deux nouvelles migrations communication_followups et communication_activity_indexes sont appliquées aux bases locales principale et navigateur. La base distante reste à migrer lors du déploiement autorisé. Le tableau OMEGA privilégie les suivis ouverts, affiche les sources obsolètes et autorise leur exclusion.
