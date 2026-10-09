# Validation des quatre premières tranches V20

Exécutée le 9 octobre 2026. Résultats de cette instance ; aucune publication, restauration dans une nouvelle tâche ou fidélité Rotor certifiée.

| Contrôle | Résultat réel |
|---|---|
| Installation reproductible `bash scripts/setup.sh` | Réussie : npm ci, génération Prisma JS, migrations répétables, seed idempotent, import legacy, build et sauvegarde |
| TypeScript | Réussi |
| Build Next.js production | Réussi |
| Tests TypeScript avec PostgreSQL séparé | 26 exécutés, 26 réussis, 0 ignoré |
| Prototype Python conservé | 3 exécutés, 3 réussis |
| Parcours Chromium | 23 étapes CRM/OMEGA + 17 étapes financières validées sur le build de production, aucun événement pageerror |
| Mobile | Parcours 390×844 et capture inspectée ; Safari non exécuté |
| Backup PostgreSQL | Dump custom restauré dans `proclair_restore_test`; comptes techniciens, clients et migrations identiques |
| Instance principale | Connexion, état CRM et financier, base PostgreSQL et worker vérifiés ; 3 techniciens configurés, 0 client, 0 visite, 0 facture et 0 paiement fictifs |
| OMEGA | Aperçu, application idempotente, conflits, permissions, worker concurrent, retry, dead-letter, kill switch et ouverture du plan testés |
| Rotor MCP / site | CONNECT HTTP 403 du proxy ; capacités, authentification et fidélité inconnues |
| Audit dépendances runtime | 0 vulnérabilité signalée par npm audit ; ce contrôle ne certifie pas toute la sécurité de l’application |

Le parcours navigateur a créé les données uniquement dans `proclair_browser_test` : connexion, client, site, contrat, prestation, visite confirmée, proposition OMEGA, approbation et affectation, modification de notes, affichage semaine et mois, fiche client persistante par URL, journal, activation du worker, mise en file, traitement hors navigateur, ouverture du plan, désactivation et interface mobile.

Les tests métier contrôlent transitions, horaires Toronto, durée, week-end, capacité de base, passage unique, concurrence de version, conflit de technicien et rollback, audit, idempotence et interdiction de confirmation par OMEGA. Le worker utilise un schéma de test propre et vérifie désactivation par défaut, permission ADMIN, déduplication, concurrence, persistance des plans et trois essais avant dead-letter.

Problèmes corrigés pendant cette validation : moteur Rust Prisma indisponible remplacé par le mode JavaScript officiel, origine navigateur distincte du hostname interne Next, libellés accessibles des selects, isolation de la file worker et conflits de sérialisation sans consommation des tentatives métier.

## Non validé ou non livré

Pas de 1 500 tests, pas de référence visuelle Rotor, pas de test Safari, pas d’intégration externe opérationnelle. Les marges de déplacement sont fixes et ne vérifient ni circulation ni consentement client. SMS, courriels, encaissement externe, PDF serveur et envoi de factures, commissions V10, cartes, optimisation de routes, modèle IA, multi-utilisateurs et déploiement public restent ouverts. Les clients et contrats sont maintenant modifiables avec version et audit. Sites, prestations et techniciens restent sans édition complète. Le calendrier n’a pas encore le glisser-déposer ni une vue dispatch cartographique.

Les commits sont locaux dans le checkout. Aucun push GitHub ni activation d’une version publiée n’a été effectué. La conservation/restauration des commits locaux dans une nouvelle tâche n’a pas été testée ; les volumes Docker exigent une sauvegarde restaurable depuis le workspace.

## Tranche financière

Migration additive des factures, lignes, paiements, contrepassations et compteur de numérotation, puis migration de précision des taux sans modifier les migrations déjà appliquées. Les tests isolés valident centimes exacts, arrondi par ligne, taux fractionnaires (997,5 bps), doublons, concurrence, facture/client/contrat cohérents, factures émises immuables, solde recalculé et permissions humaines.

Le parcours Chromium financier vérifie brouillon, édition, émission, paiement partiel, rejet du dépassement de solde, paiement complet, contrepassation, persistance après rechargement, annulation du brouillon et export CSV contenant le vrai client et les montants exacts. Cas vérifié : 2 × 10 000 cents à 997,5 bps donne 1 995 cents de taxe, total 21 995 cents. Aucun débit ni remboursement externe n’est simulé.

Corrections supplémentaires : conservation de la navigation en mode React Strict lors du rechargement, soumission des seuls champs éditables des contrats, récupération après conflit de version et protection des CSV contre les formules. Assets du prototype déplacés sous legacy/static, sans changer ses URLs de service ni ses données ; ses trois tests restent réussis.

## Tranche dépenses

Les 25 tests TypeScript restent réussis avec des contrôles supplémentaires dans le test de registre financier isolé : dépense positive, date réelle, idempotence concurrente, conflit de clé, interdiction OMEGA, correction administrateur, version et conservation de l’original avec deux événements d’audit. Typecheck et build production réussis.

Le parcours financier de 15 étapes a été exécuté sur le nouveau build : saisie d’une dépense de 12 345 cents, rechargement, export CSV, annulation motivée et diminution exacte du total de dépenses actives. Aucun événement pageerror. Le solde présenté est encaissements nets moins dépenses payées enregistrées, toutes dates confondues ; aucune prétention de bénéfice comptable, de solde bancaire ou de crédit de taxes récupérable. Les justificatifs ne sont pas téléversés. Nouvelle sauvegarde PostgreSQL créée après migration additive ; sa restauration dans une nouvelle tâche n’est pas certifiée.

## Documents imprimables

Le parcours financier complet de 17 étapes passe sur le build de production, sans pageerror : ouverture du document depuis la facture, numéro réel, styles d’impression masquant les commandes, génération d’un PDF A4 valide par Chromium et accès anonyme refusé (401). Un test de rendu vérifie échappement des champs HTML, montants et taux fractionnaire, date d’émission Toronto, mentions brouillon/annulation et absence de solde demandé pour ces états. Réponse privée no-store, CSP restrictive et protection contre l’encapsulation dans un iframe.

Il s’agit d’une impression navigateur ; aucun PDF serveur archivé ou courriel envoyé. Les coordonnées légales et numéros fiscaux de l’émetteur restent à configurer. Les coordonnées du client et les paiements sont les données actuelles, pas une archive de l’état au moment de l’émission.
