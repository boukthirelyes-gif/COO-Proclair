# Déploiement natif V2000

Consigne actuelle : ne pas toucher directement à la production. Tous les nouveaux commits restent sur feature/proclair-native-operations-20261014 ; aucune poussée vers main.

Aucune migration ou nouvelle dépendance requise pour Dispatch. Réutiliser les variables privées et la base existantes. Ne pas changer le secret de session ni copier des données réelles dans les tests.

Aucune Preview Vercel/Render créée ou vérifiée : accès fournisseur absent et requêtes au site bloquées par le proxy de sortie lors de la session précédente. GitHub ne constitue pas une mise en ligne. Préparation locale : build puis serveur alimenté par proclair_browser_test et tests navigateur.

Compilation finale réussie ; 121 tests serveur et 77 groupes navigateur réussis. Quatre lots métier et une finition du formulaire committés sur la branche native : Dispatch, sauvegarde atomique, agrégats dashboard et commissions/leaderboard. Aucune migration, clé ou dépendance nouvelle. Ne pas créer une fausse URL Preview ou présenter le site Vercel existant comme cette branche.

Dernière compilation réussie après les états guidés. 121 tests serveur et couverture de 79 groupes navigateur ; un push de branche n’est pas une Preview distante vérifiée.
