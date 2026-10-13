# Sécurité de Proclair

Les sessions de huit heures sont HMAC, HttpOnly et SameSite=Strict. Les cookies sont Secure en HTTPS. Les comptes applicatifs sont revérifiés dans PostgreSQL ; toute modification de rôle, permissions, mot de passe ou statut invalide leurs anciennes sessions. Le compte principal admin dépend du secret d’environnement et reste hors gestion des comptes d’équipe.

Les mots de passe d’équipe utilisent scrypt avec sel aléatoire. Les hashes ne sont ni listés, ni audités, ni exportés. Les rôles ne peuvent recevoir une permission extérieure à leur preset. Les mutations exigent une origine correspondante, un JSON valide et une taille bornée. Les routes non déclarées refusent l’accès par défaut.

Les vendeurs ne voient que leurs portes. Les pins Rotor n’ont pas encore de correspondance vérifiée avec les comptes d’équipe ; leur miroir est donc réservé aux administrateurs. Les coordonnées et notes ne sont pas exposées dans les journaux serveur. Les références de document public sont des tokens aléatoires dont seul le hash est stocké, avec expiration/révocation ; elles ne constituent pas une identité client forte.

OAuth utilise PKCE S256, stockage AES-GCM, anti-rejeu durable et révocation. Le secret de session sert aussi au chiffrement existant : le changer rend les tokens Rotor illisibles et impose une procédure de reconnexion, pas une rotation aveugle. Les scopes demandés et accordés sont distincts. Les outils de carte valident les schémas courants et utilisent une liste fermée de lectures ; aucun outil d’écriture arbitraire n’est exposé.

Les exports privés peuvent contenir des renseignements clients et doivent être conservés comme tels. Les sauvegardes PostgreSQL restent ignorées par Git. `npm run check:secrets` vérifie l’historique et les fichiers du projet avant push. Il ne certifie pas une conformité Loi 25 ni un audit de vulnérabilités exhaustif. La page Santé affiche explicitement l’absence de scan de sécurité en temps réel.
