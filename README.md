# CRM Proclair — déploiement Vercel

Le projet existant est prêt à être importé depuis GitHub dans Vercel. Consultez [le guide de déploiement](docs/deploy-vercel.md) et [.env.example](.env.example) pour les six variables nécessaires, PostgreSQL, OMEGA et OAuth Rotor. Le déploiement distant reste à effectuer avec votre compte et votre base.

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

Le parcours Chromium utilise une instance séparée au port 3001. `E2E_DATABASE_URL=URL_DE_L_INSTANCE_TEST npm run test:e2e` vérifie connexion, création client/site/contrat/prestation/visite, planification Omega, modification, navigation persistante, audit et mobile. Il crée des dossiers de test : ne pas l’exécuter sur la base opérationnelle. La CI vérifie types, tests PostgreSQL et build. Le second parcours `E2E_DATABASE_URL=URL_DE_L_INSTANCE_TEST npm run test:finance:e2e` valide création et modification de brouillons, émission, paiements, contrepassation, taux décimaux, dépenses payées, annulation des écritures, calcul de trésorerie enregistrée et contenu réel du CSV.

## Limites V20

Voir [l’inventaire Rotor](docs/rotor-interface-inventory.md). Aucun écran Rotor ni cahier V10 fourni. MCP et site Rotor bloqués par le proxy : aucune capacité API ou synchronisation vérifiée. `LOCAL_ONLY` identifie les dossiers locaux ; aucune synchronisation simulée.

Facturation, paiements manuels et dépenses payées sont disponibles, avec audit, correction conservant les écritures et exports CSV. Encaissement bancaire, PDF serveur et envoi des factures, commissions V10, profitabilité comptable, cartes, territoires, optimisation routière, communications et modèle IA restent à implémenter. Le déploiement public Safari et les comparaisons Rotor nécessitent les références et intégrations autorisées. La cible de 1 500 tests n’est pas atteinte ; résultats réels dans `docs/validation.md`.

La liste des factures propose **Imprimer / PDF** : document HTML authentifié avec lignes, taxes, paiements nets et solde. Le navigateur permet l’enregistrement en PDF. Les brouillons et annulations sont marqués. Les coordonnées légales et inscriptions fiscales de l’émetteur ne sont pas encore configurées ; les coordonnées du client et le solde sont lus à la consultation. Aucun envoi automatique ni PDF serveur archivé.

## Rotor dans le CRM

La page **Intégrations** prépare une connexion OAuth Rotor depuis le CRM. Configurez `PROCLAIR_PUBLIC_ORIGIN=https://votre-domaine` et un proxy HTTPS, puis redémarrez. Le retour enregistré est `/api/integrations/rotor/callback`. Le bouton enregistre un client OAuth chez Rotor puis demande clients, prestations, visites et factures en lecture seule avec PKCE S256 et offline_access pour le renouvellement. Aucune adresse ni compte Proclair n’est supposé.

Les jetons sont chiffrés AES-256-GCM dans PostgreSQL, avec une clé dérivée du secret de session. Préservez la base et ce secret ensemble ; le système de fichiers n’est plus utilisé pour la persistance OAuth. Le dossier `.local/rotor` historique peut être migré sans publier ses fichiers. Un changement de secret rend les autorisations stockées illisibles. Le retour OAuth est limité à dix minutes et à une utilisation, avec cookie HttpOnly Secure SameSite=Lax. L’administration du CRM reste requise pour commencer la connexion, découvrir les outils et déconnecter localement. Les connexions, renouvellements manuels, révocations et déconnexions aboutis sont audités sans jetons.

Après autorisation, **Découvrir les outils disponibles** initialise MCP et consulte `tools/list` ; aucun `tools/call` ni import métier n’est exécuté. La découverte parcourt jusqu’à 20 pages et 1 000 outils, conserve leurs schémas de paramètres et signale une liste partielle. Les réponses JSON ou SSE sont contrôlées et limitées à 1 Mo. Les accès sont renouvelés avant expiration lors de la découverte, si Rotor a fourni un refresh token. Les rotations sont chiffrées, sérialisées par verrou transactionnel PostgreSQL entre instances, et les droits élargis sont refusés. Une panne temporaire ne supprime pas l’accès ; invalid_grant impose une reconnexion. Le bouton Renouveler permet aussi une demande manuelle. Le bouton Révoquer chez Rotor demande confirmation, invalide les jetons auprès du fournisseur puis supprime l’accès local après succès. La déconnexion locale seule ne révoque pas Rotor. Cette intégration est testée avec un serveur simulé ; la connexion au vrai compte Rotor et son inscription dynamique restent à valider sur une adresse publique.

Le stockage OAuth PostgreSQL persiste entre déploiements et prend un verrou distribué pour les rotations. Les scopes accordés et les jetons réels restent à valider chez Rotor.

Améliorations OMEGA : compteurs persistés de la file, traitement manuel avec résultat visible et reprise administrateur des préparations en échec. Une reprise exige l’état et le nombre de tentatives attendus, refuse les dates passées et conserve l’ancien échec dans l’audit. Le tableau de bord affiche les visites actives à venir triées, l’avancement Toronto et les dossiers de suivi. Déconnexion disponible sur desktop et mobile.

## CRM indépendant de Rotor

Les opérations natives fonctionnent sans compte Rotor. Devis locaux (émission, décisions auditées, conversion unique en facture), impression/PDF et export JSON métier sont disponibles. Voir [l’état d’autonomie](docs/autonomie-proclair.md) pour les fonctions livrées et les fonctions restantes. Les données du miroir Rotor restent séparées des données natives.

La page Entreprise permet de gérer votre identité d’émetteur. Le portail client natif partage un devis ou une facture par lien privé expirant/révocable, affiche uniquement le document ciblé et consigne l’accord sur un devis. Identité de l’émetteur figée à émission ; aucun compte Rotor ni fournisseur de messagerie requis. Aucun paiement en ligne ni signature certifiée revendiqués.

Les comptes d’équipe, rôles et restrictions ainsi que la carte porte-à-porte sont natifs : consultez [le guide utilisateurs et prospection](docs/utilisateurs-prospection.md). Les vendeurs accèdent uniquement à leurs portes affectées ; les autorisations sont vérifiées côté serveur.

La livraison 0.2.0 ajoute le registre de capacités Rotor, le consentement progressif en lecture, les cinq catégories de pins Proclair et la page **Santé et compatibilité**. La [matrice de 512 capacités candidates](docs/ROTOR_PARITY_MATRIX.md) décrit la couverture réelle ; les [limites d’intégration](docs/INTEGRATION_LIMITATIONS.md) précisent les chemins non connectés. Le [modèle métier](docs/PROCLAIR_DATA_MODEL.md) identifie les écarts Service Plan → Job → Visit restant à corriger.

## Première tranche Proclair V30

La version 0.3.0 ajoute l’espace sombre regroupé, la recherche globale, les dossiers clients, l’import Rotor reprenable avec promotion client explicite et le parcours Service / Agree / Schedule. L’assistant OMEGA utilise des requêtes métier sur PostgreSQL. Aucun fournisseur Stripe/Twilio/courriel ni AUTOPILOT n’est connecté par cette livraison. [Rapport complet et point de reprise](docs/PROCLAIR_V30_OVERNIGHT_REPORT.md).

## Sécurité et équipe

Les profils, sessions révocables, MFA TOTP et invitations du CRM Next.js sont documentés dans [le guide de sécurité](docs/enterprise-security/README.md). Le prototype Python historique est une démonstration locale sans ce RBAC ; il ne constitue pas le backend sécurisé de l’entreprise.

Fondations SaaS pilotes (désactivées par défaut), isolation et checklist commerciale : [documentation SaaS](docs/saas/README.md). Aucune activation de facturation réelle.
