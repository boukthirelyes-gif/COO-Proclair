# Validation de la première tranche V20

Exécutée le 9 octobre 2026. Résultats de cette instance ; aucune publication, restauration dans une nouvelle tâche ou fidélité Rotor certifiée.

| Contrôle | Résultat réel |
|---|---|
| Installation reproductible `bash scripts/setup.sh` | Réussie : npm ci, génération Prisma JS, migrations répétables, seed idempotent, import legacy, build et sauvegarde |
| TypeScript | Réussi |
| Build Next.js production | Réussi |
| Tests TypeScript avec PostgreSQL séparé | 18 exécutés, 18 réussis, 0 ignoré |
| Prototype Python conservé | 3 exécutés, 3 réussis |
| Parcours Chromium | 18 étapes validées, aucun événement pageerror |
| Mobile | Parcours 390×844 et capture inspectée ; Safari non exécuté |
| Backup PostgreSQL | Dump custom restauré dans `proclair_restore_test`; comptes techniciens, clients et migrations identiques |
| Instance principale | Connexion, état, base PostgreSQL et worker vérifiés ; 3 techniciens configurés, 0 client et 0 visite fictifs |
| OMEGA | Aperçu, application idempotente, conflits, permissions, worker concurrent, retry, dead-letter, kill switch et ouverture du plan testés |
| Rotor MCP / site | CONNECT HTTP 403 du proxy ; capacités, authentification et fidélité inconnues |
| Audit dépendances runtime | 0 vulnérabilité signalée par npm audit ; ce contrôle ne certifie pas toute la sécurité de l’application |

Le parcours navigateur a créé les données uniquement dans `proclair_browser_test` : connexion, client, site, contrat, prestation, visite confirmée, proposition OMEGA, approbation et affectation, modification de notes, fiche client persistante par URL, journal, activation du worker, mise en file, traitement hors navigateur, ouverture du plan, désactivation et interface mobile.

Les tests métier contrôlent transitions, horaires Toronto, durée, week-end, capacité de base, passage unique, concurrence de version, conflit de technicien et rollback, audit, idempotence et interdiction de confirmation par OMEGA. Le worker utilise un schéma de test propre et vérifie désactivation par défaut, permission ADMIN, déduplication, concurrence, persistance des plans et trois essais avant dead-letter.

Problèmes corrigés pendant cette validation : moteur Rust Prisma indisponible remplacé par le mode JavaScript officiel, origine navigateur distincte du hostname interne Next, libellés accessibles des selects, isolation de la file worker et conflits de sérialisation sans consommation des tentatives métier.

## Non validé ou non livré

Pas de 1 500 tests, pas de référence visuelle Rotor, pas de test Safari, pas d’intégration externe opérationnelle. Les marges de déplacement sont fixes et ne vérifient ni circulation ni consentement client. SMS, courriels, finances, commissions V10, cartes, optimisation de routes, modèle IA, multi-utilisateurs et déploiement public restent ouverts. Les mutations de visites sont auditables mais les autres objets sont actuellement créables et consultables, sans édition complète. Le calendrier n’a pas encore le glisser-déposer ni une vue dispatch cartographique.

Les commits sont locaux dans le checkout. Aucun push GitHub ni activation d’une version publiée n’a été effectué. La conservation/restauration des commits locaux dans une nouvelle tâche n’a pas été testée ; les volumes Docker exigent une sauvegarde restaurable depuis le workspace.
