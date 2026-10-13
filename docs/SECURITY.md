# Sécurité de Proclair

Les sessions de huit heures sont HMAC, HttpOnly et SameSite=Strict. Les cookies sont Secure en HTTPS. Les comptes applicatifs sont revérifiés dans PostgreSQL ; toute modification de rôle, permissions, mot de passe ou statut invalide leurs anciennes sessions. Le compte principal admin dépend du secret d’environnement et reste hors gestion des comptes d’équipe.

Les mots de passe d’équipe utilisent scrypt avec sel aléatoire. Les hashes ne sont ni listés, ni audités, ni exportés. Les rôles ne peuvent recevoir une permission extérieure à leur preset. Les mutations exigent une origine correspondante, un JSON valide et une taille bornée. Les routes non déclarées refusent l’accès par défaut.

Les vendeurs ne voient que leurs portes. Les pins Rotor n’ont pas encore de correspondance vérifiée avec les comptes d’équipe ; leur miroir est donc réservé aux administrateurs. Les coordonnées et notes ne sont pas exposées dans les journaux serveur. Les références de document public sont des tokens aléatoires dont seul le hash est stocké, avec expiration/révocation ; elles ne constituent pas une identité client forte.

OAuth utilise PKCE S256, stockage AES-GCM, anti-rejeu durable et révocation. Le secret de session sert aussi au chiffrement existant : le changer rend les tokens Rotor illisibles et impose une procédure de reconnexion, pas une rotation aveugle. Les scopes demandés et accordés sont distincts. Les outils de carte valident les schémas courants et utilisent une liste fermée de lectures ; aucun outil d’écriture arbitraire n’est exposé.

Les exports privés peuvent contenir des renseignements clients et doivent être conservés comme tels. Les sauvegardes PostgreSQL restent ignorées par Git. `npm run check:secrets` vérifie l’historique et les fichiers du projet avant push. Il ne certifie pas une conformité Loi 25 ni un audit de vulnérabilités exhaustif. La page Santé affiche explicitement l’absence de scan de sécurité en temps réel.

## Accès commercial natif

Les routes de prospects exigent les permissions commerciales et limitent les vendeurs à leur affectation. Le rattachement à une porte exige son accès carte. La conversion en client est réservée aux droits leads.all + leads.write + crm.write. Clé idempotente, verrou transactionnel, version et audit protègent les créations et conversions concurrentes. Les colonnes de normalisation client sont calculées par PostgreSQL et servent uniquement à la recherche de doublons.

## Première tranche V30

Recherche globale : chaque catégorie est filtrée par permission et les pins/prospects par propriétaire. OMEGA ne révèle les factures qu’avec Finance. La liste d’employés reste protégée. Les résultats et PDF sont privés, no-store.

Les accords exigent crm.write ; les passages exigent dispatch. Les routes publiques de document n’ouvrent pas le CRM : jeton aléatoire 32 octets dans un fragment, hash en base, expiration, révocation, projection du snapshot, consentement explicite et signature idempotente. Les données de carte et autorisations de paiement ne font pas partie de ce flux. PDF archivé et empreintes restent en PostgreSQL ; le binaire n’est pas copié dans l’export métier. Les conditions émises sont protégées contre l’édition historique.

L’import contrôle les schémas actifs, baux, checkpoints, doublons et comptages. Les secrets/token/carte sont filtrés de la source de staging. Les contacts candidats nécessitent une décision explicite ; aucune promotion financière. Les tokens OAuth, leases internes et corps de requêtes ne sont pas journalisés ou retournés comme secrets.
