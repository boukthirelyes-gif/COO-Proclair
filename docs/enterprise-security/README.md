> Mise à jour du 17 octobre 2026 : à la demande du propriétaire, la connexion utilise uniquement le nom d’utilisateur et le mot de passe. Le formulaire ne demande plus de code, les routes d’activation MFA répondent 410 et les anciens enrôlements conservés ne bloquent plus la connexion. Les primitives TOTP et leurs tests restent conservés pour préserver l’historique technique; les sections MFA ci-dessous décrivent cette ancienne capacité, désormais désactivée dans le parcours public. Aucun mot de passe, rôle ou droit d’accès n’est changé.

# Proclair — sécurité et gestion d'équipe

Lot issu de develop ; aucune modification directe en Production. Il ne constitue ni un audit exhaustif, ni une certification, ni une déclaration de conformité Loi 25.

## Corrections vérifiables

La déconnexion effaçait seulement le cookie : une copie encore valide restait réutilisable. Elle révoque maintenant **toutes les sessions du compte**, y compris les cookies d'autorisation Rotor dérivés, via un compteur serveur. Les comptes d'équipe utilisaient déjà AppUser.sessionVersion pour les changements d'accès ; cette fonction est conservée. Le compte principal admin possède maintenant un compteur persistant SecuritySessionEpoch, sans rotation du secret qui chiffrerait autrement les accès Rotor. Une nouvelle connexion reste possible avec le mot de passe valide : révocation n'est pas désactivation.

La résolution d'identité utilise les droits actuels en base, l'activation et le compteur, jamais les permissions d'un cookie. Le helper historique actorFor ne fait qu'une vérification de signature ; aucun endpoint actuel ne l'utilise, il est marqué déprécié. Les sessions restent signées et expirent après 8 h. Cookie HttpOnly, SameSite strict, Secure sur HTTPS ; contrôle Origin des mutations conservé. Limite existante : 8 tentatives par identifiant et minute. Pas encore de protection distribuée contre toutes les formes d'attaque par identifiants aléatoires.

Les succès et échecs de connexion admis par la limite sont audités. L'identifiant inconnu est condensé ; ni mot de passe, cookie ni token n'est enregistré. La réinitialisation administrée existante est conservée et révoque les sessions ; pas de nouveau flux public « mot de passe oublié » envoyé par courriel.

## Profils et droits

Les droits peuvent être retirés aux profils non administrateurs (ADMIN et OWNER conservent tous les droits), jamais ajoutés au-delà de son plafond. Le serveur filtre les permissions lors de la résolution et valide les changements. PostgreSQL impose aussi les rôles autorisés et le sous-ensemble de permissions. Pas de promotion automatique d'anciens comptes. Les anciens rôles MANAGER, DISPATCHER et VIEWER restent compatibles.

| Profil | Lecture | Création/modification | Export, utilisateurs, intégrations, approbations |
|---|---|---|---|
| OWNER — Propriétaire | Tous modules | Tous droits administratifs | Tous ; seul propriétaire/compte principal gère les propriétaires |
| ADMIN — Administrateur | Tous modules | Administration | Tous, sauf gestion d'un propriétaire par un administrateur nommé |
| GENERAL_MANAGER — Directeur général | CRM, opérations, finances, ventes | CRM, devis, dispatch, finances, supervision | Pas de gestion des comptes, intégrations ou export global par défaut |
| SALES_MANAGER — Directeur des ventes | CRM, tous prospects/pins | Prospection, devis et ventes | Pas de module financier, export global, utilisateurs ou configuration |
| OPERATIONS_MANAGER — Directeur des opérations | CRM, carte globale, opérations | Dispatch et supervision OMEGA autorisée | Pas de finance, export, intégrations ou gestion des utilisateurs |
| SELLER — Vendeur | Ses prospects/pins/ventes/commissions et territoires autorisés | Ses objets commerciaux | Pas d'administration ou d'export global |
| TECHNICIAN — Technicien | Ses interventions attribuées | Commencer/terminer ses interventions planifiées | Aucun accès CRM général, finance, export, utilisateurs ou intégrations |
| OFFICE — Personnel administratif | CRM | Clients, contrats et devis | Pas de dispatch, finance, export global ou administration |

Les permissions héritées sont des groupes fonctionnels, pas encore des autorisations distinctes pour chaque champ ou chaque opération CRUD. Par exemple finance associe lecture et plusieurs mutations ; il ne faut pas l'accorder comme simple accès lecture. crm.read donne une lecture CRM d'entreprise, pas un accès personnel. Les approbations sensibles gardent les contrôles supplémentaires de leurs services (Stripe administrateur humain, supervision, etc.). Aucun nouveau droit de suppression générale n'est introduit.

OWNER utilise le contexte administratif existant avec businessRole conservé. Le compte principal admin reste un accès de secours extrêmement privilégié : usage restreint et mot de passe conservé dans les variables privées, jamais dans les exports. Les changements de rôle, activation, mot de passe et liaison technicien incrémentent le compteur de sessions et conservent l'identifiant/historique du compte.

## Portail technicien

AppUser.technicianId est unique et lié par clé étrangère à Technician. Un compte sans liaison active ne voit aucune intervention. L'administrateur sélectionne le technicien par son nom dans Utilisateurs. L'accès d'un technicien ne nécessite pas crm.read.

GET /api/employee/visits?date=YYYY-MM-DD filtre le technicien côté serveur et affiche au maximum 100 lignes de sa journée Toronto, total exact et historique terminé conservé. Aucun paramètre propriétaire arbitraire n'est accepté. Les prix, contrats, courriels et notes internes ne sont pas renvoyés. Visit.technicianInstructions est un champ distinct, vide par défaut : aucune copie automatique des notes privées. Le dispatch renseigne ce champ depuis le formulaire d'intervention.

POST /api/employee/visits/:id/start accepte uniquement expectedVersion et approved:true ; SCHEDULED devient IN_PROGRESS. POST /complete accepte aussi actualDurationMinutes (1–540) ; IN_PROGRESS devient COMPLETED. La propriété, l'activation et le compteur sont revérifiés en transaction ; CAS, reprise idempotente et audit conservés. Un identifiant d'un autre technicien répond 404. Aucun déplacement, annulation, changement de prix, facturation ou envoi externe n'est permis. Pas encore de photos, absences ou tâches personnelles ajoutées à ce portail.

## Centre de sécurité

Le centre de santé conserve toute la liste des migrations appliquées (métadonnées seulement), sans tronquer les versions historiques au-delà de 30 entrées.

Dans Utilisateurs : comptes actifs/inactifs, échecs de connexion sur 24 h, tâches en dead-letter, 30 derniers événements sensibles, invitations en attente, MFA enrôlées et révocation globale. Il affiche des **comptes**, pas un nombre inventé de sessions actives. Révocation de son propre compte = reconnexion requise. Les autres utilisateurs n'accèdent pas à /api/security/overview ni /revoke.

## MFA personnelle

`/account` permet l’enrôlement volontaire avec le mot de passe actuel, puis un code d’application TOTP (RFC 6238 SHA-1, 6 chiffres, 30 secondes, tolérance ±1 pas). Le secret est généré par CSPRNG, montré uniquement au propriétaire pendant l’enrôlement et chiffré AES-256-GCM avec l’identité en données associées. Aucun service externe de QR code ne reçoit le secret. L’enrôlement expire après 10 minutes.

Après preuve du code, dix codes de secours à usage unique sont montrés une seule fois ; seules leurs empreintes sont conservées en base. Activation/désactivation révoquent toutes les sessions du compte. La connexion exige ensuite mot de passe ET code TOTP ou de secours. Les codes TOTP consommés ne peuvent pas être rejoués ; la consommation est transactionnelle. Cinq codes erronés bloquent le TOTP pendant 15 minutes, avec événement d’audit ; un code de secours valide permet de récupérer l’accès et réinitialise ce blocage. Les limites existantes par identifiant et les limites de preuve MFA s’ajoutent à ce compteur.

Désactiver exige le mot de passe et un second facteur valide. Un changement administré du mot de passe ne désactive pas silencieusement la MFA. Les confirmations revérifient l’activation et la version de session en transaction. Aucun secret, code TOTP, code de secours ou mot de passe n’est enregistré dans l’audit ou l’export métier.

La clé de chiffrement dérive de PROCLAIR_SESSION_SECRET, déjà requis. Sa rotation nécessite une procédure contrôlée : elle invalide les cookies et rend les secrets chiffrés existants illisibles sans ré-enveloppement. Les codes de secours MFA restent utilisables pour se reconnecter puis ré-enrôler ; les accès OAuth Rotor nécessitent leur procédure de reconnexion/rechiffrement. Conserver la clé de restauration hors des sauvegardes de données, dans une gestion de secrets à accès restreint. La récupération sans appareil ni codes de secours demande une procédure administrée avec preuve d’identité ; aucun contournement public n’est ajouté.

## Invitations et activation

« Inviter un employé » crée atomiquement un compte inactif, un mot de passe temporaire aléatoire inconnu et une invitation de 72 heures. Le destinataire choisit son propre mot de passe sur `/invite`. Le jeton de 256 bits est stocké uniquement sous empreinte SHA-256 ; le lien privé est retourné une seule fois à l’administrateur, avec statut NOT_SENT. Il faut le transmettre par un canal sûr après vérification du destinataire. Aucun fournisseur de courriel n’est activé.

Le jeton se trouve dans le fragment URL, pas la requête serveur ; la page le retire de l’historique après lecture et l’envoie uniquement dans le corps POST de même origine. Si la page est rechargée avant activation, rouvrir le lien original. Activation, mot de passe choisi et consommation sont transactionnels. Une seconde utilisation est refusée et ne modifie jamais le mot de passe.

Une réémission révoque les liens précédents ; une révocation explicite est possible depuis la liste des comptes inactifs. Les changements d’un compte révoquent les invitations non consommées destinées à ce compte ou émises par lui. L’acceptation vérifie encore la version de profil, l’inactivité, l’expiration et la révocation. Les droits du destinataire viennent du profil enregistré, jamais du corps d’acceptation. Une invitation consommée ne peut pas désactiver le compte : utiliser la désactivation d’utilisateur. Une MFA préexistante reste active à la réactivation. Les liens, secrets et empreintes d’invitation ne sont pas exportés dans le JSON métier ni journalisés.

## Migrations et déploiement

20261017030000_enterprise_sessions : compteur du compte principal.
20261017031000_enterprise_roles : nouveaux profils, contrainte de permissions, liaison technicien et instructions publiques séparées. Les administrateurs existants reçoivent employee.self et leurs sessions sont révoquées lors de cette évolution. Ce droit n'ouvre aucun dossier sans liaison de technicien actif.

20261017032000_account_mfa : facteurs chiffrés et codes de secours condensés.
20261017033000_user_invitations : invitations avec empreinte de jeton et version cible.
20261017034000_mfa_attempt_limits : blocage persistant des tentatives MFA.

Le contrôle /api/health refuse un statut prêt si les tables d’authentification ou le marqueur de dernière migration de sécurité sont absents.

Avant déploiement : sauvegarde vérifiée, préflight des permissions déjà stockées, migrations sur une base isolée puis déploiement applicatif. Une ancienne donnée hors plafond fait échouer la contrainte ; réviser l'attribution avec le propriétaire au lieu de contourner la contrainte. Ne pas modifier une migration déjà appliquée. Les tests de ce lot utilisent uniquement bases locales synthétiques/schémas aléatoires. Les migrations historiques ne sont pas réécrites.

## Protection des données et limites restantes

- Multi-entreprises / RLS PostgreSQL par locataire : non implémenté. Le logiciel reste un CRM d'une seule entreprise ; une contrainte de permissions ne remplace pas une isolation SaaS entre entreprises.
- MFA : TOTP optionnelle implémentée et vérifiée par tests, pas imposée automatiquement à tous les comptes. Définir la politique d’enrôlement des comptes privilégiés avant généralisation.
- Invitations à usage unique : implémentées avec transmission manuelle sécurisée, sans courriel automatique. La récupération publique de compte par courriel, les objectifs et de nouvelles fonctions d’absences ne sont pas ajoutés ; les fonctions administrées existantes restent disponibles.
- Sauvegardes de Production, chiffrement et restauration : non vérifiés. Un export JSON métier n'est pas une sauvegarde PostgreSQL. Définir RPO/RTO, sauvegardes chiffrées hors compte applicatif, accès restreint et tests de restauration isolés. Après restauration, révoquer les sessions avant remise en service.
- Conservation : pas de purge automatique nouvelle. Définir les durées par catégorie (comptabilité, contrats/preuves, communications, prospection et audit), les exceptions légales et la procédure d'effacement contrôlé. Ne pas effacer les archives financières pour satisfaire aveuglément une demande.
- Québec/Canada : désigner le responsable des renseignements personnels, documenter finalités/consentements, droits d'accès et rectification, traitements externes, incidents et évaluations requises. Ce sont des mesures organisationnelles à vérifier ; le code ne certifie pas la Loi 25.
- Audit npm : mise à jour de tsx vers 4.23.15 et de sa dépendance esbuild vers 0.28.2, corrigeant l’avis sur le serveur de développement Windows. L’audit complet après mise à jour ne signale aucune vulnérabilité connue (production et développement). Ce résultat ponctuel ne prouve pas l’absence de vulnérabilités applicatives.

## Validation

Tests enterprise-security : profils frontend/backend identiques, élévation refusée par service et PostgreSQL, copies de cookies révoquées, expiration, propriétaire protégé, redaction des notes/prix et isolement du technicien, début/fin idempotents, révocation pendant une session. Le navigateur appelle réellement les API avec une session technicien, tente des accès interdits, enrôle une MFA synthétique, refuse une connexion sans second facteur, utilise un code de secours et rejoue une copie du cookie après déconnexion. Il crée et accepte aussi une invitation synthétique, puis refuse son rejeu. Les tests MFA incluent un vecteur RFC, expiration, codes concurrents, blocage persistant et absence de secrets dans les audits.

Tests existants conservés. Consulter le rapport du lot pour les résultats réellement exécutés ; ne pas confondre résultats locaux et GitHub Actions/Preview.

## Restauration locale vérifiée

Un export PostgreSQL du schéma public de la base navigateur synthétique a été restauré dans une nouvelle base locale isolée. Les comptes, visites, invitations et états MFA correspondent au jeu source ; le secret d’un facteur MFA restauré a été déchiffré avec la clé de test, sans afficher sa valeur. La base de restauration a ensuite été supprimée. Cela valide ce scénario technique local, pas les sauvegardes, la rétention ou la reprise après sinistre de Production. Les dumps privés ne sont pas commis.

### Connexion indisponible sur une Preview

Le contrôle `/api/health` doit répondre `200` avec `database: connected`. Un statut `schema_incomplete` nécessite les migrations sur la base Preview isolée. Le build Vercel applique maintenant les migrations versionnées en Preview via `scripts/preview-migrate.ts`, après validation de `PROCLAIR_PREVIEW_DATABASE_URL` par le même résolveur que le serveur. Une variable manquante ou équivalente à la connexion Production arrête le build avant toute migration. Aucun seed métier n’est exécuté en Preview. Les migrations sont transactionnelles, verrouillées et rejouables sans doublon.

Une Preview déjà créée doit être redéployée avec ce code : modifier une branche ne remplace pas le code exécuté par une ancienne URL immuable. Un contrôle de santé réussi n’atteste pas à lui seul la connexion; vérifier aussi une authentification puis la lecture du dossier autorisé. Le message générique 503 ne permet pas de conclure à une migration manquante : consulter le code borné `Erreur API Proclair` dans les logs Vercel, sans divulguer secrets ou données clients.
