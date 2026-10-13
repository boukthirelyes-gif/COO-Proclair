# Héberger le CRM existant sur Render

Le dépôt reste sur GitHub. `render.yaml` prépare un service Node 24 avec Next.js complet, contrôle PostgreSQL via `/api/health`, migrations avant démarrage et écoute sur le port Render. Il ne crée aucune nouvelle base de données. Le plan Starter est payant : vérifier le tarif affiché par Render avant de créer le service.

## Première installation

1. Dans Render, choisir **New → Blueprint**, connecter `boukthirelyes-gif/COO-Proclair`, branche `main`, puis examiner le service proposé.
2. Renseigner les variables privées ci-dessous dans Render. Ne pas envoyer les clés dans une conversation ou GitHub.
3. Sauvegarder la base PostgreSQL existante avant la première migration. Utiliser cette même base, avec TLS, accessible depuis Render.
4. Définir `PROCLAIR_PUBLIC_ORIGIN` sur l'origine HTTPS réellement attribuée au service Render, sans chemin ni paramètres. Redéployer si l'adresse n'était pas connue au premier essai.
5. Vérifier les journaux de compilation, de pré-déploiement et le contrôle de santé. Puis vérifier connexion, utilisateurs et rôles, clients, carte et pins vendeurs, devis, historique financier et OMEGA.

| Variable | Valeur à reprendre ou configurer |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL existante pour l'application, TLS |
| `DIRECT_DATABASE_URL` | Connexion directe à la même base pour les migrations |
| `PROCLAIR_ADMIN_PASSWORD` | Mot de passe privé existant, minimum 12 caractères |
| `PROCLAIR_SESSION_SECRET` | **Conserver exactement le secret existant** : il chiffre aussi les jetons Rotor |
| `PROCLAIR_PUBLIC_ORIGIN` | Nouvelle origine HTTPS Render ou domaine personnalisé |
| `CRON_SECRET` | Secret privé distinct, minimum 32 caractères |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Facultatives ; Stripe reste en mode test |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Facultatives ; appels et SMS sortants restent désactivés |

Ne pas copier `.env` dans GitHub. Ne pas définir `VERCEL_ENV` sur Render. Ne pas remplacer le secret de session par un secret généré si la base contient déjà des connexions Rotor.

## Rotor, Stripe, Twilio et tâches programmées

Reconnecter Rotor depuis les intégrations du CRM après changement d'origine ; utiliser l'URL de retour affichée par le CRM dans la configuration OAuth. Les jetons existants restent chiffrés dans PostgreSQL. Une nouvelle connexion ne signifie pas que les données ont été importées.

Dans Stripe/Twilio, mettre à jour les URL des webhooks vers le nouveau domaine en gardant les chemins existants indiqués dans `docs/STRIPE_TWILIO.md`. Vérifier leurs signatures avec les secrets configurés pour ces nouveaux endpoints.

Les crons `vercel.json` ne sont pas exécutés par Render. Configurer un ordonnanceur privé pour appeler `GET /api/cron/omega` à 13:00 UTC et `GET /api/cron/compatibility` à 13:15 UTC, avec l'en-tête `Authorization: Bearer <CRON_SECRET>`. Ne jamais placer ce secret dans une URL. Ces tâches restent soumises aux activations et autorisations existantes ; elles ne déclenchent pas automatiquement des paiements ou communications. Le Blueprint ne provisionne pas ces tâches supplémentaires.

Vercel peut rester disponible pendant la bascule. Après validation Render, éviter de faire tourner simultanément les anciens et nouveaux crons. Les données et PDF sont conservés dans PostgreSQL ; GitHub contient uniquement le code. Aucun transfert de données Rotor supplémentaire n'est effectué par ce déploiement.

## Limites de validation

Le fichier est préparé pour Render, mais sa validation côté fournisseur et la mise en ligne exigent l'accès au compte Render. Un push GitHub ou une compilation locale ne prouve pas qu'un service Render est en ligne.

Validation locale effectuée : compilation Next.js et TypeScript réussie ; YAML lisible ; pré-déploiement exécuté deux fois sur la base de test distincte (réexécution sans erreur). Démarrage Node sur `0.0.0.0` vérifié, interface et santé HTTP 200, cron sans authentification HTTP 401. La documentation Render était inaccessible depuis cet environnement (HTTP 403) ; le schéma reste à confirmer dans l'écran Blueprint Render avant création.
