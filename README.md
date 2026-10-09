# PROCLAIR OS — première tranche opérationnelle OMEGA

Application Next.js / React / TypeScript avec PostgreSQL et Prisma en mode moteur JavaScript. Le prototype Python initial reste disponible avec `python3 app.py` ; ses fichiers et sa base SQLite sont conservés. Le nouveau CRM utilise le même dépôt et migre les données historiques sans les effacer.

## Fonctions livrées

- Clients et contrats modifiables avec version et audit ; fiches clients, propriétés desservies et prestations distinctes.
- Visites avec passage unique par contrat, prix en centimes, états explicites et versions.
- Calendrier jour par technicien, semaine et mois, horaires de Toronto.
- Affectation et modification avec validation de durée, heures ouvrables, chevauchements et capacité.
- Damien, Ricardo et Lucas : lundi–vendredi 08–17h, objectif quatre visites, deux le vendredi.
- OMEGA Fill : aperçu persisté, vérification des versions, approbation humaine et application transactionnelle idempotente.
- Worker PostgreSQL : propositions toutes les quinze minutes, file durable, verrou concurrent, trois essais avec temporisation, file d’échec et arrêt d’urgence. Désactivé au départ.
- Session administrateur signée, cookie HttpOnly, contrôle d’origine des mutations et audit.
- Factures brouillons modifiables, émission numérotée, paiements manuels partiels/complets, contrepassations conservées et export comptable CSV.
- Calcul exact des taxes explicites jusqu’à 0,001 point de base, sans appliquer de taux légal supposé. OMEGA peut préparer un brouillon ; les actions financières définitives restent humaines.

OMEGA utilise un planificateur déterministe ; aucun modèle de langage n’est connecté. Il ne confirme pas seul les visites et ne contacte aucun client. Une marge fixe de trente minutes entre visites ne constitue pas une optimisation des trajets routiers.

## Installation locale

Node.js 24, Python 3.12 pour la migration historique, Docker pour la base locale. Chaque tâche cloud est isolée : réutiliser le checkout, sans worktree sauf demande explicite.

```sh
cd /workspace/COO-Proclair
node scripts/local-config.mjs
bash scripts/db-start.sh
npm ci --cache /workspace/.npm-cache
npm run db:generate
npm run db:migrate
npm run db:seed
npm run legacy:migrate
npm run build
npm start
```

`npm run worker` démarre séparément les propositions sans navigateur. Activez-le dans Omega. Serveur local : port 3000 ; PostgreSQL : port 5433. Développement : `npm run dev -- --webpack`.

`local-config.mjs` crée `.env` uniquement si absent : mot de passe administrateur et secret de session aléatoires, non affichés et ignorés par Git. Configurez `PROCLAIR_ADMIN_PASSWORD` (12 caractères minimum), `PROCLAIR_SESSION_SECRET` (32 minimum) et `DATABASE_URL` dans votre gestionnaire de secrets avant déploiement. Aucun mot de passe par défaut n’est exposé dans l’interface. Derrière un reverse proxy HTTPS, définir `PROCLAIR_PUBLIC_ORIGIN` avec l’origine exacte.

La base Docker utilise des identifiants de développement et une écoute locale. En production, fournir PostgreSQL géré, TLS, comptes utilisateurs et permissions adaptées ; ne pas exposer cette base Docker sur Internet.

Les migrations SQL sont dans `prisma/migrations`. Le runner applique seulement les migrations nouvelles, sous verrou et transaction, avec SHA-256 pour celles déjà appliquées. Aucun reset destructif. Le client est généré depuis les paquets officiels Prisma vérifiés par le verrou npm ; aucun moteur Rust ni contournement TLS/checksum n’est nécessaire.

## Sauvegardes

`bash scripts/db-backup.sh` écrit une sauvegarde vérifiée dans `.local/backups`. Les volumes Docker ne sont pas présumés inclus dans un snapshot cloud. Sauvegarder avant publication et migrations importantes. Sur une nouvelle instance, lancer la base puis, **avant les migrations**, restaurer avec `bash scripts/db-restore-empty.sh .local/backups/NOM.dump`. Le script refuse une base non vide. L’import SQLite lit sans modifier l’original et conserve ID, entreprise, statut, notes et tâches. Les tâches historiques ne sont pas encore exposées dans la nouvelle interface.

## Validation

```sh
npm run typecheck
npm test
python3 -m unittest discover -s tests -v
```

Sans `TEST_DATABASE_URL`, les tests PostgreSQL sont explicitement ignorés. Pour tout valider, préparer une **base de test séparée**, y appliquer les migrations et fournir son URL :

```sh
DATABASE_URL="$TEST_DATABASE_URL" node scripts/migrate.cjs
npm test
```

Le parcours Chromium utilise une instance séparée au port 3001. `E2E_DATABASE_URL=URL_DE_L_INSTANCE_TEST npm run test:e2e` vérifie connexion, création client/site/contrat/prestation/visite, planification Omega, modification, navigation persistante, audit et mobile. Il crée des dossiers de test : ne pas l’exécuter sur la base opérationnelle. La CI vérifie types, tests PostgreSQL et build. Le second parcours `E2E_DATABASE_URL=URL_DE_L_INSTANCE_TEST npm run test:finance:e2e` valide création et modification de brouillons, émission, paiements, contrepassation, taux décimaux et contenu réel du CSV.

## Limites V20

Voir [l’inventaire Rotor](docs/rotor-interface-inventory.md). Aucun écran Rotor ni cahier V10 fourni. MCP et site Rotor bloqués par le proxy : aucune capacité API ou synchronisation vérifiée. `LOCAL_ONLY` identifie les dossiers locaux ; aucune synchronisation simulée.

Facturation et paiements manuels sont disponibles. Encaissement bancaire, PDF et envoi des factures, commissions V10, dépenses/profitabilité, cartes, territoires, optimisation routière, communications et modèle IA restent à implémenter. Le déploiement public Safari et les comparaisons Rotor nécessitent les références et intégrations autorisées. La cible de 1 500 tests n’est pas atteinte ; résultats réels dans `docs/validation.md`.
