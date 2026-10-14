# Paramètres natifs — livraison du 14 octobre 2026

Les 29 captures Rotor sont reçues et référencées dans SCREENSHOT_MATRIX.md.
Ce lot ajoute une navigation dédiée aux paramètres, adaptée au mobile, autour des modules existants : entreprise, équipe et planning, utilisateurs et rôles, Stripe, intégrations, communications, import/export et facturation clients.

Les utilisateurs peuvent être recherchés et filtrés par état ; la date de création et un badge actif/désactivé sont affichés. Les restrictions serveur et la révocation des sessions restent inchangées. L’import Rotor existant est accessible depuis les données selon les droits requis. Stripe mène à la vérification réelle des fournisseurs ; ouvrir cette page ne lance aucune vérification externe ni transaction.

Validation : compilation production réussie, contrôle TypeScript, 6 groupes navigateur Paramètres, 8 groupes utilisateurs/carte, 5 groupes équipe, inspection des captures synthétiques ordinateur/mobile et contrôle des secrets. Les tests utilisent exclusivement la base navigateur isolée.

Restent hors de ce lot : horaires entreprise, sous-domaine portail, sièges et invitations/2FA, préférences Klarna/pourboires, fournisseurs Surge/Blooio, catalogue et modèles de fréquence, création des formulaires et campagnes. Aucun état connecté ni donnée personnelle des captures n’est simulé.

Publication : un push main ne constitue pas une confirmation de déploiement Vercel ; le commit servi doit être vérifié séparément.
