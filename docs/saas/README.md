# Proclair OS — fondations SaaS incrémentales

Ce lot ajoute un **pilote technique**, désactivé par défaut. Il ne transforme pas encore tous les modules du CRM historique en SaaS commercial. Aucun paiement réel, message réel, import de données Proclair ou modification de Production n’est réalisé.

## Architecture et frontière

Le schéma existant reste le CRM Proclair. Une migration additive le référence dans le registre sous `proclair-legacy`, état LEGACY : aucun compte SaaS n’y reçoit de droits automatiquement. Les données existantes ne sont ni déplacées, ni copiées, ni réattribuées.

Le plan de contrôle contient organisations, identités SaaS, adhésions, sessions, forfaits, abonnements, configurations chiffrées et événements. Chaque nouvelle entreprise reçoit un schéma `tenant_<32 caractères hexadécimaux>` contenant les **mêmes modèles et migrations CRM**, sans les tables du plan de contrôle. Les services CRM existants sont réutilisés : aucun deuxième modèle Customer/Contract n’est créé.

Les routes `/api/saas/**` authentifient un cookie opaque distinct, HttpOnly/SameSite strict, limité au chemin SaaS. Seule son empreinte est conservée. Activation du compte, expiration et adhésion sont vérifiées côté serveur ; le slug fourni par le navigateur ne donne jamais un droit. Les cookies du CRM historique et du SaaS ne sont pas interchangeables. Une route SaaS inconnue répond 404, sans redirection vers les anciens services globaux.

Le client Prisma est construit **après** résolution du schéma depuis le registre et vérification de l’adhésion, avec un pool d’une connexion. Il est déconnecté après chaque opération. Huit clients simultanés au maximum par processus ; réponse 503 au-delà. Pas de cache global de données clients, ni de substitution de process.env entre entreprises. Ce plafond n’est pas un quota distribué entre instances.

Les requêtes Prisma sont qualifiées par schéma. Les rares requêtes SQL de gestion d’équipe utilisent uniquement des identifiants internes validés et des valeurs paramétrées. Les créations sous quota, changements de forfait et changements d’accès partagent un verrou transactionnel par organisation ; la mutation revérifie les droits et le forfait après acquisition du verrou. Le quota client est vérifié dans la même transaction que l’écriture, via les validations et l’audit CRM existants.

**Limite d’infrastructure** : le rôle PostgreSQL de l’application peut techniquement atteindre plusieurs schémas. L’isolation repose sur cette frontière serveur et les clients qualifiés, pas sur une RLS ni une identité PostgreSQL propre à chaque tenant. Pour une défense contre une compromission du serveur applicatif, déployer des rôles/bases distincts et un service de provisioning à privilèges minimaux. Aucun accès SQL client n’est exposé.

## Activation et provisioning

Variables, à configurer uniquement dans l’environnement pilote isolé :

- `PROCLAIR_SAAS_ENABLED=true` ouvre les API pilotes. Absent = 503 ; le CRM interne ne change pas.
- `PROCLAIR_SESSION_SECRET` existant chiffre les configurations avec AES-GCM et AAD organisation+fournisseur ; aucune valeur n’est publique.
- `PROCLAIR_SAAS_PLATFORM_ADMIN_IDS` : liste explicite d’identifiants SaaS autorisés à administrer la plateforme. Un propriétaire d’entreprise n’est pas super administrateur. Vide = aucun accès plateforme.
- `PROCLAIR_SAAS_ALLOW_PROVISIONING=true` uniquement sur le worker isolé. Il refuse VERCEL_ENV=production. Ne pas activer cette variable sur le serveur web.

Après migration normale et génération du client, l’inscription crée une organisation PENDING, un propriétaire et un essai de 14 jours, sans appel de paiement. Le provisioning n’est jamais exécuté dans une requête HTTP.

```sh
node --env-file-if-exists=.env --import tsx scripts/provision-saas.ts
# ou un identifiant d’organisation précis en argument
```

Une invocation traite au plus cinq entreprises PENDING, ordonnées par création. Un superviseur externe doit programmer le worker : **aucun fonctionnement continu n’est prétendu**. Verrou de ligne, transaction DDL unique, contrôles de schéma, version des migrations et reprise explicite des FAILED (argument identifiant), cinq essais maximum. Crash = rollback PostgreSQL ; READY ne sera publié qu’après succès complet. Un second provisioning READY de même version est idempotent. Une version différente échoue avec TENANT_MIGRATION_REQUIRED : un déploiement de migrations tenants reste à mettre en œuvre avant évolution ultérieure du schéma métier.

Le compte AppUser du tenant possède un mot de passe aléatoire inconnu, sans équivalence avec le mot de passe SaaS. Il sert au RBAC des services existants. Aucun accès au cookie interne n’en découle.

## Modules réellement disponibles

- `/product` : page commerciale originale, identité bleue sombre, distinction pilote / développement, aucun tarif ou succès inventé.
- `/saas` : inscription, connexion, choix d’entreprise autorisée, état du provisioning, clients paginés, configuration de base, invitation par lien, paramètres d’intégration, essai/annulation et synthèse OMEGA.
- API CRM : liste paginée des clients/contrats/visites/factures ; fiche client ; création client/propriété/contrat avec les services existants. Prospection en lecture avec filtres et pagination existants.
- Équipe : invitations de 72 h à usage unique, transmission manuelle (NOT_SENT), acceptation, changement de rôle et activation côté serveur. L’utilisateur existant doit prouver son mot de passe SaaS pour accepter une invitation. Le propriétaire initial est protégé ; rôle d’administrateur accordé par le propriétaire uniquement. Historique conservé dans les événements. Réactivation soumise au quota.
- Paramètres par entreprise : nom, logo HTTPS, couleur, services, taux de taxes, horaires, grille tarifaire et modèles de contrats/factures/messages. Ce stockage ne réécrit pas les anciens contrats ni leurs calculs : l’application de ces modèles à tous les générateurs est une étape ultérieure.
- OMEGA : outil déterministe de résumé de Customer/Contract/Visit dans le seul schéma autorisé, lecture seule, sources indiquées. Aucun LLM, clé IA globale, queue autonome ou action externe n’est partagé.
- Plateforme : organisations (100 par réponse, total exact), nombres d’utilisateurs/adhésions/configurations, état de provisioning, forfaits, erreurs. Aucun dossier client, message ou secret retourné. Gestion des politiques et changements de forfait via API protégée.

## API pilote

| Méthode / chemin après /api/saas | Accès |
|---|---|
| POST register, login | Public lorsque le pilote est activé ; validation stricte et limite par identifiant |
| GET session / POST logout | Session SaaS ; déconnexion révoque tous les appareils |
| GET organizations/:slug | Adhésion active |
| GET organizations/:slug/customers, contracts, visits, invoices | Adhésion, permissions CRM/finance et entitlement ; limite 100 |
| GET organizations/:slug/customers/:id | Objet du schéma autorisé uniquement |
| POST organizations/:slug/customers, properties, contracts | Écriture CRM, quota clients atomique |
| GET organizations/:slug/pins, omega, usage | Permissions et entitlement correspondants |
| GET/POST organizations/:slug/integrations | Propriétaire / administrateur ; aucun transport activé |
| POST organizations/:slug/settings, invitations | Propriétaire / administrateur |
| POST invitations/accept | Token valide + mot de passe ; quota revérifié |
| GET organizations/:slug/members / PATCH .../members/:id | Administration d’entreprise ; propriétaire protégé |
| GET organizations/:slug/subscription / POST .../subscription/cancel | Lecture membre / annulation administrateur avec version + approbation |
| GET platform / POST platform/plans, platform/subscriptions/:slug | Allowlist serveur de super administrateurs uniquement |

## Forfaits et facturation

Essai, Basic, Pro, Business, Enterprise sont des enregistrements modifiables. Prix CAD initialement NULL : aucun tarif commercial inventé. Les limites utilisateurs/clients sont appliquées côté serveur ; les autres capacités sont explicitement désactivées si aucun transport ou stockage adapté n’existe. Aucun SMS/stockage « consommé » fictif n’est retourné ; stockage externe non connecté = mesure inconnue.

Une annulation bloque immédiatement les outils SaaS, en conservant les données et l’historique. Un changement de forfait utilise une version optimiste et un événement, sans charge ni activation automatique d’un abonnement payé. Une baisse de quota ne supprime pas les données existantes ; elle bloque les nouvelles créations tant que l’usage est supérieur au plafond. Expiration de l’essai contrôlée à chaque opération, même sans scheduler.

**Non implémenté commercialement** : paiement des abonnements, prorata, relances, renouvellement payant, factures SaaS légales et webhooks du marchand SaaS. Les paiements CRM des clients finaux ne doivent jamais servir de registre de paiement des abonnements.

## Connecteurs et webhooks

Chaque fournisseur a un secret chiffré par organisation, non retourné ni audité. Configurer le réinitialise à UNVERIFIED ; jamais « Connecté ». Aucun transport n’utilise les variables globales Stripe/Twilio/Rotor du CRM historique. La primitive de résolution de webhook exige un compte fournisseur unique, vérifié et rattaché à une organisation READY. Elle ne valide pas une signature et n’active pas de processeur webhook. Les processeurs multitenants signés restent un prérequis : ne pas diriger les fournisseurs SaaS vers les anciens endpoints Proclair.

## Tests et performance

Tests avec entreprises A/B/C et schémas isolés : accès croisé, relations, adhésions, secrets/AAD, OMEGA, invitations, révocation, quotas concurrents, forfaits/version, annulation, rollback et reprise du provisioning ; comparaison du nombre de clients du schéma public avant/après. Les fixtures synthétiques sont supprimées dans finally.

La mesure automatisée utilise 10 000 clients synthétiques, dix lectures de 100 lignes maximum, et publie médiane/p95 dans `.local/saas-foundations/performance.json`. Ce n’est **pas** une validation de centaines d’entreprises, de millions de lignes, de centaines de milliers de pins ou d’un débit distribué. Pas de promesse de scalabilité sans ces essais et sans budget de connexions/infrastructure.

## Checklist avant lancement commercial

- [ ] Adapter tous les modules métier, imports, documents, photos, cartes, calendriers et workers au contexte tenant. Garder bloqué tout module sans adaptation.
- [ ] MFA et récupération sécurisée des identités SaaS, vérification d’adresse, protection distribuée contre l’abus, SSO si requis. La MFA du CRM interne ne couvre pas encore les nouvelles identités SaaS.
- [ ] Moindre privilège PostgreSQL, tests d’intrusion, revue d’isolement indépendante, gestion des clés et rotation.
- [ ] Provisioner supervisé, migrations sur parc de tenants, pagination des grands registres de plateforme, files/fairness et quotas distribués.
- [ ] Stockage de fichiers isolé, rétention, export/restauration par entreprise, sauvegardes chiffrées/PITR et exercices de restauration.
- [ ] Fournisseurs indépendants vérifiés, signatures des webhooks, idempotence, reprise et rapprochement par entreprise.
- [ ] Billing commercial TEST exhaustif, conformité, taxes, remboursement/prorata et autorisation explicite LIVE.
- [ ] Conditions d’utilisation, confidentialité/Loi 25, accords de sous-traitance, consentements et responsable des renseignements personnels.
- [ ] Support, procédures d’incidents, alertes, objectifs de service, monitoring et budgets de capacité.
- [ ] Tests de charge multi-entreprises, mobile et accessibilité ; tests de non-régression Proclair.
- [ ] Tarifs approuvés, documentation client, démonstrations anonymisées, onboarding et import guidé complets.

Aucune case organisationnelle n’est cochée par la seule présence de code.

## Robustesse financière héritée

L’audit a reproduit un blocage intermittent lors de transactions financières concurrentes sur un même client Prisma JS, sans verrou SQL en attente. Les transactions de FinanceService sont désormais ordonnées par client, avec admission bornée (32), attente maximale de 2 s avant démarrage et libération après erreur. Une requête expirée dans cette file ne démarre jamais ultérieurement. L’isolation Serializable, les clés idempotentes et les contrôles de version restent conservés ; les reprises de conflits SQL attendent brièvement entre essais. Des appels issus de clients distincts continuent à être arbitrés par PostgreSQL et sont testés avec un paiement idempotent concurrent. Cette file est locale au processus, pas une queue durable de paiements ni un remplacement des contraintes de base. Les premiers échecs de validation sont conservés dans les journaux locaux.
