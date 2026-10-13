# Déployer le projet existant sur Vercel

Le dépôt contient le CRM Next.js déjà développé, son historique, les migrations PostgreSQL, OMEGA, la facturation, les paiements manuels, les dépenses et OAuth Rotor. Le prototype Python et les scripts d’import restent conservés ; Vercel héberge l’application Next.js, pas le serveur Python historique.

## 1. Préparer PostgreSQL

Créer une base PostgreSQL de production chez un fournisseur accessible depuis Vercel (par exemple Neon ou Supabase). Copier ses chaînes de connexion TLS officielles : URL de pool pour l’application et URL directe pour les migrations. Ne pas utiliser les adresses Docker/localhost ou les mots de passe de développement présents dans les tests et scripts locaux.

La base de développement locale, les sauvegardes et les données clients ne sont pas envoyées à GitHub. Si des dossiers réels y existent, effectuer une migration PostgreSQL séparée depuis une sauvegarde sécurisée, avant d’ouvrir la production aux utilisateurs. Sauvegarder la base distante avant les migrations ; activer les sauvegardes de son fournisseur. L’import du prototype est disponible dans les scripts conservés et ne s’exécute pas automatiquement sur Vercel.

## 2. Importer le dépôt

Dans Vercel : Add New → Project → importer `boukthirelyes-gif/COO-Proclair`. Racine : dépôt, framework Next.js, Node.js 24.x. Le fichier `vercel.json` fournit l’installation et la compilation ; ne pas renseigner un Output Directory personnalisé.

Installation : `npm ci --include=dev --ignore-scripts`. Le générateur Prisma JavaScript officiel est lancé explicitement par le build, sans téléchargement de moteur Rust. Compilation : `npm run vercel:build`.

Créer le projet, identifier son domaine stable `https://nom-du-projet.vercel.app`, puis configurer les variables ci-dessous et déployer/redéployer. Un domaine acheté n’est pas nécessaire : le domaine HTTPS Vercel peut servir au CRM et au retour OAuth. Utiliser le domaine stable, pas une URL temporaire de déploiement.

## 3. Variables Vercel

Configurer les valeurs dans Settings → Environment Variables, jamais dans Git ou dans le chat. Les placeholders de `.env.example` ne sont pas des identifiants utilisables.

| Variable | Valeur à fournir | Environnement |
|---|---|---|
| `DATABASE_URL` | URL PostgreSQL runtime, idéalement poolée, avec TLS fourni par l’hébergeur | Production ; base différente en Preview |
| `DIRECT_DATABASE_URL` | URL PostgreSQL directe, non poolée par transaction, pour migrations | Production uniquement |
| `PROCLAIR_ADMIN_PASSWORD` | Mot de passe administrateur privé et aléatoire, au moins 12 caractères | Production ; différent en Preview |
| `PROCLAIR_SESSION_SECRET` | Secret aléatoire stable, au moins 32 caractères ; signe les sessions et chiffre les jetons Rotor | Production ; différent en Preview |
| `PROCLAIR_PUBLIC_ORIGIN` | Origine HTTPS stable, sans chemin ni slash final, ex. `https://nom-du-projet.vercel.app` | Production ; URL stable différente en Preview si OAuth testé |
| `CRON_SECRET` | Secret aléatoire distinct, au moins 32 caractères ; Vercel l’envoie en Authorization Bearer au cron | Production uniquement |

Ne jamais préfixer ces variables par `NEXT_PUBLIC_`. Aucun jeton Rotor ni identifiant OAuth privé n’est nécessaire pour commencer : le client public est enregistré dynamiquement lors de la connexion. Le CRM conserve ensuite les jetons chiffrés dans PostgreSQL. Aucune clé de modèle IA n’est requise pour OMEGA actuel, qui reste un planificateur déterministe.

Pour générer localement une valeur secrète : `openssl rand -hex 32`, puis la saisir directement dans le gestionnaire de secrets Vercel. Conserver `PROCLAIR_SESSION_SECRET` dans un coffre : sa perte rend les autorisations Rotor chiffrées illisibles. Sa rotation invalide les sessions et exige une reconnexion Rotor ou une migration explicite du chiffrement.

Ne pas donner les variables de production aux Preview. Leur build ne migre pas la base automatiquement ; préparer une base de Preview séparée et lui appliquer les migrations manuellement via `DATABASE_URL=URL_PREVIEW npm run db:migrate`. Les variables doivent être cohérentes avec chaque domaine, sinon la protection contre les requêtes de modification d’origine différente les refusera.

## 4. Compilation et migrations

En Production, le build vérifie la configuration, génère Prisma, applique les migrations additives via `DIRECT_DATABASE_URL`, initialise de façon idempotente les trois techniciens déjà demandés, puis compile Next.js. Aucun client, facture, paiement ou visite de démonstration n’est créé. Aucun reset ni import de données locales n’est exécuté.

Les migrations prennent un verrou PostgreSQL et vérifient le checksum des migrations déjà appliquées. Le runner utilise une connexion directe parce qu’un verrou de session ne convient pas à un pooler en mode transaction. Ne pas modifier une migration appliquée ; ajouter une nouvelle migration. Une compilation échouée peut avoir déjà appliqué des migrations additives : conserver une sauvegarde et prévoir le déploiement compatible plutôt qu’un reset.

## 5. OMEGA sur Vercel

Le worker local `npm run worker` reste disponible pour une machine permanente. Sur Vercel, le cron appelle `GET /api/cron/omega` avec le secret ; aucune session navigateur n’est requise. Sans secret correct : HTTP401. Le moteur reste désactivé par défaut, jusqu’à son activation par l’administrateur dans OMEGA.

Le cron livré tourne une fois par jour à **13:00 UTC**, soit 09:00 à Toronto en heure d’été et 08:00 en heure d’hiver. Cette fréquence n’équivaut pas au worker local permanent. Le bouton **Traiter la file OMEGA maintenant** permet un traitement administrateur immédiat depuis le CRM. Chaque appel traite au plus trois jobs, utilise les mêmes verrous, retentatives et kill switch, et ne fait aucune confirmation client ni envoi externe.

Pour une cadence de 15 minutes, choisir un forfait Vercel qui l’autorise puis remplacer la planification par `*/15 * * * *`, ou utiliser un ordonnanceur externe authentifié. Ne pas lancer de processus infini dans une fonction Vercel. L’API a une durée maximale configurée de 60 secondes ; les limites réelles dépendent du forfait.

## 6. Rotor OAuth

Une fois le domaine HTTPS configuré et le CRM accessible : se connecter au CRM → **Intégrations** → **Connecter le compte Rotor Proclair** → s’authentifier chez Rotor et autoriser les lectures. Retour :

`https://nom-du-projet.vercel.app/api/integrations/rotor/callback`

Scopes demandés : clients, prestations, visites et factures en lecture seule, plus offline_access pour le renouvellement. PKCE S256, cookie HttpOnly Secure SameSite=Lax, expiration dix minutes, état à usage unique enregistré dans PostgreSQL. Le stockage chiffré et les verrous transactionnels PostgreSQL fonctionnent entre plusieurs instances Vercel ; aucun jeton n’est enregistré sur le système de fichiers éphémère.

Le projet conserve renouvellement, révocation, déconnexion locale et découverte paginée des schémas d’outils. Le fournisseur doit accepter l’inscription dynamique et autoriser le compte réel. Ces parcours ont été testés avec serveur simulé et PostgreSQL, pas avec les données du compte Proclair. Aucun import automatique ni `tools/call` n’est annoncé.

Si des jetons existent déjà dans l’ancien dossier `.local/rotor`, utiliser **avec le secret d’origine** `node --env-file=.env --import tsx scripts/import-rotor-credentials.ts` vers la base choisie. L’import refuse d’écraser des accès déjà présents, conserve les fichiers source et ne montre aucun secret. Ne jamais envoyer ce dossier sur GitHub.

## 7. Contrôles après déploiement

- `/api/health` : status ok et database connected.
- Connexion avec le mot de passe Vercel ; clients/planning/finances/journal accessibles.
- Création d’essai uniquement dans une Preview avec base séparée ; contrôler persistance après rechargement et nouveau déploiement.
- `/api/cron/omega` sans authentification : 401 ; bouton de traitement OMEGA disponible ; moteur désactivé par défaut.
- Dans Intégrations, le retour OAuth utilise le domaine stable ; vérifier la connexion au compte autorisé puis la découverte des outils.
- Factures : impression/PDF navigateur ; aucune banque ou communication externe n’est simulée.

Le contrôle local de compilation ne vaut pas un déploiement distant réussi. La publication Vercel et le test OAuth réel nécessitent le compte Vercel, la base distante, les variables et le compte Rotor autorisé. Les comptes multiples et restrictions sont disponibles ; aucun modèle IA de langage n’est connecté.

Note de la version fusionnée : le correctif runtime présent sur la branche distante privilégie actuellement DIRECT_DATABASE_URL en Production et limite le pool à une connexion par instance. DATABASE_URL reste utilisée hors Production. Les actifs WASM du client Prisma sont inclus explicitement dans le tracing Next.js. Ce correctif est conservé ; le retour au pooler runtime nécessite une validation de la connexion du fournisseur.

Fonctions natives supplémentaires : Devis, Entreprise, Mes données et /portal fonctionnent sans Rotor. Les migrations ajoutent les devis, snapshots d’émetteur et liens client hashés. Les liens clients utilisent le domaine du CRM ; aucune variable de messagerie ou de signature n’est requise pour les partager manuellement. Le fichier JSON métier exclut les secrets et les liens d’accès. Ne jamais publier un lien privé ou un export client.

Les modules **Utilisateurs** et **Carte de prospection** utilisent PostgreSQL et la migration additive `20261013010000_users_prospecting`. Aucune variable supplémentaire n’est requise. Le fond de carte OpenStreetMap est chargé par le navigateur. [Gestion des rôles et portes](utilisateurs-prospection.md).

### Branche 0.2.0 — capacités Rotor et carte

La migration additive `20261013020000_rotor_capabilities` crée snapshots, guards, surveillance, catégories et miroir de pins ; les données métier existantes ne sont pas supprimées. La production cible fournie est `https://coo-proclair.vercel.app` : `PROCLAIR_PUBLIC_ORIGIN` doit correspondre exactement à cette origine pour ce déploiement. Ne réutilisez pas cette origine dans une instance locale destinée aux tests navigateur.

Un second cron appelle `/api/cron/compatibility` à 13:15 UTC avec le même `CRON_SECRET`. Il est inactif fonctionnellement jusqu’à activation dans Santé et compatibilité. Vérifiez que le plan Vercel accepte ces deux crons quotidiens. Les contrôles réseau dans Codex ne permettent pas d’attester le déploiement de cette branche.

Pour la carte Rotor : sélectionner `pins:read` dans Intégrations, reconnecter et consentir depuis le compte Rotor Proclair, découvrir les outils, actualiser les catégories puis prévisualiser/importer une page. Les pins restent dans un miroir distinct réservé aux administrateurs. Les écritures distantes sont désactivées ; Stripe et les fournisseurs de communication restent non connectés. Aucune variable privée supplémentaire n’est nécessaire pour cette livraison.

### Migrations commerciales de cette branche

`20261013030000_native_sales` et `20261013031000_contact_normalization` sont additives. Elles créent le pipeline/prospects et des colonnes client calculées avec index ; aucune donnée métier supprimée. Sauvegarder avant la migration de production. Aucune nouvelle variable Vercel n’est nécessaire pour ces fonctions natives. Les droits des comptes non administrateurs existants restent explicites.

### Première tranche V30 — 0.3.0

Trois migrations additives ajoutent import/checkpoints, correspondances clients et accords de service (`20261013040000_rotor_import_runs`, `20261013041000_rotor_customer_mappings`, `20261013042000_service_agreements`). Préparer une Preview avec base séparée avant la revue. Aucun secret Vercel supplémentaire requis. Les archives PDF sont en PostgreSQL ; la police Open Sans est versionnée sous Apache-2.0 et incluse dans le tracing. Ne pas partager une base Production avec Preview.

Le retour OAuth reste `/api/integrations/rotor/callback` sur l’origine stable de chaque environnement. La page `/agreement` utilise un jeton de document privé dans le fragment URL, hashé en base. Configurer l’identité Entreprise avant émission. Un accord client active le contrat ; les passages sont ensuite créés explicitement en PENDING, sans prélèvement ni rendez-vous confirmé. Révoquer un lien ne supprime pas le document signé.

Voir [le rapport V30](PROCLAIR_V30_OVERNIGHT_REPORT.md) pour les limites et vérifications. Cette branche ne doit pas être présentée comme déjà publiée.

### Stripe et Twilio

Les intégrations sont facultatives pour le démarrage. Configurer les variables serveur et les webhooks décrits dans [STRIPE_TWILIO.md](STRIPE_TWILIO.md), puis redéployer. L'envoi SMS et le transfert vocal restent désactivés par défaut. Stripe est limité au mode test : aucune clé ou opération de paiement réel n'est acceptée.
