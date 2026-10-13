# Retour arrière

Le retour du code s’effectue vers un déploiement Vercel précédemment validé, en préservant les variables et l’origine OAuth. Une promotion ou un rollback doit être vérifié par health et un parcours de connexion/consultation. Il n’est pas exécuté par cette livraison.

Les migrations de cette livraison sont additives : nouvelles tables et typeId facultatif sur les pins. L’ancien code ignore ces colonnes/tables. Ne supprimez pas les nouvelles données pour revenir à l’interface précédente. Ne modifiez jamais un fichier de migration déjà appliqué ; ajoutez une migration compensatrice explicitement revue si nécessaire.

La sauvegarde PostgreSQL privée est la voie de restauration complète. `scripts/db-backup.sh` crée une archive avec permissions restreintes et vérifie son catalogue. `scripts/db-restore-empty.sh` refuse une cible non vide : choisir la cible avec PROCLAIR_RESTORE_DATABASE puis tester la restauration dans une base séparée avant toute opération sur la production. Les exports JSON métier excluent les credentials et ne constituent pas une sauvegarde complète restaurable des sessions/comptes.

Avant rollback, désactivez les workers et la surveillance si les adaptateurs sont concernés. Préservez les snapshots, erreurs, audits et réferences externes. Le changement d’origine publique requiert une nouvelle inscription/autorisation OAuth ; le changement du secret de session rend les tokens chiffrés existants inutilisables. Les archives ne doivent jamais être poussées sur GitHub.
