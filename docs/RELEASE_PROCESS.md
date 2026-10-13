# Livraison

Chaque livraison part de l’état GitHub main vérifié, conserve les migrations appliquées et utilise une branche de fonctionnalité. La pull request doit préciser les changements concrets, contrôles exécutés et limites de production. Cette livraison vise une PR ; elle ne fusionne pas automatiquement dans main.

Contrôles requis : installation avec lockfile, génération Prisma, migrations additives, matrice canonique synchronisée, TypeScript, tests métier avec base isolée, build Next.js et scan de secrets. Les contrôles Playwright des parcours affectés utilisent une base séparée. Un scénario simulé n’est jamais présenté comme un test Rotor/Stripe réel.

Dependabot propose des mises à jour npm et GitHub Actions chaque semaine. Les paquets Prisma et React sont regroupés pour vérifier leur compatibilité ensemble. Les PR ne sont pas fusionnées automatiquement. Une mise à jour de schéma ou dépendance doit repasser les validations avant déploiement.

Le build Vercel de production vérifie les variables existantes, migre avec DIRECT_DATABASE_URL et compile. Les previews utilisent leurs propres credentials et ne migrent pas la production. La préparation locale, le push d’une branche, la PR, la fusion et la vérification d’un déploiement sont des états distincts.

Après déploiement autorisé : vérifier l’endpoint health, la connexion, les rôles, un parcours de consultation, les migrations et les tâches planifiées. Aucune mention « PRODUCTION_VERIFIED » ne doit être ajoutée sans preuve du déploiement concerné. Les statuts et la documentation sont mis à jour ensemble. Le registre de capabilities reste indépendant du rythme des releases.
