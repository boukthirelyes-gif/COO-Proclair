# Déploiement natif V2000

Consigne actuelle : ne pas toucher directement à la production. Tous les nouveaux commits restent sur feature/proclair-native-operations-20261014 ; aucune poussée vers main.

Aucune migration ou nouvelle dépendance requise pour Dispatch. Réutiliser les variables privées et la base existantes. Ne pas changer le secret de session ni copier des données réelles dans les tests.

Aucune Preview Vercel/Render créée ou vérifiée : accès fournisseur absent et requêtes au site bloquées par le proxy de sortie lors de la session précédente. GitHub ne constitue pas une mise en ligne. Préparation locale : build puis serveur alimenté par proclair_browser_test et tests navigateur.
